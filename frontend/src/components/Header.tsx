import React from 'react';
import { Search, ArrowUp, ArrowDown, ArrowLeftRight, CornerDownLeft, Type, Palette } from 'lucide-react';
import type { NodeStatus, GraphMode, LayoutType, ColorMode } from '../types';

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
  fontSize: number;
  onFontSizeChange: (sz: number) => void;
  colorMode: ColorMode;
  onColorModeChange: (m: ColorMode) => void;
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
  fontSize,
  onFontSizeChange,
  colorMode,
  onColorModeChange,
  isSearching,
}) => {
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearchSubmit(e);
  };

  return (
    <header className="h-13 border-b border-slate-800 bg-[#0e1117] flex items-center justify-between px-3 z-20 select-none shadow-sm gap-2 text-xs">
      {/* Brand & Clean Status Indicator */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-[#1c222d] border border-amber-500/40 flex items-center justify-center shadow-xs">
            <span className="font-mono font-black text-xs text-amber-400 tracking-wider">CS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white font-sans hidden lg:inline">ChainScope</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold tracking-wide">
              FORENSICS
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* Minimalist Live Connection Dot */}
        <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-[#14171f] border border-slate-800">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status?.node_connected ? 'bg-emerald-400 shadow-xs shadow-emerald-400/80 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">
            {status?.node_connected ? 'Node Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Center Search Input with guaranteed Enter submission */}
      <div className="flex-1 max-w-lg min-w-[200px]">
        <form onSubmit={handleSubmit} className="relative flex items-center w-full">
          <Search className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
          <input
            type="text"
            placeholder="Search TXID or address (Press Enter to search)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full bg-[#14171f] border border-slate-700/80 focus:border-amber-500/80 rounded-md py-1.5 pl-8 pr-22 text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner"
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSearching}
            className="absolute right-1 px-2.5 py-1 text-[10px] font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1"
          >
            {isSearching ? (
              <span>SEARCHING</span>
            ) : (
              <>
                <span>SEARCH</span>
                <CornerDownLeft size={10} className="text-slate-900" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Exploration & Graph Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Font Size Setting */}
        <div className="flex items-center bg-[#14171f] p-0.5 rounded-md border border-slate-700/80 text-[11px] font-mono shadow-xs">
          <span className="px-1.5 text-slate-400 flex items-center gap-0.5 font-bold" title="Graph label font size">
            <Type size={11} className="text-slate-400" />
          </span>
          {[10, 12, 14, 16].map((sz) => (
            <button
              key={sz}
              onClick={() => onFontSizeChange(sz)}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                fontSize === sz
                  ? 'bg-slate-200 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={`Set text size to ${sz}px`}
            >
              {sz}
            </button>
          ))}
        </div>

        {/* Color Mode Toggle (Hash Spectrum vs Type) */}
        <button
          onClick={() => onColorModeChange(colorMode === 'hash' ? 'type' : 'hash')}
          className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all border shadow-xs cursor-pointer ${
            colorMode === 'hash'
              ? 'bg-[#1e2430] text-amber-400 border-amber-500/50 hover:bg-[#252d3d]'
              : 'bg-[#14171f] text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle deterministic color spectrum based on address/tx hash"
        >
          <Palette size={12} className={colorMode === 'hash' ? 'text-amber-400' : 'text-slate-400'} />
          <span className="hidden xl:inline">{colorMode === 'hash' ? 'Hash Colors' : 'Type Colors'}</span>
        </button>

        {/* Hop Depth Selector */}
        <div className="flex items-center bg-[#14171f] p-0.5 rounded-md border border-slate-700/80 text-[11px] font-mono shadow-xs">
          <span className="px-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider hidden md:inline">Hops:</span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => onDepthChange(d)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                depth === d
                  ? 'bg-slate-200 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={`Explore up to ${d} hops`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Direction Flow Selector */}
        <div className="flex items-center bg-[#14171f] p-0.5 rounded-md border border-slate-700/80 text-[11px] font-mono shadow-xs">
          <button
            onClick={() => onDirectionChange('both')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-semibold ${
              direction === 'both'
                ? 'bg-slate-200 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Explore both upstream sources and downstream spends"
          >
            <ArrowLeftRight size={11} />
            <span className="hidden lg:inline">Both</span>
          </button>
          <button
            onClick={() => onDirectionChange('upstream')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-semibold ${
              direction === 'upstream'
                ? 'bg-slate-200 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Trace upstream: funding parents & senders"
          >
            <ArrowUp size={11} />
            <span className="hidden lg:inline">Up</span>
          </button>
          <button
            onClick={() => onDirectionChange('downstream')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-semibold ${
              direction === 'downstream'
                ? 'bg-slate-200 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Trace downstream: output spends & recipients"
          >
            <ArrowDown size={11} />
            <span className="hidden lg:inline">Down</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#14171f] p-0.5 rounded-md border border-slate-700/80 text-[11px] font-mono shadow-xs">
          <button
            onClick={() => onModeChange('address')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-semibold ${
              mode === 'address'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Address
          </button>
          <button
            onClick={() => onModeChange('utxo')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-semibold ${
              mode === 'utxo'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            UTXO
          </button>
        </div>

        {/* Layout Selector (CoSE Force-Directed / Cluster as primary) */}
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
          className="bg-[#14171f] border border-slate-700/80 rounded px-2 py-1 text-xs font-mono text-slate-100 font-medium focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
        >
          <option value="cose">Force-Directed (Cluster)</option>
          <option value="breadthfirst">Flow / Tree</option>
          <option value="concentric">Concentric</option>
          <option value="circle">Circular</option>
        </select>
      </div>
    </header>
  );
};
