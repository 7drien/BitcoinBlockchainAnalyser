from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TransactionInput(BaseModel):
    txid: str | None = None
    vout: int | None = None
    address: str | None = None
    value_sats: int = 0
    script_type: str | None = None
    sequence: int | None = None
    is_coinbase: bool = False


class TransactionOutput(BaseModel):
    index: int
    address: str | None = None
    value_sats: int = 0
    script_type: str | None = None
    script_pubkey: str | None = None
    spent: bool = False


class NormalizedTransaction(BaseModel):
    txid: str
    block_height: int | None = None
    block_hash: str | None = None
    block_time: int | None = None
    confirmed: bool = True
    size: int = 0
    vsize: int = 0
    weight: int = 0
    fee_sats: int = 0
    fee_rate: float = 0.0
    total_input_sats: int = 0
    total_output_sats: int = 0
    inputs: list[TransactionInput] = Field(default_factory=list)
    outputs: list[TransactionOutput] = Field(default_factory=list)


class HeuristicFinding(BaseModel):
    name: str
    score: float = Field(ge=0, le=100)  # 0 to 100
    confidence: Literal["low", "medium", "high"]
    severity: Literal["info", "warning", "critical"]
    explanation: str
    evidence: dict[str, Any] = Field(default_factory=dict)


class GraphNodeData(BaseModel):
    id: str
    label: str
    type: Literal["transaction", "address", "utxo", "cluster"]
    value_sats: int | None = None
    confirmed: bool | None = None
    cluster_id: str | None = None
    heuristic_count: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphEdgeData(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None
    amount_sats: int = 0
    type: str = "transfer"
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphElement(BaseModel):
    data: dict[str, Any]


class GraphData(BaseModel):
    nodes: list[GraphElement] = Field(default_factory=list)
    edges: list[GraphElement] = Field(default_factory=list)


class Investigation(BaseModel):
    id: str
    name: str
    description: str | None = None
    root_subject_type: str = "transaction"
    root_subject_id: str
    network: str = "mainnet"
    snapshot_height: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
