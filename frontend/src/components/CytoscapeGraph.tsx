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

const getLayoutOptions = (layoutType: LayoutType) => {
  switch (layoutType) {
    case 'cose':
      return {
        name: 'cose',
        animate: false,
        padding: 80,
        nodeDimensionsIncludeLabels: true,
        // High repulsion to prevent nodes from bunching up closely
        nodeRepulsion: () => 90000,
        // Long ideal edge length for clean, spacious separation
        idealEdgeLength: () => 180,
        edgeElasticity: () => 25,
        nodeOverlap: 50,
        gravity: 0.04, // Very light gravity so nodes do not collapse into a ball
        numIter: 1000,
        initialTemp: 300,
        coolingFactor: 0.95,
        minTemp: 1.0,
        randomize: false,
        componentSpacing: 160,
      };
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        directed: true,
        padding: 80,
        spacingFactor: 2.2,
        animate: false,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
      };
    case 'concentric':
      return {
        name: 'concentric',
        padding: 80,
        spacingFactor: 2.0,
        minNodeSpacing: 80,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        concentric: (node: any) => (node.data('is_center') ? 10 : (node.data('type') === 'transaction' ? 5 : 1)),
        levelWidth: () => 2,
      };
    case 'circle':
      return {
        name: 'circle',
        padding: 80,
        spacingFactor: 2.0,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
      };
    default:
      return {
        name: 'breadthfirst',
        directed: true,
        padding: 80,
        spacingFactor: 2.0,
        animate: false,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
      };
  }
};

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
              'font-weight': 600,
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 50,
              'height': 50,
              'text-wrap': 'ellipsis',
              'text-max-width': '75px',
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
              'width': 50,
              'height': 50,
            },
          },
          // Transaction nodes
          {
            selector: 'node[type = "transaction"]',
            style: {
              'shape': 'round-rectangle',
              'border-color': '#8b5cf6',
              'background-color': '#2e1065',
              'width': 84,
              'height': 38,
            },
          },
          // UTXO nodes
          {
            selector: 'node[type = "utxo"]',
            style: {
              'shape': 'diamond',
              'border-color': '#10b981',
              'background-color': '#064e3b',
              'width': 44,
              'height': 44,
            },
          },
          // Coinbase nodes
          {
            selector: 'node[type = "coinbase"]',
            style: {
              'shape': 'hexagon',
              'border-color': '#f59e0b',
              'background-color': '#78350f',
              'width': 50,
              'height': 50,
            },
          },
          // Center / focused node (Glowing cyan halo)
          {
            selector: 'node[?is_center]',
            style: {
              'border-width': 4,
              'border-color': '#00f0ff',
              'border-style': 'solid',
              'underlay-color': '#00f0ff',
              'underlay-padding': 6,
              'underlay-opacity': 0.3,
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
              'control-point-step-size': 40,
              'arrow-scale': 1.25,
              'label': 'data(label)',
              'font-family': 'monospace',
              'font-size': '10px',
              'font-weight': 500,
              'color': '#cbd5e1',
              'text-background-color': '#070b14',
              'text-background-opacity': 0.9,
              'text-background-padding': '3px',
              'text-background-shape': 'roundrectangle',
              'text-rotation': 'autorotate',
            },
          },
          {
            selector: 'edge[?is_center]',
            style: {
              'width': 2.5,
              'line-color': '#0284c7',
              'target-arrow-color': '#0284c7',
            },
          },
          {
            selector: 'edge:selected',
            style: {
              'width': 3.5,
              'line-color': '#38bdf8',
              'target-arrow-color': '#38bdf8',
              'color': '#38bdf8',
            },
          },
        ],
        layout: getLayoutOptions(layout) as any,
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
      console.error('Error selecting node/edge:', err);
    }
  }, [selectedId]);

  // Canvas Action Helpers
  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() / 1.25);
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 80);
  };

  const handleResetLayout = () => {
    if (!cyRef.current) return;
    const l = cyRef.current.layout(getLayoutOptions(layout) as any);
    l.run();
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, bg: '#070b14', scale: 2 });
    const a = document.createElement('a');
    a.href = png;
    a.download = `chainscope-flow-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#070b14]">
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10 bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-lg border border-slate-800 shadow-xl">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-850 rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-850 rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleFit}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-850 rounded transition-colors"
          title="Fit view to canvas"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={handleResetLayout}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-850 rounded transition-colors"
          title="Re-run layout calculation"
        >
          <RotateCcw size={16} />
        </button>
        <div className="h-px bg-slate-800 my-1" />
        <button
          onClick={handleExportPNG}
          className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/60 rounded transition-colors"
          title="Export high-res PNG"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Mini Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/85 backdrop-blur-xs px-3 py-2 rounded-lg border border-slate-800 text-[10px] font-mono flex items-center gap-3 text-slate-400 pointer-events-none shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 border border-cyan-400" />
          <span>Address</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-xs bg-purple-600 border border-purple-400" />
          <span>Transaction</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rotate-45 bg-emerald-600 border border-emerald-400" />
          <span>UTXO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-cyan-300" />
          <span>Center Focus</span>
        </div>
      </div>
    </div>
  );
};
