import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_status_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "network" in data
        assert "blocks" in data
        assert "indexed_blocks" in data
        assert "indexed_transactions" in data


@pytest.mark.asyncio
async def test_search_block_height():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/search?q=969120")
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "block"
        assert data["data"]["height"] == 969120


@pytest.mark.asyncio
async def test_search_real_tx():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/search?q=a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "transaction"
        assert (
            data["data"]["txid"]
            == "a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8"
        )


@pytest.mark.asyncio
async def test_search_filter():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"min_amount_sats": 1000, "limit": 10}
        resp = await client.post("/api/search/filter", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert isinstance(data["results"], list)


@pytest.mark.asyncio
async def test_graph_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/graph?mode=address")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data


@pytest.mark.asyncio
async def test_graph_multi_hop_exploration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        txid = "a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8"
        # 1. Multi-hop address graph
        resp = await client.get(f"/api/graph?subject={txid}&mode=address&depth=2&direction=both")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["nodes"]) >= 2
        assert len(data["edges"]) >= 1

        # 2. Multi-hop UTXO graph
        utxo_resp = await client.get(f"/api/graph?subject={txid}&mode=utxo&depth=2&direction=both")
        assert utxo_resp.status_code == 200
        utxo_data = utxo_resp.json()
        assert len(utxo_data["nodes"]) >= 3
        assert len(utxo_data["edges"]) >= 2


@pytest.mark.asyncio
async def test_forensics_heuristics_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/forensics/heuristics")
        assert resp.status_code == 200
        heuristics = resp.json().get("heuristics", [])
        assert len(heuristics) >= 12
        names = [h["name"] for h in heuristics]
        assert "common_input_ownership" in names
        assert "peel_chain" in names
        assert "coinjoin_suspicion" in names


@pytest.mark.asyncio
async def test_forensics_analyze_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {"txid": "a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8"}
        resp = await client.post("/api/forensics/analyze", json=payload)
        assert resp.status_code == 200
        findings = resp.json()
        assert isinstance(findings, list)
        finding_names = [f["name"] for f in findings]
        assert "change_address_detection" in finding_names or "address_reuse" in finding_names


@pytest.mark.asyncio
async def test_investigations_and_report():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create an investigation
        create_payload = {
            "name": "Live Forensic Case",
            "root_subject_id": "a981bfa106e0796bcf3759ae433ba8e9d473d2c6d243bbae53de1f744d6ba7f8",
            "network": "mainnet",
        }
        create_resp = await client.post("/api/investigations", json=create_payload)
        assert create_resp.status_code == 200
        inv_id = create_resp.json()["id"]

        # 2. List investigations
        resp = await client.get("/api/investigations")
        assert resp.status_code == 200
        invs = resp.json()
        assert len(invs) >= 1

        # 3. Get details
        detail_resp = await client.get(f"/api/investigations/{inv_id}")
        assert detail_resp.status_code == 200
        assert "findings" in detail_resp.json()

        # 4. Generate HTML report
        rep_resp = await client.get(f"/api/investigations/{inv_id}/report")
        assert rep_resp.status_code == 200
        assert "text/html" in rep_resp.headers["content-type"]
        assert "ChainScope Forensic Analysis Dossier" in rep_resp.text
