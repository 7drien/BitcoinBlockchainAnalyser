from datetime import UTC, datetime

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.indexer.external_api import ExternalBitcoinProvider
from apps.indexer.transaction_parser import TransactionParser
from packages.common.units import detect_script_type
from packages.domain.models import Address, Block, HeuristicFinding, Input, Output, Transaction
from packages.domain.schemas import NormalizedTransaction, TransactionInput, TransactionOutput
from packages.forensic.engine import ForensicEngine

logger = structlog.get_logger()


class LiveSyncService:
    """
    On-demand live synchronization service for real Bitcoin blockchain data.
    Fetches real transactions, addresses, and blocks from on-chain provider (mempool.space),
    indexes them into the local PostgreSQL database, and executes forensic heuristics.
    """

    def __init__(self):
        self.provider = ExternalBitcoinProvider()
        self.forensic_engine = ForensicEngine()

    async def sync_transaction(
        self, session: AsyncSession, txid: str
    ) -> NormalizedTransaction | None:
        """
        Synchronizes a transaction: checks DB first; if absent, fetches from on-chain,
        normalizes, stores in PostgreSQL, executes forensic heuristics, and returns it.
        """
        # 1. Check if already in PostgreSQL
        existing_tx = await self._get_normalized_from_db(session, txid)
        if existing_tx:
            return existing_tx

        # 2. Fetch live from external on-chain provider
        if not self.provider.enabled:
            logger.info("live_sync_disabled", reason="external provider not enabled")
            return None

        try:
            logger.info("fetching_live_transaction", txid=txid)
            raw_tx = await self.provider.get_transaction(txid)
            norm_tx = TransactionParser.parse_mempool_transaction(raw_tx)
        except Exception as e:
            logger.warning("live_tx_fetch_failed", txid=txid, error=str(e))
            return None

        # 3. Persist transaction, inputs, outputs, block, and addresses
        await self._persist_transaction(session, norm_tx)

        # 4. Run forensic analysis and store findings
        await self._run_and_store_forensics(session, norm_tx)

        await session.commit()
        return norm_tx

    async def sync_address(
        self, session: AsyncSession, address: str
    ) -> tuple[Address | None, list[NormalizedTransaction]]:
        """
        Synchronizes an address: fetches on-chain balance, transaction history,
        indexes recent transactions, updates local balances, and returns the models.
        """
        if not self.provider.enabled:
            return None, []

        # Check if address was already indexed and is fresh (within 5 minutes)
        addr_stmt = select(Address).where(Address.address == address)
        addr_res = await session.execute(addr_stmt)
        addr_model = addr_res.scalars().first()
        if addr_model and addr_model.last_seen_at:
            age = (datetime.now(UTC) - addr_model.last_seen_at).total_seconds()
            if age < 300:
                return addr_model, []

        try:
            logger.info("fetching_live_address", address=address)
            addr_info = await self.provider.get_address(address)
            raw_txs = await self.provider.get_address_transactions(address)
        except Exception as e:
            logger.warning("live_address_fetch_failed", address=address, error=str(e))
            return None, []

        # 1. Index each transaction returned for the address
        synced_txs: list[NormalizedTransaction] = []
        for raw_tx in raw_txs[:50]:  # Index top 50 recent on-chain transactions
            try:
                norm_tx = TransactionParser.parse_mempool_transaction(raw_tx)
                await self._persist_transaction(session, norm_tx)
                await self._run_and_store_forensics(session, norm_tx)
                synced_txs.append(norm_tx)
            except Exception as e:
                logger.error("error_indexing_address_tx", txid=raw_tx.get("txid"), error=str(e))

        # 2. Upsert Address record with authoritative chain stats
        chain_stats = addr_info.get("chain_stats", {})
        mempool_stats = addr_info.get("mempool_stats", {})

        funded_sats = chain_stats.get("funded_txo_sum", 0) + mempool_stats.get("funded_txo_sum", 0)
        spent_sats = chain_stats.get("spent_txo_sum", 0) + mempool_stats.get("spent_txo_sum", 0)
        curr_balance = max(0, funded_sats - spent_sats)
        tx_count = chain_stats.get("tx_count", 0) + mempool_stats.get("tx_count", 0)

        # Detect address type (p2wpkh, p2tr, p2pkh, etc.)
        script_type = detect_script_type("", address)

        addr_stmt = select(Address).where(Address.address == address)
        addr_res = await session.execute(addr_stmt)
        addr_model = addr_res.scalars().first()

        now = datetime.now(UTC)
        if addr_model:
            addr_model.current_balance_sats = curr_balance
            addr_model.total_received_sats = funded_sats
            addr_model.total_spent_sats = spent_sats
            addr_model.transaction_count = max(addr_model.transaction_count, tx_count)
            addr_model.last_seen_at = now
        else:
            addr_model = Address(
                address=address,
                network="mainnet",
                address_type=script_type,
                first_seen_at=now,
                last_seen_at=now,
                transaction_count=tx_count,
                total_received_sats=funded_sats,
                total_spent_sats=spent_sats,
                current_balance_sats=curr_balance,
            )
            session.add(addr_model)

        await session.commit()
        return addr_model, synced_txs

    async def _get_normalized_from_db(
        self, session: AsyncSession, txid: str
    ) -> NormalizedTransaction | None:
        """Loads and returns a NormalizedTransaction from local DB if it exists."""
        tx_stmt = select(Transaction).where(Transaction.txid == txid)
        tx_res = await session.execute(tx_stmt)
        tx = tx_res.scalars().first()
        if not tx:
            return None

        in_res = await session.execute(select(Input).where(Input.transaction_id == tx.id))
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

        out_res = await session.execute(select(Output).where(Output.transaction_id == tx.id))
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

        return NormalizedTransaction(
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

    async def _persist_transaction(
        self, session: AsyncSession, norm_tx: NormalizedTransaction
    ) -> Transaction:
        """Persists block (if needed), transaction, inputs, and outputs."""
        # 1. Ensure Block exists
        height = norm_tx.block_height
        block_stmt = select(Block).where(Block.height == height)
        b_res = await session.execute(block_stmt)
        block = b_res.scalars().first()

        if not block:
            block_hash = (
                norm_tx.block_hash
                if (norm_tx.block_hash and len(norm_tx.block_hash) == 64)
                else f"0000000000000000{height:016x}00000000000000000000000000000000"[:64]
            )
            b_hash_check = await session.execute(select(Block).where(Block.hash == block_hash))
            existing_hash = b_hash_check.scalars().first()

            if existing_hash:
                block = existing_hash
            else:
                block = Block(
                    height=height,
                    hash=block_hash,
                    previous_hash=None,
                    timestamp=norm_tx.block_time or int(datetime.now(UTC).timestamp()),
                    median_time=norm_tx.block_time or int(datetime.now(UTC).timestamp()),
                    transaction_count=1,
                    size=norm_tx.size,
                    weight=norm_tx.weight,
                )
                session.add(block)
                await session.flush()

        # 2. Check if Transaction already exists
        tx_stmt = select(Transaction).where(Transaction.txid == norm_tx.txid)
        t_res = await session.execute(tx_stmt)
        tx = t_res.scalars().first()

        if tx:
            return tx

        now = datetime.now(UTC)
        tx = Transaction(
            txid=norm_tx.txid,
            block_id=block.id,
            block_height=norm_tx.block_height,
            block_hash=norm_tx.block_hash or block.hash,
            block_time=norm_tx.block_time or int(now.timestamp()),
            confirmed=norm_tx.confirmed,
            size=norm_tx.size,
            vsize=norm_tx.vsize,
            weight=norm_tx.weight,
            version=2,
            locktime=0,
            input_count=len(norm_tx.inputs),
            output_count=len(norm_tx.outputs),
            total_input_sats=norm_tx.total_input_sats,
            total_output_sats=norm_tx.total_output_sats,
            fee_sats=norm_tx.fee_sats,
            fee_rate=norm_tx.fee_rate,
            raw_transaction_hash=norm_tx.txid,
            first_seen_at=now,
        )
        session.add(tx)
        await session.flush()

        # 3. Add Inputs
        for inp in norm_tx.inputs:
            session.add(
                Input(
                    transaction_id=tx.id,
                    previous_txid=inp.txid,
                    previous_output_index=inp.vout,
                    previous_value_sats=inp.value_sats,
                    previous_address=inp.address,
                    sequence=inp.sequence or 4294967295,
                    is_coinbase=inp.is_coinbase,
                )
            )

        # 4. Add Outputs
        for out in norm_tx.outputs:
            session.add(
                Output(
                    transaction_id=tx.id,
                    output_index=out.index,
                    value_sats=out.value_sats,
                    script_pubkey=out.script_pubkey or "",
                    address=out.address,
                    script_type=out.script_type or "p2wpkh",
                    spent=out.spent,
                )
            )

        # 5. Aggregate and touch addresses (deduplicated per transaction)
        address_deltas: dict[str, dict[str, int]] = {}
        for inp in norm_tx.inputs:
            if inp.address and inp.address != "Coinbase Reward":
                if inp.address not in address_deltas:
                    address_deltas[inp.address] = {"received": 0, "spent": 0}
                address_deltas[inp.address]["spent"] += inp.value_sats

        for out in norm_tx.outputs:
            if out.address:
                if out.address not in address_deltas:
                    address_deltas[out.address] = {"received": 0, "spent": 0}
                address_deltas[out.address]["received"] += out.value_sats

        for addr_str, deltas in address_deltas.items():
            await self._touch_address(
                session,
                addr_str,
                received_delta=deltas["received"],
                spent_delta=deltas["spent"],
            )

        await session.flush()
        return tx

    async def _touch_address(
        self,
        session: AsyncSession,
        address: str,
        received_delta: int = 0,
        spent_delta: int = 0,
    ) -> None:
        """Touches or creates an Address record to maintain accurate balances."""
        stmt = select(Address).where(Address.address == address)
        res = await session.execute(stmt)
        addr = res.scalars().first()
        now = datetime.now(UTC)

        if addr:
            addr.total_received_sats += received_delta
            addr.total_spent_sats += spent_delta
            addr.current_balance_sats = max(0, addr.total_received_sats - addr.total_spent_sats)
            addr.transaction_count += 1
            addr.last_seen_at = now
        else:
            script_type = detect_script_type("", address)
            addr = Address(
                address=address,
                network="mainnet",
                address_type=script_type,
                first_seen_at=now,
                last_seen_at=now,
                transaction_count=1,
                total_received_sats=received_delta,
                total_spent_sats=spent_delta,
                current_balance_sats=max(0, received_delta - spent_delta),
            )
            session.add(addr)
        await session.flush()

    async def _run_and_store_forensics(
        self, session: AsyncSession, norm_tx: NormalizedTransaction
    ) -> None:
        """Executes ForensicEngine heuristics and stores findings in heuristic_findings table."""
        findings = self.forensic_engine.analyze_transaction(norm_tx)
        if not findings:
            return

        # Delete previous findings for this transaction to avoid duplicates
        await session.execute(
            delete(HeuristicFinding).where(HeuristicFinding.subject_id == norm_tx.txid)
        )

        for f in findings:
            session.add(
                HeuristicFinding(
                    analysis_id=1,  # Default global investigation ID
                    heuristic_name=f.name,
                    subject_type="transaction",
                    subject_id=norm_tx.txid,
                    score=f.score,
                    confidence=f.confidence,
                    severity=f.severity,
                    explanation=f.explanation,
                    evidence_json=f.evidence,
                )
            )

    async def get_parent_transactions(
        self, session: AsyncSession, norm_tx: NormalizedTransaction, limit: int = 10
    ) -> list[NormalizedTransaction]:
        """Fetches the parent transactions that funded the inputs of this transaction (Upstream flow)."""
        parents: list[NormalizedTransaction] = []
        seen_txids: set[str] = set()
        for inp in norm_tx.inputs[:limit]:
            if inp.txid and not inp.is_coinbase and len(inp.txid) == 64 and inp.txid not in seen_txids:
                seen_txids.add(inp.txid)
                parent_tx = await self.sync_transaction(session, inp.txid)
                if parent_tx:
                    parents.append(parent_tx)
        return parents

    async def get_child_transactions(
        self, session: AsyncSession, norm_tx: NormalizedTransaction, limit: int = 10
    ) -> list[NormalizedTransaction]:
        """Fetches subsequent transactions that spent the outputs of this transaction (Downstream flow)."""
        children: list[NormalizedTransaction] = []
        seen_txids: set[str] = set()
        for out in norm_tx.outputs[:limit]:
            # 1. Check local DB if an input spent this output
            in_stmt = select(Input).where(
                Input.previous_txid == norm_tx.txid,
                Input.previous_output_index == out.index,
            )
            in_res = await session.execute(in_stmt)
            inp_row = in_res.scalars().first()
            if inp_row:
                tx_stmt = select(Transaction).where(Transaction.id == inp_row.transaction_id)
                t_res = await session.execute(tx_stmt)
                child_t = t_res.scalars().first()
                if child_t and child_t.txid not in seen_txids:
                    seen_txids.add(child_t.txid)
                    child_norm = await self._get_normalized_from_db(session, child_t.txid)
                    if child_norm:
                        children.append(child_norm)
                        continue

            # 2. If not found in DB, check on-chain provider for spend status
            if self.provider.enabled:
                try:
                    outspend = await self.provider.get_outspend(norm_tx.txid, out.index)
                    if outspend.get("spent") and outspend.get("txid"):
                        spending_txid = outspend["txid"]
                        if spending_txid not in seen_txids:
                            seen_txids.add(spending_txid)
                            child_norm = await self.sync_transaction(session, spending_txid)
                            if child_norm:
                                children.append(child_norm)
                except Exception:
                    pass
        return children

