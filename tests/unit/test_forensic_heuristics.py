from packages.domain.schemas import NormalizedTransaction, TransactionInput, TransactionOutput
from packages.forensic.engine import ForensicEngine
from packages.forensic.heuristics import (
    AddressReuseHeuristic,
    BatchPaymentHeuristic,
    ChangeAddressDetectionHeuristic,
    CoinJoinSuspicionHeuristic,
    CommonInputOwnershipHeuristic,
    ConsolidationHeuristic,
    DustHeuristic,
    FanInHeuristic,
    FanOutHeuristic,
    PeelChainHeuristic,
    RoundAmountsHeuristic,
)


def test_common_input_ownership():
    h = CommonInputOwnershipHeuristic()

    # 1 input: should not trigger
    tx_single = NormalizedTransaction(
        txid="tx1",
        inputs=[TransactionInput(address="addr1", value_sats=1000)],
        outputs=[TransactionOutput(index=0, address="addr2", value_sats=900)],
    )
    assert h.analyze(tx_single) is None

    # Multiple distinct input addresses: triggers
    tx_multi = NormalizedTransaction(
        txid="tx2",
        inputs=[
            TransactionInput(address="addr1", value_sats=1000),
            TransactionInput(address="addr2", value_sats=2000),
        ],
        outputs=[TransactionOutput(index=0, address="addr3", value_sats=2900)],
    )
    res = h.analyze(tx_multi)
    assert res is not None
    assert res.name == "common_input_ownership"
    assert res.confidence == "medium"
    assert res.severity == "info"
    assert "probablement" in res.explanation.lower()


def test_change_address_detection():
    h = ChangeAddressDetectionHeuristic()
    tx = NormalizedTransaction(
        txid="tx_change",
        total_output_sats=100_000_000,
        inputs=[TransactionInput(address="addr_in", script_type="p2wpkh", value_sats=100_050_000)],
        outputs=[
            # Payment: 0.8 BTC (round amount)
            TransactionOutput(
                index=0, address="addr_merchant", value_sats=80_000_000, script_type="p2pkh"
            ),
            # Change: 0.2 BTC - 50k sats (unrounded, matches input script_type p2wpkh)
            TransactionOutput(
                index=1, address="addr_change", value_sats=19_950_000, script_type="p2wpkh"
            ),
        ],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "change_address_detection"
    assert res.evidence["candidate_address"] == "addr_change"


def test_address_reuse():
    h = AddressReuseHeuristic()
    # Output reuses input address
    tx = NormalizedTransaction(
        txid="tx_reuse",
        inputs=[TransactionInput(address="addr_reuse", value_sats=5000)],
        outputs=[TransactionOutput(index=0, address="addr_reuse", value_sats=4000)],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "address_reuse"
    assert "addr_reuse" in res.evidence["reused_addresses"]


def test_peel_chain():
    h = PeelChainHeuristic()
    tx = NormalizedTransaction(
        txid="tx_peel",
        total_output_sats=100_000_000,
        inputs=[TransactionInput(address="addr1", value_sats=100_020_000)],
        outputs=[
            # Peeled payment: 5% (5,000,000 sats)
            TransactionOutput(index=0, address="merchant", value_sats=5_000_000),
            # Bulk continuing: 95% (94,980,000 sats)
            TransactionOutput(index=1, address="change", value_sats=94_980_000),
        ],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "peel_chain"
    assert res.evidence["peeled_amount_sats"] == 5_000_000


def test_consolidation():
    h = ConsolidationHeuristic()
    tx = NormalizedTransaction(
        txid="tx_consol",
        inputs=[TransactionInput(address=f"addr{i}", value_sats=10_000) for i in range(5)],
        outputs=[TransactionOutput(index=0, address="cold_storage", value_sats=48_000)],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "consolidation"
    assert res.evidence["input_count"] == 5


def test_fan_in_and_fan_out():
    h_in = FanInHeuristic()
    h_out = FanOutHeuristic()

    # Fan-in: 4 distinct inputs -> 1 output
    tx_in = NormalizedTransaction(
        txid="tx_in",
        inputs=[TransactionInput(address=f"src_{i}", value_sats=1000) for i in range(4)],
        outputs=[TransactionOutput(index=0, address="dest", value_sats=3900)],
    )
    assert h_in.analyze(tx_in) is not None

    # Fan-out: 1 input -> 6 outputs
    tx_out = NormalizedTransaction(
        txid="tx_out",
        inputs=[TransactionInput(address="source", value_sats=10000)],
        outputs=[
            TransactionOutput(index=i, address=f"dest_{i}", value_sats=1500) for i in range(6)
        ],
    )
    assert h_out.analyze(tx_out) is not None


def test_batch_payment():
    h = BatchPaymentHeuristic()
    # 1 input, 6 distinct output amounts
    tx = NormalizedTransaction(
        txid="tx_batch",
        inputs=[TransactionInput(address="exchange", value_sats=100_000)],
        outputs=[
            TransactionOutput(index=i, address=f"user_{i}", value_sats=10_000 + i * 2500)
            for i in range(6)
        ],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "batch_payment"


def test_coinjoin_suspicion():
    h = CoinJoinSuspicionHeuristic()
    # 4 inputs, 3 equal denomination outputs (1,000,000 sats)
    tx = NormalizedTransaction(
        txid="tx_cj",
        inputs=[TransactionInput(address=f"part_{i}", value_sats=1_500_000) for i in range(4)],
        outputs=[
            TransactionOutput(index=0, address="out0", value_sats=1_000_000),
            TransactionOutput(index=1, address="out1", value_sats=1_000_000),
            TransactionOutput(index=2, address="out2", value_sats=1_000_000),
            TransactionOutput(index=3, address="chg", value_sats=400_000),
        ],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "coinjoin_suspicion"
    # AGENTS.md 9.9: Must be called "CoinJoin-like pattern"
    assert "CoinJoin-like pattern" in res.explanation


def test_dust_detection():
    h = DustHeuristic()
    tx = NormalizedTransaction(
        txid="tx_dust",
        inputs=[TransactionInput(address="in", value_sats=10000)],
        outputs=[
            TransactionOutput(index=0, address="dest", value_sats=9000),
            TransactionOutput(index=1, address="dust_target", value_sats=546),
        ],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "dust_detection"


def test_round_amounts():
    h = RoundAmountsHeuristic()
    tx = NormalizedTransaction(
        txid="tx_round",
        inputs=[TransactionInput(address="in", value_sats=200_000_000)],
        outputs=[
            TransactionOutput(index=0, address="dest", value_sats=100_000_000),  # 1 BTC exact
            TransactionOutput(index=1, address="chg", value_sats=99_980_000),
        ],
    )
    res = h.analyze(tx)
    assert res is not None
    assert res.name == "round_amounts"
    assert "contextuel uniquement" in res.explanation


def test_forensic_engine_orchestration():
    engine = ForensicEngine()
    assert len(engine.heuristics) == 12

    # Test disabled heuristic filter
    engine_filtered = ForensicEngine(disabled_heuristics=["dust_detection", "round_amounts"])
    assert "dust_detection" not in engine_filtered.heuristics
    assert len(engine_filtered.heuristics) == 10
