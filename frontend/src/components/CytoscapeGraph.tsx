import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core, EventObject } from 'cytoscape';
import type { GraphData, LayoutType, ColorMode } from '../types';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Palette, Type } from 'lucide-react';
import { getNodeColors } from '../lib/colors';

interface Props {
  data: GraphData;
  layout: LayoutType;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
  onSelectNode: (nodeData: any) => void;
  onSelectEdge: (edgeData: any) => void;
  onDoubleTapNode?: (id: string) => void;
  selectedId?: string | null;
}

const getLayoutOptions = (layoutType: LayoutType, fontSize: number = 12) => {
  const fontMultiplier = Math.max(0.8, fontSize / 12);
  switch (layoutType) {
    case 'cose':
      return {
        name: 'cose',
        animate: false,
        padding: Math.round(70 * fontMultiplier),
        nodeDimensionsIncludeLabels: true,
        // High repulsion to prevent nodes from overlapping
        nodeRepulsion: () => Math.round(95000 * fontMultiplier),
        // Ideal length for natural transaction-address clusters
        idealEdgeLength: () => Math.round(150 * fontMultiplier),
        edgeElasticity: () => 32,
        nestingFactor: 1.2,
        gravity: 0.08, // Forms natural, cohesive clusters for related transactions
        numIter: 1200,
        initialTemp: 350,
        coolingFactor: 0.95,
        minTemp: 1.0,
        randomize: false,
        componentSpacing: Math.round(180 * fontMultiplier),
      };
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        directed: true,
        padding: Math.round(70 * fontMultiplier),
        spacingFactor: 2.2 + (fontSize - 11) * 0.08,
        animate: false,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
      };
    case 'concentric':
      return {
        name: 'concentric',
        padding: Math.round(70 * fontMultiplier),
        spacingFactor: 2.0 * fontMultiplier,
        minNodeSpacing: Math.round(75 * fontMultiplier),
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        concentric: (node: any) => (node.data('is_center') ? 10 : (node.data('type') === 'transaction' ? 5 : 1)),
        levelWidth: () => 2,
      };
    case 'circle':
      return {
        name: 'circle',
        padding: Math.round(70 * fontMultiplier),
        spacingFactor: 2.0 * fontMultiplier,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
      };
    default:
      return {
        name: 'cose',
        animate: false,
        padding: Math.round(70 * fontMultiplier),
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: () => Math.round(95000 * fontMultiplier),
        idealEdgeLength: () => Math.round(150 * fontMultiplier),
        edgeElasticity: () => 32,
        gravity: 0.08,
        componentSpacing: Math.round(180 * fontMultiplier),
      };
  }
};

