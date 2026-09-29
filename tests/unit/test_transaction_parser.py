from apps.indexer.transaction_parser import TransactionParser


def test_parse_coinbase_transaction():
    raw_tx = {
        "txid": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
        "size": 204,
        "vsize": 204,
        "weight": 816,
        "version": 1,
        "locktime": 0,
        "vin": [{"coinbase": "04ffff001d0104", "sequence": 4294967295}],
        "vout": [
            {
                "value": 50.0,
                "n": 0,
                "scriptPubKey": {
                    "hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
                    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                    "type": "pubkey",
                },
            }
        ],
    }

    norm = TransactionParser.parse_rpc_transaction(raw_tx, block_height=0, block_time=1231006505)
    assert norm.txid == raw_tx["txid"]
    assert norm.block_height == 0
    assert len(norm.inputs) == 1
    assert norm.inputs[0].is_coinbase is True
    assert norm.total_output_sats == 5_000_000_000
    assert norm.fee_sats == 0
    assert norm.fee_rate == 0.0


def test_parse_standard_payment_transaction():
    raw_tx = {
        "txid": "feedface00000000000000000000000000000000000000000000000000000001",
        "size": 220,
        "vsize": 140,
        "weight": 560,
        "vin": [
            {
                "txid": "prev000000000000000000000000000000000000000000000000000000000000",
                "vout": 0,
                "sequence": 4294967295,
                "prevout": {
                    "value": 1.0,
                    "scriptPubKey": {
                        "address": "bc1qsource00001111222233334444555566667777",
                        "hex": "0014source",
                        "type": "witness_v0_keyhash",
                    },
                },
            }
        ],
        "vout": [
            {
                "value": 0.8,
                "n": 0,
                "scriptPubKey": {
                    "address": "bc1qdest00001111222233334444555566667777",
                    "hex": "0014dest",
                    "type": "witness_v0_keyhash",
                },
            },
            {
                "value": 0.1999,
                "n": 1,
                "scriptPubKey": {
                    "address": "bc1qchange00001111222233334444555566667777",
                    "hex": "0014change",
                    "type": "witness_v0_keyhash",
                },
            },
        ],
    }

    norm = TransactionParser.parse_rpc_transaction(
        raw_tx, block_height=800000, block_time=1700000000
    )
    assert norm.txid == raw_tx["txid"]
    assert norm.total_input_sats == 100_000_000
    assert norm.total_output_sats == 99_990_000
    assert norm.fee_sats == 10_000
    assert norm.fee_rate > 0
    assert len(norm.inputs) == 1
    assert len(norm.outputs) == 2
