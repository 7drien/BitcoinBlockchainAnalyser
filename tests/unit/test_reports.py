from packages.reports.generator import ForensicReportGenerator


def test_generate_html_report_adheres_to_agents_spec():
    investigation = {
        "id": 1,
        "name": "Operation Titan",
        "description": "Analysis of mixer hop",
        "network": "regtest",
        "snapshot_height": 850001,
        "root_subject_id": "a100000000000000000000000000000000000000000000000000000000000001",
        "root_subject_type": "transaction",
    }
    transactions = [
        {
            "txid": "a100000000000000000000000000000000000000000000000000000000000001",
            "block_height": 850001,
            "total_output_sats": 499980000,
            "fee_rate": 14.5,
        }
    ]
    findings = [
        {
            "heuristic_name": "peel_chain",
            "score": 70.0,
            "confidence": "medium",
            "severity": "info",
            "explanation": "Peel chain pattern detected",
        }
    ]
    clusters = [
        {
            "name": "Mixer Cluster",
            "cluster_type": "mixer",
            "confidence": "medium",
            "description": "Equal output mixing",
        }
    ]

    html = ForensicReportGenerator.generate_html_report(
        investigation, transactions, findings, clusters
    )

    # Verify AGENTS.md Section 13 requirements
    assert "ChainScope Forensic Analysis Dossier" in html
    assert "Operation Titan" in html
    assert "Audit Integrity Hash:" in html
    assert (
        "METHODOLOGICAL NOTICE &amp; FORENSIC DISCLAIMER" in html
        or "METHODOLOGICAL NOTICE & FORENSIC DISCLAIMER" in html
    )
    assert "Observed On-Chain Data" in html
    assert "Heuristic Inference" in html
    assert "Analyst Annotation" in html
    assert "peel_chain" in html
