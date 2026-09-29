from typing import Any

from sqlalchemy import or_, select

from sqlalchemy.ext.asyncio import AsyncSession

from packages.domain.models import Address, Block, Input, Output, Transaction


class SearchEngine:
    """
    Search engine for Bitcoin transactions, addresses, blocks, and forensic clusters.
    Supports simple fuzzy query routing and multi-parameter forensic filtering.
    """

    @staticmethod
    async def quick_search(session: AsyncSession, q: str) -> dict[str, Any]:
        """Auto-detects and resolves TXID, Block Hash, Block Height, or Address."""
        q = q.strip()
        if not q:
            return {"type": "empty", "results": []}

        # 1. Block Height
        if q.isdigit():
            height = int(q)
            block_stmt = select(Block).where(Block.height == height)
            b_res = await session.execute(block_stmt)
            block = b_res.scalars().first()
            if block:
                return {
                    "type": "block",
                    "data": {
                        "height": block.height,
                        "hash": block.hash,
                        "timestamp": block.timestamp,
                        "transaction_count": block.transaction_count,
                        "size": block.size,
                    },
                }

        # 2. 64-char hex (TXID or Block Hash)
        if len(q) == 64 and all(c in "0123456789abcdefABCDEF" for c in q):
            # Try Transaction first
            tx_stmt = select(Transaction).where(Transaction.txid == q)
            t_res = await session.execute(tx_stmt)
            tx = t_res.scalars().first()
            if tx:
                inputs_stmt = select(Input).where(Input.transaction_id == tx.id)
                in_res = await session.execute(inputs_stmt)
                outputs_stmt = select(Output).where(Output.transaction_id == tx.id)
                out_res = await session.execute(outputs_stmt)

                return {
                    "type": "transaction",
                    "data": {
                        "txid": tx.txid,
                        "block_height": tx.block_height,
                        "block_hash": tx.block_hash,
                        "block_time": tx.block_time,
                        "vsize": tx.vsize,
                        "fee_sats": tx.fee_sats,
                        "fee_rate": tx.fee_rate,
                        "total_input_sats": tx.total_input_sats,
                        "total_output_sats": tx.total_output_sats,
                        "inputs": [
                            {
                                "address": inp.previous_address,
                                "value_sats": inp.previous_value_sats,
                                "is_coinbase": inp.is_coinbase,
                            }
                            for inp in in_res.scalars().all()
                        ],
                        "outputs": [
                            {
                                "index": out.output_index,
                                "address": out.address,
                                "value_sats": out.value_sats,
                                "script_type": out.script_type,
                            }
                            for out in out_res.scalars().all()
                        ],
                    },
                }

            # Try Block Hash
            block_stmt = select(Block).where(Block.hash == q)
            bh_res = await session.execute(block_stmt)
            bh_block = bh_res.scalars().first()
            if bh_block:
                return {
                    "type": "block",
                    "data": {
                        "height": bh_block.height,
                        "hash": bh_block.hash,
                        "timestamp": bh_block.timestamp,
                        "transaction_count": bh_block.transaction_count,
                        "size": bh_block.size,
                    },
                }

        # 3. Address
        addr_stmt = select(Address).where(Address.address == q)
        a_res = await session.execute(addr_stmt)
        addr = a_res.scalars().first()
        if addr:
            return {
                "type": "address",
                "data": {
                    "address": addr.address,
                    "address_type": addr.address_type,
                    "transaction_count": addr.transaction_count,
                    "total_received_sats": addr.total_received_sats,
                    "total_spent_sats": addr.total_spent_sats,
                    "current_balance_sats": addr.current_balance_sats,
                    "first_seen_at": addr.first_seen_at.isoformat() if addr.first_seen_at else None,
                    "last_seen_at": addr.last_seen_at.isoformat() if addr.last_seen_at else None,
                    "cluster_id": addr.cluster_id,
                },
            }

        # Partial search in addresses or transactions
        like_q = f"%{q}%"
        addr_matches = await session.execute(
            select(Address).where(Address.address.ilike(like_q)).limit(5)
        )
        tx_matches = await session.execute(
            select(Transaction).where(Transaction.txid.ilike(like_q)).limit(5)
        )

        matches = []
        for a in addr_matches.scalars().all():
            matches.append({"type": "address", "id": a.address, "label": a.address})
        for t in tx_matches.scalars().all():
            matches.append({"type": "transaction", "id": t.txid, "label": t.txid})

        return {"type": "search_results", "matches": matches}

    @staticmethod
    async def filter_transactions(
        session: AsyncSession,
        address: str | None = None,
        min_amount_sats: int | None = None,
        max_amount_sats: int | None = None,
        min_height: int | None = None,
        max_height: int | None = None,
        min_inputs: int | None = None,
        max_inputs: int | None = None,
        min_outputs: int | None = None,
        max_outputs: int | None = None,
        script_type: str | None = None,
        pattern: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Multi-parameter forensic filtering matching AGENTS.md Section 7."""
        conditions = []

        if address:
            addr_clean = address.strip()
            addr_subq = (
                select(Transaction.id)
                .outerjoin(Input, Input.transaction_id == Transaction.id)
                .outerjoin(Output, Output.transaction_id == Transaction.id)
                .where(or_(Input.previous_address == addr_clean, Output.address == addr_clean))
            )
            conditions.append(Transaction.id.in_(addr_subq))

        if min_amount_sats is not None:
            conditions.append(Transaction.total_output_sats >= min_amount_sats)
        if max_amount_sats is not None:
            conditions.append(Transaction.total_output_sats <= max_amount_sats)
        if min_height is not None:
            conditions.append(Transaction.block_height >= min_height)
        if max_height is not None:
            conditions.append(Transaction.block_height <= max_height)
        if min_inputs is not None:
            conditions.append(Transaction.input_count >= min_inputs)
        if max_inputs is not None:
            conditions.append(Transaction.input_count <= max_inputs)
        if min_outputs is not None:
            conditions.append(Transaction.output_count >= min_outputs)
        if max_outputs is not None:
            conditions.append(Transaction.output_count <= max_outputs)

        if pattern == "consolidation":
            conditions.append(Transaction.input_count >= 2)
            conditions.append(Transaction.output_count <= 2)
        elif pattern == "batch":
            conditions.append(Transaction.input_count <= 3)
            conditions.append(Transaction.output_count >= 3)
        elif pattern == "peel":
            conditions.append(Transaction.input_count == 1)
            conditions.append(Transaction.output_count == 2)
        elif pattern == "coinjoin":
            conditions.append(Transaction.input_count >= 3)
            conditions.append(Transaction.output_count >= 3)


        stmt = (
            select(Transaction)
            .where(*conditions)
            .order_by(Transaction.block_height.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        txs = result.scalars().all()

        return [
            {
                "txid": tx.txid,
                "block_height": tx.block_height,
                "block_time": tx.block_time,
                "vsize": tx.vsize,
                "fee_sats": tx.fee_sats,
                "fee_rate": tx.fee_rate,
                "input_count": tx.input_count,
                "output_count": tx.output_count,
                "total_output_sats": tx.total_output_sats,
            }
            for tx in txs
        ]
