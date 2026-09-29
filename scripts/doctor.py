#!/usr/bin/env python3
import asyncio
import os
import shutil
import subprocess

import asyncpg
import httpx
from dotenv import load_dotenv


async def check_command(cmd, name):
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        await proc.communicate()
        if proc.returncode == 0:
            print(f"✅ {name} is installed")
            return True
        else:
            print(f"❌ {name} is not available")
            return False
    except Exception as e:
        print(f"❌ {name} check failed: {e}")
        return False


async def check_postgres(url):
    try:
        # replace asyncpg url
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(url, timeout=2)
        b_count = await conn.fetchval("SELECT count(*) FROM blocks")
        t_count = await conn.fetchval("SELECT count(*) FROM transactions")
        a_count = await conn.fetchval("SELECT count(*) FROM addresses")
        await conn.close()
        print(
            f"✅ PostgreSQL connection successful ({b_count} blocks, {t_count} txs, {a_count} addresses indexed)"
        )
        return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False


def check_disk_space():
    total, used, free = shutil.disk_usage("/")
    free_gb = free / (1024**3)
    if free_gb > 10:
        print(f"✅ Disk space: {free_gb:.1f} GB free")
    else:
        print(f"⚠️ Disk space low: {free_gb:.1f} GB free")


async def main():
    print("--- ChainScope Doctor ---")
    load_dotenv()

    await check_command("docker --version", "Docker")
    await check_command("docker compose version", "Docker Compose")
    await check_command("python --version", "Python")

    check_disk_space()

    db_url = os.environ.get(
        "DATABASE_URL", "postgresql+asyncpg://chainscope:chainscope@localhost:5432/chainscope"
    )
    await check_postgres(db_url)

    rpc_user = os.environ.get("BITCOIN_RPC_USER", "btcuser")
    rpc_pass = os.environ.get("BITCOIN_RPC_PASSWORD", "btcpass")
    rpc_host = os.environ.get("BITCOIN_RPC_HOST", "localhost")
    rpc_port = os.environ.get("BITCOIN_RPC_PORT", "18443")

    rpc_url = f"http://{rpc_host}:{rpc_port}/"
    print(f"Checking Bitcoin Core RPC at {rpc_url}...")
    try:
        auth = (rpc_user, rpc_pass)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "1.0",
                    "id": "doctor",
                    "method": "getblockchaininfo",
                    "params": [],
                },
                auth=auth,
                timeout=2,
            )
            if resp.status_code == 200:
                data = resp.json().get("result", {})
                print(
                    f"✅ Bitcoin Core RPC connected (blocks: {data.get('blocks')}, chain: {data.get('chain')})"
                )
            else:
                print(f"❌ Bitcoin Core RPC returned status {resp.status_code}")
    except Exception as e:
        print(f"❌ Bitcoin Core RPC connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())
