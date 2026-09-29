import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core, EventObject } from 'cytoscape';
import type { GraphData, LayoutType } from '../types';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download } from 'lucide-react';

interface Props {
  data: GraphData;
  layout: LayoutType;
  onSelectNode: (nodeData: any) => void;
  onSelectEdge: (edgeData: any) => void;
  onDoubleTapNode?: (id: string) => void;
  selectedId?: string | null;
}

export const CytoscapeGraph: React.FC<Props> = ({
  data,
  layout,
  onSelectNode,
  onSelectEdge,
  onDoubleTapNode,
  selectedId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter elements to ensure Cytoscape never receives an edge with missing node
    const nodeIds = new Set((data?.nodes || []).map((n) => n?.data?.id).filter(Boolean));
    const validEdges = (data?.edges || []).filter((e) => {
      const edgeData = e?.data as any;
      return edgeData && nodeIds.has(edgeData.source) && nodeIds.has(edgeData.target);
    });

    const elements = [
      ...(data?.nodes || []).map((n) => ({
        group: 'nodes' as const,
        data: n.data,
      })),
      ...validEdges.map((e) => ({
        group: 'edges' as const,
        data: e.data,
      })),
    ];

    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#1e293b',
              'border-width': 2,
              'border-color': '#334155',
              'color': '#f8fafc',
              'label': 'data(label)',
              'font-family': 'monospace',
              'font-size': '11px',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 50,
              'height': 50,
              'transition-property': 'background-color, border-color, width, height',
              'transition-duration': 0.2,
            },
          },
          // Address nodes
          {
            selector: 'node[type = "address"]',
            style: {
              'shape': 'ellipse',
              'border-color': '#06b6d4',
              'background-color': '#082f49',
              'width': 44,
              'height': 44,
            },
          },
          // Transaction nodes
          {
            selector: 'node[type = "transaction"]',
            style: {
              'shape': 'round-rectangle',
              'border-color': '#8b5cf6',
              'background-color': '#2e1065',
              'width': 70,
              'height': 36,
            },
          },
          // UTXO nodes
          {
            selector: 'node[type = "utxo"]',
            style: {
              'shape': 'diamond',
              'border-color': '#10b981',
              'background-color': '#064e3b',
              'width': 40,
              'height': 40,
            },
          },
          // Coinbase nodes
          {
            selector: 'node[type = "coinbase"]',
            style: {
              'shape': 'hexagon',
              'border-color': '#f59e0b',
              'background-color': '#78350f',
              'width': 46,
              'height': 46,
            },
          },
          // Center / focused node
          {
            selector: 'node[?is_center]',
            style: {
              'border-width': 4,
              'border-color': '#06b6d4',
              'border-style': 'solid',
            },
          },
          // Selected node
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': '#38bdf8',
              'background-color': '#0284c7',
            },
          },
          // Edges
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#475569',
              'target-arrow-color': '#475569',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 1.2,
              'label': 'data(label)',
              'font-family': 'monospace',
              'font-size': '10px',
              'color': '#94a3b8',
              'text-background-color': '#090d16',
              'text-background-opacity': 0.8,
              'text-background-padding': '2px',
              'text-rotation': 'autorotate',
            },
          },
          {
            selector: 'edge:selected',
            style: {
              'width': 3,
              'line-color': '#38bdf8',
              'target-arrow-color': '#38bdf8',
              'color': '#38bdf8',
            },
          },
        ],
        layout: {
          name: layout === 'breadthfirst' ? 'breadthfirst' : layout,
          directed: true,
          padding: 50,
          spacingFactor: 1.4,
        } as any,
      });

      cy.on('tap', 'node', (evt: EventObject) => {
        try {
          onSelectNode(evt.target.data());
        } catch (err) {
          console.error('Error onSelectNode:', err);
        }
      });

      cy.on('dbltap', 'node', (evt: EventObject) => {
        try {
          const nodeData = evt.target.data();
          const targetId = nodeData.full_id || nodeData.full_address || nodeData.id;
          if (onDoubleTapNode) {
            onDoubleTapNode(targetId);
          }
        } catch (err) {
          console.error('Error onDoubleTapNode:', err);
        }
      });

      cy.on('tap', 'edge', (evt: EventObject) => {
        try {
          onSelectEdge(evt.target.data());
        } catch (err) {
          console.error('Error onSelectEdge:', err);
        }
      });

      cy.on('tap', (evt: EventObject) => {
        if (evt.target === cy) {
          onSelectNode(null);
          onSelectEdge(null);
        }
      });

      cyRef.current = cy;
    } catch (err) {
      console.error('Failed to initialize Cytoscape canvas:', err);
    }

    return () => {
      try {
        cyRef.current?.destroy();
      } catch {}
    };
  }, [data, layout]);

  // Handle selectedId highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    try {
      const cy = cyRef.current;
      cy.elements().unselect();
      if (selectedId) {
        const el = cy.getElementById(selectedId);
        if (el && el.length > 0) {
          el.select();
        }
      }
    } catch (err) {
      console.warn('Error selecting element in Cytoscape:', err);
    }
  }, [selectedId]);


  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 40);
  const handleReset = () => {
    if (!cyRef.current) return;
    cyRef.current.reset();
    cyRef.current.layout({ name: layout, directed: true, padding: 50 } as any).run();
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, bg: '#090d16', scale: 2 });
    const link = document.createElement('a');
    link.download = `chainscope-graph-${Date.now()}.png`;
    link.href = png;
    link.click();
  };

  return (
    <div className="relative w-full h-full bg-[#070b14] overflow-hidden select-none">
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 bg-[#0f172a]/90 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-xl z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleFit}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
          title="Fit View"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
          title="Re-layout Graph"
        >
          <RotateCcw size={16} />
        </button>
        <div className="h-px bg-slate-800 my-0.5" />
        <button
          onClick={handleExportPNG}
          className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors"
          title="Export Graph Image (PNG)"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Canvas Watermark Telemetry */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-[11px] text-slate-500 font-mono bg-[#090d16]/80 px-2.5 py-1 rounded border border-slate-800/60 pointer-events-none">
        <span>NODES: {data.nodes.length}</span>
        <span>•</span>
        <span>EDGES: {data.edges.length}</span>
        <span>•</span>
        <span className="uppercase">LAYOUT: {layout}</span>
      </div>
    </div>
  );
};
