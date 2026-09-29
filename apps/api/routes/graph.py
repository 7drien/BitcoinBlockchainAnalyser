from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.indexer.live_sync import LiveSyncService
from packages.domain.database import get_db
from packages.domain.models import Input, Output, Transaction
from packages.domain.schemas import GraphData, NormalizedTransaction
from packages.graph.builder import GraphBuilder

router = APIRouter(prefix="/api/graph", tags=["graph"])
live_sync = LiveSyncService()


async def _fetch_transactions_for_address(
    db: AsyncSession, address: str, limit: int = 10
) -> list[NormalizedTransaction]:
    """Retrieves normalized transactions involving a given address."""
    tx_ids_subq = (
        select(Transaction.id)
        .outerjoin(Input, Input.transaction_id == Transaction.id)
        .outerjoin(Output, Output.transaction_id == Transaction.id)
        .where(or_(Input.previous_address == address, Output.address == address))
    )
    stmt = (
        select(Transaction)
        .where(Transaction.id.in_(tx_ids_subq))
        .order_by(Transaction.block_height.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    tx_models = res.scalars().all()
    normalized: list[NormalizedTransaction] = []
    for t in tx_models:
        norm = await live_sync._get_normalized_from_db(db, t.txid)
        if norm:
            normalized.append(norm)
    return normalized


@router.get("", response_model=GraphData)
async def get_graph(
    subject: str | None = Query(None, description="TXID or address to center graph upon"),
    mode: str = Query("address", enum=["address", "utxo"], description="Graph representation mode"),
    depth: int = Query(2, ge=1, le=4, description="Traversal depth / hops"),
    direction: str = Query("both", enum=["upstream", "downstream", "both"], description="Flow direction"),
    max_nodes: int = Query(150, ge=10, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns Cytoscape-compatible topological graph with multi-hop exploration.
    Supports traversing upstream (funding parents & senders) and downstream (spends & recipients).
    """
    txid = subject if subject and len(subject) == 64 else None
    address = subject if subject and len(subject) != 64 else None

    tx_map: dict[str, NormalizedTransaction] = {}

    if txid:
        root_tx = await live_sync.sync_transaction(db, txid)
        if not root_tx:
            root_tx = await live_sync._get_normalized_from_db(db, txid)

        if root_tx:
            tx_map[root_tx.txid] = root_tx
            frontier = [root_tx]

            for _ in range(depth):
                next_frontier: list[NormalizedTransaction] = []
                for current_tx in frontier:
                    if len(tx_map) >= 40:
                        break

                    # 1. Upstream (Parents funding inputs)
                    if direction in ("upstream", "both"):
                        parents = await live_sync.get_parent_transactions(db, current_tx, limit=5)
                        for p in parents:
                            if p.txid not in tx_map:
                                tx_map[p.txid] = p
                                next_frontier.append(p)

                    # 2. Downstream (Children spending outputs)
                    if direction in ("downstream", "both"):
                        children = await live_sync.get_child_transactions(db, current_tx, limit=5)
                        for c in children:
                            if c.txid not in tx_map:
                                tx_map[c.txid] = c
                                next_frontier.append(c)

                frontier = next_frontier
                if not frontier:
                    break

            # Also fetch transactions for primary input and output addresses so related addresses appear
            if len(tx_map) < 30:
                for inp in root_tx.inputs[:3]:
                    if inp.address and inp.address != "Coinbase Reward":
                        for t in await _fetch_transactions_for_address(db, inp.address, limit=3):
                            if t.txid not in tx_map:
                                tx_map[t.txid] = t
                for out in root_tx.outputs[:3]:
                    if out.address:
                        for t in await _fetch_transactions_for_address(db, out.address, limit=3):
                            if t.txid not in tx_map:
                                tx_map[t.txid] = t

    elif address:
        # Address multi-hop exploration
        try:
            await live_sync.sync_address(db, address)
        except Exception:
            pass

        db_txs = await _fetch_transactions_for_address(db, address, limit=20)
        for t in db_txs:
            tx_map[t.txid] = t

        if depth >= 2 and len(tx_map) < 30:
            # Expand counterparties
            counterparty_addrs: set[str] = set()
            for t in list(tx_map.values())[:6]:
                for inp in t.inputs:
                    if inp.address and inp.address != address and inp.address != "Coinbase Reward":
                        counterparty_addrs.add(inp.address)
                for out in t.outputs:
                    if out.address and out.address != address:
                        counterparty_addrs.add(out.address)

            for cp in list(counterparty_addrs)[:5]:
                cp_txs = await _fetch_transactions_for_address(db, cp, limit=2)
                for t in cp_txs:
                    if t.txid not in tx_map:
                        tx_map[t.txid] = t

    else:
        # No subject: fetch recent transactions
        recent_models = await db.execute(
            select(Transaction).order_by(Transaction.block_height.desc()).limit(20)
        )
        for t in recent_models.scalars().all():
            norm = await live_sync._get_normalized_from_db(db, t.txid)
            if norm:
                tx_map[norm.txid] = norm

    transactions = list(tx_map.values())

    if mode == "utxo":
        return GraphBuilder.build_utxo_graph(transactions, center_txid=txid, max_nodes=max_nodes)
    else:
        return GraphBuilder.build_address_graph(
            transactions, center_address=address, center_txid=txid, max_nodes=max_nodes
        )
