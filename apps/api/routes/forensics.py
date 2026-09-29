from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.indexer.live_sync import LiveSyncService
from packages.domain.database import get_db
from packages.domain.models import Input, Output, Transaction
from packages.domain.schemas import (
    HeuristicFinding,
    NormalizedTransaction,
    TransactionInput,
    TransactionOutput,
)
from packages.forensic.engine import ForensicEngine

router = APIRouter(prefix="/api/forensics", tags=["forensics"])
engine = ForensicEngine()
live_sync = LiveSyncService()


class AnalyzeRequest(BaseModel):
    txid: str
    enabled_heuristics: list[str] | None = None


@router.get("/heuristics")
async def list_heuristics():
    return {"heuristics": engine.get_registered_heuristics()}


@router.post("/analyze", response_model=list[HeuristicFinding])
async def analyze_transaction(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    # 1. Fetch transaction from database
    tx_stmt = select(Transaction).where(Transaction.txid == req.txid)
    tx_res = await db.execute(tx_stmt)
    tx = tx_res.scalars().first()

    if not tx:
        try:
            norm_sync = await live_sync.sync_transaction(db, req.txid)
            if norm_sync:
                tx_res = await db.execute(tx_stmt)
                tx = tx_res.scalars().first()
        except Exception:
            pass

    if not tx:
        raise HTTPException(
            status_code=404,
            detail=f"Transaction '{req.txid}' not found in database or on-chain.",
        )

    in_res = await db.execute(select(Input).where(Input.transaction_id == tx.id))
    inputs = [
        TransactionInput(
            txid=inp.previous_txid,
            vout=inp.previous_output_index,
            address=inp.previous_address,
            value_sats=inp.previous_value_sats or 0,
            is_coinbase=inp.is_coinbase,
        )
        for inp in in_res.scalars().all()
    ]

    out_res = await db.execute(select(Output).where(Output.transaction_id == tx.id))
    outputs = [
        TransactionOutput(
            index=out.output_index,
            address=out.address,
            value_sats=out.value_sats,
            script_type=out.script_type,
            spent=out.spent,
        )
        for out in out_res.scalars().all()
    ]

    norm_tx = NormalizedTransaction(
        txid=tx.txid,
        block_height=tx.block_height,
        block_hash=tx.block_hash,
        block_time=tx.block_time,
        confirmed=tx.confirmed,
        size=tx.size,
        vsize=tx.vsize,
        weight=tx.weight,
        fee_sats=tx.fee_sats,
        fee_rate=tx.fee_rate,
        total_input_sats=tx.total_input_sats,
        total_output_sats=tx.total_output_sats,
        inputs=inputs,
        outputs=outputs,
    )

    findings = engine.analyze_transaction(norm_tx, enabled_only=req.enabled_heuristics)
    return findings
