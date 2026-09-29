import React from 'react';
import { Search, ArrowUp, ArrowDown, ArrowLeftRight, CornerDownLeft, Type, Palette, Share2, AlignLeft } from 'lucide-react';
import type { NodeStatus, GraphMode, LayoutType, ColorMode } from '../types';
import { InfoTooltip } from './InfoTooltip';

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
  viewMode: 'graph' | 'text';
  onViewModeChange: (v: 'graph' | 'text') => void;
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
  viewMode,
  onViewModeChange,
  isSearching,
}) => {
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearchSubmit(e);
  };

  return (
    <header className="h-13 border-b border-neutral-800 bg-[#0a0a0a] flex items-center justify-between px-3 z-20 select-none shadow-xs gap-2 text-xs">
      {/* Brand & Clean Status Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-[#171717] border border-neutral-700 flex items-center justify-center shadow-xs">
            <span className="font-mono font-black text-xs text-white tracking-wider">CS</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-sans hidden sm:inline">
            ChainScope
          </span>
        </div>

        <div className="h-4 w-px bg-neutral-800 mx-1" />

        {/* Minimalist Live Connection Dot */}
        <div
          className="flex items-center px-1.5 py-1 rounded bg-[#141414] border border-neutral-800 cursor-help"
          title={status?.node_connected ? 'Local Bitcoin Core node connected' : 'Node offline'}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status?.node_connected
                ? 'bg-white shadow-xs shadow-white/80 animate-pulse'
                : 'bg-neutral-600'
            }`}
          />
        </div>

        {/* View Mode Toggle: Graph vs Table */}
        <div className="flex bg-[#141414] p-0.5 rounded-md border border-neutral-800 text-[11px] font-mono shadow-xs items-center gap-0.5 ml-1">
          <button
            type="button"
            onClick={() => onViewModeChange('graph')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-semibold flex items-center gap-1 ${
              viewMode === 'graph'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Share2 size={11} />
            <span>Graph</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('text')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-semibold flex items-center gap-1 ${
              viewMode === 'text'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <AlignLeft size={11} />
            <span>Table</span>
          </button>
          <InfoTooltip content="Toggle between interactive 2D graph topology and structured table view." />
        </div>
      </div>

      {/* Center Search Input with guaranteed Enter submission */}
      <div className="flex-1 max-w-lg min-w-[200px]">
        <form onSubmit={handleSubmit} className="relative flex items-center w-full">
          <Search className="absolute left-3 text-neutral-500 pointer-events-none" size={14} />
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
            className="w-full bg-[#141414] border border-neutral-800 focus:border-white rounded-md py-1.5 pl-8 pr-22 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
          />
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSearching}
            className="absolute right-1 px-2.5 py-1 text-[10px] font-mono font-bold bg-white hover:bg-neutral-200 text-black rounded transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1"
          >
            {isSearching ? (
              <span>SEARCHING...</span>
            ) : (
              <>
                <span>SEARCH</span>
                <CornerDownLeft size={10} className="text-black" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Exploration & Graph Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Font Size Setting */}
        <div className="flex items-center bg-[#141414] p-0.5 rounded-md border border-neutral-800 text-[11px] font-mono shadow-xs">
          <span className="px-1 text-neutral-500 flex items-center gap-0.5 font-bold">
            <Type size={11} className="text-neutral-500" />
          </span>
          {[10, 12, 14, 16].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onFontSizeChange(sz)}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                fontSize === sz
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {sz}
            </button>
          ))}
          <InfoTooltip content="Adjust label text font size and relative node radius." />
        </div>

        {/* Color Mode Toggle */}
        <div className="flex items-center bg-[#141414] p-0.5 rounded-md border border-neutral-800">
          <button
            type="button"
            onClick={() => onColorModeChange(colorMode === 'hash' ? 'type' : 'hash')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              colorMode === 'hash'
                ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Palette size={12} className={colorMode === 'hash' ? 'text-white' : 'text-neutral-500'} />
            <span className="hidden xl:inline">{colorMode === 'hash' ? 'Monochrome Entity' : 'Type Colors'}</span>
          </button>
          <InfoTooltip content="Deterministic high-contrast monochrome shades per address or distinct entity types." />
        </div>

        {/* Hop Depth Selector */}
        <div className="flex items-center bg-[#141414] p-0.5 rounded-md border border-neutral-800 text-[11px] font-mono shadow-xs">
          <span className="px-1 text-neutral-500 text-[10px] uppercase font-bold tracking-wider hidden md:inline">Hops:</span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDepthChange(d)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                depth === d
                  ? 'bg-white text-black shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {d}
            </button>
          ))}
          <InfoTooltip content="Exploration depth: trace parent or descendant transactions across 1, 2, or 3 levels." />
        </div>

        {/* Direction Flow Selector */}
        <div className="flex items-center bg-[#141414] p-0.5 rounded-md border border-neutral-800 text-[11px] font-mono shadow-xs">
          <button
            type="button"
            onClick={() => onDirectionChange('both')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-semibold ${
              direction === 'both'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ArrowLeftRight size={11} />
            <span className="hidden lg:inline">Both</span>
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange('upstream')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-semibold ${
              direction === 'upstream'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ArrowUp size={11} />
            <span className="hidden lg:inline">Up</span>
          </button>
          <button
            type="button"
            onClick={() => onDirectionChange('downstream')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer font-semibold ${
              direction === 'downstream'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ArrowDown size={11} />
            <span className="hidden lg:inline">Down</span>
          </button>
          <InfoTooltip content="Upstream: trace funding sources. Downstream: trace output spends to recipients." />
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#141414] p-0.5 rounded-md border border-neutral-800 text-[11px] font-mono shadow-xs items-center">
          <button
            type="button"
            onClick={() => onModeChange('address')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-semibold ${
              mode === 'address'
                ? 'bg-neutral-800 text-white border border-neutral-600 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Address
          </button>
          <button
            type="button"
            onClick={() => onModeChange('utxo')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer font-semibold ${
              mode === 'utxo'
                ? 'bg-neutral-800 text-white border border-neutral-600 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            UTXO
          </button>
          <InfoTooltip content="Address mode: transactions between addresses. UTXO mode: inspect distinct unspent outputs." />
        </div>

        {/* Layout Selector */}
        <div className="flex items-center gap-1">
          <select
            value={layout}
            onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
            className="bg-[#141414] border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-white font-medium focus:outline-none focus:border-white cursor-pointer shadow-xs"
          >
            <option value="cose">Force-Directed (Clusters)</option>
            <option value="breadthfirst">Flow / Tree</option>
            <option value="concentric">Concentric</option>
            <option value="circle">Circular</option>
          </select>
          <InfoTooltip content="Automatic node placement algorithm." />
        </div>
      </div>
    </header>
  );
};
