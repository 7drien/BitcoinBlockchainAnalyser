import os
from typing import Any

import httpx
import structlog

logger = structlog.get_logger()


class BitcoinRPCClient:
    def __init__(self):
        self.rpc_user = os.environ.get("BITCOIN_RPC_USER", "btcuser")
        self.rpc_password = os.environ.get("BITCOIN_RPC_PASSWORD", "btcpass")
        self.rpc_host = os.environ.get("BITCOIN_RPC_HOST", "localhost")
        self.rpc_port = os.environ.get("BITCOIN_RPC_PORT", "18443")
        self.rpc_url = f"http://{self.rpc_host}:{self.rpc_port}/"
        self.auth = (self.rpc_user, self.rpc_password)

    async def _call(self, method: str, params: list[Any] | None = None) -> Any:
        if params is None:
            params = []
        async with httpx.AsyncClient() as client:
            payload = {"jsonrpc": "1.0", "id": "chainscope", "method": method, "params": params}
            try:
                response = await client.post(
                    self.rpc_url, json=payload, auth=self.auth, timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                if data.get("error"):
                    raise Exception(f"RPC Error: {data['error']}")
                return data.get("result")
            except httpx.HTTPStatusError as e:
                # Sometimes Bitcoin Core returns 500 for RPC errors (like TX not found)
                try:
                    data = e.response.json()
                    if data.get("error"):
                        raise Exception(f"RPC Error: {data['error']['message']}")
                except Exception:
                    pass
                raise Exception(f"HTTP Error: {e.response.status_code}")
            except Exception as e:
                logger.error("rpc_call_failed", method=method, error=str(e))
                raise

    async def get_blockchain_info(self) -> dict[str, Any]:
        return await self._call("getblockchaininfo")

    async def get_raw_transaction(self, txid: str, verbose: bool = True) -> dict[str, Any]:
        return await self._call("getrawtransaction", [txid, verbose])

    async def get_block_hash(self, height: int) -> str:
        return await self._call("getblockhash", [height])

    async def get_block(self, block_hash: str, verbosity: int = 1) -> dict[str, Any]:
        return await self._call("getblock", [block_hash, verbosity])
