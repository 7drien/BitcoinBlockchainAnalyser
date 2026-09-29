import pytest
from apps.indexer.transaction_parser import TransactionParser
from apps.indexer.external_api import ExternalBitcoinProvider
from apps.indexer.live_sync import LiveSyncService
from packages.domain.database import async_session_factory
from packages.domain.schemas import NormalizedTransaction


def test_parse_mempool_transaction():
    raw_mempool_tx = {
        "txid": "a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8",
        "version": 2,
        "locktime": 0,
        "size": 223,
        "weight": 562,
        "fee": 322,
        "vin": [
            {
                "txid": "df0fbeb27f9429a46cbd0b57ecbb9a290a56e78be8623446e0c2d9ce4826536a",
                "vout": 119,
                "prevout": {
                    "scriptpubkey": "0014cab85efda1d9b3d388e6d42103953dd870ae4918",
                    "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 cab85efda1d9b3d388e6d42103953dd870ae4918",
                    "scriptpubkey_type": "v0_p2wpkh",
                    "scriptpubkey_address": "bc1qe2u9aldpmxea8z8x6sss89fampc2ujgcwzqs37",
                    "value": 81962,
                },
                "is_coinbase": False,
                "sequence": 4294967295,
            }
        ],
        "vout": [
            {
                "scriptpubkey": "001481e8aae7bcb4ed206f04b2156e5ac3bfab163fc1",
                "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 81e8aae7bcb4ed206f04b2156e5ac3bfab163fc1",
                "scriptpubkey_type": "v0_p2wpkh",
                "scriptpubkey_address": "bc1qs8524eauknkjqmcykg2kukkrh743v07px08zqr",
                "value": 65000,
            },
            {
                "scriptpubkey": "0014cab85efda1d9b3d388e6d42103953dd870ae4918",
                "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 cab85efda1d9b3d388e6d42103953dd870ae4918",
                "scriptpubkey_type": "v0_p2wpkh",
                "scriptpubkey_address": "bc1qe2u9aldpmxea8z8x6sss89fampc2ujgcwzqs37",
                "value": 16640,
            },
        ],
        "status": {
            "confirmed": True,
            "block_height": 969120,
            "block_hash": "0000000000000000000120121321f57d08db963cf64f998ebb4d71ea7055f737",
            "block_time": 1790667721,
        },
    }

    norm = TransactionParser.parse_mempool_transaction(raw_mempool_tx)

    assert norm.txid == "a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8"
    assert norm.confirmed is True
    assert norm.block_height == 969120
    assert norm.vsize == 141
    assert norm.fee_sats == 322
    assert norm.fee_rate == 2.28
    assert norm.total_input_sats == 81962
    assert norm.total_output_sats == 81640
    assert len(norm.inputs) == 1
    assert norm.inputs[0].address == "bc1qe2u9aldpmxea8z8x6sss89fampc2ujgcwzqs37"
    assert len(norm.outputs) == 2
    assert norm.outputs[0].address == "bc1qs8524eauknkjqmcykg2kukkrh743v07px08zqr"
    assert norm.outputs[1].address == "bc1qe2u9aldpmxea8z8x6sss89fampc2ujgcwzqs37"


def test_external_provider_initialization():
    provider = ExternalBitcoinProvider()
    assert provider.base_url.startswith("https://")
    assert "User-Agent" in provider.headers


@pytest.mark.asyncio
async def test_live_sync_persists_transaction():
    service = LiveSyncService()
    norm_tx = NormalizedTransaction(
        txid="e000000000000000000000000000000000000000000000000000000000000099",
        block_height=999999,
        block_hash="0000000000000000000000000000000000000000000000000000000000000099",
        block_time=1700000000,
        confirmed=True,
        size=220,
        vsize=140,
        weight=560,
        fee_sats=500,
        fee_rate=3.57,
        total_input_sats=100000,
        total_output_sats=99500,
        inputs=[],
        outputs=[],
    )

    async with async_session_factory() as session:
        persisted = await service._persist_transaction(session, norm_tx)
        assert persisted.txid == norm_tx.txid
        assert persisted.block_height == 999999
        await session.commit()

        # Re-fetch from db
        fetched = await service._get_normalized_from_db(session, norm_tx.txid)
        assert fetched is not None
        assert fetched.txid == norm_tx.txid
