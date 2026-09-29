import React, { useState } from 'react';
import { SlidersHorizontal, ActivitySquare, FileText, Play, RotateCcw, ArrowUpRight, Search } from 'lucide-react';
import type { Investigation } from '../types';

interface Props {
  investigation: Investigation | null;
  enabledHeuristics: Record<string, boolean>;
  onToggleHeuristic: (name: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
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
    <aside className="w-84 border-r border-slate-800 bg-[#090d16] flex flex-col select-none text-xs font-sans">
      {/* Sidebar Tab Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/70 p-1.5 gap-1">
        <button
          onClick={() => setActiveTab('filter')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-colors font-medium text-xs ${
            activeTab === 'filter'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <SlidersHorizontal size={13} />
          <span>Filters</span>
        </button>
        <button
          onClick={() => setActiveTab('heuristics')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-colors font-medium text-xs ${
            activeTab === 'heuristics'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <ActivitySquare size={13} />
          <span>Forensics</span>
        </button>
        <button
          onClick={() => setActiveTab('dossier')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-colors font-medium text-xs ${
            activeTab === 'dossier'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileText size={13} />
          <span>Dossier</span>
        </button>
      </div>

      {/* Tab 1: Parametric Query Filter */}
      {activeTab === 'filter' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <form onSubmit={handleFilterSubmit} className="p-3.5 space-y-3 border-b border-slate-800/80">
            {/* Address Search */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 block">
                Address Filter
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. bc1q... or 1..."
                  value={filterAddress}
                  onChange={(e) => setFilterAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
            </div>

            {/* Amount Range with Unit Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Total Output Amount
                </label>
                <div className="flex items-center rounded border border-slate-800 overflow-hidden text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setAmountUnit('btc')}
                    className={`px-2 py-0.5 transition-colors ${
                      amountUnit === 'btc' ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    BTC
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountUnit('sats')}
                    className={`px-2 py-0.5 transition-colors ${
                      amountUnit === 'sats' ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-500 hover:text-slate-300'
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
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={amountUnit === 'btc' ? 'Max (e.g. 5.0)' : 'Max sats'}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Pattern Filter */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 block">
                Forensic Pattern
              </label>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Transactions</option>
                <option value="peel">Peel Chain (1 input, 2 outputs)</option>
                <option value="consolidation">Consolidation (&ge;2 in, &le;2 out)</option>
                <option value="batch">Batch Distribution (&le;3 in, &ge;3 out)</option>
                <option value="coinjoin">CoinJoin-like (&ge;3 in, &ge;3 out)</option>
              </select>
            </div>

            {/* Block Height Range */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 block">
                Block Height Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Height"
                  value={minHeight}
                  onChange={(e) => setMinHeight(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="number"
                  placeholder="Max Height"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Input / Output Counts */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 block">
                  Inputs (Min/Max)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minInputs}
                    onChange={(e) => setMinInputs(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxInputs}
                    onChange={(e) => setMaxInputs(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 block">
                  Outputs (Min/Max)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minOutputs}
                    onChange={(e) => setMinOutputs(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxOutputs}
                    onChange={(e) => setMaxOutputs(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-xs"
              >
                <Search size={13} />
                <span>Apply Filter</span>
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded flex items-center justify-center transition-colors cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </form>

          {/* Filter Matching Results List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 pb-1 border-b border-slate-850">
              <span>MATCHING TRANSACTIONS</span>
              <span className="font-semibold text-cyan-400">{filterResults.length}</span>
            </div>

            {filterResults.length === 0 ? (
              <div className="py-8 text-center text-slate-600 font-mono text-[11px]">
                No active filter matches found.
              </div>
            ) : (
              filterResults.map((tx) => (
                <div
                  key={tx.txid}
                  onClick={() => onSelectTransaction(tx.txid)}
                  className="p-2 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-850/80 hover:border-cyan-800/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-cyan-300 group-hover:text-cyan-200 font-semibold truncate max-w-[170px]">
                      {tx.txid.slice(0, 10)}...{tx.txid.slice(-8)}
                    </span>
                    <ArrowUpRight size={12} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Block {tx.block_height ?? '---'}</span>
                    <span className="text-slate-200 font-medium">
                      {tx.total_output_sats ? (tx.total_output_sats / 100_000_000).toFixed(4) : '0.0000'} BTC
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {tx.input_count ?? 1} in &rarr; {tx.output_count ?? 2} out
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Forensic Heuristics */}
      {activeTab === 'heuristics' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase">12 HEURISTIC RULES</span>
            <button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-mono font-semibold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
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
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-medium text-slate-200">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}}
                        className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span>{h.label}</span>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                        h.severity === 'warning'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                      }`}
                    >
                      {h.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-5">{h.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Forensic Dossier Export */}
      {activeTab === 'dossier' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">ACTIVE SESSION</span>
              {investigation?.id && (
                <span className="text-[10px] font-mono text-slate-500">REF #{investigation.id}</span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-slate-100">
              {investigation?.name || 'Local Forensic Investigation'}
            </h3>
            {selectedSubject && (
              <div className="py-1 px-2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-400 truncate">
                Target: {selectedSubject}
              </div>
            )}
            {investigation?.snapshot_height ? (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>SNAPSHOT HEIGHT:</span>
                <span className="text-slate-200 font-bold">{investigation.snapshot_height}</span>
              </div>
            ) : null}
          </div>

          {/* Analyst Notes */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 uppercase mb-1.5 block">Session Notes</label>
            <textarea
              rows={4}
              placeholder="Enter analyst observations, transaction cluster notes, or investigation context..."
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 resize-none"
            />
          </div>

          {/* Export Report Button */}
          {investigation?.id ? (
            <button
              onClick={handleOpenReport}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-md shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText size={14} />
              <span>Generate Forensic Dossier</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-mono text-center py-2 bg-slate-950/60 rounded border border-slate-800/80">
              Select or inspect a transaction to attach findings to a dossier.
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
