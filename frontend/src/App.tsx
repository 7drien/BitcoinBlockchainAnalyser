import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { CytoscapeGraph } from './components/CytoscapeGraph';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomDock } from './components/BottomDock';
import type { NodeStatus, GraphMode, LayoutType, GraphData, HeuristicFinding, Investigation } from './types';

// API base helper (relative path uses Vite proxy, fallback to port 8000)
const API_BASE = '/api';

export function App() {
  // Global & Connectivity State
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [dockOpen, setDockOpen] = useState(true);

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Graph State
  const [mode, setMode] = useState<GraphMode>('address');
  const [layout, setLayout] = useState<LayoutType>('breadthfirst');
  const [depth, setDepth] = useState<number>(2);
  const [direction, setDirection] = useState<'both' | 'upstream' | 'downstream'>('both');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // Forensic Analysis & Investigation State
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [heuristicFindings, setHeuristicFindings] = useState<HeuristicFinding[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enabledHeuristics, setEnabledHeuristics] = useState<Record<string, boolean>>({});
  const [filterResults, setFilterResults] = useState<any[]>([]);

  // Fetch Node Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Standalone fallback
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

  // Fetch Graph Data
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

  // Fetch Active Investigation
  const fetchInvestigation = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/investigations`);
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) {
          const detailRes = await fetch(`${API_BASE}/investigations/${list[0].id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setInvestigation(detail);
            if (detail.findings) {
              setHeuristicFindings(detail.findings);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load investigation:', err);
    }
  }, []);

  // Connect WebSocket Logs
  useEffect(() => {
    fetchStatus();
    fetchGraph();
    fetchInvestigation();

    // Poll status every 10s
    const statusInterval = setInterval(fetchStatus, 10000);

    // Setup live WebSocket telemetry
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
    const ws = new WebSocket(`${wsProto}//${wsHost}/api/logs/stream`);

    ws.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data].slice(-100));
    };

    return () => {
      clearInterval(statusInterval);
      ws.close();
    };
  }, [fetchStatus, fetchGraph, fetchInvestigation]);

  // Handle Search Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');

    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Search query yielded no results.');
      }
      const searchResult = await res.json();

      // If search returns a transaction or block or address, re-center graph
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
      } else if (searchResult.type === 'block') {
        fetchGraph(searchResult.data.hash);
      } else if (searchResult.type === 'search_results') {
        setFilterResults(searchResult.data.matches || []);
        setDockOpen(true);
      }
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Run Forensic Analysis
  const runForensics = async (txid: string) => {
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
  };




  // Filter Submissions
  const handleApplyFilter = async (filters: any) => {
    try {
      const res = await fetch(`${API_BASE}/search/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setFilterResults(results);
        setDockOpen(true);
        if (results.length > 0) {
          const firstTx = results[0];
          fetchGraph(firstTx.txid);
          setSelectedNode({
            id: firstTx.txid,
            type: 'transaction',
            full_id: firstTx.txid,
            ...firstTx,
          });
          runForensics(firstTx.txid);
        }
      }
    } catch (err) {
      console.error('Filter request failed:', err);
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

  // Multi-hop explore action from Inspector or Double-click
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
    <div className="flex flex-col h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Professional Command Header */}
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
        showLogs={dockOpen}
        onToggleLogs={() => setDockOpen(!dockOpen)}
        isSearching={isSearching}
      />

      {/* Main Workspace Grid */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Forensic Sidebar */}
        <LeftSidebar
          investigation={investigation}
          enabledHeuristics={enabledHeuristics}
          onToggleHeuristic={handleToggleHeuristic}
          onRunAnalysis={() => selectedNode && runForensics(selectedNode.full_id || selectedNode.id)}
          isAnalyzing={isAnalyzing}
          onApplyFilter={handleApplyFilter}
          onSelectTransaction={(txid) => {
            fetchGraph(txid, mode, depth, direction);
            setSelectedNode({ id: txid, type: 'transaction', full_id: txid });
            runForensics(txid);
          }}
          filterResults={filterResults}
          selectedSubject={selectedNode?.full_id || selectedNode?.full_address || selectedNode?.id || searchQuery}
        />

        {/* Center Cytoscape Canvas & Controls */}
        <main className="flex-1 flex flex-col relative bg-[#070b14] overflow-hidden">
          {searchError && (
            <div className="bg-red-950/80 border-b border-red-800 text-red-300 px-4 py-2 text-xs font-mono flex items-center justify-between">
              <span>SEARCH ERROR: {searchError}</span>
              <button onClick={() => setSearchError('')} className="text-red-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 relative">
            {isLoadingGraph && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
                  <span className="text-xs font-mono text-cyan-400">Rendering Topological Flow...</span>
                </div>
              </div>
            )}

            <CytoscapeGraph
              data={graphData}
              layout={layout}
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

          </div>

          {/* Bottom Dock (Timeline, Query Table, Terminal) */}
          <BottomDock
            logs={logs}
            onClearLogs={() => setLogs([])}
            filterResults={filterResults}
            onSelectTx={(txid) => {
              fetchGraph(txid, mode, depth, direction);
              setSelectedNode({ id: txid, type: 'transaction', full_id: txid });
              runForensics(txid);
            }}
            isOpen={dockOpen}
            onToggleOpen={() => setDockOpen(!dockOpen)}
          />
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
