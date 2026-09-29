import React from 'react';
import { ChevronUp, ChevronDown, Table, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { getNodeColors } from '../lib/colors';

interface Props {
  filterResults: any[];
  onSelectTx: (txid: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const BottomDock: React.FC<Props> = ({
  filterResults,
  onSelectTx,
  isOpen,
  onToggleOpen,
}) => {
  return (
    <div
      className={`border-t border-slate-800 bg-[#0e1117] flex flex-col transition-all duration-200 select-none ${
        isOpen ? 'h-52' : 'h-8'
      }`}
    >
      {/* Dock Bar Header */}
      <div className="h-8 border-b border-slate-800 bg-[#0a0d13] px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleOpen}
            className="px-2.5 py-0.5 rounded transition-colors flex items-center gap-2 bg-[#181c26] border border-slate-700 text-slate-200 font-semibold cursor-pointer hover:bg-[#202533]"
          >
            <Table size={13} className="text-slate-400" />
            <span>Query & Filter Results</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#12151c] text-amber-400 border border-amber-500/40 text-[10px] font-bold">
              {filterResults.length}
            </span>
          </button>
          {filterResults.length > 0 && (
            <span className="text-[11px] text-slate-400 hidden sm:inline flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span>Click Inspect on any transaction to load into graph</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleOpen}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            title={isOpen ? 'Collapse panel' : 'Expand panel'}
          >
            <span className="text-[10px] text-slate-400 uppercase font-semibold hidden md:inline">
              {isOpen ? 'Collapse' : 'Expand'}
            </span>
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      {isOpen && (
        <div className="flex-1 overflow-auto bg-[#0c0f15]">
          <div className="p-2">
            {filterResults.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs font-mono gap-1.5">
                <Table size={20} className="text-slate-600 mb-1" />
                <span className="text-slate-300 font-medium">No active query filter.</span>
                <span className="text-slate-500 text-[11px]">
                  Use the top search bar or Left Sidebar filters to discover and inspect transactions.
                </span>
              </div>
            ) : (
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 bg-[#14171f] uppercase tracking-wider text-[10px]">
                    <th className="p-2.5 font-semibold">Transaction ID</th>
                    <th className="p-2.5 font-semibold">Block</th>
                    <th className="p-2.5 font-semibold">Total Output Value</th>
                    <th className="p-2.5 font-semibold">Fee Rate</th>
                    <th className="p-2.5 font-semibold">Flow Structure</th>
                    <th className="p-2.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filterResults.map((tx) => {
                    const txColors = getNodeColors({ type: 'transaction', full_id: tx.txid }, 'hash');
                    return (
                      <tr
                        key={tx.txid}
                        className="hover:bg-[#14171f] transition-colors group cursor-pointer"
                        onClick={() => onSelectTx(tx.txid)}
                      >
                        <td className="p-2.5 text-slate-100 font-mono font-medium max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-xs shrink-0" style={{ backgroundColor: txColors.border }} />
                            <span className="text-white group-hover:text-amber-400 font-semibold truncate">
                              {tx.txid}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-300 font-medium">
                          {tx.block_height !== undefined ? `#${tx.block_height.toLocaleString()}` : '---'}
                        </td>
                        <td className="p-2.5 text-white font-bold">
                          {tx.total_output_sats ? (tx.total_output_sats / 100_000_000).toFixed(6) : '0.000000'} BTC
                        </td>
                        <td className="p-2.5 text-emerald-400 font-medium">
                          {tx.fee_rate ? `${tx.fee_rate} sat/vB` : '0 sat/vB'}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <span className="text-slate-200 font-semibold">{tx.input_count ?? 1} in</span>
                          <span className="text-slate-500 mx-1.5">➔</span>
                          <span className="text-slate-200 font-semibold">{tx.output_count ?? 2} out</span>
                        </td>
                        <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectTx(tx.txid)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded border border-slate-700 transition-colors text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>Inspect Flow</span>
                            <ArrowUpRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
