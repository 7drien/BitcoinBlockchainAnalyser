from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.domain.database import get_db
from packages.domain.models import Cluster, Transaction
from packages.domain.models import HeuristicFinding as DBFinding
from packages.domain.models import Investigation as DBInvestigation
from packages.reports.generator import ForensicReportGenerator

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


class InvestigationCreate(BaseModel):
    name: str
    description: str | None = None
    root_subject_type: str = "transaction"
    root_subject_id: str
    network: str = "mainnet"
    snapshot_height: int | None = None


@router.get("")
async def list_investigations(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBInvestigation).order_by(DBInvestigation.created_at.desc()))
    invs = res.scalars().all()
    return [
        {
            "id": inv.id,
            "name": inv.name,
            "description": inv.description,
            "root_subject_type": inv.root_subject_type,
            "root_subject_id": inv.root_subject_id,
            "network": inv.network,
            "snapshot_height": inv.snapshot_height,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
        for inv in invs
    ]


@router.post("")
async def create_investigation(inv: InvestigationCreate, db: AsyncSession = Depends(get_db)):
    new_inv = DBInvestigation(
        name=inv.name,
        description=inv.description,
        root_subject_type=inv.root_subject_type,
        root_subject_id=inv.root_subject_id,
        network=inv.network,
        snapshot_height=inv.snapshot_height or 0,
    )
    db.add(new_inv)
    await db.commit()
    await db.refresh(new_inv)
    return {"id": new_inv.id, "name": new_inv.name, "created_at": new_inv.created_at.isoformat()}


@router.get("/{inv_id}")
async def get_investigation(inv_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBInvestigation).where(DBInvestigation.id == inv_id))
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found.")

    findings_res = await db.execute(select(DBFinding).where(DBFinding.analysis_id == inv_id))
    findings = [
        {
            "id": f.id,
            "heuristic_name": f.heuristic_name,
            "subject_type": f.subject_type,
            "subject_id": f.subject_id,
            "score": f.score,
            "confidence": f.confidence,
            "severity": f.severity,
            "explanation": f.explanation,
            "evidence": f.evidence_json,
        }
        for f in findings_res.scalars().all()
    ]

    return {
        "id": inv.id,
        "name": inv.name,
        "description": inv.description,
        "root_subject_type": inv.root_subject_type,
        "root_subject_id": inv.root_subject_id,
        "network": inv.network,
        "snapshot_height": inv.snapshot_height,
        "findings": findings,
    }


@router.get("/{inv_id}/report")
async def generate_report(inv_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(DBInvestigation).where(DBInvestigation.id == inv_id))
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found.")

    findings_res = await db.execute(select(DBFinding).where(DBFinding.analysis_id == inv_id))
    findings = [
        {
            "heuristic_name": f.heuristic_name,
            "score": f.score,
            "confidence": f.confidence,
            "severity": f.severity,
            "explanation": f.explanation,
        }
        for f in findings_res.scalars().all()
    ]

    tx_res = await db.execute(select(Transaction).where(Transaction.txid == inv.root_subject_id))
    txs = [
        {
            "txid": t.txid,
            "block_height": t.block_height,
            "total_output_sats": t.total_output_sats,
            "fee_rate": t.fee_rate,
        }
        for t in tx_res.scalars().all()
    ]

    cluster_res = await db.execute(select(Cluster).limit(5))
    clusters = [
        {
            "name": c.name,
            "cluster_type": c.cluster_type,
            "confidence": c.confidence,
            "description": c.description,
        }
        for c in cluster_res.scalars().all()
    ]

    inv_dict = {
        "id": inv.id,
        "name": inv.name,
        "description": inv.description,
        "root_subject_type": inv.root_subject_type,
        "root_subject_id": inv.root_subject_id,
        "network": inv.network,
        "snapshot_height": inv.snapshot_height,
    }

    html = ForensicReportGenerator.generate_html_report(
        investigation=inv_dict,
        transactions=txs,
        findings=findings,
        clusters=clusters,
    )

    return Response(content=html, media_type="text/html")
