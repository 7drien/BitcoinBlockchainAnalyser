import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Header } from './components/Header';
import { LeftSidebar, type FilterState } from './components/LeftSidebar';
import { CytoscapeGraph } from './components/CytoscapeGraph';
import { TextView } from './components/TextView';
import { InspectorPanel } from './components/InspectorPanel';
import type { NodeStatus, GraphMode, LayoutType, ColorMode, GraphData, HeuristicFinding } from './types';

const API_BASE = '/api';
const STORAGE_KEY = 'chainscope_session_v3';

const DEFAULT_FILTERS: FilterState = {
  address: '',
  unit: 'btc',
  minAmount: '',
  maxAmount: '',
  pattern: 'all',
  minHeight: '',
  maxHeight: '',
  minInputs: '',
  maxInputs: '',
  minOutputs: '',
  maxOutputs: '',
};

interface SavedSession {
  searchQuery?: string;
  selectedId?: string;
  mode?: GraphMode;
  layout?: LayoutType;
  depth?: number;
  direction?: 'both' | 'upstream' | 'downstream';
  fontSize?: number;
  colorMode?: ColorMode;
  viewMode?: 'graph' | 'text';
  filterValues?: FilterState;
  enabledHeuristics?: Record<string, boolean>;
}

export function App() {
  // Read saved session once on startup
  const savedSession: SavedSession | null = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  // Global & Connectivity State
  const [status, setStatus] = useState<NodeStatus | null>(null);

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState<string>(savedSession?.searchQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Graph State & Customization
  const [mode, setMode] = useState<GraphMode>(savedSession?.mode || 'address');
  const [layout, setLayout] = useState<LayoutType>(savedSession?.layout || 'cose');
  const [depth, setDepth] = useState<number>(savedSession?.depth ?? 2);
  const [direction, setDirection] = useState<'both' | 'upstream' | 'downstream'>(savedSession?.direction || 'both');
  const [fontSize, setFontSize] = useState<number>(savedSession?.fontSize ?? 12);
  const [colorMode, setColorMode] = useState<ColorMode>(savedSession?.colorMode || 'hash');
  const [viewMode, setViewMode] = useState<'graph' | 'text'>(savedSession?.viewMode || 'graph');

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // Heuristic Findings State
  const [heuristicFindings, setHeuristicFindings] = useState<HeuristicFinding[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enabledHeuristics, setEnabledHeuristics] = useState<Record<string, boolean>>(
    savedSession?.enabledHeuristics || {}
  );

  // In-Memory Local Real-time Filters
  const [filterValues, setFilterValues] = useState<FilterState>(
    savedSession?.filterValues ? { ...DEFAULT_FILTERS, ...savedSession.filterValues } : DEFAULT_FILTERS
  );

  // Save session state to localStorage on every change
  useEffect(() => {
    try {
      const sessionToSave: SavedSession = {
        searchQuery,
        selectedId: selectedNode?.full_id || selectedNode?.full_address || selectedNode?.id,
        mode,
        layout,
        depth,
        direction,
        fontSize,
        colorMode,
        viewMode,
        filterValues,
        enabledHeuristics,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionToSave));
    } catch (err) {
      console.error('Failed to save session to localStorage:', err);
    }
  }, [
    searchQuery,
    selectedNode,
    mode,
    layout,
    depth,
    direction,
    fontSize,
    colorMode,
    viewMode,
    filterValues,
    enabledHeuristics,
  ]);

  // Fetch Node Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      try {
        const res = await fetch(`http://localhost:8000/api/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch node status:', err);
      }
    }
  }, []);

  // Fetch Graph Data from backend
  const fetchGraph = useCallback(
    async (
      subject?: string,
      graphMode?: GraphMode,
      hopDepth?: number,
      flowDir?: 'both' | 'upstream' | 'downstream'
    ) => {
      setIsLoadingGraph(true);
      const activeMode = graphMode || mode;
      const activeDepth = hopDepth ?? depth;
      const activeDirection = flowDir ?? direction;
      try {
        const params = new URLSearchParams();
        if (subject) params.set('subject', subject);
        params.set('mode', activeMode);
        params.set('depth', activeDepth.toString());
        params.set('direction', activeDirection);

        const res = await fetch(`${API_BASE}/graph?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setGraphData(data);
        }
      } catch (err) {
        console.error('Failed to load graph:', err);
      } finally {
        setIsLoadingGraph(false);
      }
    },
    [mode, depth, direction]
  );

  // Run Forensic Analysis
  const runForensics = useCallback(
    async (txid: string) => {
      if (!txid || txid.length !== 64) return;
      setIsAnalyzing(true);
      try {
        const activeList = Object.entries(enabledHeuristics)
          .filter(([_, v]) => v)
          .map(([k]) => k);

        const res = await fetch(`${API_BASE}/forensics/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txid: txid,
            enabled_heuristics: activeList.length > 0 ? activeList : undefined,
          }),
        });

        if (res.ok) {
          const findings = await res.json();
          setHeuristicFindings(findings);
        }
      } catch (err) {
        console.error('Forensics analysis failed:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [enabledHeuristics]
  );

  // Restore initial target from saved session
  useEffect(() => {
    fetchStatus();

    const target = savedSession?.selectedId || savedSession?.searchQuery;
    fetchGraph(target, savedSession?.mode, savedSession?.depth, savedSession?.direction);

    if (target) {
      fetch(`${API_BASE}/search?q=${encodeURIComponent(target)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((sr) => {
          if (!sr) return;
          if (sr.type === 'transaction') {
            setSelectedNode({ id: sr.data.txid, type: 'transaction', full_id: sr.data.txid, ...sr.data });
            runForensics(sr.data.txid);
          } else if (sr.type === 'address') {
            setSelectedNode({ id: sr.data.address, type: 'address', full_address: sr.data.address, ...sr.data });
          }
        })
        .catch(() => {});
    }

    const statusInterval = setInterval(fetchStatus, 10000);
    return () => clearInterval(statusInterval);
  }, [fetchStatus, fetchGraph, runForensics, savedSession]);

  // 1. Extract all unique transactions in the graph (from graphData.transactions, nodes, or edges)
  const allTransactions = useMemo(() => {
    if (graphData?.transactions && graphData.transactions.length > 0) {
      return graphData.transactions;
    }

    const txMap = new Map<string, any>();

    // From nodes (UTXO mode)
    (graphData?.nodes || []).forEach((n) => {
      if (n?.data?.type === 'transaction') {
        const rawId = n.data.full_id || n.data.txid || n.data.id;
        const cleanTxid = rawId?.startsWith('tx:') ? rawId.slice(3) : rawId;
        if (cleanTxid && !txMap.has(cleanTxid)) {
          txMap.set(cleanTxid, {
            ...n.data,
            id: cleanTxid,
            txid: cleanTxid,
            full_id: cleanTxid,
            type: 'transaction',
          });
        }
      }
    });

    // From edges (Address mode)
    (graphData?.edges || []).forEach((e) => {
      const txid = e?.data?.txid;
      if (txid && !txMap.has(txid)) {
        txMap.set(txid, {
          id: txid,
          txid: txid,
          full_id: txid,
          type: 'transaction',
          amount_btc: e.data.amount_btc,
          total_output_sats: e.data.total_output_sats ?? e.data.amount_sats,
          fee_sats: e.data.fee_sats,
          fee_rate: e.data.fee_rate,
          vsize: e.data.vsize,
          block_height: e.data.block_height,
          block_time: e.data.block_time,
          input_count: e.data.input_count ?? 1,
          output_count: e.data.output_count ?? 2,
          inputs: e.data.inputs || [],
          outputs: e.data.outputs || [],
        });
      }
    });

    return Array.from(txMap.values());
  }, [graphData]);

  // 2. Check if any filter parameter is non-empty
  const isFilterActive = useMemo(() => {
    return (
      Boolean(filterValues?.address?.trim()) ||
      Boolean(filterValues?.minAmount?.trim()) ||
      Boolean(filterValues?.maxAmount?.trim()) ||
      (Boolean(filterValues?.pattern) && filterValues.pattern !== 'all') ||
      Boolean(filterValues?.minHeight?.trim()) ||
      Boolean(filterValues?.maxHeight?.trim()) ||
      Boolean(filterValues?.minInputs?.trim()) ||
      Boolean(filterValues?.maxInputs?.trim()) ||
      Boolean(filterValues?.minOutputs?.trim()) ||
      Boolean(filterValues?.maxOutputs?.trim())
    );
  }, [filterValues]);

  // 3. Match a transaction against all active filter parameters
  const matchesFilter = useCallback(
    (tx: any) => {
      if (!tx) return false;

      // Address filter (checks txid, input addresses, output addresses)
      if (filterValues?.address?.trim()) {
        const q = filterValues.address.trim().toLowerCase();
        const matchTxid = (tx.full_id || tx.txid || tx.id || '').toLowerCase().includes(q);
        const matchInputs = (tx.inputs || []).some((inp: any) =>
          (inp.address || '').toLowerCase().includes(q)
        );
        const matchOutputs = (tx.outputs || []).some((out: any) =>
          (out.address || '').toLowerCase().includes(q)
        );
        if (!matchTxid && !matchInputs && !matchOutputs) return false;
      }

      // Amount filter (supports BTC and Satoshis with float rounding safety)
      const minSats = filterValues?.minAmount?.trim()
        ? filterValues.unit === 'btc'
          ? Math.round(parseFloat(filterValues.minAmount) * 100_000_000)
          : parseInt(filterValues.minAmount, 10)
        : null;
      const maxSats = filterValues?.maxAmount?.trim()
        ? filterValues.unit === 'btc'
          ? Math.round(parseFloat(filterValues.maxAmount) * 100_000_000)
          : parseInt(filterValues.maxAmount, 10)
        : null;

      const txAmount =
        tx.total_output_sats ?? (tx.amount_btc ? Math.round(tx.amount_btc * 100_000_000) : 0);
      if (minSats !== null && !isNaN(minSats) && txAmount < minSats) return false;
      if (maxSats !== null && !isNaN(maxSats) && txAmount > maxSats) return false;

      // Block height filter
      if (filterValues?.minHeight?.trim()) {
        const minH = parseInt(filterValues.minHeight, 10);
        if (!isNaN(minH) && (tx.block_height == null || tx.block_height < minH)) return false;
      }
      if (filterValues?.maxHeight?.trim()) {
        const maxH = parseInt(filterValues.maxHeight, 10);
        if (!isNaN(maxH) && (tx.block_height == null || tx.block_height > maxH)) return false;
      }

      // Inputs & Outputs count filters
      const inCount = tx.input_count ?? (tx.inputs ? tx.inputs.length : 1);
      const outCount = tx.output_count ?? (tx.outputs ? tx.outputs.length : 2);

      if (filterValues?.minInputs?.trim()) {
        const mi = parseInt(filterValues.minInputs, 10);
        if (!isNaN(mi) && inCount < mi) return false;
      }
      if (filterValues?.maxInputs?.trim()) {
        const ma = parseInt(filterValues.maxInputs, 10);
        if (!isNaN(ma) && inCount > ma) return false;
      }
      if (filterValues?.minOutputs?.trim()) {
        const mo = parseInt(filterValues.minOutputs, 10);
        if (!isNaN(mo) && outCount < mo) return false;
      }
      if (filterValues?.maxOutputs?.trim()) {
        const ma = parseInt(filterValues.maxOutputs, 10);
        if (!isNaN(ma) && outCount > ma) return false;
      }

      // Flow pattern filter
      if (filterValues?.pattern && filterValues.pattern !== 'all') {
        if (filterValues.pattern === 'peel' && !(inCount === 1 && outCount === 2)) return false;
        if (filterValues.pattern === 'consolidation' && !(inCount >= 2 && outCount <= 2)) return false;
        if (filterValues.pattern === 'batch' && !(inCount <= 3 && outCount >= 3)) return false;
        if (filterValues.pattern === 'coinjoin' && !(inCount >= 3 && outCount >= 3)) return false;
      }

      return true;
    },
    [filterValues]
  );

  // 4. Compute displayed graph elements and matching transactions list
  const { displayedGraphData, matchingTransactions } = useMemo(() => {
    const rawNodes = graphData?.nodes || [];
    const rawEdges = graphData?.edges || [];

    if (!isFilterActive) {
      return {
        displayedGraphData: graphData,
        matchingTransactions: allTransactions,
      };
    }

    const matchedTxs = allTransactions.filter(matchesFilter);
    const matchingTxIds = new Set<string>();
    matchedTxs.forEach((t) => {
      const cid = t.txid || t.full_id || t.id;
      if (cid) {
        matchingTxIds.add(cid);
        matchingTxIds.add(`tx:${cid}`);
      }
    });

    const retainedNodeIds = new Set<string>();

    // If an address query is active, also directly match address and utxo nodes in the graph
    const addrQuery = filterValues?.address?.trim().toLowerCase();
    if (addrQuery) {
      rawNodes.forEach((n) => {
        const fullAddr = (n.data?.full_address || n.data?.address || n.data?.id || '').toLowerCase();
        if ((n.data?.type === 'address' || n.data?.type === 'utxo') && fullAddr.includes(addrQuery)) {
          retainedNodeIds.add(n.data.id);
        }
      });
    }

    // Filter edges: retain edges associated with matching transactions
    const filteredEdges = rawEdges.filter((e) => {
      const edgeTxid = e.data?.txid;
      const isTxMatch =
        (edgeTxid && matchingTxIds.has(edgeTxid)) ||
        matchingTxIds.has(e.data?.source) ||
        matchingTxIds.has(e.data?.target);

      if (isTxMatch) {
        retainedNodeIds.add(e.data.source);
        retainedNodeIds.add(e.data.target);
        return true;
      }
      return false;
    });

    // Also retain matching transaction nodes themselves (e.g. in UTXO mode)
    matchedTxs.forEach((t) => {
      const cid = t.txid || t.full_id || t.id;
      if (cid) {
        retainedNodeIds.add(cid);
        retainedNodeIds.add(`tx:${cid}`);
      }
    });

    // Retain only nodes that are marked for retention
    const filteredNodes = rawNodes.filter((n) => retainedNodeIds.has(n.data.id));

    return {
      displayedGraphData: {
        nodes: filteredNodes,
        edges: filteredEdges,
        transactions: matchedTxs,
      },
      matchingTransactions: matchedTxs,
    };
  }, [graphData, allTransactions, isFilterActive, matchesFilter, filterValues]);

  // Handle Search Submission (guaranteed Enter key support)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError('');

    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'No results found for this search.');
      }
      const searchResult = await res.json();

      if (searchResult.type === 'transaction') {
        fetchGraph(searchResult.data.txid);
        setSelectedNode({
          id: searchResult.data.txid,
          type: 'transaction',
          full_id: searchResult.data.txid,
          ...searchResult.data,
        });
        runForensics(searchResult.data.txid);
      } else if (searchResult.type === 'address') {
        fetchGraph(searchResult.data.address);
        setSelectedNode({
          id: searchResult.data.address,
          type: 'address',
          full_address: searchResult.data.address,
          ...searchResult.data,
        });
        setHeuristicFindings([]);
      } else if (searchResult.type === 'block') {
        fetchGraph(searchResult.data.hash);
      }
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Mode change
  const handleModeChange = (newMode: GraphMode) => {
    setMode(newMode);
    fetchGraph(selectedNode?.id || searchQuery, newMode, depth, direction);
  };

  // Depth change
  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
    const targetSubject = selectedNode?.full_id || selectedNode?.full_address || selectedNode?.id || searchQuery;
    fetchGraph(targetSubject, mode, newDepth, direction);
  };

  // Direction change
  const handleDirectionChange = (newDir: 'both' | 'upstream' | 'downstream') => {
    setDirection(newDir);
    const targetSubject = selectedNode?.full_id || selectedNode?.full_address || selectedNode?.id || searchQuery;
    fetchGraph(targetSubject, mode, depth, newDir);
  };

  // Multi-hop explore action
  const handleExploreNode = (id: string, exploreDir?: 'both' | 'upstream' | 'downstream') => {
    const dir = exploreDir || direction;
    fetchGraph(id, mode, depth, dir);
    if (id.length === 64) {
      runForensics(id);
    }
    fetch(`${API_BASE}/search?q=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((sr) => {
        if (!sr) return;
        if (sr.type === 'transaction') {
          setSelectedNode({ id: sr.data.txid, type: 'transaction', full_id: sr.data.txid, ...sr.data });
        } else if (sr.type === 'address') {
          setSelectedNode({ id: sr.data.address, type: 'address', full_address: sr.data.address, ...sr.data });
        }
      })
      .catch(() => {});
  };

  const handleSelectRelated = (id: string, _type: 'transaction' | 'address') => {
    handleExploreNode(id, direction);
  };

  // Toggle Heuristics
  const handleToggleHeuristic = (name: string) => {
    setEnabledHeuristics((prev) => ({
      ...prev,
      [name]: prev[name] === false ? true : false,
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      {/* Header with ViewMode toggle, Tooltips & Clean Labels */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        status={status}
        mode={mode}
        onModeChange={handleModeChange}
        layout={layout}
        onLayoutChange={setLayout}
        depth={depth}
        onDepthChange={handleDepthChange}
        direction={direction}
        onDirectionChange={handleDirectionChange}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isSearching={isSearching}
      />

      {/* Main Workspace Grid */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar with Real-time Filters & Heuristics */}
        <LeftSidebar
          enabledHeuristics={enabledHeuristics}
          onToggleHeuristic={handleToggleHeuristic}
          onRunAnalysis={() => selectedNode && runForensics(selectedNode.full_id || selectedNode.id)}
          isAnalyzing={isAnalyzing}
          filterValues={filterValues}
          onFilterChange={(newVals) => setFilterValues((prev) => ({ ...prev, ...newVals }))}
          onResetFilter={() => setFilterValues(DEFAULT_FILTERS)}
          onSelectTransaction={(txid) => {
            const cleanTxid = txid?.startsWith('tx:') ? txid.slice(3) : txid;
            fetchGraph(cleanTxid, mode, depth, direction);
            setSelectedNode({ id: cleanTxid, type: 'transaction', full_id: cleanTxid });
            runForensics(cleanTxid);
          }}
          matchingTransactions={matchingTransactions}
        />

        {/* Center Canvas / Table View */}
        <main className="flex-1 flex flex-col relative bg-black overflow-hidden">
          {searchError && (
            <div className="bg-[#171717] border-b border-neutral-700 text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-xs">
              <span className="font-semibold">SEARCH ERROR: {searchError}</span>
              <button
                type="button"
                onClick={() => setSearchError('')}
                className="text-neutral-400 hover:text-white font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 relative overflow-hidden">
            {isLoadingGraph && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2.5 p-4 rounded-lg bg-[#141414] border border-neutral-700 shadow-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                  <span className="text-xs font-mono font-bold text-white">
                    Loading flow topology...
                  </span>
                </div>
              </div>
            )}

            {/* Empty state overlay when filters exclude all graph elements */}
            {isFilterActive && displayedGraphData.nodes.length === 0 && !isLoadingGraph && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="bg-[#141414]/95 border border-neutral-800 p-6 rounded-xl text-center max-w-sm pointer-events-auto backdrop-blur-sm shadow-2xl">
                  <div className="h-10 w-10 rounded-full bg-[#1c1c1c] border border-neutral-700 mx-auto flex items-center justify-center text-neutral-400 mb-3">
                    <SlidersHorizontal size={18} />
                  </div>
                  <h4 className="font-bold text-sm text-white mb-1">No Matching Elements</h4>
                  <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                    No transactions or addresses match your active filter criteria in this session.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterValues(DEFAULT_FILTERS)}
                    className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black font-semibold rounded-md text-xs transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {/* View Mode Toggle: Interactive Cytoscape Graph vs Structured Text Table */}
            {viewMode === 'graph' ? (
              <CytoscapeGraph
                data={displayedGraphData}
                layout={layout}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                colorMode={colorMode}
                onColorModeChange={setColorMode}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setSelectedEdge(null);
                  if (node && node.type === 'transaction') {
                    const txid = node.full_id || node.id;
                    if (txid && txid.length === 64) {
                      runForensics(txid);
                    }
                  } else if (node && node.type === 'address') {
                    setHeuristicFindings([]);
                    const addr = node.full_address || node.id;
                    if (addr) {
                      fetch(`${API_BASE}/search?q=${encodeURIComponent(addr)}`)
                        .then((r) => (r.ok ? r.json() : null))
                        .then((sr) => {
                          if (sr?.type === 'address') {
                            setSelectedNode((prev: any) => (prev ? { ...prev, ...sr.data } : prev));
                          }
                        })
                        .catch(() => {});
                    }
                  } else {
                    setHeuristicFindings([]);
                  }
                }}
                onSelectEdge={(edge) => {
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                }}
                onDoubleTapNode={handleExploreNode}
                selectedId={selectedNode?.id}
              />
            ) : (
              <TextView
                data={displayedGraphData}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setSelectedEdge(null);
                  if (node && node.type === 'transaction') {
                    const txid = node.full_id || node.id;
                    if (txid && txid.length === 64) {
                      runForensics(txid);
                    }
                  } else if (node && node.type === 'address') {
                    setHeuristicFindings([]);
                    const addr = node.full_address || node.id;
                    if (addr) {
                      fetch(`${API_BASE}/search?q=${encodeURIComponent(addr)}`)
                        .then((r) => (r.ok ? r.json() : null))
                        .then((sr) => {
                          if (sr?.type === 'address') {
                            setSelectedNode((prev: any) => (prev ? { ...prev, ...sr.data } : prev));
                          }
                        })
                        .catch(() => {});
                    }
                  }
                }}
                onExploreNode={handleExploreNode}
                selectedId={selectedNode?.id}
              />
            )}
          </div>
        </main>

        {/* Right Inspector Panel */}
        <InspectorPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          findings={heuristicFindings}
          onExpandNode={(id) => handleExploreNode(id, 'both')}
          onExplore={handleExploreNode}
          onSelectRelated={handleSelectRelated}
        />
      </div>
    </div>
  );
}

export default App;
