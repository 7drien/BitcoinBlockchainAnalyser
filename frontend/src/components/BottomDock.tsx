import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronUp, ChevronDown, Table, Trash2, ArrowUpRight } from 'lucide-react';

interface Props {
  logs: string[];
  onClearLogs: () => void;
  filterResults: any[];
  onSelectTx: (txid: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const BottomDock: React.FC<Props> = ({
  logs,
  onClearLogs,
  filterResults,
  onSelectTx,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'terminal'>('results');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'terminal' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  return (
    <div
      className={`border-t border-slate-800 bg-[#070b14] flex flex-col transition-all duration-200 select-none ${
        isOpen ? 'h-52' : 'h-8'
      }`}
    >
      {/* Dock Bar Header */}
      <div className="h-8 border-b border-slate-800/80 bg-slate-950/80 px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('results');
              if (!isOpen) onToggleOpen();
            }}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'results' && isOpen
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table size={12} />
            <span>Search & Filter Results ({filterResults.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('terminal');
              if (!isOpen) onToggleOpen();
            }}
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'terminal' && isOpen
                ? 'bg-slate-800 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={12} />
            <span>Live Terminal ({logs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'terminal' && isOpen && (
            <button
              onClick={onClearLogs}
              className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[11px]"
              title="Clear terminal"
            >
              <Trash2 size={11} />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={onToggleOpen}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-900 transition-colors"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      {isOpen && (
        <div className="flex-1 overflow-auto bg-[#070b14]">
          {/* Tab: Results Table */}
          {activeTab === 'results' && (
            <div className="p-2">
              {filterResults.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-slate-500 text-xs font-mono">
                  No active query filter. Use the search bar or the Left Sidebar Filter tab to query transactions.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="p-2">TXID</th>
                      <th className="p-2">BLOCK</th>
                      <th className="p-2">OUTPUT TOTAL</th>
                      <th className="p-2">FEE RATE</th>
                      <th className="p-2">STRUCTURE</th>
                      <th className="p-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterResults.map((tx) => (
                      <tr
                        key={tx.txid}
                        className="border-b border-slate-900 hover:bg-slate-900/60 transition-colors group"
                      >
                        <td className="p-2 text-slate-300 font-semibold max-w-xs truncate">{tx.txid}</td>
                        <td className="p-2 text-slate-400">{tx.block_height ?? '---'}</td>
                        <td className="p-2 text-slate-200">
                          {tx.total_output_sats ? (tx.total_output_sats / 100_000_000).toFixed(4) : '0.0000'} BTC
                        </td>
                        <td className="p-2 text-cyan-400">{tx.fee_rate ? `${tx.fee_rate} sat/vB` : '0 sat/vB'}</td>
                        <td className="p-2 text-slate-400">
                          {tx.input_count ?? 1} in ➔ {tx.output_count ?? 2} out
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => onSelectTx(tx.txid)}
                            className="px-2 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors text-[10px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab: Terminal Logs */}
          {activeTab === 'terminal' && (
            <div className="p-3 font-mono text-[11px] leading-relaxed space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">Connected to live WebSocket log stream. Waiting for events...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="text-slate-300 flex items-start gap-2">
                    <span className="text-slate-600 select-none">&gt;</span>
                    <span className="break-all">{log}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
