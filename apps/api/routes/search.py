import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from apps.indexer.bitcoin_rpc import BitcoinRPCClient
from apps.indexer.external_api import ExternalBitcoinProvider
from apps.indexer.live_sync import LiveSyncService
from packages.domain.database import get_db
from packages.search.engine import SearchEngine

router = APIRouter(prefix="/api/search", tags=["search"])
rpc_client = BitcoinRPCClient()
external_provider = ExternalBitcoinProvider()
live_sync = LiveSyncService()


class SearchResult(BaseModel):
    type: str  # "transaction", "block", "address", "search_results"
    data: dict[str, Any]


class FilterQuery(BaseModel):
    address: str | None = None
    min_amount_sats: int | None = None
    max_amount_sats: int | None = None
    min_height: int | None = None
    max_height: int | None = None
    min_inputs: int | None = None
    max_inputs: int | None = None
    min_outputs: int | None = None
    max_outputs: int | None = None
    pattern: str | None = None
    limit: int = 50
    offset: int = 0


@router.get("", response_model=SearchResult)
async def search(q: str, db: AsyncSession = Depends(get_db)):
    q = q.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Empty query string.")

    # 1. Search indexed PostgreSQL database first
    db_result = await SearchEngine.quick_search(db, q)
    if db_result.get("type") not in ("empty", "search_results") or (
        db_result.get("type") == "search_results" and db_result.get("matches")
    ):
        return SearchResult(
            type=db_result["type"],
            data=db_result.get("data") or {"matches": db_result.get("matches", [])},
        )

    # 2. If not found in DB, check if query is an Address (e.g. bc1..., tb1..., 1..., 3...)
    is_address_candidate = q.startswith(("bc1", "tb1", "bcrt1", "1", "3")) or (
        26 <= len(q) <= 62 and not re.match(r"^[0-9a-fA-F]{64}$", q)
    )
    if is_address_candidate:
        try:
            addr_model, _ = await live_sync.sync_address(db, q)
            if addr_model:
                fresh_result = await SearchEngine.quick_search(db, q)
                if fresh_result.get("type") == "address":
                    return SearchResult(type="address", data=fresh_result["data"])
        except Exception:
            pass

    # 3. 64 hex characters (TXID or Block Hash)
    if re.match(r"^[0-9a-fA-F]{64}$", q):
        # Try local Bitcoin Core RPC first
        try:
            tx_data = await rpc_client.get_raw_transaction(q, verbose=True)
            return SearchResult(type="transaction", data=tx_data)
        except Exception:
            try:
                block_data = await rpc_client.get_block(q)
                return SearchResult(type="block", data=block_data)
            except Exception:
                pass

        # Try live sync from external on-chain provider (mempool.space)
        try:
            norm_tx = await live_sync.sync_transaction(db, q)
            if norm_tx:
                fresh_result = await SearchEngine.quick_search(db, q)
                if fresh_result.get("type") == "transaction":
                    return SearchResult(type="transaction", data=fresh_result["data"])
        except Exception:
            pass

        # Fallback to block fetch
        try:
            block_data = await external_provider.get_block(q)
            return SearchResult(type="block", data=block_data)
        except Exception:
            pass

    # 4. Block height
    if q.isdigit():
        try:
            height = int(q)
            block_hash = await rpc_client.get_block_hash(height)
            block_data = await rpc_client.get_block(block_hash)
            return SearchResult(type="block", data=block_data)
        except Exception:
            pass

    # 5. If partial match list was returned by DB
    if db_result.get("matches"):
        return SearchResult(type="search_results", data={"matches": db_result["matches"]})

    raise HTTPException(
        status_code=404, detail=f"No matching transaction, block, or address found for '{q}'."
    )


@router.post("/filter")
async def filter_transactions(query: FilterQuery, db: AsyncSession = Depends(get_db)):
    results = await SearchEngine.filter_transactions(
        session=db,
        address=query.address,
        min_amount_sats=query.min_amount_sats,
        max_amount_sats=query.max_amount_sats,
        min_height=query.min_height,
        max_height=query.max_height,
        min_inputs=query.min_inputs,
        max_inputs=query.max_inputs,
        min_outputs=query.min_outputs,
        max_outputs=query.max_outputs,
        pattern=query.pattern,
        limit=query.limit,
        offset=query.offset,
    )
    return {"results": results, "count": len(results)}
