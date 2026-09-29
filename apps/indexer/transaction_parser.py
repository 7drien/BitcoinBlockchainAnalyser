from typing import Any

from packages.common.units import btc_to_sats, detect_script_type
from packages.domain.schemas import NormalizedTransaction, TransactionInput, TransactionOutput


class TransactionParser:
    """
    Parses Bitcoin RPC and raw transaction structures into NormalizedTransaction.
    """

    @staticmethod
    def parse_rpc_transaction(
        raw_tx: dict[str, Any], block_height: int = 0, block_time: int = 0
    ) -> NormalizedTransaction:
        txid = raw_tx.get("txid", "")
        size = raw_tx.get("size", 0)
        vsize = raw_tx.get("vsize", size)
        weight = raw_tx.get("weight", vsize * 4)
        block_hash = raw_tx.get("blockhash")

        inputs: list[TransactionInput] = []
        total_input_sats = 0

        for vin in raw_tx.get("vin", []):
            if "coinbase" in vin:
                inputs.append(
                    TransactionInput(
                        is_coinbase=True,
                        sequence=vin.get("sequence", 0),
                        value_sats=0,
                        address="Coinbase Reward",
                        script_type="coinbase",
                    )
                )
                continue

            prev_txid = vin.get("txid")
            vout_idx = vin.get("vout")
            sequence = vin.get("sequence", 0)

            # In verbose RPC, prevout might be populated if txindex=1 and verbosity=2
            prevout = vin.get("prevout", {})
            value_sats = 0
            addr = None
            script_type = None

            if prevout:
                if "value" in prevout:
                    value_sats = btc_to_sats(prevout["value"])
                spk = prevout.get("scriptPubKey", {})
                addr = spk.get("address")
                script_type = spk.get("type") or detect_script_type(
                    spk.get("hex", ""), addr, spk.get("asm", "")
                )

            # Fallback address from scriptSig or witness if available
            if not addr:
                script_sig = vin.get("scriptSig", {})
                asm = script_sig.get("asm", "")
                script_type = detect_script_type(script_sig.get("hex", ""), asm=asm)

            inputs.append(
                TransactionInput(
                    txid=prev_txid,
                    vout=vout_idx,
                    address=addr,
                    value_sats=value_sats,
                    script_type=script_type,
                    sequence=sequence,
                    is_coinbase=False,
                )
            )
            total_input_sats += value_sats

        outputs: list[TransactionOutput] = []
        total_output_sats = 0

        for idx, vout in enumerate(raw_tx.get("vout", [])):
            val_sats = btc_to_sats(vout.get("value", 0.0))
            spk = vout.get("scriptPubKey", {})
            addr = spk.get("address")

            # In some core versions, addresses are in a list
            if not addr and "addresses" in spk and spk["addresses"]:
                addr = spk["addresses"][0]

            hex_script = spk.get("hex", "")
            asm_script = spk.get("asm", "")
            script_type = spk.get("type") or detect_script_type(hex_script, addr, asm_script)

            outputs.append(
                TransactionOutput(
                    index=vout.get("n", idx),
                    address=addr,
                    value_sats=val_sats,
                    script_type=script_type,
                    script_pubkey=hex_script,
                    spent=False,
                )
            )
            total_output_sats += val_sats

        is_coinbase = bool(inputs and inputs[0].is_coinbase)
        if is_coinbase or total_input_sats == 0:
            fee_sats = 0
            fee_rate = 0.0
        else:
            fee_sats = max(0, total_input_sats - total_output_sats)
            fee_rate = round(fee_sats / vsize, 2) if vsize > 0 else 0.0

        return NormalizedTransaction(
            txid=txid,
            block_height=block_height,
            block_hash=block_hash,
            block_time=block_time,
            confirmed=bool(block_hash),
            size=size,
            vsize=vsize,
            weight=weight,
            fee_sats=fee_sats,
            fee_rate=fee_rate,
            total_input_sats=total_input_sats,
            total_output_sats=total_output_sats,
            inputs=inputs,
            outputs=outputs,
        )

    @staticmethod
    def parse_mempool_transaction(raw_tx: dict[str, Any]) -> NormalizedTransaction:
        """
        Parses Esplora / mempool.space format transaction into NormalizedTransaction.
        """
        txid = raw_tx.get("txid", "")
        size = raw_tx.get("size", 0)
        weight = raw_tx.get("weight", 0)
        vsize = (weight + 3) // 4 if weight > 0 else (raw_tx.get("vsize") or size)

        status = raw_tx.get("status", {})
        confirmed = bool(status.get("confirmed", False))
        block_height = status.get("block_height", 0)
        block_hash = status.get("block_hash", "")
        block_time = status.get("block_time", 0)

        inputs: list[TransactionInput] = []
        total_input_sats = 0

        for vin in raw_tx.get("vin", []):
            if vin.get("is_coinbase", False) or "coinbase" in vin:
                inputs.append(
                    TransactionInput(
                        is_coinbase=True,
                        sequence=vin.get("sequence", 0),
                        value_sats=0,
                        address="Coinbase Reward",
                        script_type="coinbase",
                    )
                )
                continue

            prevout = vin.get("prevout") or {}
            val_sats = prevout.get("value", 0)
            addr = prevout.get("scriptpubkey_address")
            hex_script = prevout.get("scriptpubkey", "")
            asm_script = prevout.get("scriptpubkey_asm", "")
            script_type = prevout.get("scriptpubkey_type") or detect_script_type(
                hex_script, addr, asm_script
            )

            inputs.append(
                TransactionInput(
                    txid=vin.get("txid"),
                    vout=vin.get("vout"),
                    address=addr,
                    value_sats=val_sats,
                    script_type=script_type,
                    sequence=vin.get("sequence", 0),
                    is_coinbase=False,
                )
            )
            total_input_sats += val_sats

        outputs: list[TransactionOutput] = []
        total_output_sats = 0

        for idx, vout in enumerate(raw_tx.get("vout", [])):
            val_sats = vout.get("value", 0)
            addr = vout.get("scriptpubkey_address")
            hex_script = vout.get("scriptpubkey", "")
            asm_script = vout.get("scriptpubkey_asm", "")
            script_type = vout.get("scriptpubkey_type") or detect_script_type(
                hex_script, addr, asm_script
            )

            outputs.append(
                TransactionOutput(
                    index=idx,
                    address=addr,
                    value_sats=val_sats,
                    script_type=script_type,
                    script_pubkey=hex_script,
                    spent=False,
                )
            )
            total_output_sats += val_sats

        fee_sats = raw_tx.get("fee")
        if fee_sats is None:
            if inputs and inputs[0].is_coinbase:
                fee_sats = 0
            else:
                fee_sats = max(0, total_input_sats - total_output_sats)

        fee_rate = round(fee_sats / vsize, 2) if vsize > 0 else 0.0

        return NormalizedTransaction(
            txid=txid,
            block_height=block_height,
            block_hash=block_hash,
            block_time=block_time,
            confirmed=confirmed,
            size=size,
            vsize=vsize,
            weight=weight,
            fee_sats=fee_sats,
            fee_rate=fee_rate,
            total_input_sats=total_input_sats,
            total_output_sats=total_output_sats,
            inputs=inputs,
            outputs=outputs,
        )
