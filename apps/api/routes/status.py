from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.indexer.bitcoin_rpc import BitcoinRPCClient
from apps.indexer.external_api import ExternalBitcoinProvider
from packages.domain.database import get_db
from packages.domain.models import Address, Block, Transaction

router = APIRouter(prefix="/api/status", tags=["status"])
rpc_client = BitcoinRPCClient()
external_provider = ExternalBitcoinProvider()


class NodeStatus(BaseModel):
    network: str
    node_connected: bool
    blocks: int
    indexed_blocks: int
    indexed_transactions: int
    indexed_addresses: int
    is_external_fallback: bool


@router.get("", response_model=NodeStatus)
async def get_status(db: AsyncSession = Depends(get_db)):
    node_connected = False
    chain = "regtest"
    rpc_blocks = 0

    try:
        info = await rpc_client.get_blockchain_info()
        chain = info.get("chain", "regtest")
        rpc_blocks = info.get("blocks", 0)
        node_connected = True
    except Exception:
        pass

    # Query local database counts
    idx_blocks = 0
    idx_txs = 0
    idx_addrs = 0

    max_h = 0
    try:
        b_res = await db.execute(select(func.count(Block.id)))
        idx_blocks = b_res.scalar() or 0

        h_res = await db.execute(select(func.max(Block.height)))
        max_h = h_res.scalar() or 0

        t_res = await db.execute(select(func.count(Transaction.id)))
        idx_txs = t_res.scalar() or 0

        a_res = await db.execute(select(func.count(Address.id)))
        idx_addrs = a_res.scalar() or 0
    except Exception:
        pass

    network_display = "mainnet" if external_provider.enabled else chain
    effective_blocks = max(rpc_blocks, max_h)

    return NodeStatus(
        network=network_display,
        node_connected=node_connected or external_provider.enabled,
        blocks=effective_blocks,
        indexed_blocks=idx_blocks,
        indexed_transactions=idx_txs,
        indexed_addresses=idx_addrs,
        is_external_fallback=external_provider.enabled,
    )
