from typing import Any

from packages.domain.schemas import HeuristicFinding, NormalizedTransaction
from packages.forensic.base import BaseHeuristic
from packages.forensic.heuristics import (
    AddressReuseHeuristic,
    BatchPaymentHeuristic,
    ChainTransactionHeuristic,
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


class ForensicEngine:
    """
    Forensic analysis engine for Bitcoin transactions and entities.
    Orchestrates heuristics, tracks confidence and explanations.
    """

    def __init__(self, disabled_heuristics: list[str] | None = None):
        disabled = set(disabled_heuristics or [])
        self.heuristics: dict[str, BaseHeuristic] = {
            h.name: h
            for h in [
                CommonInputOwnershipHeuristic(),
                ChangeAddressDetectionHeuristic(),
                AddressReuseHeuristic(),
                PeelChainHeuristic(),
                ConsolidationHeuristic(),
                FanInHeuristic(),
                FanOutHeuristic(),
                BatchPaymentHeuristic(),
                CoinJoinSuspicionHeuristic(),
                DustHeuristic(),
                RoundAmountsHeuristic(),
                ChainTransactionHeuristic(),
            ]
            if h.name not in disabled
        }

    def analyze_transaction(
        self,
        tx: NormalizedTransaction,
        context: dict[str, Any] | None = None,
        enabled_only: list[str] | None = None,
    ) -> list[HeuristicFinding]:
        """Run enabled heuristics on the transaction."""
        findings: list[HeuristicFinding] = []
        for name, heuristic in self.heuristics.items():
            if enabled_only is not None and name not in enabled_only:
                continue
            finding = heuristic.analyze(tx, context)
            if finding:
                findings.append(finding)
        return findings

    def get_registered_heuristics(self) -> list[dict[str, Any]]:
        """List metadata for all registered heuristics."""
        return [
            {
                "name": h.name,
                "description": h.description,
                "enabled": True,
            }
            for h in self.heuristics.values()
        ]