export const CytoscapeGraph: React.FC<Props> = ({
  data,
  layout = 'cose',
  fontSize = 12,
  onFontSizeChange,
  colorMode = 'hash',
  onColorModeChange,
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
      ...(data?.nodes || []).map((n) => {
        const colors = getNodeColors(n.data, colorMode);
        return {
          group: 'nodes' as const,
          data: {
            ...n.data,
            nodeBg: colors.bg,
            nodeBorder: colors.border,
            nodeOutline: colors.outline,
          },
        };
      }),
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
              'background-color': 'data(nodeBg)',
              'border-width': 2.5,
              'border-color': 'data(nodeBorder)',
              'color': '#f9fafb',
              'label': 'data(label)',
              'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              'font-size': `${fontSize}px`,
              'font-weight': 700,
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'ellipsis',
              'text-max-width': `${Math.round(fontSize * 6.8)}px`,
              'text-outline-width': Math.max(2, Math.round(fontSize * 0.18)),
              'text-outline-color': 'data(nodeOutline)',
              'transition-property': 'background-color, border-color, width, height',
              'transition-duration': 0.15,
            },
          },
          // Address nodes
          {
            selector: 'node[type = "address"]',
            style: {
              'shape': 'ellipse',
              'width': Math.round(fontSize * 4.6),
              'height': Math.round(fontSize * 4.6),
            },
          },
          // Transaction nodes
          {
            selector: 'node[type = "transaction"]',
            style: {
              'shape': 'round-rectangle',
              'width': Math.round(fontSize * 7.8),
              'height': Math.round(fontSize * 3.4),
            },
          },
          // UTXO nodes
          {
            selector: 'node[type = "utxo"]',
            style: {
              'shape': 'diamond',
              'width': Math.round(fontSize * 4.0),
              'height': Math.round(fontSize * 4.0),
            },
          },
          // Coinbase nodes
          {
            selector: 'node[type = "coinbase"]',
            style: {
              'shape': 'hexagon',
              'width': Math.round(fontSize * 4.6),
              'height': Math.round(fontSize * 4.6),
            },
          },
          // Center / focused node (Bitcoin Amber Glow Halo)
          {
            selector: 'node[?is_center]',
            style: {
              'border-width': 4,
              'border-color': '#f59e0b',
              'border-style': 'solid',
              'underlay-color': '#f59e0b',
              'underlay-padding': Math.round(fontSize * 0.6),
              'underlay-opacity': 0.35,
            },
          },
          // Selected node
          {
            selector: 'node:selected',
            style: {
              'border-width': 3.5,
              'border-color': '#ffffff',
              'underlay-color': '#ffffff',
              'underlay-padding': 5,
              'underlay-opacity': 0.25,
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
              'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              'font-size': `${Math.max(9, fontSize - 1)}px`,
              'font-weight': 600,
              'color': '#f3f4f6',
              'text-background-color': '#11141a',
              'text-background-opacity': 0.95,
              'text-background-padding': `${Math.max(3, Math.round(fontSize * 0.28))}px`,
              'text-background-shape': 'roundrectangle',
              'text-border-width': 1,
              'text-border-color': '#374151',
              'text-border-opacity': 0.9,
              'text-rotation': 'autorotate',
            },
          },
          {
            selector: 'edge[?is_center]',
            style: {
              'width': 2.5,
              'line-color': '#f59e0b',
              'target-arrow-color': '#f59e0b',
            },
          },
          {
            selector: 'edge:selected',
            style: {
              'width': 3.5,
              'line-color': '#ffffff',
              'target-arrow-color': '#ffffff',
              'color': '#ffffff',
              'text-border-color': '#ffffff',
            },
          },
        ],
        layout: getLayoutOptions(layout, fontSize) as any,
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
  }, [data, layout, fontSize, colorMode]);

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
    cyRef.current?.fit(undefined, 70);
  };

  const handleResetLayout = () => {
    if (!cyRef.current) return;
    const l = cyRef.current.layout(getLayoutOptions(layout, fontSize) as any);
    l.run();
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, bg: '#0c0e12', scale: 2 });
    const a = document.createElement('a');
    a.href = png;
    a.download = `chainscope-flow-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0c0e12]">
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10 bg-[#12151c]/95 backdrop-blur-xs p-1.5 rounded-lg border border-slate-700/80 shadow-xl">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleFit}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Fit view to canvas"
        >
          <Maximize2 size={15} />
        </button>
        <button
          onClick={handleResetLayout}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Re-run layout calculation"
        >
          <RotateCcw size={15} />
        </button>

        <div className="h-px bg-slate-800 my-0.5" />

        {/* Text Size Quick Increment / Decrement */}
        {onFontSizeChange && (
          <>
            <button
              onClick={() => onFontSizeChange(Math.min(18, fontSize + 2))}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer font-bold text-xs font-mono"
              title="Increase text size"
            >
              A+
            </button>
            <button
              onClick={() => onFontSizeChange(Math.max(8, fontSize - 2))}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer font-bold text-xs font-mono"
              title="Decrease text size"
            >
              A-
            </button>
            <div className="h-px bg-slate-800 my-0.5" />
          </>
        )}

        {/* Color Mode Toggle */}
        {onColorModeChange && (
          <button
            onClick={() => onColorModeChange(colorMode === 'hash' ? 'type' : 'hash')}
            className={`p-2 rounded transition-colors cursor-pointer ${
              colorMode === 'hash'
                ? 'text-amber-400 bg-amber-950/40 border border-amber-800/60'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={`Toggle Color Mode (Current: ${colorMode === 'hash' ? 'Address Hash Spectrum' : 'Entity Type'})`}
          >
            <Palette size={15} />
          </button>
        )}

        <button
          onClick={handleExportPNG}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Export high-res PNG"
        >
          <Download size={15} />
        </button>
      </div>

      {/* Mini Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#12151c]/95 backdrop-blur-xs px-3.5 py-2 rounded-lg border border-slate-700/80 text-[11px] font-mono flex items-center gap-4 text-slate-300 pointer-events-none shadow-lg">
        {colorMode === 'hash' ? (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400 border border-white/60" />
            <span className="font-semibold text-slate-200">Hash-Mapped Spectrum</span>
            <span className="text-[10px] text-slate-400 font-mono">(Unique Color per Address)</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500 border border-sky-300" />
              <span className="font-semibold text-slate-200">Address</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-xs bg-purple-500 border border-purple-300" />
              <span className="font-semibold text-slate-200">Transaction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rotate-45 bg-emerald-500 border border-emerald-300" />
              <span className="font-semibold text-slate-200">UTXO</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5 border-l border-slate-700/80 pl-3">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-400 bg-amber-950/60" />
          <span className="font-semibold text-amber-300">Center Focus</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-[10px] border-l border-slate-700/80 pl-3">
          <Type size={11} className="text-slate-400" />
          <span>{fontSize}px</span>
        </div>
      </div>
    </div>
  );
};
