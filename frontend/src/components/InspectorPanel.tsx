import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, ChevronDown, ChevronRight, CornerDownRight, ArrowUp, ArrowDown, ArrowLeftRight, ExternalLink } from 'lucide-react';
import type { HeuristicFinding } from '../types';
import { getNodeColors } from '../lib/colors';

interface Props {
  selectedNode: any | null;
  selectedEdge: any | null;
  findings: HeuristicFinding[];
  onExpandNode: (id: string) => void;
  onExplore?: (id: string, direction?: 'both' | 'upstream' | 'downstream') => void;
  onSelectRelated?: (id: string, type: 'transaction' | 'address') => void;
}

export const InspectorPanel: React.FC<Props> = ({
  selectedNode,
  selectedEdge,
  findings,
  onExpandNode,
  onExplore,
  onSelectRelated,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEvidence = (name: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="w-84 border-l border-slate-800 bg-[#0e1117] flex flex-col p-6 items-center justify-center text-center select-none shadow-sm">
        <div className="h-12 w-12 rounded-full bg-[#14171f] border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
          <ShieldCheck size={24} />
        </div>
        <h3 className="font-bold text-sm text-slate-100 mb-1">Forensic Inspector</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Select any node or flow edge in the graph canvas to explore its on-chain connections, trace upstream/downstream flows, and inspect forensic heuristics.
        </p>
      </aside>
    );
  }

  // Edge Inspection View
  if (selectedEdge) {
    const srcColors = getNodeColors({ type: 'address', full_id: selectedEdge.source }, 'hash');
    const tgtColors = getNodeColors({ type: 'address', full_id: selectedEdge.target }, 'hash');

    return (
      <aside className="w-84 border-l border-slate-800 bg-[#0e1117] flex flex-col overflow-y-auto select-none p-4 text-xs font-sans shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <span className="text-[10px] font-mono text-slate-200 font-bold uppercase bg-[#14171f] px-2.5 py-0.5 rounded border border-slate-700">
            TRANSACTION TRANSFER EDGE
          </span>
        </div>

        <div className="space-y-3.5">
          <div className="bg-[#14171f] p-3 rounded-lg border border-slate-700/80 space-y-1.5 shadow-xs">
            <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase">TRANSFER VALUE</div>
            <div className="text-xl font-mono font-bold text-white">
              {selectedEdge.amount_btc ? selectedEdge.amount_btc.toFixed(6) : ((selectedEdge.amount_sats || 0) / 100_000_000).toFixed(6)} BTC
            </div>
            <div className="text-xs font-mono text-slate-400">
              {selectedEdge.amount_sats ? selectedEdge.amount_sats.toLocaleString() : '---'} satoshis
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-semibold block mb-1">SOURCE SENDER</span>
              <div
                onClick={() => onSelectRelated && onSelectRelated(selectedEdge.source, 'address')}
                className="bg-[#14171f] hover:bg-[#1a202c] p-2.5 rounded font-mono text-[11px] text-white break-all border border-slate-700 cursor-pointer transition-colors flex items-start gap-2"
                title="Inspect source address"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: srcColors.border }} />
                <span>{selectedEdge.source}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-semibold block mb-1">DESTINATION RECIPIENT</span>
              <div
                onClick={() => onSelectRelated && onSelectRelated(selectedEdge.target, 'address')}
                className="bg-[#14171f] hover:bg-[#1a202c] p-2.5 rounded font-mono text-[11px] text-white break-all border border-slate-700 cursor-pointer transition-colors flex items-start gap-2"
                title="Inspect target address"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: tgtColors.border }} />
                <span>{selectedEdge.target}</span>
              </div>
            </div>
          </div>

          {selectedEdge.txid && (
            <button
              onClick={() => onExpandNode(selectedEdge.txid)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono text-xs font-semibold rounded border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2 shadow-xs"
            >
              <span>Inspect Underlying Transaction</span>
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Node Inspection View
  const fullId = selectedNode.full_id || selectedNode.full_address || selectedNode.id;
  const isTx = selectedNode.type === 'transaction';
  const isAddr = selectedNode.type === 'address';
  const isUtxo = selectedNode.type === 'utxo';
  const nodeColors = getNodeColors(selectedNode, 'hash');

  return (
    <aside className="w-84 border-l border-slate-800 bg-[#0e1117] flex flex-col overflow-y-auto select-none p-4 text-xs font-sans shadow-sm">
      {/* Header Badge & Copy */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full border border-white/60 shadow-xs"
            style={{ backgroundColor: nodeColors.border }}
            title="Entity Hash Color"
          />
          <span
            className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border"
            style={{
              backgroundColor: nodeColors.bg,
              borderColor: nodeColors.border,
              color: '#ffffff',
            }}
          >
            {selectedNode.type}
          </span>
        </div>
        <button
          onClick={() => handleCopy(fullId)}
          className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 hover:text-white bg-[#14171f] px-2.5 py-1 rounded border border-slate-700 transition-colors cursor-pointer font-semibold shadow-xs"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>

      {/* Full Identifier */}
      <div
        className="p-2.5 rounded-lg border font-mono text-[11px] text-white break-all mb-3 select-text shadow-xs"
        style={{
          backgroundColor: '#14171f',
          borderLeftWidth: '4px',
          borderLeftColor: nodeColors.border,
          borderTopColor: '#2b3240',
          borderRightColor: '#2b3240',
          borderBottomColor: '#2b3240',
        }}
      >
        {fullId}
      </div>

      {/* Multi-Hop Exploration Controls */}
      <div className="mb-4 p-2.5 bg-[#14171f] border border-slate-700/80 rounded-lg space-y-2 shadow-xs">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
          <ArrowLeftRight size={12} className="text-slate-300" />
          <span>Flow Exploration Hops</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExplore ? onExplore(fullId, 'upstream') : onExpandNode(fullId)}
            className="py-1.5 px-2 bg-[#1b202a] hover:bg-[#242b38] text-slate-200 border border-slate-700 rounded font-mono text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Trace upstream: fetch parent funding transactions & senders"
          >
            <ArrowUp size={12} className="text-amber-400" />
            <span>⇡ Trace Upstream</span>
          </button>
          <button
            onClick={() => onExplore ? onExplore(fullId, 'downstream') : onExpandNode(fullId)}
            className="py-1.5 px-2 bg-[#1b202a] hover:bg-[#242b38] text-slate-200 border border-slate-700 rounded font-mono text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Trace downstream: fetch spending transactions & recipients"
          >
            <ArrowDown size={12} className="text-amber-400" />
            <span>⇣ Trace Spends</span>
          </button>
        </div>
        <button
          onClick={() => onExplore ? onExplore(fullId, 'both') : onExpandNode(fullId)}
          className="w-full py-1.5 bg-[#1e2430] hover:bg-[#283142] text-amber-300 border border-amber-600/40 rounded font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          title="Center graph on this node and expand all connected hops"
        >
          <CornerDownRight size={12} />
          <span>Center & Expand (Multi-Hop)</span>
        </button>
      </div>

      {/* On-Chain Properties */}
      <div className="space-y-3 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: nodeColors.border }} />
            <span>Observed On-Chain Data</span>
          </div>
          {isTx && (
            <a
              href={`https://mempool.space/tx/${fullId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline font-semibold"
            >
              mempool.space ↗
            </a>
          )}
          {isAddr && (
            <a
              href={`https://mempool.space/address/${fullId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline font-semibold"
            >
              mempool.space ↗
            </a>
          )}
        </div>

        {isTx && (
          <div className="bg-[#14171f] rounded-lg p-3 border border-slate-700/80 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Block Height:</span>
              <span className="font-mono text-white font-bold">
                {selectedNode.block_height !== undefined ? `#${selectedNode.block_height.toLocaleString()}` : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Virtual Size:</span>
              <span className="font-mono text-slate-100">{selectedNode.vsize ? `${selectedNode.vsize} vB` : '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Total Outputs:</span>
              <span className="font-mono text-white font-bold">
                {selectedNode.total_output_sats !== undefined
                  ? `${(selectedNode.total_output_sats / 100_000_000).toFixed(6)} BTC`
                  : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Fee / Rate:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {selectedNode.fee_sats !== undefined ? `${selectedNode.fee_sats} sats` : '---'} ({selectedNode.fee_rate || 0} sat/vB)
              </span>
            </div>

            {/* Inputs & Outputs Breakdown */}
            {selectedNode.inputs && selectedNode.inputs.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  Senders / Inputs ({selectedNode.inputs.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {selectedNode.inputs.map((inp: any, idx: number) => {
                    const inpColors = getNodeColors({ type: 'address', full_id: inp.address || '' }, 'hash');
                    return (
                      <div
                        key={idx}
                        onClick={() => inp.address && onSelectRelated && onSelectRelated(inp.address, 'address')}
                        className="flex items-center justify-between p-1.5 rounded bg-[#1a1f29] hover:bg-[#232938] font-mono text-[10px] border border-slate-750 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: inpColors.border }} />
                          <span className="text-slate-200 hover:text-white font-semibold truncate">
                            {inp.address || 'Coinbase'}
                          </span>
                        </div>
                        <span className="text-slate-300 font-medium">
                          {inp.value_sats ? `${(inp.value_sats / 100_000_000).toFixed(4)} BTC` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedNode.outputs && selectedNode.outputs.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                  Recipients / Outputs ({selectedNode.outputs.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {selectedNode.outputs.map((out: any, idx: number) => {
                    const outColors = getNodeColors({ type: 'address', full_id: out.address || '' }, 'hash');
                    return (
                      <div
                        key={idx}
                        onClick={() => out.address && onSelectRelated && onSelectRelated(out.address, 'address')}
                        className="flex items-center justify-between p-1.5 rounded bg-[#1a1f29] hover:bg-[#232938] font-mono text-[10px] border border-slate-750 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: outColors.border }} />
                          <span className="text-slate-200 hover:text-white font-semibold truncate">
                            {out.address || `Output #${out.index}`}
                          </span>
                        </div>
                        <span className="text-emerald-400 font-bold">
                          {out.value_sats ? `${(out.value_sats / 100_000_000).toFixed(4)} BTC` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {isAddr && (
          <div className="bg-[#14171f] rounded-lg p-3 border border-slate-700/80 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Current Balance:</span>
              <div className="text-right">
                <span className="font-mono text-emerald-400 font-bold block text-sm">
                  {((selectedNode.current_balance_sats ?? selectedNode.balance_sats ?? 0) / 100_000_000).toFixed(8)} BTC
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {(selectedNode.current_balance_sats ?? selectedNode.balance_sats ?? 0).toLocaleString()} sats
                </span>
              </div>
            </div>
            {selectedNode.total_received_sats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Received:</span>
                <span className="font-mono text-white font-semibold">
                  {(selectedNode.total_received_sats / 100_000_000).toFixed(6)} BTC
                </span>
              </div>
            )}
            {selectedNode.total_spent_sats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Spent:</span>
                <span className="font-mono text-white font-semibold">
                  {(selectedNode.total_spent_sats / 100_000_000).toFixed(6)} BTC
                </span>
              </div>
            )}
            {selectedNode.transaction_count !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">On-Chain Activity:</span>
                <span className="font-mono text-white font-bold">{selectedNode.transaction_count.toLocaleString()} txs</span>
              </div>
            )}
            {selectedNode.transaction_count > 50 && (
              <div className="p-2 rounded bg-[#181c26] border border-amber-600/30 text-[10px] text-amber-300 font-mono leading-relaxed">
                Active high-volume entity ({selectedNode.transaction_count.toLocaleString()} total transactions). Graph canvas visualizes the active forensic topological window.
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-medium">Script Format:</span>
              <span className="font-mono text-slate-200 font-bold uppercase bg-[#1a1f29] px-2 py-0.5 rounded border border-slate-700">
                {selectedNode.address_type || selectedNode.script_type || 'p2wpkh'}
              </span>
            </div>
          </div>
        )}

        {isUtxo && (
          <div className="bg-[#14171f] rounded-lg p-3 border border-slate-700/80 space-y-2 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Output Value:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {selectedNode.value_sats ? `${(selectedNode.value_sats / 100_000_000).toFixed(8)} BTC` : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Satoshis:</span>
              <span className="font-mono text-white font-semibold">{selectedNode.value_sats ? selectedNode.value_sats.toLocaleString() : '---'} sats</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Spent Status:</span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${selectedNode.spent ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'}`}>
                {selectedNode.spent ? 'SPENT' : 'UNSPENT UTXO'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Heuristic Findings */}
      <div className="space-y-2 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Forensic Heuristic Findings</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold">
            {findings.length} triggered
          </span>
        </div>

        {findings.length === 0 ? (
          <div className="bg-[#14171f] border border-slate-800 rounded-lg p-3 text-slate-400 font-mono text-[11px] text-center">
            No heuristic flags detected for this entity.
          </div>
        ) : (
          findings.map((f: any, idx) => {
            const hName = f.name || f.heuristic_name || 'Heuristic';
            const evidence = f.evidence || f.evidence_json;
            const itemKey = `${hName}-${idx}`;
            return (
              <div key={itemKey} className="bg-[#14171f] border border-slate-700/80 rounded-lg p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs font-mono">
                    {hName.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-amber-950/60 text-amber-300 rounded border border-amber-800/80">
                      {f.score ? `${f.score}/100` : 'Flag'}
                    </span>
                    <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">
                      {f.confidence}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                  {f.explanation}
                </p>

                {evidence && (
                  <div className="pt-1.5 border-t border-slate-800">
                    <button
                      onClick={() => toggleEvidence(itemKey)}
                      className="text-[10px] font-mono text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      {expandedEvidence[itemKey] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>{expandedEvidence[itemKey] ? 'Hide Evidence' : 'Show Evidence'}</span>
                    </button>
                    {expandedEvidence[itemKey] && (
                      <pre className="mt-2 p-2.5 bg-[#0b0e14] rounded font-mono text-[10px] text-emerald-300 overflow-x-auto border border-slate-800 leading-normal">
                        {JSON.stringify(evidence, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
