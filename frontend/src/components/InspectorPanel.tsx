import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, CornerDownRight, ArrowUp, ArrowDown, ArrowLeftRight, ExternalLink } from 'lucide-react';
import type { HeuristicFinding } from '../types';
import { getNodeColors } from '../lib/colors';
import { InfoTooltip } from './InfoTooltip';

interface Props {
  selectedNode: any | null;
  selectedEdge: any | null;
  findings: HeuristicFinding[];
  onExpandNode: (id: string) => void;
  onExplore?: (id: string, direction?: 'both' | 'upstream' | 'downstream') => void;
  onSelectRelated?: (id: string, type: 'transaction' | 'address') => void;
}

const HEURISTIC_TITLES: Record<string, { label: string; desc: string }> = {
  common_input_ownership: {
    label: 'Common-Input Ownership (CIOH)',
    desc: 'Input addresses are presumed to be under control of the same entity.',
  },
  change_address_detection: {
    label: 'Change Address Detection',
    desc: 'Output likely returning change to the transaction sender.',
  },
  address_reuse: {
    label: 'Address Reuse',
    desc: 'Address was reused across multiple transactions, reducing privacy.',
  },
  peel_chain: {
    label: 'Peel Chain Pattern',
    desc: 'Sequential payment chain peeling off funds with successive change forwardings.',
  },
  consolidation: {
    label: 'UTXO Consolidation',
    desc: 'Merging multiple smaller inputs into 1 or 2 outputs.',
  },
  fan_in: {
    label: 'Convergence (Fan-in)',
    desc: 'Multiple distinct sources converging into a single destination.',
  },
  fan_out: {
    label: 'Dispersion (Fan-out)',
    desc: 'Distribution of funds across numerous distinct recipient outputs.',
  },
  batch_payment: {
    label: 'Batch Payment',
    desc: 'Commercial payout structure paying multiple recipients simultaneously.',
  },
  coinjoin_suspicion: {
    label: 'CoinJoin-like Pattern',
    desc: 'Collaborative transaction structure with multiple equal-denomination outputs.',
  },
  dust_detection: {
    label: 'Dust Output',
    desc: 'Micro-amount output (≤ 546 satoshis) potentially used for tracing.',
  },
  round_amounts: {
    label: 'Round Amount Indicator',
    desc: 'Clean integer or decimal value typically distinguishing payment from change.',
  },
  chain_transaction: {
    label: 'Rapid Chained Transactions',
    desc: 'Immediate successive output spends across consecutive blocks.',
  },
};

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
      <aside className="w-84 border-l border-neutral-800 bg-[#0a0a0a] flex flex-col p-6 items-center justify-center text-center select-none shadow-xs">
        <div className="h-10 w-10 rounded-full bg-[#141414] border border-neutral-700 flex items-center justify-center text-white mb-3 shadow-inner">
          <ArrowLeftRight size={20} />
        </div>
        <h3 className="font-bold text-sm text-neutral-100 mb-1">Inspector</h3>
        <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
          Select any node or transaction in the graph or table to view its properties, explore connections, and inspect heuristic findings.
        </p>
      </aside>
    );
  }

  // Edge Inspection View
  if (selectedEdge) {
    const srcColors = getNodeColors({ type: 'address', full_id: selectedEdge.source }, 'hash');
    const tgtColors = getNodeColors({ type: 'address', full_id: selectedEdge.target }, 'hash');

    return (
      <aside className="w-84 border-l border-neutral-800 bg-[#0a0a0a] flex flex-col overflow-y-auto select-none p-4 text-xs font-sans shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
          <span className="text-[10px] font-mono text-neutral-200 font-bold uppercase bg-[#141414] px-2.5 py-0.5 rounded border border-neutral-700">
            Transfer Edge
          </span>
        </div>

        <div className="space-y-3.5">
          <div className="bg-[#141414] p-3 rounded-lg border border-neutral-800 space-y-1.5 shadow-xs">
            <div className="text-[11px] font-mono text-neutral-400 font-semibold uppercase">Transfer Value</div>
            <div className="text-xl font-mono font-bold text-white">
              {selectedEdge.amount_btc ? selectedEdge.amount_btc.toFixed(6) : ((selectedEdge.amount_sats || 0) / 100_000_000).toFixed(6)} BTC
            </div>
            <div className="text-xs font-mono text-neutral-400">
              {selectedEdge.amount_sats ? selectedEdge.amount_sats.toLocaleString() : '---'} satoshis
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 font-semibold block mb-1">Source Sender</span>
              <div
                onClick={() => onSelectRelated && onSelectRelated(selectedEdge.source, 'address')}
                className="bg-[#141414] hover:bg-[#1f1f1f] p-2.5 rounded font-mono text-[11px] text-white break-all border border-neutral-800 cursor-pointer transition-colors flex items-start gap-2"
                title="Inspect source address"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: srcColors.border }} />
                <span>{selectedEdge.source}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-400 font-semibold block mb-1">Destination Recipient</span>
              <div
                onClick={() => onSelectRelated && onSelectRelated(selectedEdge.target, 'address')}
                className="bg-[#141414] hover:bg-[#1f1f1f] p-2.5 rounded font-mono text-[11px] text-white break-all border border-neutral-800 cursor-pointer transition-colors flex items-start gap-2"
                title="Inspect target address"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: tgtColors.border }} />
                <span>{selectedEdge.target}</span>
              </div>
            </div>
          </div>

          {selectedEdge.txid && (
            <button
              type="button"
              onClick={() => onExpandNode(selectedEdge.txid)}
              className="w-full py-2 bg-[#171717] hover:bg-[#242424] text-white font-mono text-xs font-semibold rounded border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2 shadow-xs"
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
    <aside className="w-84 border-l border-neutral-800 bg-[#0a0a0a] flex flex-col overflow-y-auto select-none p-4 text-xs font-sans shadow-xs">
      {/* Header Badge & Copy */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full border border-white/60 shadow-xs"
            style={{ backgroundColor: nodeColors.border }}
          />
          <span
            className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border"
            style={{
              backgroundColor: nodeColors.bg,
              borderColor: nodeColors.border,
              color: '#ffffff',
            }}
          >
            {isTx ? 'Transaction' : isAddr ? 'Address' : 'UTXO'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(fullId)}
          className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 hover:text-white bg-[#141414] px-2.5 py-1 rounded border border-neutral-700 transition-colors cursor-pointer font-semibold shadow-xs"
        >
          {copied ? <Check size={12} className="text-white" /> : <Copy size={12} />}
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>

      {/* Full Identifier */}
      <div
        className="p-2.5 rounded-lg border font-mono text-[11px] text-white break-all mb-3 select-text shadow-xs"
        style={{
          backgroundColor: '#141414',
          borderLeftWidth: '4px',
          borderLeftColor: nodeColors.border,
          borderTopColor: '#2b2b2b',
          borderRightColor: '#2b2b2b',
          borderBottomColor: '#2b2b2b',
        }}
      >
        {fullId}
      </div>

      {/* Multi-Hop Exploration Controls */}
      <div className="mb-4 p-2.5 bg-[#141414] border border-neutral-800 rounded-lg space-y-2 shadow-xs">
        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight size={12} className="text-neutral-300" />
            <span>Flow Exploration</span>
          </div>
          <InfoTooltip content="Trace transaction hops upstream towards funding sources or downstream towards output spends." />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onExplore ? onExplore(fullId, 'upstream') : onExpandNode(fullId)}
            className="py-1.5 px-2 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-700 rounded font-mono text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Trace upstream to parent funding transactions"
          >
            <ArrowUp size={12} className="text-white" />
            <span>⇡ Trace Upstream</span>
          </button>
          <button
            type="button"
            onClick={() => onExplore ? onExplore(fullId, 'downstream') : onExpandNode(fullId)}
            className="py-1.5 px-2 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-700 rounded font-mono text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Trace downstream to child spending transactions"
          >
            <ArrowDown size={12} className="text-white" />
            <span>⇣ Trace Spends</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onExplore ? onExplore(fullId, 'both') : onExpandNode(fullId)}
          className="w-full py-1.5 bg-[#222222] hover:bg-[#2e2e2e] text-white border border-neutral-600 rounded font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          title="Center graph on this entity and explore its full connections"
        >
          <CornerDownRight size={12} />
          <span>Center & Expand (Both Hops)</span>
        </button>
      </div>

      {/* On-Chain Properties */}
      <div className="space-y-3 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: nodeColors.border }} />
            <span>Observed On-Chain Data</span>
          </div>
          {isTx && (
            <a
              href={`https://mempool.space/tx/${fullId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-neutral-300 hover:text-white underline font-semibold"
            >
              mempool.space ↗
            </a>
          )}
          {isAddr && (
            <a
              href={`https://mempool.space/address/${fullId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-neutral-300 hover:text-white underline font-semibold"
            >
              mempool.space ↗
            </a>
          )}
        </div>

        {isTx && (
          <div className="bg-[#141414] rounded-lg p-3 border border-neutral-800 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Block Height:</span>
              <span className="font-mono text-white font-bold">
                {selectedNode.block_height !== undefined ? `#${selectedNode.block_height.toLocaleString()}` : 'Unconfirmed'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Virtual Size:</span>
              <span className="font-mono text-neutral-200">{selectedNode.vsize ? `${selectedNode.vsize} vB` : '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Total Output:</span>
              <span className="font-mono text-white font-bold">
                {selectedNode.total_output_sats !== undefined
                  ? `${(selectedNode.total_output_sats / 100_000_000).toFixed(6)} BTC`
                  : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Fee / Rate:</span>
              <span className="font-mono text-neutral-200 font-bold">
                {selectedNode.fee_sats !== undefined ? `${selectedNode.fee_sats} sats` : '---'} ({selectedNode.fee_rate || 0} sat/vB)
              </span>
            </div>

            {/* Inputs & Outputs Breakdown */}
            {selectedNode.inputs && selectedNode.inputs.length > 0 && (
              <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold block">
                  Senders / Inputs ({selectedNode.inputs.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {selectedNode.inputs.map((inp: any, idx: number) => {
                    const inpColors = getNodeColors({ type: 'address', full_id: inp.address || '' }, 'hash');
                    return (
                      <div
                        key={idx}
                        onClick={() => inp.address && onSelectRelated && onSelectRelated(inp.address, 'address')}
                        className="flex items-center justify-between p-1.5 rounded bg-[#1a1a1a] hover:bg-[#262626] font-mono text-[10px] border border-neutral-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: inpColors.border }} />
                          <span className="text-neutral-200 hover:text-white font-semibold truncate">
                            {inp.address || 'Coinbase'}
                          </span>
                        </div>
                        <span className="text-neutral-300 font-medium">
                          {inp.value_sats ? `${(inp.value_sats / 100_000_000).toFixed(4)} BTC` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedNode.outputs && selectedNode.outputs.length > 0 && (
              <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold block">
                  Recipients / Outputs ({selectedNode.outputs.length})
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {selectedNode.outputs.map((out: any, idx: number) => {
                    const outColors = getNodeColors({ type: 'address', full_id: out.address || '' }, 'hash');
                    return (
                      <div
                        key={idx}
                        onClick={() => out.address && onSelectRelated && onSelectRelated(out.address, 'address')}
                        className="flex items-center justify-between p-1.5 rounded bg-[#1a1a1a] hover:bg-[#262626] font-mono text-[10px] border border-neutral-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: outColors.border }} />
                          <span className="text-neutral-200 hover:text-white font-semibold truncate">
                            {out.address || `Output #${out.index}`}
                          </span>
                        </div>
                        <span className="text-white font-bold">
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
          <div className="bg-[#141414] rounded-lg p-3 border border-neutral-800 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Current Balance:</span>
              <div className="text-right">
                <span className="font-mono text-white font-bold block text-sm">
                  {((selectedNode.current_balance_sats ?? selectedNode.balance_sats ?? 0) / 100_000_000).toFixed(8)} BTC
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  {(selectedNode.current_balance_sats ?? selectedNode.balance_sats ?? 0).toLocaleString()} sats
                </span>
              </div>
            </div>
            {selectedNode.total_received_sats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Total Received:</span>
                <span className="font-mono text-white font-semibold">
                  {(selectedNode.total_received_sats / 100_000_000).toFixed(6)} BTC
                </span>
              </div>
            )}
            {selectedNode.total_spent_sats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Total Spent:</span>
                <span className="font-mono text-white font-semibold">
                  {(selectedNode.total_spent_sats / 100_000_000).toFixed(6)} BTC
                </span>
              </div>
            )}
            {selectedNode.transaction_count !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Transactions:</span>
                <span className="font-mono text-white font-bold">{selectedNode.transaction_count.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-neutral-800">
              <span className="text-neutral-400 font-medium">Script Format:</span>
              <span className="font-mono text-neutral-200 font-bold uppercase bg-[#1f1f1f] px-2 py-0.5 rounded border border-neutral-700">
                {selectedNode.address_type || selectedNode.script_type || 'p2wpkh'}
              </span>
            </div>
          </div>
        )}

        {isUtxo && (
          <div className="bg-[#141414] rounded-lg p-3 border border-neutral-800 space-y-2 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">UTXO Value:</span>
              <span className="font-mono text-white font-bold">
                {selectedNode.value_sats ? `${(selectedNode.value_sats / 100_000_000).toFixed(8)} BTC` : '---'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Satoshis:</span>
              <span className="font-mono text-white font-semibold">{selectedNode.value_sats ? selectedNode.value_sats.toLocaleString() : '---'} sats</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Status:</span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${selectedNode.spent ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' : 'bg-white text-black border border-white'}`}>
                {selectedNode.spent ? 'SPENT' : 'UNSPENT UTXO'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Heuristics Detected */}
      <div className="space-y-2 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span>Heuristic Findings</span>
          </div>
          <span className="text-[10px] font-mono text-white font-bold">
            {findings.length} triggered
          </span>
        </div>

        {findings.length === 0 ? (
          <div className="bg-[#141414] border border-neutral-800 rounded-lg p-3 text-neutral-400 font-mono text-[11px] text-center">
            No heuristic flags detected for this entity.
          </div>
        ) : (
          findings.map((f: any, idx) => {
            const hId = f.name || f.heuristic_name || 'heuristic';
            const meta = HEURISTIC_TITLES[hId] || {
              label: hId.replace(/_/g, ' '),
              desc: 'On-chain flow heuristic rule.',
            };
            const evidence = f.evidence || f.evidence_json;
            const itemKey = `${hId}-${idx}`;
            const confLabel = f.confidence === 'high' ? 'High' : f.confidence === 'low' ? 'Low' : 'Medium';

            return (
              <div key={itemKey} className="bg-[#141414] border border-neutral-800 rounded-lg p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-xs font-sans">
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#222222] text-white rounded border border-neutral-700">
                      Score: {f.score ? `${f.score}/100` : 'Flag'}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#171717] text-neutral-300 rounded border border-neutral-700">
                      {confLabel}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-200 leading-relaxed font-sans">
                  {f.explanation}
                </p>

                <div className="text-[10px] text-neutral-400 bg-[#0a0a0a] p-2 rounded border border-neutral-800">
                  <span className="font-semibold text-neutral-300 block mb-0.5">What this implies:</span>
                  <span>{meta.desc}</span>
                </div>

                {evidence && (
                  <div className="pt-1.5 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => toggleEvidence(itemKey)}
                      className="text-[10px] font-mono text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      {expandedEvidence[itemKey] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>{expandedEvidence[itemKey] ? 'Hide Evidence' : 'Show Evidence'}</span>
                    </button>
                    {expandedEvidence[itemKey] && (
                      <pre className="mt-2 p-2.5 bg-black rounded font-mono text-[10px] text-neutral-200 overflow-x-auto border border-neutral-800 leading-normal">
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
