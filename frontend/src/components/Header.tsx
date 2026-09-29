import React from 'react';
import { Search, Terminal, ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react';
import type { NodeStatus, GraphMode, LayoutType } from '../types';

interface Props {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  status: NodeStatus | null;
  mode: GraphMode;
  onModeChange: (m: GraphMode) => void;
  layout: LayoutType;
  onLayoutChange: (l: LayoutType) => void;
  depth: number;
  onDepthChange: (d: number) => void;
  direction: 'both' | 'upstream' | 'downstream';
  onDirectionChange: (dir: 'both' | 'upstream' | 'downstream') => void;
  showLogs: boolean;
  onToggleLogs: () => void;
  isSearching: boolean;
}

export const Header: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  status,
  mode,
  onModeChange,
  layout,
  onLayoutChange,
  depth,
  onDepthChange,
  direction,
  onDirectionChange,
  showLogs,
  onToggleLogs,
  isSearching,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#090d16] flex items-center justify-between px-4 z-20 select-none">
      {/* Brand & Clean Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-gradient-to-tr from-cyan-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-mono font-black text-sm text-white">CS</span>
          </div>
          <span className="font-semibold text-sm tracking-wide text-slate-100">ChainScope</span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Minimalist Live Connection Dot */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status?.node_connected ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px] text-slate-400">
            {status?.node_connected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-lg mx-3">
        <form onSubmit={onSearchSubmit} className="relative flex items-center w-full">
          <Search className="absolute left-3 text-slate-500 pointer-events-none" size={14} />
          <input
            type="text"
            placeholder="Search TXID or address (e.g. bc1q...)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-500 rounded-md py-1.5 pl-9 pr-20 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1.5 px-2.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? 'SEARCHING' : 'ENTER'}
          </button>
        </form>
      </div>

      {/* Exploration & Graph Controls */}
      <div className="flex items-center gap-2">
        {/* Hop Depth Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800 text-[11px] font-mono">
          <span className="px-1.5 text-slate-500 text-[10px] uppercase font-semibold">Depth:</span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => onDepthChange(d)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                depth === d
                  ? 'bg-cyan-950/90 text-cyan-300 font-bold border border-cyan-800/80 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Explore up to ${d} transaction hops`}
            >
              {d} Hop{d > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        {/* Direction Flow Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => onDirectionChange('both')}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              direction === 'both'
                ? 'bg-cyan-950/90 text-cyan-300 font-bold border border-cyan-800/80 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Explore both upstream sources and downstream spends"
          >
            <ArrowLeftRight size={11} />
            <span>Both</span>
          </button>
          <button
            onClick={() => onDirectionChange('upstream')}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              direction === 'upstream'
                ? 'bg-cyan-950/90 text-cyan-300 font-bold border border-cyan-800/80 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Trace upstream: funding parents & senders"
          >
            <ArrowUp size={11} />
            <span>Upstream</span>
          </button>
          <button
            onClick={() => onDirectionChange('downstream')}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              direction === 'downstream'
                ? 'bg-cyan-950/90 text-cyan-300 font-bold border border-cyan-800/80 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Trace downstream: output spends & recipients"
          >
            <ArrowDown size={11} />
            <span>Downstream</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-950 p-0.5 rounded-md border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => onModeChange('address')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              mode === 'address'
                ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Address
          </button>
          <button
            onClick={() => onModeChange('utxo')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              mode === 'utxo'
                ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            UTXO DAG
          </button>
        </div>

        {/* Layout Selector */}
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="breadthfirst">Tree / Flow</option>
          <option value="cose">Force-Directed</option>
          <option value="concentric">Concentric</option>
          <option value="circle">Circular</option>
        </select>

        {/* Telemetry Toggle */}
        <button
          onClick={onToggleLogs}
          className={`p-1.5 rounded border transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
            showLogs
              ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
          }`}
          title="Toggle telemetry terminal"
        >
          <Terminal size={14} />
        </button>
      </div>
    </header>
  );
};
