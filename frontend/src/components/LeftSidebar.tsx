import React, { useState } from 'react';
import { SlidersHorizontal, ActivitySquare, FileText, Play, RotateCcw, ArrowUpRight, Search, CornerDownLeft } from 'lucide-react';
import type { Investigation } from '../types';
import { getNodeColors } from '../lib/colors';

interface Props {
  investigation: Investigation | null;
  enabledHeuristics: Record<string, boolean>;
  onToggleHeuristic: (name: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  isFiltering?: boolean;
  onApplyFilter: (filters: any) => void;
  onSelectTransaction: (txid: string) => void;
  filterResults?: any[];
  selectedSubject?: string;
}

export const LeftSidebar: React.FC<Props> = ({
  investigation,
  enabledHeuristics,
  onToggleHeuristic,
  onRunAnalysis,
  isAnalyzing,
  isFiltering = false,
  onApplyFilter,
  onSelectTransaction,
  filterResults = [],
  selectedSubject = '',
}) => {
  const [activeTab, setActiveTab] = useState<'filter' | 'heuristics' | 'dossier'>('filter');

  // Filter form state
  const [filterAddress, setFilterAddress] = useState<string>('');
  const [amountUnit, setAmountUnit] = useState<'btc' | 'sats'>('btc');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [minHeight, setMinHeight] = useState<string>('');
  const [maxHeight, setMaxHeight] = useState<string>('');
  const [minInputs, setMinInputs] = useState<string>('');
  const [maxInputs, setMaxInputs] = useState<string>('');
  const [minOutputs, setMinOutputs] = useState<string>('');
  const [maxOutputs, setMaxOutputs] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<string>('all');

  // Notes state
  const [analystNotes, setAnalystNotes] = useState<string>('');

  const heuristicsList = [
    { id: 'common_input_ownership', label: 'Common-input ownership', severity: 'info', desc: 'Clusters multiple addresses in inputs (attenuated on CoinJoin)' },
    { id: 'change_address_detection', label: 'Change address detection', severity: 'info', desc: 'Script matching & unrounded remainder detection' },
    { id: 'address_reuse', label: 'Address reuse', severity: 'warning', desc: 'Identifies addresses reused across inputs/outputs' },
    { id: 'peel_chain', label: 'Peel chain pattern', severity: 'info', desc: 'Sequential peeling of small payment outputs' },
    { id: 'consolidation', label: 'Consolidation', severity: 'info', desc: 'Many inputs merged into 1 or 2 outputs' },
    { id: 'fan_in', label: 'Fan-in pattern', severity: 'info', desc: 'Convergence of multiple distinct addresses' },
    { id: 'fan_out', label: 'Fan-out pattern', severity: 'info', desc: 'Dispersion of funds into many recipient outputs' },
    { id: 'batch_payment', label: 'Batch payment', severity: 'info', desc: 'Commercial payout structure with heterogeneous values' },
    { id: 'coinjoin_suspicion', label: 'CoinJoin-like pattern', severity: 'warning', desc: 'Equal-denomination outputs with multiple participants' },
    { id: 'dust_detection', label: 'Dust & micro amounts', severity: 'warning', desc: 'Outputs <= 546 satoshis (dusting attacks)' },
    { id: 'round_amounts', label: 'Round amounts (Contextual)', severity: 'info', desc: 'Clean decimal values (informational only)' },
    { id: 'chain_transaction', label: 'Chained rapid transactions', severity: 'info', desc: 'Rapid sequential child-spends' },
  ];

  const toSats = (val: string): number | undefined => {
    if (!val.trim()) return undefined;
    const num = parseFloat(val);
    if (isNaN(num)) return undefined;
    if (amountUnit === 'btc') {
      return Math.round(num * 100_000_000);
    }
    return Math.round(num);
  };

  const handleFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onApplyFilter({
      address: filterAddress.trim() || undefined,
      min_amount_sats: toSats(minAmount),
      max_amount_sats: toSats(maxAmount),
      min_height: minHeight ? parseInt(minHeight, 10) : undefined,
      max_height: maxHeight ? parseInt(maxHeight, 10) : undefined,
      min_inputs: minInputs ? parseInt(minInputs, 10) : undefined,
      max_inputs: maxInputs ? parseInt(maxInputs, 10) : undefined,
      min_outputs: minOutputs ? parseInt(minOutputs, 10) : undefined,
      max_outputs: maxOutputs ? parseInt(maxOutputs, 10) : undefined,
      pattern: selectedPattern !== 'all' ? selectedPattern : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFilterSubmit();
    }
  };

  const handleResetFilter = () => {
    setFilterAddress('');
    setMinAmount('');
    setMaxAmount('');
    setMinHeight('');
    setMaxHeight('');
    setMinInputs('');
    setMaxInputs('');
    setMinOutputs('');
    setMaxOutputs('');
    setSelectedPattern('all');
    onApplyFilter({});
  };

  const handleOpenReport = () => {
    if (investigation?.id) {
      window.open(`http://localhost:8000/api/investigations/${investigation.id}/report`, '_blank');
    }
  };

  return (
    <aside className="w-84 border-r border-slate-800 bg-[#0e1117] flex flex-col select-none text-xs font-sans shadow-sm">
      {/* Sidebar Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-[#0a0d13] p-1.5 gap-1">
        <button
          onClick={() => setActiveTab('filter')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all font-semibold text-xs cursor-pointer ${
            activeTab === 'filter'
              ? 'bg-[#1a1e28] text-amber-400 border border-slate-700 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#14171f]'
          }`}
        >
          <SlidersHorizontal size={13} className={activeTab === 'filter' ? 'text-amber-400' : 'text-slate-400'} />
          <span>Filters</span>
        </button>
        <button
          onClick={() => setActiveTab('heuristics')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all font-semibold text-xs cursor-pointer ${
            activeTab === 'heuristics'
              ? 'bg-[#1a1e28] text-amber-400 border border-slate-700 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#14171f]'
          }`}
        >
          <ActivitySquare size={13} className={activeTab === 'heuristics' ? 'text-amber-400' : 'text-slate-400'} />
          <span>Forensics</span>
        </button>
        <button
          onClick={() => setActiveTab('dossier')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all font-semibold text-xs cursor-pointer ${
            activeTab === 'dossier'
              ? 'bg-[#1a1e28] text-amber-400 border border-slate-700 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-[#14171f]'
          }`}
        >
          <FileText size={13} className={activeTab === 'dossier' ? 'text-amber-400' : 'text-slate-400'} />
          <span>Dossier</span>
        </button>
      </div>

      {/* Tab 1: Parametric Query Filter */}
      {activeTab === 'filter' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <form onSubmit={handleFilterSubmit} className="p-3.5 space-y-3.5 border-b border-slate-800/90 bg-[#0c0f15]/50">
            {/* Address Search */}
            <div>
              <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                Address Filter
              </label>
              <input
                type="text"
                placeholder="e.g. bc1q... or 1..."
                value={filterAddress}
                onChange={(e) => setFilterAddress(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-[#14171f] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              />
            </div>

            {/* Amount Range with Unit Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                  Total Output Amount
                </label>
                <div className="flex items-center rounded border border-slate-700 overflow-hidden text-[10px] font-mono bg-[#14171f]">
                  <button
                    type="button"
                    onClick={() => setAmountUnit('btc')}
                    className={`px-2 py-0.5 transition-colors cursor-pointer ${
                      amountUnit === 'btc' ? 'bg-slate-200 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    BTC
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountUnit('sats')}
                    className={`px-2 py-0.5 transition-colors cursor-pointer ${
                      amountUnit === 'sats' ? 'bg-slate-200 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
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
                  placeholder={amountUnit === 'btc' ? 'Min (e.g. 0.001)' : 'Min sats'}
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-[#14171f] border border-slate-700/80 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={amountUnit === 'btc' ? 'Max (e.g. 5.0)' : 'Max sats'}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-[#14171f] border border-slate-700/80 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>
            </div>

            {/* Pattern Filter */}
            <div>
              <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                Forensic Pattern
              </label>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="w-full bg-[#14171f] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">All Transactions</option>
                <option value="peel">Peel Chain (1 in, 2 out)</option>
                <option value="consolidation">Consolidation (&ge;2 in, &le;2 out)</option>
                <option value="batch">Batch Distribution (&le;3 in, &ge;3 out)</option>
                <option value="coinjoin">CoinJoin-like (&ge;3 in, &ge;3 out)</option>
              </select>
            </div>

            {/* Block Height Range */}
            <div>
              <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                Block Height Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Height"
                  value={minHeight}
                  onChange={(e) => setMinHeight(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-[#14171f] border border-slate-700/80 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Max Height"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-[#14171f] border border-slate-700/80 rounded px-2 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>
            </div>

            {/* Input / Output Counts */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                  Inputs (Min/Max)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minInputs}
                    onChange={(e) => setMinInputs(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-1/2 bg-[#14171f] border border-slate-700/80 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxInputs}
                    onChange={(e) => setMaxInputs(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-1/2 bg-[#14171f] border border-slate-700/80 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                  Outputs (Min/Max)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minOutputs}
                    onChange={(e) => setMinOutputs(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-1/2 bg-[#14171f] border border-slate-700/80 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxOutputs}
                    onChange={(e) => setMaxOutputs(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-1/2 bg-[#14171f] border border-slate-700/80 rounded px-1.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isFiltering}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-xs"
              >
                {isFiltering ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-950" />
                ) : (
                  <>
                    <Search size={13} />
                    <span>Apply Filter</span>
                    <CornerDownLeft size={11} className="text-slate-950" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                disabled={isFiltering}
                className="px-3 py-2 bg-[#181c26] hover:bg-[#202533] disabled:opacity-50 text-slate-300 hover:text-white border border-slate-700 rounded flex items-center justify-center transition-colors cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </form>

          {/* Filter Matching Results List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 px-1 pb-1 border-b border-slate-800 font-semibold">
              <span>MATCHING TRANSACTIONS</span>
              <span className="px-2 py-0.2 rounded bg-[#181c26] text-amber-400 border border-amber-600/40 text-[10px] font-bold">
                {filterResults.length}
              </span>
            </div>

            {filterResults.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-mono text-[11px]">
                No active filter matches found.
              </div>
            ) : (
              filterResults.map((tx) => {
                const txColors = getNodeColors({ type: 'transaction', full_id: tx.txid }, 'hash');
                return (
                  <div
                    key={tx.txid}
                    onClick={() => onSelectTransaction(tx.txid)}
                    className="p-2.5 rounded-lg bg-[#14171f] hover:bg-[#1c222e] border border-slate-800 hover:border-slate-600 transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <span className="h-2 w-2 rounded-xs shrink-0" style={{ backgroundColor: txColors.border }} />
                        <span className="font-mono text-[11px] text-white group-hover:text-amber-400 font-bold truncate">
                          {tx.txid.slice(0, 10)}...{tx.txid.slice(-8)}
                        </span>
                      </div>
                      <ArrowUpRight size={13} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                      <span className="font-medium">Block {tx.block_height ?? '---'}</span>
                      <span className="text-white font-bold">
                        {tx.total_output_sats ? (tx.total_output_sats / 100_000_000).toFixed(4) : '0.0000'} BTC
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                      <span>
                        <span className="text-slate-300 font-semibold">{tx.input_count ?? 1} in</span>
                        <span className="mx-1">&rarr;</span>
                        <span className="text-slate-300 font-semibold">{tx.output_count ?? 2} out</span>
                      </span>
                      <span className="text-emerald-400 font-medium">
                        {tx.fee_rate ? `${tx.fee_rate} sat/vB` : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Forensic Heuristics */}
      {activeTab === 'heuristics' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-[#0a0d13] flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-300 uppercase font-semibold">12 FORENSIC RULES</span>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded font-mono font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Play size={10} />
              <span>{isAnalyzing ? 'ANALYZING...' : 'RUN LIVE'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {heuristicsList.map((h) => {
              const isEnabled = enabledHeuristics[h.id] !== false;
              return (
                <div
                  key={h.id}
                  onClick={() => onToggleHeuristic(h.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isEnabled
                      ? 'bg-[#14171f] border-slate-700/80 hover:border-slate-600 shadow-xs'
                      : 'bg-slate-950/40 border-slate-900 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}}
                        className="rounded bg-slate-800 border-slate-600 text-amber-500 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <span className="text-xs">{h.label}</span>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                        h.severity === 'warning'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {h.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-5.5 leading-relaxed">{h.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Forensic Dossier Export */}
      {activeTab === 'dossier' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-[#14171f] border border-slate-700/80 rounded-lg p-3 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">ACTIVE SESSION</span>
              {investigation?.id && (
                <span className="text-[10px] font-mono text-slate-400 font-semibold">REF #{investigation.id}</span>
              )}
            </div>
            <h3 className="font-bold text-sm text-white">
              {investigation?.name || 'Local Forensic Investigation'}
            </h3>
            {selectedSubject && (
              <div className="py-1 px-2 rounded bg-[#0d1016] border border-slate-700 text-[10px] font-mono text-amber-400 truncate">
                Target: {selectedSubject}
              </div>
            )}
            {investigation?.snapshot_height ? (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span>SNAPSHOT HEIGHT:</span>
                <span className="text-white font-bold">#{investigation.snapshot_height.toLocaleString()}</span>
              </div>
            ) : null}
          </div>

          {/* Analyst Notes */}
          <div>
            <label className="text-[11px] font-mono text-slate-300 uppercase font-semibold mb-1.5 block">
              Session Notes
            </label>
            <textarea
              rows={4}
              placeholder="Enter analyst observations, transaction cluster notes, or investigation context..."
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              className="w-full bg-[#14171f] border border-slate-700 rounded-md p-2.5 text-xs text-white font-sans focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 resize-none transition-colors"
            />
          </div>

          {/* Export Report Button */}
          {investigation?.id ? (
            <button
              onClick={handleOpenReport}
              className="w-full py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-md shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText size={14} />
              <span>Generate Forensic Dossier</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 font-mono text-center py-2.5 bg-[#14171f] rounded border border-slate-800">
              Select or inspect a transaction to attach findings to a dossier.
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
