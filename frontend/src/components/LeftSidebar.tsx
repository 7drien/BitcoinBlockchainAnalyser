import React, { useState } from 'react';
import { SlidersHorizontal, ActivitySquare, Play, RotateCcw, ArrowUpRight } from 'lucide-react';
import { getNodeColors } from '../lib/colors';
import { InfoTooltip } from './InfoTooltip';

export interface FilterState {
  address: string;
  unit: 'btc' | 'sats';
  minAmount: string;
  maxAmount: string;
  pattern: string;
  minHeight: string;
  maxHeight: string;
  minInputs: string;
  maxInputs: string;
  minOutputs: string;
  maxOutputs: string;
}

interface Props {
  enabledHeuristics: Record<string, boolean>;
  onToggleHeuristic: (name: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  filterValues: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onResetFilter: () => void;
  onSelectTransaction: (txid: string) => void;
  matchingTransactions: any[];
}

export const LeftSidebar: React.FC<Props> = ({
  enabledHeuristics,
  onToggleHeuristic,
  onRunAnalysis,
  isAnalyzing,
  filterValues,
  onFilterChange,
  onResetFilter,
  onSelectTransaction,
  matchingTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<'filter' | 'heuristics'>('filter');

  const heuristicsList = [
    {
      id: 'common_input_ownership',
      label: 'Common-Input Ownership (CIOH)',
      tag: 'Clustering',
      desc: 'Assumes all input addresses in a multi-input transaction belong to the same entity. Invalidated on CoinJoin.',
      detail: 'Foundational rule for Bitcoin wallet clustering. If multiple addresses co-sign inputs to fund a transaction, they are presumed to be under common control.',
    },
    {
      id: 'change_address_detection',
      label: 'Change Address Detection',
      tag: 'Change Output',
      desc: 'Identifies the output likely returning change to the sender based on script matching, unrounded satoshi value, or fresh address status.',
      detail: 'Because Bitcoin transactions consume whole UTXOs, any remainder after miner fees is sent back to a newly generated change address controlled by the sender.',
    },
    {
      id: 'address_reuse',
      label: 'Address Reuse',
      tag: 'Privacy Loss',
      desc: 'Identifies addresses reused across multiple transactions, compromising recipient privacy and enabling clustering.',
      detail: 'Address reuse directly links distinct on-chain activities, allowing observers to map wallet balances and counterparties.',
    },
    {
      id: 'peel_chain',
      label: 'Peel Chain Pattern',
      tag: 'Sequential Flow',
      desc: 'Successive transactions where a large sum is peeled off step-by-step (one small payment output, with remainder forwarded to a fresh change address).',
      detail: 'A classic pattern seen in automated withdrawals, payroll, or money laundering sequences.',
    },
    {
      id: 'consolidation',
      label: 'UTXO Consolidation',
      tag: 'Merge',
      desc: 'Merges many small input UTXOs into 1 or 2 outputs, typically executed to minimize future transaction fees.',
      detail: 'Frequently performed by exchanges, services, and advanced users during periods of low mempool fee rates.',
    },
    {
      id: 'fan_in',
      label: 'Convergence (Fan-in)',
      tag: 'Aggregation',
      desc: 'Multiple distinct source addresses converge to fund a single destination or transaction.',
      detail: 'Commonly represents treasury sweeps or sweeping scattered balances into cold storage.',
    },
    {
      id: 'fan_out',
      label: 'Dispersion (Fan-out)',
      tag: 'Distribution',
      desc: 'A single transaction distributes funds across numerous recipient outputs.',
      detail: 'Standard distribution structure for payments, dividends, or dispersing funds across multiple addresses.',
    },
    {
      id: 'batch_payment',
      label: 'Batch Payment',
      tag: 'Commercial',
      desc: 'Commercial payout structure with few inputs and many diverse outputs, reducing aggregate blockchain fees.',
      detail: 'Standard operational procedure for Bitcoin exchanges and payment processors to optimize byte space.',
    },
    {
      id: 'coinjoin_suspicion',
      label: 'CoinJoin-like Pattern',
      tag: 'Mixing',
      desc: 'Collaborative transaction with multiple inputs and multiple outputs of identical satoshi denominations.',
      detail: 'Equalizes output amounts (e.g. 0.1 BTC each) to break deterministic transaction graph linkability.',
    },
    {
      id: 'dust_detection',
      label: 'Dust Output',
      tag: 'Micro-Amount',
      desc: 'Very small outputs (≤ 546 satoshis), often indicating dusting attacks or tracking probes.',
      detail: 'Dusting attempts to trick users into spending tainted micro-UTXOs alongside their main balance, revealing wallet ownership.',
    },
    {
      id: 'round_amounts',
      label: 'Round Amount Indicator',
      tag: 'Contextual',
      desc: 'Clean integer or decimal values (e.g. 0.1 BTC, 1.0 BTC), typically indicating the actual payment output.',
      detail: 'Human spenders usually pay rounded amounts, while change outputs absorb decimal fractions and miner fees.',
    },
    {
      id: 'chain_transaction',
      label: 'Rapid Chained Transactions',
      tag: 'Cascade',
      desc: 'Immediate successive spends of newly created outputs across consecutive blocks without delay.',
      detail: 'Indicates automated scripting, rapid forwarding, or urgent relay mechanisms.',
    },
  ];

  return (
    <aside className="w-84 border-r border-neutral-800 bg-[#0a0a0a] flex flex-col select-none text-xs font-sans shadow-xs">
      {/* Sidebar Tab Switcher */}
      <div className="flex border-b border-neutral-800 bg-[#050505] p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('filter')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all font-semibold text-xs cursor-pointer ${
            activeTab === 'filter'
              ? 'bg-[#1c1c1c] text-white border border-neutral-700 shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <SlidersHorizontal size={13} className={activeTab === 'filter' ? 'text-white' : 'text-neutral-500'} />
          <span>Filters</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('heuristics')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all font-semibold text-xs cursor-pointer ${
            activeTab === 'heuristics'
              ? 'bg-[#1c1c1c] text-white border border-neutral-700 shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <ActivitySquare size={13} className={activeTab === 'heuristics' ? 'text-white' : 'text-neutral-500'} />
          <span>Heuristics</span>
        </button>
      </div>

      {/* Tab 1: Local Real-time Filters */}
      {activeTab === 'filter' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-3.5 space-y-3.5 border-b border-neutral-800 bg-[#0a0a0a]">
            {/* Address Search */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-semibold">
                  Address Filter
                </label>
                <InfoTooltip content="Instantly filters nodes or transactions containing this address substring." />
              </div>
              <input
                type="text"
                placeholder="e.g. 1A1z... or bc1q..."
                value={filterValues.address}
                onChange={(e) => onFilterChange({ address: e.target.value })}
                className="w-full bg-[#141414] border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Amount Range with Unit Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <label className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-semibold">
                    Total Output Amount
                  </label>
                  <InfoTooltip content="Filters transactions by total output value transferred (in BTC or Satoshis)." />
                </div>
                <div className="flex items-center rounded border border-neutral-700 overflow-hidden text-[10px] font-mono bg-[#141414]">
                  <button
                    type="button"
                    onClick={() => onFilterChange({ unit: 'btc' })}
                    className={`px-2 py-0.5 transition-colors cursor-pointer ${
                      filterValues.unit === 'btc'
                        ? 'bg-white text-black font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    BTC
                  </button>
                  <button
                    type="button"
                    onClick={() => onFilterChange({ unit: 'sats' })}
                    className={`px-2 py-0.5 transition-colors cursor-pointer ${
                      filterValues.unit === 'sats'
                        ? 'bg-white text-black font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Sats
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder={filterValues.unit === 'btc' ? 'Min (e.g. 0.01)' : 'Min sats'}
                  value={filterValues.minAmount}
                  onChange={(e) => onFilterChange({ minAmount: e.target.value })}
                  className="bg-[#141414] border border-neutral-800 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={filterValues.unit === 'btc' ? 'Max (e.g. 10.0)' : 'Max sats'}
                  value={filterValues.maxAmount}
                  onChange={(e) => onFilterChange({ maxAmount: e.target.value })}
                  className="bg-[#141414] border border-neutral-800 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* Pattern Filter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-semibold">
                  Flow Pattern
                </label>
                <InfoTooltip content="Filters transactions matching specific structural topologies (Consolidation, Peel Chain, etc.)." />
              </div>
              <select
                value={filterValues.pattern}
                onChange={(e) => onFilterChange({ pattern: e.target.value })}
                className="w-full bg-[#141414] border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white font-medium focus:outline-none focus:border-white cursor-pointer"
              >
                <option value="all">All Transactions</option>
                <option value="peel">Peel Chain (1 in, 2 out)</option>
                <option value="consolidation">Consolidation (≥2 in, ≤2 out)</option>
                <option value="batch">Batch Payment (≤3 in, ≥3 out)</option>
                <option value="coinjoin">CoinJoin-like (≥3 in, ≥3 out)</option>
              </select>
            </div>

            {/* Block Height Range */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-semibold">
                  Block Height Range
                </label>
                <InfoTooltip content="Restricts display to transactions confirmed within specified block heights." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Height"
                  value={filterValues.minHeight}
                  onChange={(e) => onFilterChange({ minHeight: e.target.value })}
                  className="bg-[#141414] border border-neutral-800 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
                <input
                  type="number"
                  placeholder="Max Height"
                  value={filterValues.maxHeight}
                  onChange={(e) => onFilterChange({ maxHeight: e.target.value })}
                  className="bg-[#141414] border border-neutral-800 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* Input / Output Counts */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-semibold mb-1 block">
                  Inputs (Min/Max)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filterValues.minInputs}
                    onChange={(e) => onFilterChange({ minInputs: e.target.value })}
                    className="w-1/2 bg-[#141414] border border-neutral-800 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filterValues.maxInputs}
                    onChange={(e) => onFilterChange({ maxInputs: e.target.value })}
                    className="w-1/2 bg-[#141414] border border-neutral-800 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-semibold mb-1 block">
                  Outputs (Min/Max)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filterValues.minOutputs}
                    onChange={(e) => onFilterChange({ minOutputs: e.target.value })}
                    className="w-1/2 bg-[#141414] border border-neutral-800 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filterValues.maxOutputs}
                    onChange={(e) => onFilterChange({ maxOutputs: e.target.value })}
                    className="w-1/2 bg-[#141414] border border-neutral-800 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-neutral-500 font-mono">
                Instant in-memory filter (0 requests)
              </span>
              <button
                type="button"
                onClick={onResetFilter}
                className="px-2.5 py-1.5 bg-[#171717] hover:bg-[#262626] text-neutral-300 hover:text-white border border-neutral-700 rounded flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Filter Matching Results List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300 px-1 pb-1 border-b border-neutral-800 font-semibold">
              <span>MATCHING TRANSACTIONS</span>
              <span className="px-2 py-0.2 rounded bg-[#171717] text-white border border-neutral-600 text-[10px] font-bold">
                {matchingTransactions.length}
              </span>
            </div>

            {matchingTransactions.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 font-mono text-[11px]">
                No transactions match active filter criteria.
              </div>
            ) : (
              matchingTransactions.map((tx) => {
                const cleanTxid = (tx.full_id || tx.txid || (tx.id?.startsWith('tx:') ? tx.id.slice(3) : tx.id) || '');
                const txColors = getNodeColors({ type: 'transaction', full_id: cleanTxid }, 'hash');
                const totalBtc = tx.total_output_sats
                  ? (tx.total_output_sats / 100_000_000).toFixed(4)
                  : tx.amount_btc ? tx.amount_btc.toFixed(4) : '0.0000';

                return (
                  <div
                    key={cleanTxid || tx.id}
                    onClick={() => onSelectTransaction(cleanTxid)}
                    className="p-2.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <span className="h-2 w-2 rounded-xs shrink-0" style={{ backgroundColor: txColors.border }} />
                        <span className="font-mono text-[11px] text-white group-hover:text-neutral-300 font-bold truncate">
                          {cleanTxid.slice(0, 10)}...{cleanTxid.slice(-8)}
                        </span>
                      </div>
                      <ArrowUpRight size={13} className="text-neutral-500 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span className="font-medium">Block {tx.block_height ?? '---'}</span>
                      <span className="text-white font-bold">{totalBtc} BTC</span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-1 flex items-center justify-between">
                      <span>
                        <span className="text-neutral-300 font-semibold">{tx.input_count ?? 1} in</span>
                        <span className="mx-1">&rarr;</span>
                        <span className="text-neutral-300 font-semibold">{tx.output_count ?? 2} out</span>
                      </span>
                      <span className="text-neutral-300 font-medium">
                        {tx.fee_sats ? `${tx.fee_sats} sats` : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Heuristics */}
      {activeTab === 'heuristics' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-800 bg-[#050505] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-neutral-300 uppercase font-semibold">
                12 ANALYSIS RULES
              </span>
              <InfoTooltip content="Individually enable or disable heuristics to refine graph inferences." />
            </div>
            <button
              type="button"
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="px-3 py-1 bg-white hover:bg-neutral-200 disabled:opacity-50 text-black rounded font-mono font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Play size={10} />
              <span>{isAnalyzing ? 'ANALYZING...' : 'RUN'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {heuristicsList.map((h) => {
              const isEnabled = enabledHeuristics[h.id] !== false;
              return (
                <div
                  key={h.id}
                  onClick={() => onToggleHeuristic(h.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-[#141414] border-neutral-800 hover:border-neutral-600 shadow-xs'
                      : 'bg-black border-neutral-900 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}}
                        className="rounded bg-neutral-900 border-neutral-700 text-white focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                      />
                      <span className="text-xs leading-snug">{h.label}</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold bg-[#1f1f1f] text-neutral-300 border border-neutral-700 shrink-0">
                      {h.tag}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 pl-5.5 leading-relaxed font-sans mb-1.5">
                    {h.desc}
                  </p>

                  <div className="pl-5.5 pt-1.5 border-t border-neutral-800/80 flex items-start gap-1 text-[10px] text-neutral-400">
                    <span className="font-semibold text-neutral-300 shrink-0">Principle:</span>
                    <span className="italic">{h.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
