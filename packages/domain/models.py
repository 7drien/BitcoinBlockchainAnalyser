from datetime import datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(AsyncAttrs, DeclarativeBase):
    pass


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    height: Mapped[int] = mapped_column(index=True, unique=True)
    hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[int] = mapped_column(index=True)
    median_time: Mapped[int] = mapped_column()
    transaction_count: Mapped[int] = mapped_column()
    size: Mapped[int] = mapped_column()
    weight: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    txid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    block_id: Mapped[int] = mapped_column(ForeignKey("blocks.id"), index=True)
    block_height: Mapped[int] = mapped_column(index=True)
    block_hash: Mapped[str] = mapped_column(String(64))
    block_time: Mapped[int] = mapped_column(index=True)
    confirmed: Mapped[bool] = mapped_column(default=True)
    size: Mapped[int] = mapped_column()
    vsize: Mapped[int] = mapped_column(index=True)
    weight: Mapped[int] = mapped_column(index=True)
    version: Mapped[int] = mapped_column()
    locktime: Mapped[int] = mapped_column()
    input_count: Mapped[int] = mapped_column(index=True)
    output_count: Mapped[int] = mapped_column(index=True)
    total_input_sats: Mapped[int] = mapped_column(BigInteger)
    total_output_sats: Mapped[int] = mapped_column(BigInteger, index=True)
    fee_sats: Mapped[int] = mapped_column(BigInteger, index=True)
    fee_rate: Mapped[float] = mapped_column(Float, index=True)
    raw_transaction_hash: Mapped[str] = mapped_column(String(64))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    indexed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Input(Base):
    __tablename__ = "inputs"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), index=True)
    previous_txid: Mapped[str] = mapped_column(String(64), index=True, nullable=True)
    previous_output_index: Mapped[int] = mapped_column(nullable=True)
    previous_value_sats: Mapped[int] = mapped_column(BigInteger, nullable=True)
    previous_script_pubkey: Mapped[str] = mapped_column(Text, nullable=True)
    previous_address: Mapped[str] = mapped_column(String(255), index=True, nullable=True)
    sequence: Mapped[int] = mapped_column(BigInteger)
    is_coinbase: Mapped[bool] = mapped_column(default=False)


class Output(Base):
    __tablename__ = "outputs"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), index=True)
    output_index: Mapped[int] = mapped_column()
    value_sats: Mapped[int] = mapped_column(BigInteger)
    script_pubkey: Mapped[str] = mapped_column(Text)
    address: Mapped[str] = mapped_column(String(255), index=True, nullable=True)
    script_type: Mapped[str] = mapped_column(String(50), nullable=True)
    spent: Mapped[bool] = mapped_column(default=False, index=True)
    spent_by_txid: Mapped[str] = mapped_column(String(64), nullable=True, index=True)
    spent_by_input_index: Mapped[int] = mapped_column(nullable=True)


class Address(Base):
    __tablename__ = "addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    address: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    network: Mapped[str] = mapped_column(String(20))
    address_type: Mapped[str] = mapped_column(String(50))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    transaction_count: Mapped[int] = mapped_column(default=0)
    total_received_sats: Mapped[int] = mapped_column(BigInteger, default=0)
    total_spent_sats: Mapped[int] = mapped_column(BigInteger, default=0)
    current_balance_sats: Mapped[int] = mapped_column(BigInteger, default=0)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"), index=True, nullable=True)


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    cluster_type: Mapped[str] = mapped_column(String(50))
    confidence: Mapped[str] = mapped_column(String(20))
    created_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )


class HeuristicFinding(Base):
    __tablename__ = "heuristic_findings"

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(index=True)
    heuristic_name: Mapped[str] = mapped_column(String(100), index=True)
    subject_type: Mapped[str] = mapped_column(String(50))
    subject_id: Mapped[str] = mapped_column(String(100), index=True)
    score: Mapped[float] = mapped_column(Float)
    confidence: Mapped[str] = mapped_column(String(20))
    severity: Mapped[str] = mapped_column(String(20))
    explanation: Mapped[str] = mapped_column(Text)
    evidence_json: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    root_subject_type: Mapped[str] = mapped_column(String(50))
    root_subject_id: Mapped[str] = mapped_column(String(100))
    network: Mapped[str] = mapped_column(String(20))
    snapshot_height: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True
    )
