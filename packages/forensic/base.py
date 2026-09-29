from abc import ABC, abstractmethod
from typing import Any

from packages.domain.schemas import HeuristicFinding, NormalizedTransaction


class BaseHeuristic(ABC):
    """Base class for all Bitcoin forensic heuristics."""

    name: str = "base_heuristic"
    description: str = ""
    default_enabled: bool = True

    @abstractmethod
    def analyze(
        self, tx: NormalizedTransaction, context: dict[str, Any] | None = None
    ) -> HeuristicFinding | None:
        """
        Analyze a normalized transaction and optional blockchain context.
        Returns a HeuristicFinding if the heuristic triggers, or None.
        """
