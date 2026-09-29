from typing import Any

from packages.common.units import sats_to_btc
from packages.domain.schemas import GraphData, GraphElement, NormalizedTransaction


class GraphBuilder:
    """
    Builds Cytoscape-compatible graph topologies from Bitcoin transactions.
    Supports Address Graph, UTXO True DAG, and Multi-Hop forensic flow graphs.
    """

    @staticmethod
    def build_address_graph(
        transactions: list[NormalizedTransaction],
        center_address: str | None = None,
        center_txid: str | None = None,
        max_nodes: int = 150,
    ) -> GraphData:
        """
        Builds address-to-address flow graph (Nodes = Addresses, Edges = Transactions).
        Enables multi-hop upstream and downstream tracing across related counterparties.
        """
        nodes_dict: dict[str, dict[str, Any]] = {}
        edges_list: list[dict[str, Any]] = []
        seen_edges: set[str] = set()

        # Identify primary addresses if a center transaction is specified
        primary_addresses: set[str] = set()
        if center_txid:
            for tx in transactions:
                if tx.txid == center_txid:
                    for inp in tx.inputs:
                        if inp.address:
                            primary_addresses.add(inp.address)
                    for out in tx.outputs:
                        if out.address:
                            primary_addresses.add(out.address)

        for tx in transactions:
            # Register address nodes from inputs
            for inp in tx.inputs:
                addr = inp.address
                if not addr or addr == "Coinbase Reward":
                    addr = f"coinbase:{tx.txid[:8]}"

                if addr not in nodes_dict:
                    if len(nodes_dict) >= max_nodes:
                        break
                    is_coinbase = addr.startswith("coinbase:")
                    label = (
                        "Coinbase Reward"
                        if is_coinbase
                        else (addr[:6] + "..." + addr[-4:] if len(addr) > 12 else addr)
                    )
                    nodes_dict[addr] = {
                        "id": addr,
                        "label": label,
                        "full_address": "" if is_coinbase else addr,
                        "type": "coinbase" if is_coinbase else "address",
                        "script_type": inp.script_type or "p2wpkh",
                        "is_center": addr == center_address or (center_txid and addr in primary_addresses),
                        "balance_sats": 0,
                    }

            # Register address nodes from outputs
            for out in tx.outputs:
                if out.address and out.address not in nodes_dict:
                    if len(nodes_dict) >= max_nodes:
                        break
                    nodes_dict[out.address] = {
                        "id": out.address,
                        "label": out.address[:6] + "..." + out.address[-4:]
                        if len(out.address) > 12
                        else out.address,
                        "full_address": out.address,
                        "type": "address",
                        "script_type": out.script_type or "p2wpkh",
                        "is_center": out.address == center_address or (center_txid and out.address in primary_addresses),
                        "balance_sats": out.value_sats,
                    }

            # Create edges from inputs to outputs
            for inp in tx.inputs:
                in_addr = inp.address
                if not in_addr or in_addr == "Coinbase Reward":
                    in_addr = f"coinbase:{tx.txid[:8]}"

                if in_addr not in nodes_dict:
                    continue

                for out in tx.outputs:
                    if not out.address or out.address not in nodes_dict:
                        continue
                    if in_addr == out.address and len(tx.outputs) > 1:
                        # Skip self-change loop on macro view if multiple outputs exist
                        continue

                    edge_id = f"{tx.txid}:{in_addr}->{out.address}:{out.index}"
                    if edge_id in seen_edges:
                        continue
                    seen_edges.add(edge_id)

                    is_center_tx = tx.txid == center_txid
                    edges_list.append(
                        {
                            "id": edge_id,
                            "source": in_addr,
                            "target": out.address,
                            "txid": tx.txid,
                            "amount_sats": out.value_sats,
                            "amount_btc": sats_to_btc(out.value_sats),
                            "total_output_sats": tx.total_output_sats,
                            "fee_sats": tx.fee_sats,
                            "fee_rate": tx.fee_rate,
                            "vsize": tx.vsize,
                            "block_height": tx.block_height,
                            "block_time": tx.block_time,
                            "is_center": is_center_tx,
                            "label": f"{sats_to_btc(out.value_sats):.4f} BTC",
                            "input_count": len(tx.inputs),
                            "output_count": len(tx.outputs),
                            "inputs": [
                                {
                                    "address": inp.address,
                                    "value_sats": inp.value_sats,
                                    "script_type": inp.script_type,
                                }
                                for inp in tx.inputs
                            ],
                            "outputs": [
                                {
                                    "address": o.address,
                                    "value_sats": o.value_sats,
                                    "script_type": o.script_type,
                                    "index": o.index,
                                }
                                for o in tx.outputs
                            ],
                        }
                    )

        valid_nodes = set(nodes_dict.keys())
        filtered_edges = [
            e for e in edges_list if e["source"] in valid_nodes and e["target"] in valid_nodes
        ]

        return GraphData(
            nodes=[GraphElement(data=d) for d in nodes_dict.values()],
            edges=[GraphElement(data=d) for d in filtered_edges],
            transactions=GraphBuilder._serialize_transactions(transactions, center_txid),
        )

    @staticmethod
    def _serialize_transactions(
        transactions: list[NormalizedTransaction], center_txid: str | None = None
    ) -> list[dict[str, Any]]:
        result = []
        for tx in transactions:
            result.append(
                {
                    "id": tx.txid,
                    "txid": tx.txid,
                    "full_id": tx.txid,
                    "type": "transaction",
                    "block_height": tx.block_height,
                    "block_hash": tx.block_hash,
                    "block_time": tx.block_time,
                    "vsize": tx.vsize,
                    "fee_sats": tx.fee_sats,
                    "fee_rate": tx.fee_rate,
                    "total_input_sats": tx.total_input_sats,
                    "total_output_sats": tx.total_output_sats,
                    "amount_btc": sats_to_btc(tx.total_output_sats),
                    "input_count": len(tx.inputs),
                    "output_count": len(tx.outputs),
                    "inputs": [
                        {
                            "address": inp.address,
                            "value_sats": inp.value_sats,
                            "script_type": inp.script_type,
                            "txid": inp.txid,
                            "vout": inp.vout,
                            "is_coinbase": inp.is_coinbase,
                        }
                        for inp in tx.inputs
                    ],
                    "outputs": [
                        {
                            "address": out.address,
                            "value_sats": out.value_sats,
                            "script_type": out.script_type,
                            "index": out.index,
                            "spent": out.spent,
                        }
                        for out in tx.outputs
                    ],
                    "is_center": tx.txid == center_txid,
                }
            )
        return result

    @staticmethod
    def build_utxo_graph(
        transactions: list[NormalizedTransaction],
        center_txid: str | None = None,
        max_nodes: int = 200,
    ) -> GraphData:
        """
        Builds UTXO-level true DAG (Nodes = Transactions & UTXOs).
        Enables exploration across Parent TX -> Input UTXO -> Target TX -> Output UTXO -> Child TX.
        """
        nodes_dict: dict[str, dict[str, Any]] = {}
        edges_list: list[dict[str, Any]] = []

        # 1. First pass: Register all transaction nodes
        for tx in transactions:
            if len(nodes_dict) >= max_nodes:
                break
            tx_node_id = f"tx:{tx.txid}"
            nodes_dict[tx_node_id] = {
                "id": tx_node_id,
                "label": f"TX {tx.txid[:6]}...{tx.txid[-4:]}",
                "full_id": tx.txid,
                "txid": tx.txid,
                "type": "transaction",
                "is_center": tx.txid == center_txid,
                "fee_sats": tx.fee_sats,
                "fee_rate": tx.fee_rate,
                "vsize": tx.vsize,
                "block_height": tx.block_height,
                "block_time": tx.block_time,
                "total_input_sats": tx.total_input_sats,
                "total_output_sats": tx.total_output_sats,
                "amount_btc": sats_to_btc(tx.total_output_sats),
                "input_count": len(tx.inputs),
                "output_count": len(tx.outputs),
                "inputs": [
                    {
                        "address": inp.address,
                        "value_sats": inp.value_sats,
                        "script_type": inp.script_type,
                    }
                    for inp in tx.inputs
                ],
                "outputs": [
                    {
                        "address": out.address,
                        "value_sats": out.value_sats,
                        "script_type": out.script_type,
                        "index": out.index,
                    }
                    for out in tx.outputs
                ],
            }

        # 2. Second pass: Create outputs (UTXOs created by these transactions)
        for tx in transactions:
            tx_node_id = f"tx:{tx.txid}"
            if tx_node_id not in nodes_dict:
                continue

            for out in tx.outputs:
                utxo_id = f"utxo:{tx.txid}:{out.index}"
                if utxo_id not in nodes_dict and len(nodes_dict) < max_nodes:
                    nodes_dict[utxo_id] = {
                        "id": utxo_id,
                        "label": f"{sats_to_btc(out.value_sats):.4f} BTC",
                        "type": "utxo",
                        "value_sats": out.value_sats,
                        "value_btc": sats_to_btc(out.value_sats),
                        "address": out.address or "Unknown",
                        "spent": out.spent,
                        "script_type": out.script_type or "p2wpkh",
                        "txid": tx.txid,
                        "output_index": out.index,
                    }

                if utxo_id in nodes_dict:
                    edges_list.append(
                        {
                            "id": f"edge:{tx_node_id}->{utxo_id}",
                            "source": tx_node_id,
                            "target": utxo_id,
                            "type": "creates",
                            "txid": tx.txid,
                            "amount_sats": out.value_sats,
                            "label": f"creates #{out.index}",
                        }
                    )

            # 3. Third pass: Connect inputs (UTXOs spent by these transactions)
            for inp in tx.inputs:
                if inp.txid and inp.vout is not None:
                    prev_utxo_id = f"utxo:{inp.txid}:{inp.vout}"
                    # If the previous UTXO is not already registered from parent transactions,
                    # register it so the upstream source of funds is clearly visible!
                    if prev_utxo_id not in nodes_dict and len(nodes_dict) < max_nodes:
                        nodes_dict[prev_utxo_id] = {
                            "id": prev_utxo_id,
                            "label": f"{sats_to_btc(inp.value_sats):.4f} BTC" if inp.value_sats else "UTXO In",
                            "type": "utxo",
                            "value_sats": inp.value_sats,
                            "value_btc": sats_to_btc(inp.value_sats),
                            "address": inp.address or "Unknown",
                            "spent": True,
                            "script_type": inp.script_type or "p2wpkh",
                            "txid": inp.txid,
                            "output_index": inp.vout,
                        }

                    if prev_utxo_id in nodes_dict:
                        edges_list.append(
                            {
                                "id": f"edge:{prev_utxo_id}->{tx_node_id}",
                                "source": prev_utxo_id,
                                "target": tx_node_id,
                                "type": "spends",
                                "txid": tx.txid,
                                "amount_sats": inp.value_sats,
                                "label": "spends",
                            }
                        )
                elif inp.is_coinbase and len(nodes_dict) < max_nodes:
                    cb_id = f"coinbase:{tx.txid[:8]}"
                    if cb_id not in nodes_dict:
                        nodes_dict[cb_id] = {
                            "id": cb_id,
                            "label": "Coinbase Reward",
                            "type": "coinbase",
                            "value_sats": inp.value_sats,
                            "value_btc": sats_to_btc(inp.value_sats),
                        }
                    edges_list.append(
                        {
                            "id": f"edge:{cb_id}->{tx_node_id}",
                            "source": cb_id,
                            "target": tx_node_id,
                            "type": "mints",
                            "txid": tx.txid,
                            "amount_sats": inp.value_sats,
                            "label": "mints",
                        }
                    )

        valid_nodes_utxo = set(nodes_dict.keys())
        filtered_edges_utxo = [
            e
            for e in edges_list
            if e["source"] in valid_nodes_utxo and e["target"] in valid_nodes_utxo
        ]

        return GraphData(
            nodes=[GraphElement(data=d) for d in nodes_dict.values()],
            edges=[GraphElement(data=d) for d in filtered_edges_utxo],
            transactions=GraphBuilder._serialize_transactions(transactions, center_txid),
        )
