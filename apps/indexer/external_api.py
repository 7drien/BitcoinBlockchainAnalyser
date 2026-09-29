import os
from typing import Any

import httpx
import structlog

logger = structlog.get_logger()


class ExternalBitcoinProvider:
    """
    External provider for live Bitcoin blockchain data (mempool.space / Esplora API).
    Used as an external adapter to query mainnet transactions, addresses, and blocks.
    WARNING: Using this queries an external API (mempool.space).
    """

    def __init__(self, base_url: str | None = None):
        self.base_url = (
            base_url or os.environ.get("EXTERNAL_PROVIDER_URL") or "https://mempool.space/api"
        ).rstrip("/")
        env_val = os.environ.get("USE_EXTERNAL_PROVIDER", "true").lower()
        self.enabled = env_val in ("true", "1", "yes")
        self.headers = {"User-Agent": "ChainScope-Forensic/1.0 (Bitcoin Blockchain Explorer)"}

    async def get_transaction(self, txid: str) -> dict[str, Any]:
        """Fetch full transaction details in Esplora format."""
        async with httpx.AsyncClient(headers=self.headers, timeout=12.0) as client:
            resp = await client.get(f"{self.base_url}/tx/{txid}")
            if resp.status_code == 404:
                raise Exception(f"Transaction '{txid}' not found on external blockchain API.")
            resp.raise_for_status()
            return resp.json()

    async def get_address(self, address: str) -> dict[str, Any]:
        """Fetch address metadata, chain stats, and balance."""
        async with httpx.AsyncClient(headers=self.headers, timeout=12.0) as client:
            resp = await client.get(f"{self.base_url}/address/{address}")
            if resp.status_code == 404:
                raise Exception(f"Address '{address}' not found on external blockchain API.")
            resp.raise_for_status()
            return resp.json()

    async def get_address_transactions(self, address: str) -> list[dict[str, Any]]:
        """Fetch recent transactions for an address."""
        async with httpx.AsyncClient(headers=self.headers, timeout=15.0) as client:
            resp = await client.get(f"{self.base_url}/address/{address}/txs")
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            return resp.json()

    async def get_address_utxos(self, address: str) -> list[dict[str, Any]]:
        """Fetch confirmed and unconfirmed UTXOs for an address."""
        async with httpx.AsyncClient(headers=self.headers, timeout=12.0) as client:
            resp = await client.get(f"{self.base_url}/address/{address}/utxo")
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            return resp.json()

    async def get_block(self, block_hash: str) -> dict[str, Any]:
        """Fetch block metadata."""
        async with httpx.AsyncClient(headers=self.headers, timeout=12.0) as client:
            resp = await client.get(f"{self.base_url}/block/{block_hash}")
            if resp.status_code == 404:
                raise Exception(f"Block '{block_hash}' not found on external blockchain API.")
            resp.raise_for_status()
            return resp.json()

    async def get_block_status(self, block_hash: str) -> dict[str, Any]:
        """Fetch block confirmation and status."""
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/block/{block_hash}/status")
            if resp.status_code == 404:
                raise Exception(f"Block status for '{block_hash}' not found.")
            resp.raise_for_status()
            return resp.json()

    async def get_outspend(self, txid: str, vout: int) -> dict[str, Any]:
        """Fetch spend status for a specific transaction output."""
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/tx/{txid}/outspend/{vout}")
            if resp.status_code == 404:
                return {"spent": False}
            resp.raise_for_status()
            return resp.json()

