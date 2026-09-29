from packages.domain.schemas import NormalizedTransaction, TransactionInput, TransactionOutput
from packages.graph.builder import GraphBuilder


def test_build_address_graph():
    tx = NormalizedTransaction(
        txid="tx_test_graph",
        inputs=[
            TransactionInput(address="bc1qsender1111", value_sats=50_000_000),
            TransactionInput(address="bc1qsender2222", value_sats=50_000_000),
        ],
        outputs=[
            TransactionOutput(index=0, address="bc1qreceiver1111", value_sats=80_000_000),
            TransactionOutput(index=1, address="bc1qchange1111", value_sats=19_990_000),
        ],
        fee_sats=10_000,
        total_output_sats=99_990_000,
    )

    graph = GraphBuilder.build_address_graph([tx], center_address="bc1qsender1111")
    assert len(graph.nodes) == 4
    assert len(graph.edges) == 4  # 2 inputs x 2 outputs

    # Check node properties
    sender_node = next(n for n in graph.nodes if n.data["id"] == "bc1qsender1111")
    assert sender_node.data["is_center"] is True
    assert sender_node.data["type"] == "address"


def test_build_utxo_graph():
    tx = NormalizedTransaction(
        txid="tx_utxo_test",
        inputs=[TransactionInput(txid="prev_tx", vout=0, value_sats=100_000_000)],
        outputs=[
            TransactionOutput(index=0, address="bc1qdest", value_sats=90_000_000),
            TransactionOutput(index=1, address="bc1qchg", value_sats=9_990_000),
        ],
        fee_sats=10_000,
    )

    graph = GraphBuilder.build_utxo_graph([tx], center_txid="tx_utxo_test")
    # 1 TX node + 2 output UTXO nodes + 1 input UTXO node = 4 nodes
    assert len(graph.nodes) == 4
    tx_node = next(n for n in graph.nodes if n.data["type"] == "transaction")
    assert tx_node.data["is_center"] is True
    # 1 spends edge + 2 creates edges = 3 edges
    assert len(graph.edges) == 3
