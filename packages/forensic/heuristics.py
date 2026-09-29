from collections import Counter
from typing import Any, Literal

from packages.common.units import is_dust, is_round_amount
from packages.domain.schemas import HeuristicFinding, NormalizedTransaction
from packages.forensic.base import BaseHeuristic


class CommonInputOwnershipHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.1: Common-input ownership.
    If multiple addresses appear as inputs, they are likely controlled by the same entity.
    Never considered certain. Deactivated/attenuated if CoinJoin pattern is detected.
    """

    name = "common_input_ownership"
    description = (
        "Inputs from different addresses in the same transaction may belong to the same entity."
    )

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if tx.inputs and tx.inputs[0].is_coinbase:
            return None

        input_addresses = list({inp.address for inp in tx.inputs if inp.address})
        if len(input_addresses) < 2:
            return None

        # Check if CoinJoin-like pattern is detected in outputs
        output_values = [out.value_sats for out in tx.outputs if out.value_sats > 0]
        val_counts = Counter(output_values)
        has_coinjoin_traits = (
            any(count >= 3 for count in val_counts.values()) and len(tx.inputs) >= 3
        )

        if has_coinjoin_traits:
            return HeuristicFinding(
                name=self.name,
                score=20.0,
                confidence="low",
                severity="info",
                explanation="Multiple inputs detected, but CoinJoin-like pattern lowers confidence of common ownership.",
                evidence={
                    "txid": tx.txid,
                    "input_addresses": input_addresses,
                    "attenuated_reason": "coinjoin_detected",
                    "input_count": len(input_addresses),
                },
            )

        return HeuristicFinding(
            name=self.name,
            score=75.0,
            confidence="medium",
            severity="info",
            explanation="Cluster probablement contrôlé par la même entité selon l'heuristique de multi-input spending.",
            evidence={
                "txid": tx.txid,
                "input_addresses": input_addresses,
                "input_count": len(input_addresses),
                "rule": "common_input_clustering",
            },
        )


class ChangeAddressDetectionHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.2: Change address detection.
    Evaluates outputs in a transaction to identify potential change outputs based on
    script type match, unrounded values, smaller amounts, and new addresses.
    """

    name = "change_address_detection"
    description = "Detects likely change address based on script heuristics, value non-roundness, and input types."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if len(tx.outputs) < 2 or (tx.inputs and tx.inputs[0].is_coinbase):
            return None

        input_script_types = {inp.script_type for inp in tx.inputs if inp.script_type}
        input_addresses = {inp.address for inp in tx.inputs if inp.address}

        candidates = []
        for out in tx.outputs:
            if not out.address or out.address in input_addresses:
                continue

            reasons = []
            prob = 0.3

            # Rule 1: Script type matches input script type
            if out.script_type and out.script_type in input_script_types:
                prob += 0.3
                reasons.append("script_type_matches_inputs")

            # Rule 2: Non-round amount while other outputs may be round
            if not is_round_amount(out.value_sats):
                prob += 0.2
                reasons.append("unrounded_fractional_amount")

            # Rule 3: Smaller or remainder amount
            avg_val = tx.total_output_sats / len(tx.outputs)
            if out.value_sats < avg_val:
                prob += 0.1
                reasons.append("value_below_average_output")

            candidates.append(
                {
                    "output_index": out.index,
                    "address": out.address,
                    "value_sats": out.value_sats,
                    "change_probability": min(round(prob, 2), 0.95),
                    "change_reasons": reasons,
                }
            )

        if not candidates:
            return None

        best_candidate = max(candidates, key=lambda c: float(str(c["change_probability"])))
        prob_val = float(str(best_candidate["change_probability"]))
        if prob_val < 0.5:
            return None

        conf: Literal["low", "medium", "high"] = "high" if prob_val >= 0.8 else "medium"

        return HeuristicFinding(
            name=self.name,
            score=round(prob_val * 100, 1),
            confidence=conf,
            severity="info",
            explanation="Cette sortie présente plusieurs caractéristiques compatibles avec une adresse de change.",
            evidence={
                "txid": tx.txid,
                "candidate_output_index": best_candidate["output_index"],
                "candidate_address": best_candidate["address"],
                "change_probability": best_candidate["change_probability"],
                "change_reasons": best_candidate["change_reasons"],
            },
        )


class AddressReuseHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.3: Address reuse.
    Detects address reuse within the same transaction or between inputs and outputs.
    """

    name = "address_reuse"
    description = "Detects whether addresses are reused across transaction inputs and outputs."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        input_addresses = [inp.address for inp in tx.inputs if inp.address]
        output_addresses = [out.address for out in tx.outputs if out.address]

        # Overlap between inputs and outputs
        overlapping = set(input_addresses).intersection(set(output_addresses))
        # Duplicates within outputs
        out_counts = Counter(output_addresses)
        dup_outputs = [addr for addr, count in out_counts.items() if count > 1]

        if not overlapping and not dup_outputs:
            return None

        reused = list(overlapping.union(set(dup_outputs)))
        return HeuristicFinding(
            name=self.name,
            score=90.0,
            confidence="high",
            severity="warning",
            explanation="Réutilisation d'adresse détectée, affaiblissant la confidentialité de l'entité.",
            evidence={
                "txid": tx.txid,
                "reused_addresses": reused,
                "input_output_overlap": list(overlapping),
                "duplicate_outputs": dup_outputs,
            },
        )


class PeelChainHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.4: Peel chain pattern.
    Detects transactions where one output carries forward the bulk value and a smaller output is peeled off.
    """

    name = "peel_chain"
    description = "Detects peel chains where funds peel off in small chunks while the majority continues forward."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if len(tx.inputs) != 1 or len(tx.outputs) != 2:
            return None

        vals = sorted([out.value_sats for out in tx.outputs])
        small_val, large_val = vals[0], vals[1]

        if tx.total_output_sats <= 0:
            return None

        # Peel characteristic: small output is between 1% and 25% of total value
        ratio = small_val / tx.total_output_sats
        if 0.01 <= ratio <= 0.25 and large_val > 100_000:
            return HeuristicFinding(
                name=self.name,
                score=70.0,
                confidence="medium",
                severity="info",
                explanation="Structure de transaction hautement compatible avec un maillon de peel chain.",
                evidence={
                    "txid": tx.txid,
                    "peel_ratio": round(ratio, 4),
                    "peeled_amount_sats": small_val,
                    "continuing_amount_sats": large_val,
                },
            )
        return None


class ConsolidationHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.5: Consolidation pattern.
    Detects transactions with many inputs and few outputs consolidating wallet UTXOs.
    """

    name = "consolidation"
    description = "Detects UTXO consolidation patterns (many inputs to few outputs)."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if len(tx.inputs) >= 4 and len(tx.outputs) <= 2:
            score = min(50.0 + len(tx.inputs) * 5.0, 95.0)
            return HeuristicFinding(
                name=self.name,
                score=score,
                confidence="high",
                severity="info",
                explanation="Transaction de consolidation d'UTXO détectée (nombre élevé d'inputs vers peu de sorties).",
                evidence={
                    "txid": tx.txid,
                    "input_count": len(tx.inputs),
                    "output_count": len(tx.outputs),
                    "total_consolidated_sats": tx.total_input_sats,
                    "fee_sats": tx.fee_sats,
                },
            )
        return None


class FanInHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.6: Fan-in pattern.
    Multiple distinct addresses funding a single transaction or output.
    """

    name = "fan_in"
    description = (
        "Detects aggregation of funds from multiple distinct sources into one or two destinations."
    )

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        distinct_in = len({inp.address for inp in tx.inputs if inp.address})
        if distinct_in >= 4 and len(tx.outputs) <= 2:
            return HeuristicFinding(
                name=self.name,
                score=80.0,
                confidence="medium",
                severity="info",
                explanation="Convergence de fonds (fan-in) provenant de multiples adresses distinctes.",
                evidence={
                    "txid": tx.txid,
                    "distinct_inputs": distinct_in,
                    "output_count": len(tx.outputs),
                },
            )
        return None


class FanOutHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.7: Fan-out pattern.
    One or two inputs distributing funds to many outputs.
    """

    name = "fan_out"
    description = "Detects dispersion of funds from few inputs across numerous destination outputs."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if len(tx.inputs) <= 2 and len(tx.outputs) >= 5:
            return HeuristicFinding(
                name=self.name,
                score=80.0,
                confidence="medium",
                severity="info",
                explanation="Dispersion de fonds (fan-out) vers un nombre élevé de sorties.",
                evidence={
                    "txid": tx.txid,
                    "input_count": len(tx.inputs),
                    "output_count": len(tx.outputs),
                    "total_distributed_sats": tx.total_output_sats,
                },
            )
        return None


class BatchPaymentHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.8: Batch payment pattern.
    Typical of exchanges and services paying many users in a single transaction.
    """

    name = "batch_payment"
    description = (
        "Detects service batch payouts with diverse values and homogeneous script formats."
    )

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if len(tx.inputs) <= 3 and len(tx.outputs) >= 5:
            # Check for diverse non-equal output amounts (contrasting CoinJoin)
            vals = [o.value_sats for o in tx.outputs]
            unique_vals = set(vals)
            diversity_ratio = len(unique_vals) / len(vals)

            if diversity_ratio >= 0.7:
                return HeuristicFinding(
                    name=self.name,
                    score=85.0,
                    confidence="high",
                    severity="info",
                    explanation="Transaction compatible avec un paiement groupé (batch payment) de plateforme ou de service.",
                    evidence={
                        "txid": tx.txid,
                        "output_count": len(tx.outputs),
                        "unique_amount_ratio": round(diversity_ratio, 2),
                    },
                )
        return None


class CoinJoinSuspicionHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.9: CoinJoin suspicion pattern.
    Detects equal-value output structures and multiple participants.
    RULE: Must be named 'CoinJoin-like pattern' and NEVER 'CoinJoin confirmé'.
    """

    name = "coinjoin_suspicion"
    description = "Detects collaborative transactions matching CoinJoin structures (multiple equal denomination outputs)."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if len(tx.inputs) < 3 or len(tx.outputs) < 3:
            return None

        val_counts = Counter(o.value_sats for o in tx.outputs if o.value_sats > 0)
        most_common_val, count = val_counts.most_common(1)[0]

        if count >= 3:
            score = min(60.0 + count * 5.0, 95.0)
            return HeuristicFinding(
                name=self.name,
                score=score,
                confidence="medium",
                severity="warning",
                explanation="CoinJoin-like pattern détecté (sorties répétées à dénomination identique avec multiples participants).",
                evidence={
                    "txid": tx.txid,
                    "equal_denomination_sats": most_common_val,
                    "equal_output_count": count,
                    "total_outputs": len(tx.outputs),
                    "input_count": len(tx.inputs),
                },
            )
        return None


class DustHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.10: Dust and micro amounts.
    Detects outputs <= 546 satoshis, possible dusting attacks.
    """

    name = "dust_detection"
    description = "Identifies outputs at or below Bitcoin dust threshold (546 satoshis)."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        dust_outputs = [
            {"index": out.index, "address": out.address, "value_sats": out.value_sats}
            for out in tx.outputs
            if is_dust(out.value_sats)
        ]

        if not dust_outputs:
            return None

        is_severe = len(dust_outputs) >= 3
        return HeuristicFinding(
            name=self.name,
            score=85.0 if is_severe else 50.0,
            confidence="high",
            severity="warning" if is_severe else "info",
            explanation="Sortie(s) poussière (dust) détectée(s), potentiellement liée(s) à du tracking ou dusting attack.",
            evidence={
                "txid": tx.txid,
                "dust_count": len(dust_outputs),
                "dust_outputs": dust_outputs,
                "threshold_sats": 546,
            },
        )


class RoundAmountsHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.11: Round amounts.
    Contextual indicator only. Never a proof of identity.
    """

    name = "round_amounts"
    description = "Identifies exact decimal round amounts (e.g. 1 BTC, 0.5 BTC, 100k sats) as contextual indicators."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        round_outputs = [
            {"index": out.index, "address": out.address, "value_sats": out.value_sats}
            for out in tx.outputs
            if is_round_amount(out.value_sats)
        ]

        if not round_outputs:
            return None

        return HeuristicFinding(
            name=self.name,
            score=40.0,
            confidence="low",
            severity="info",
            explanation="Montant(s) rond(s) observé(s) à titre contextuel uniquement. Ne constitue pas une preuve de lien.",
            evidence={
                "txid": tx.txid,
                "round_count": len(round_outputs),
                "round_outputs": round_outputs,
            },
        )


class ChainTransactionHeuristic(BaseHeuristic):
    """
    AGENTS.md 9.12: Chained rapid transactions.
    Detects zero-confirmation chaining or outputs immediately respent.
    """

    name = "chain_transaction"
    description = "Detects rapid successive spending of outputs or unconfirmed transaction chains."

    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        if not tx.confirmed:
            return HeuristicFinding(
                name=self.name,
                score=65.0,
                confidence="medium",
                severity="info",
                explanation="Transaction non confirmée dans le mempool ou en chaîne rapide.",
                evidence={
                    "txid": tx.txid,
                    "confirmed": False,
                },
            )
        return None
