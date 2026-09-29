import asyncio
from datetime import UTC, datetime

import structlog
from sqlalchemy import select

from packages.domain.database import async_session_factory
from packages.domain.models import (
    Address,
    Block,
    Cluster,
    HeuristicFinding,
    Input,
    Investigation,
    Output,
    Transaction,
)
from packages.domain.schemas import NormalizedTransaction, TransactionInput, TransactionOutput
from packages.forensic.engine import ForensicEngine

logger = structlog.get_logger()


async def seed_database():
    """Seed PostgreSQL with realistic Bitcoin forensic scenarios."""
    async with async_session_factory() as session:
        # Check if already seeded
        existing = await session.execute(select(Block).limit(1))
        if existing.scalars().first() is not None:
            logger.info(
                "database_already_seeded", message="Database contains blocks, skipping seed."
            )
            return

        logger.info(
            "seeding_database", message="Inserting high-fidelity forensic blockchain fixtures..."
        )

        # 1. Blocks
        b0 = Block(
            height=0,
            hash="000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
            previous_hash=None,
            timestamp=1231006505,
            median_time=1231006505,
            transaction_count=1,
            size=285,
            weight=1140,
        )
        b170 = Block(
            height=170,
            hash="00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee",
            previous_hash="000000002a22c717004d745e278b5600a92c57d91f2f1a65d784d5d214ced2e0",
            timestamp=1231731025,
            median_time=1231730000,
            transaction_count=2,
            size=490,
            weight=1960,
        )
        b_forensic1 = Block(
            height=850001,
            hash="00000000000000000001a1b2c3d4e5f67890abcdef1234567890abcdef123456",
            previous_hash="00000000000000000001a1b2c3d4e5f67890abcdef1234567890abcdef123455",
            timestamp=1720000000,
            median_time=1719999000,
            transaction_count=4,
            size=154000,
            weight=616000,
        )
        session.add_all([b0, b170, b_forensic1])
        await session.flush()

        # 2. Clusters
        cluster_exchange = Cluster(
            name="Alpha Exchange Hot Wallet Cluster",
            description="High volume commercial liquidity provider with automated batch outputs.",
            cluster_type="exchange",
            confidence="high",
            created_by="analyst",
        )
        cluster_mixer = Cluster(
            name="Suspected Mixer Liquidity Pool",
            description="Equal-denomination CoinJoin collaborative transaction hub.",
            cluster_type="mixer",
            confidence="medium",
            created_by="system_forensic",
        )
        session.add_all([cluster_exchange, cluster_mixer])
        await session.flush()

        # 3. Addresses
        addr_satoshi = Address(
            address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            network="mainnet",
            address_type="p2pkh",
            first_seen_at=datetime.fromtimestamp(1231006505, UTC),
            last_seen_at=datetime.fromtimestamp(1231006505, UTC),
            transaction_count=1,
            total_received_sats=5_000_000_000,
            total_spent_sats=0,
            current_balance_sats=5_000_000_000,
        )
        addr_hal = Address(
            address="1Q2TWHE3GMdB6BZKafqS7KjWgY58Y3UAAA",
            network="mainnet",
            address_type="p2pkh",
            first_seen_at=datetime.fromtimestamp(1231731025, UTC),
            last_seen_at=datetime.fromtimestamp(1231731025, UTC),
            transaction_count=1,
            total_received_sats=1_000_000_000,
            total_spent_sats=0,
            current_balance_sats=1_000_000_000,
        )
        addr_peel_src = Address(
            address="bc1q8x9y7z2a3b4c5d6e7f8g9h0j1k2l3m4n5o6p7q",
            network="mainnet",
            address_type="p2wpkh",
            first_seen_at=datetime.fromtimestamp(1720000000, UTC),
            last_seen_at=datetime.fromtimestamp(1720000000, UTC),
            transaction_count=1,
            total_received_sats=500_000_000,
            total_spent_sats=500_000_000,
            current_balance_sats=0,
        )
        addr_peel_step1 = Address(
            address="bc1qpeelchange000011112222333344445555666677",
            network="mainnet",
            address_type="p2wpkh",
            first_seen_at=datetime.fromtimestamp(1720000000, UTC),
            last_seen_at=datetime.fromtimestamp(1720000000, UTC),
            transaction_count=2,
            total_received_sats=480_000_000,
            total_spent_sats=480_000_000,
            current_balance_sats=0,
        )
        addr_peel_dest1 = Address(
            address="bc1qmerchantpay00011122233344455566677788899",
            network="mainnet",
            address_type="p2wpkh",
            first_seen_at=datetime.fromtimestamp(1720000000, UTC),
            last_seen_at=datetime.fromtimestamp(1720000000, UTC),
            transaction_count=1,
            total_received_sats=19_980_000,
            total_spent_sats=0,
            current_balance_sats=19_980_000,
        )
        addr_batch_exchange = Address(
            address="bc1qexchangebatchhotwallet999888777666555444",
            network="mainnet",
            address_type="p2wpkh",
            first_seen_at=datetime.fromtimestamp(1720000000, UTC),
            last_seen_at=datetime.fromtimestamp(1720000000, UTC),
            transaction_count=1,
            total_received_sats=1_000_000_000,
            total_spent_sats=1_000_000_000,
            current_balance_sats=0,
            cluster_id=cluster_exchange.id,
        )
        session.add_all(
            [
                addr_satoshi,
                addr_hal,
                addr_peel_src,
                addr_peel_step1,
                addr_peel_dest1,
                addr_batch_exchange,
            ]
        )
        await session.flush()

        # 4. Transactions
        # Tx Genesis
        tx_genesis = Transaction(
            txid="4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
            block_id=b0.id,
            block_height=0,
            block_hash=b0.hash,
            block_time=1231006505,
            confirmed=True,
            size=204,
            vsize=204,
            weight=816,
            version=1,
            locktime=0,
            input_count=1,
            output_count=1,
            total_input_sats=0,
            total_output_sats=5_000_000_000,
            fee_sats=0,
            fee_rate=0.0,
            raw_transaction_hash="4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
        )
        session.add(tx_genesis)
        await session.flush()

        in_gen = Input(
            transaction_id=tx_genesis.id,
            sequence=4294967295,
            is_coinbase=True,
            previous_value_sats=0,
            previous_address="Coinbase Reward",
        )
        out_gen = Output(
            transaction_id=tx_genesis.id,
            output_index=0,
            value_sats=5_000_000_000,
            script_pubkey="4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
            address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            script_type="p2pkh",
            spent=False,
        )
        session.add_all([in_gen, out_gen])

        # Tx Peel Chain Scenario
        tx_peel = Transaction(
            txid="a100000000000000000000000000000000000000000000000000000000000001",
            block_id=b_forensic1.id,
            block_height=850001,
            block_hash=b_forensic1.hash,
            block_time=1720000000,
            confirmed=True,
            size=220,
            vsize=142,
            weight=568,
            version=2,
            locktime=0,
            input_count=1,
            output_count=2,
            total_input_sats=500_000_000,
            total_output_sats=499_980_000,
            fee_sats=20_000,
            fee_rate=140.85,
            raw_transaction_hash="a100000000000000000000000000000000000000000000000000000000000001",
        )
        session.add(tx_peel)
        await session.flush()

        in_peel = Input(
            transaction_id=tx_peel.id,
            previous_txid="0000000000000000000000000000000000000000000000000000000000000000",
            previous_output_index=0,
            previous_value_sats=500_000_000,
            previous_address=addr_peel_src.address,
            sequence=4294967295,
            is_coinbase=False,
        )
        out_peel_change = Output(
            transaction_id=tx_peel.id,
            output_index=0,
            value_sats=480_000_000,
            script_pubkey="0014peelchange000011112222333344445555666677",
            address=addr_peel_step1.address,
            script_type="p2wpkh",
            spent=False,
        )
        out_peel_payment = Output(
            transaction_id=tx_peel.id,
            output_index=1,
            value_sats=19_980_000,
            script_pubkey="0014merchantpay00011122233344455566677788899",
            address=addr_peel_dest1.address,
            script_type="p2wpkh",
            spent=False,
        )
        session.add_all([in_peel, out_peel_change, out_peel_payment])

        # Tx CoinJoin-Like Pattern Scenario
        tx_cj = Transaction(
            txid="c200000000000000000000000000000000000000000000000000000000000002",
            block_id=b_forensic1.id,
            block_height=850001,
            block_hash=b_forensic1.hash,
            block_time=1720000000,
            confirmed=True,
            size=680,
            vsize=380,
            weight=1520,
            version=2,
            locktime=0,
            input_count=4,
            output_count=6,
            total_input_sats=45_000_000,
            total_output_sats=44_950_000,
            fee_sats=50_000,
            fee_rate=131.58,
            raw_transaction_hash="c200000000000000000000000000000000000000000000000000000000000002",
        )
        session.add(tx_cj)
        await session.flush()

        cj_inputs = [
            Input(
                transaction_id=tx_cj.id,
                previous_value_sats=12_000_000,
                previous_address=f"bc1qparticipant000{i}aaaabbbbccccddddeeee",
                sequence=4294967295,
            )
            for i in range(1, 5)
        ]
        # 3 identical denomination outputs (10,000,000 sats = 0.1 BTC)
        cj_outputs = [
            Output(
                transaction_id=tx_cj.id,
                output_index=0,
                value_sats=10_000_000,
                script_pubkey="0014mixdest00112233445566778899aabbccddeeff",
                address="bc1qmixdest00112233445566778899aabbccddeeff",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_cj.id,
                output_index=1,
                value_sats=10_000_000,
                script_pubkey="0014mixdest002233445566778899aabbccddeeff",
                address="bc1qmixdest002233445566778899aabbccddeeff",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_cj.id,
                output_index=2,
                value_sats=10_000_000,
                script_pubkey="0014mixdest0033445566778899aabbccddeeff",
                address="bc1qmixdest0033445566778899aabbccddeeff",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_cj.id,
                output_index=3,
                value_sats=4_950_000,
                script_pubkey="0014change00112233445566778899aabbccddeeff",
                address="bc1qchange00112233445566778899aabbccddeeff",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_cj.id,
                output_index=4,
                value_sats=546,
                script_pubkey="0014dusttag00112233445566778899aabbccddeeff",
                address="bc1qdusttag00112233445566778899aabbccddeeff",
                script_type="p2wpkh",
            ),
        ]
        session.add_all([*cj_inputs, *cj_outputs])

        # Tx Batch Payout Scenario
        tx_batch = Transaction(
            txid="d300000000000000000000000000000000000000000000000000000000000003",
            block_id=b_forensic1.id,
            block_height=850001,
            block_hash=b_forensic1.hash,
            block_time=1720000000,
            confirmed=True,
            size=720,
            vsize=420,
            weight=1680,
            version=2,
            locktime=0,
            input_count=1,
            output_count=6,
            total_input_sats=100_000_000,
            total_output_sats=99_960_000,
            fee_sats=40_000,
            fee_rate=95.24,
            raw_transaction_hash="d300000000000000000000000000000000000000000000000000000000000003",
        )
        session.add(tx_batch)
        await session.flush()

        batch_in = Input(
            transaction_id=tx_batch.id,
            previous_value_sats=100_000_000,
            previous_address=addr_batch_exchange.address,
            sequence=4294967295,
        )
        batch_outs = [
            Output(
                transaction_id=tx_batch.id,
                output_index=0,
                value_sats=15_230_000,
                script_pubkey="0014userwithdrawal01aaaabbbbccccddddeeee",
                address="bc1quserwithdrawal01aaaabbbbccccddddeeee",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_batch.id,
                output_index=1,
                value_sats=22_850_000,
                script_pubkey="0014userwithdrawal02aaaabbbbccccddddeeee",
                address="bc1quserwithdrawal02aaaabbbbccccddddeeee",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_batch.id,
                output_index=2,
                value_sats=8_120_000,
                script_pubkey="0014userwithdrawal03aaaabbbbccccddddeeee",
                address="bc1quserwithdrawal03aaaabbbbccccddddeeee",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_batch.id,
                output_index=3,
                value_sats=31_500_000,
                script_pubkey="0014userwithdrawal04aaaabbbbccccddddeeee",
                address="bc1quserwithdrawal04aaaabbbbccccddddeeee",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_batch.id,
                output_index=4,
                value_sats=12_260_000,
                script_pubkey="0014userwithdrawal05aaaabbbbccccddddeeee",
                address="bc1quserwithdrawal05aaaabbbbccccddddeeee",
                script_type="p2wpkh",
            ),
            Output(
                transaction_id=tx_batch.id,
                output_index=5,
                value_sats=10_000_000,
                script_pubkey="0014userwithdrawal06aaaabbbbccccddddeeee",
                address="bc1quserwithdrawal06aaaabbbbccccddddeeee",
                script_type="p2wpkh",
            ),
        ]
        session.add_all([batch_in, *batch_outs])
        await session.flush()

        # 5. Default Investigation
        inv = Investigation(
            name="Operation DarkStream #204",
            description="Forensic investigation into unhosted wallet peel chain and collaborative CoinJoin hops.",
            root_subject_type="transaction",
            root_subject_id=tx_peel.txid,
            network="mainnet",
            snapshot_height=850001,
        )
        session.add(inv)
        await session.flush()

        # Run heuristics and save findings
        engine = ForensicEngine()
        norm_tx_peel = NormalizedTransaction(
            txid=tx_peel.txid,
            total_input_sats=tx_peel.total_input_sats,
            total_output_sats=tx_peel.total_output_sats,
            inputs=[
                TransactionInput(
                    address=in_peel.previous_address,
                    value_sats=in_peel.previous_value_sats,
                    script_type="p2wpkh",
                )
            ],
            outputs=[
                TransactionOutput(
                    index=0,
                    address=out_peel_change.address,
                    value_sats=out_peel_change.value_sats,
                    script_type="p2wpkh",
                ),
                TransactionOutput(
                    index=1,
                    address=out_peel_payment.address,
                    value_sats=out_peel_payment.value_sats,
                    script_type="p2wpkh",
                ),
            ],
        )
        findings = engine.analyze_transaction(norm_tx_peel)
        for f in findings:
            session.add(
                HeuristicFinding(
                    analysis_id=inv.id,
                    heuristic_name=f.name,
                    subject_type="transaction",
                    subject_id=tx_peel.txid,
                    score=f.score,
                    confidence=f.confidence,
                    severity=f.severity,
                    explanation=f.explanation,
                    evidence_json=f.evidence,
                )
            )

        await session.commit()
        logger.info("seeding_completed", message="Successfully seeded forensic database.")


if __name__ == "__main__":
    asyncio.run(seed_database())
