import hashlib
from datetime import UTC, datetime
from typing import Any


class ForensicReportGenerator:
    """
    Generates structured forensic investigation dossiers adhering to AGENTS.md Section 13.
    Explicitly distinguishes:
    - Observed on-chain data
    - Derived data
    - Heuristic inference
    - Analyst annotation
    - External attribution
    """

    @staticmethod
    def generate_html_report(
        investigation: dict[str, Any],
        transactions: list[dict[str, Any]],
        findings: list[dict[str, Any]],
        clusters: list[dict[str, Any]],
    ) -> str:
        gen_time = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
        inv_id = investigation.get("id", "N/A")
        inv_name = investigation.get("name", "Unnamed Investigation")
        network = investigation.get("network", "mainnet")
        snapshot_height = investigation.get("snapshot_height", "N/A")

        # Compute hash of findings for data integrity audit
        raw_summary = f"{inv_id}:{inv_name}:{len(transactions)}:{len(findings)}"
        data_hash = hashlib.sha256(raw_summary.encode()).hexdigest()

        # HTML formatting
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ChainScope Forensic Dossier - {inv_name}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }}
        .header {{ border-b: 1px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }}
        h1 {{ color: #38bdf8; margin: 0 0 10px 0; font-size: 24px; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-right: 8px; }}
        .badge-obs {{ background: #0284c7; color: white; }}
        .badge-der {{ background: #0d9488; color: white; }}
        .badge-heu {{ background: #d97706; color: white; }}
        .badge-ann {{ background: #7c3aed; color: white; }}
        .card {{ background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px; }}
        .disclaimer {{ background: #3b0764; border-left: 4px solid #a855f7; padding: 16px; margin: 20px 0; border-radius: 4px; font-size: 13px; line-height: 1.6; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }}
        th, td {{ text-align: left; padding: 10px 14px; border-bottom: 1px solid #334155; }}
        th {{ background: #0f172a; color: #94a3b8; font-weight: 600; }}
        .score {{ font-weight: 700; color: #f59e0b; }}
        .hash {{ font-family: monospace; color: #38bdf8; font-size: 12px; word-break: break-all; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>ChainScope Forensic Analysis Dossier</h1>
        <p style="color: #94a3b8; margin: 4px 0;">Case: <strong>{inv_name}</strong> (Ref: {inv_id})</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0;">Generated at: {gen_time} | Network: {network} | Snapshot Height: {snapshot_height}</p>
        <p style="color: #94a3b8; font-size: 11px;">Audit Integrity Hash: <span class="hash">{data_hash}</span></p>
    </div>

    <div class="disclaimer">
        <strong>METHODOLOGICAL NOTICE & FORENSIC DISCLAIMER:</strong><br>
        This report distinguishes strictly between <em>Observed On-Chain Data</em> (immutable records on the Bitcoin ledger), <em>Derived Data</em> (calculated fees, weights, balances), and <em>Heuristic Inferences</em> (probabilistic behavioral clustering and pattern detection). Under no circumstances does a heuristic match constitute absolute legal proof of identity or wallet ownership. External validation is required for attribution.
    </div>

    <div class="card">
        <h2>1. Investigation Context & Parameters <span class="badge badge-ann">Analyst Annotation</span></h2>
        <p><strong>Description:</strong> {investigation.get("description", "No description provided.")}</p>
        <p><strong>Target Subject:</strong> <span class="hash">{investigation.get("root_subject_id", "N/A")}</span> ({investigation.get("root_subject_type", "TXID")})</p>
    </div>

    <div class="card">
        <h2>2. Forensic Heuristic Detections <span class="badge badge-heu">Heuristic Inference</span></h2>
        <table>
            <thead>
                <tr>
                    <th>Heuristic</th>
                    <th>Confidence</th>
                    <th>Score</th>
                    <th>Severity</th>
                    <th>Explanation</th>
                </tr>
            </thead>
            <tbody>
"""
        for f in findings:
            html += f"""
                <tr>
                    <td style="font-weight: 600;">{f.get("heuristic_name")}</td>
                    <td>{f.get("confidence")}</td>
                    <td class="score">{f.get("score")}/100</td>
                    <td>{f.get("severity")}</td>
                    <td>{f.get("explanation")}</td>
                </tr>
"""
        html += """
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>3. Identified Subject Transactions <span class="badge badge-obs">Observed On-Chain Data</span></h2>
        <table>
            <thead>
                <tr>
                    <th>TXID</th>
                    <th>Block Height</th>
                    <th>Outputs (BTC)</th>
                    <th>Fee Rate (sat/vB)</th>
                </tr>
            </thead>
            <tbody>
"""
        for tx in transactions:
            html += f"""
                <tr>
                    <td class="hash">{tx.get("txid")}</td>
                    <td>{tx.get("block_height")}</td>
                    <td>{tx.get("total_output_sats", 0) / 100_000_000:.8f} BTC</td>
                    <td>{tx.get("fee_rate", 0.0)}</td>
                </tr>
"""
        html += """
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>4. Entity Clustering Summary <span class="badge badge-der">Derived Cluster</span></h2>
        <table>
            <thead>
                <tr>
                    <th>Cluster Name</th>
                    <th>Type</th>
                    <th>Confidence</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
"""
        for c in clusters:
            html += f"""
                <tr>
                    <td style="font-weight: 600;">{c.get("name")}</td>
                    <td>{c.get("cluster_type")}</td>
                    <td>{c.get("confidence")}</td>
                    <td>{c.get("description", "")}</td>
                </tr>
"""
        html += """
            </tbody>
        </table>
    </div>
</body>
</html>
"""
        return html
