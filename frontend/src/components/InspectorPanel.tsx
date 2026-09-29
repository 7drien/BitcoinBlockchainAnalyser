import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, ChevronDown, ChevronRight, CornerDownRight, ArrowUp, ArrowDown, ArrowLeftRight, ExternalLink } from 'lucide-react';
import type { HeuristicFinding } from '../types';

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
      <aside className="w-84 border-l border-slate-800 bg-[#090d16] flex flex-col p-6 items-center justify-center text-center select-none">
        <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <ShieldCheck size={24} />
        </div>
        <h3 className="font-semibold text-sm text-slate-300 mb-1">Forensic Inspector</h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          Select any node or flow edge in the graph canvas to explore its on-chain connections, trace upstream/downstream flows, and inspect forensic heuristics.
        </p>
      </aside>
    );
  }

  // Edge Inspection View
  if (selectedEdge) {
    return (
      <aside className="w-84 border-l border-slate-800 bg-[#090d16] flex flex-col overflow-y-auto select-none p-4 text-xs font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
            TRANSACTION TRANSFER EDGE
          </span>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="text-[11px] font-mono text-slate-400">TRANSFER VALUE</div>
            <div className="text-lg font-mono font-bold text-slate-100">
              {selectedEdge.amount_btc ? selectedEdge.amount_btc.toFixed(6) : ((selectedEdge.amount_sats || 0) / 100_000_000).toFixed(6)} BTC
            </div>
            <div className="text-xs font-mono text-slate-500">
              {selectedEdge.amount_sats ? selectedEdge.amount_sats.toLocaleString() : '---'} satoshis
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block mb-1">SOURCE SENDER</span>
              <div
                onClick={() => onSelectRelated && onSelectRelated(selectedEdge.source, 'address')}
                className="bg-slate-900 hover:bg-slate-850 p-2 rounded font-mono text-[11px] text-cyan-300 break-all border border-slate-800 cursor-pointer transition-colors"
                title="Inspect source address"
              >
                {selectedEdge.source}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 block mb-1">DESTINATION RECIPIENT</span>
              <div
                onClick={() => onSelectRelated && onSelectRelated(selectedEdge.target, 'address')}
                className="bg-slate-900 hover:bg-slate-850 p-2 rounded font-mono text-[11px] text-cyan-300 break-all border border-slate-800 cursor-pointer transition-colors"
                title="Inspect target address"
              >
                {selectedEdge.target}
              </div>
            </div>
          </div>

          {selectedEdge.txid && (
            <button
              onClick={() => onExpandNode(selectedEdge.txid)}
              className="w-full py-2 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-mono text-xs rounded border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>Inspect Underlying Transaction</span>
              <ExternalLink size={12} />
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
  const isCoinbase = selectedNode.type === 'coinbase';

  return (
    <aside className="w-84 border-l border-slate-800 bg-[#090d16] flex flex-col overflow-y-auto select-none p-4 text-xs font-sans">
      {/* Header Badge & Copy */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <span
          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
            isTx
              ? 'bg-purple-950 text-purple-300 border-purple-800/60'
              : isAddr
              ? 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
              : isCoinbase
              ? 'bg-amber-950 text-amber-300 border-amber-800/60'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
          }`}
        >
          {selectedNode.type}
        </span>
        <button
          onClick={() => handleCopy(fullId)}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800 transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>

      {/* Full Identifier */}
      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 break-all mb-3 select-text">
        {fullId}
      </div>

      {/* Multi-Hop Exploration Controls */}
      <div className="mb-4 p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
          <ArrowLeftRight size={11} className="text-cyan-400" />
          <span>Graph Exploration Hops</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExplore ? onExplore(fullId, 'upstream') : onExpandNode(fullId)}
            className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded font-mono text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Trace upstream: fetch parent funding transactions & senders"
          >
            <ArrowUp size={11} className="text-cyan-400" />
            <span>⇡ Trace Upstream</span>
          </button>
          <button
            onClick={() => onExplore ? onExplore(fullId, 'downstream') : onExpandNode(fullId)}
            className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded font-mono text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Trace downstream: fetch spending transactions & recipients"
          >
            <ArrowDown size={11} className="text-cyan-400" />
            <span>⇣ Trace Spends</span>
          </button>
        </div>
        <button
          onClick={() => onExplore ? onExplore(fullId, 'both') : onExpandNode(fullId)}
          className="w-full py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 rounded font-mono text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          title="Center graph on this node and expand all connected hops"
        >
          <CornerDownRight size={12} />
          <span>Center & Expand (2 Hops)</span>
        </button>
      </div>

      {/* On-Chain Properties */}
      <div className="space-y-3 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Observed On-Chain Data</span>
          </div>
          {isTx && (
            <a
              href={`https://mempool.space/tx/${fullId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              mempool.space ↗
            </a>
          )}
          {isAddr && (
            <a
              href={`https://mempool.space/address/${fullId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              mempool.space ↗
            </a>
          )}
        </div>

        {isTx && (
          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Block Height:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {selectedNode.block_height !== undefined ? `#${selectedNode.block_height.toLocaleString()}` : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Virtual Size:</span>
              <span className="font-mono text-slate-200">{selectedNode.vsize ? `${selectedNode.vsize} vB` : '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Outputs:</span>
              <span className="font-mono text-slate-100 font-bold">
                {selectedNode.total_output_sats !== undefined
                  ? `${(selectedNode.total_output_sats / 100_000_000).toFixed(6)} BTC`
                  : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Fee / Rate:</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {selectedNode.fee_sats !== undefined ? `${selectedNode.fee_sats} sats` : '---'} ({selectedNode.fee_rate || 0} sat/vB)
              </span>
            </div>

            {/* Inputs & Outputs Breakdown */}
            {selectedNode.inputs && selectedNode.inputs.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Senders / Inputs ({selectedNode.inputs.length})
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {selectedNode.inputs.map((inp: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => inp.address && onSelectRelated && onSelectRelated(inp.address, 'address')}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-950 hover:bg-slate-850 font-mono text-[10px] border border-slate-850 cursor-pointer"
                    >
                      <span className="text-cyan-300 truncate max-w-[140px]">
                        {inp.address || 'Coinbase'}
                      </span>
                      <span className="text-slate-400">
                        {inp.value_sats ? `${(inp.value_sats / 100_000_000).toFixed(4)} BTC` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.outputs && selectedNode.outputs.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Recipients / Outputs ({selectedNode.outputs.length})
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {selectedNode.outputs.map((out: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => out.address && onSelectRelated && onSelectRelated(out.address, 'address')}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-950 hover:bg-slate-850 font-mono text-[10px] border border-slate-850 cursor-pointer"
                    >
                      <span className="text-slate-200 truncate max-w-[140px]">
                        {out.address || `Output #${out.index}`}
                      </span>
                      <span className="text-emerald-400 font-medium">
                        {out.value_sats ? `${(out.value_sats / 100_000_000).toFixed(4)} BTC` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isAddr && (
          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Balance:</span>
              <div className="text-right">
                <span className="font-mono text-emerald-400 font-bold block">
                  {((selectedNode.current_balance_sats ?? selectedNode.balance_sats ?? 0) / 100_000_000).toFixed(8)} BTC
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {(selectedNode.current_balance_sats ?? selectedNode.balance_sats ?? 0).toLocaleString()} sats
                </span>
              </div>
            </div>
            {selectedNode.total_received_sats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Received:</span>
                <span className="font-mono text-slate-300">
                  {(selectedNode.total_received_sats / 100_000_000).toFixed(6)} BTC
                </span>
              </div>
            )}
            {selectedNode.total_spent_sats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Spent:</span>
                <span className="font-mono text-slate-300">
                  {(selectedNode.total_spent_sats / 100_000_000).toFixed(6)} BTC
                </span>
              </div>
            )}
            {selectedNode.transaction_count !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tx Activity Count:</span>
                <span className="font-mono text-slate-200 font-semibold">{selectedNode.transaction_count} txs</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Script Format:</span>
              <span className="font-mono text-slate-200 uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                {selectedNode.address_type || selectedNode.script_type || 'p2wpkh'}
              </span>
            </div>
          </div>
        )}

        {isUtxo && (
          <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Output Value:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {selectedNode.value_sats ? `${(selectedNode.value_sats / 100_000_000).toFixed(8)} BTC` : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Satoshis:</span>
              <span className="font-mono text-slate-200">{selectedNode.value_sats ? selectedNode.value_sats.toLocaleString() : '---'} sats</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Spent Status:</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${selectedNode.spent ? 'bg-red-950 text-red-400 border border-red-800/60' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'}`}>
                {selectedNode.spent ? 'SPENT' : 'UNSPENT UTXO'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Heuristic Findings */}
      <div className="space-y-2 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Forensic Heuristic Findings</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {findings.length} triggered
          </span>
        </div>

        {findings.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-850 rounded-lg p-3 text-slate-500 font-mono text-[11px] text-center">
            No heuristic flags detected for this entity.
          </div>
        ) : (
          findings.map((f: any, idx) => {
            const hName = f.name || f.heuristic_name || 'Heuristic';
            const evidence = f.evidence || f.evidence_json;
            const itemKey = `${hName}-${idx}`;
            return (
              <div key={itemKey} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs font-mono">
                    {hName.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-800/60">
                      {f.score ? `${f.score}/100` : 'Flag'}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1 py-0.2 bg-slate-800 text-slate-300 rounded">
                      {f.confidence}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-normal">
                  {f.explanation}
                </p>

                {evidence && (
                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleEvidence(itemKey)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {expandedEvidence[itemKey] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <span>{expandedEvidence[itemKey] ? 'Hide Evidence' : 'Show Evidence'}</span>
                    </button>
                    {expandedEvidence[itemKey] && (
                      <pre className="mt-1.5 p-2 bg-slate-950 rounded font-mono text-[9px] text-slate-300 overflow-x-auto border border-slate-800">
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
