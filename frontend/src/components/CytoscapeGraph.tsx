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

const getLayoutOptions = (layoutType: LayoutType, fontSize: number = 12, nodeCount: number = 0) => {
  const fontMultiplier = Math.max(0.8, fontSize / 12);
  const isDense = nodeCount >= 60;
  const isVeryDense = nodeCount >= 90;

  switch (layoutType) {
    case 'cose':
      return {
        name: 'cose',
        animate: false,
        padding: Math.round(40 * fontMultiplier),
        nodeDimensionsIncludeLabels: false, // Huge performance boost: avoid DOM text measurement per iteration
        nodeRepulsion: () => (isVeryDense ? 4500 : isDense ? 6000 : 8000),
        idealEdgeLength: () => (isVeryDense ? 55 : isDense ? 75 : 100),
        edgeElasticity: () => 32,
        nestingFactor: 1.2,
        gravity: isVeryDense ? 0.35 : 0.2,
        numIter: isVeryDense ? 160 : isDense ? 220 : 300, // 160-300 iterations instead of 1400 (converges in < 60ms)
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
        randomize: false,
        componentSpacing: Math.round(isVeryDense ? 70 : 120),
      };
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        directed: true,
        padding: Math.round(40 * fontMultiplier),
        spacingFactor: isDense ? 1.5 : 2.2,
        animate: false,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
      };
    case 'concentric':
      return {
        name: 'concentric',
        padding: Math.round(40 * fontMultiplier),
        spacingFactor: isDense ? 1.5 : 2.0,
        minNodeSpacing: isDense ? 35 : 60,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
        concentric: (node: any) => (node.data('is_center') ? 10 : (node.data('type') === 'transaction' ? 5 : 1)),
        levelWidth: () => 2,
      };
    case 'circle':
      return {
        name: 'circle',
        padding: Math.round(40 * fontMultiplier),
        spacingFactor: isDense ? 1.4 : 2.0,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: false,
      };
    default:
      return {
        name: 'cose',
        animate: false,
        padding: 40,
        nodeDimensionsIncludeLabels: false,
        nodeRepulsion: () => 5000,
        idealEdgeLength: () => 80,
        numIter: 200,
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

    const nodeCount = (data?.nodes || []).length;
    const isVeryDense = nodeCount >= 90;

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
        pixelRatio: isVeryDense ? 1 : 'auto', // Avoid huge 4K texture thrashing on dense graphs
        textureOnViewport: true, // Hardware-accelerated viewport texture for smooth 60fps pan/zoom
        hideEdgesOnViewport: isVeryDense, // When panning/zooming 90+ nodes, hide edges during movement
        motionBlur: false,
        wheelSensitivity: 0.22,
        boxSelectionEnabled: false,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(nodeBg)',
              'border-width': 2,
              'border-color': 'data(nodeBorder)',
              'color': '#ffffff',
              'label': 'data(label)',
              'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              'font-size': `${fontSize}px`,
              'font-weight': 700,
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'ellipsis',
              'text-max-width': `${Math.round(fontSize * 6.8)}px`,
              'text-outline-width': Math.max(1, Math.round(fontSize * 0.15)),
              'text-outline-color': 'data(nodeOutline)',
              'min-zoomed-font-size': 6, // Native level-of-detail culling when zoomed out
              'transition-property': 'background-color, border-color', // No width/height transitions!
              'transition-duration': 0.12,
            },
          },
          // Address nodes
          {
            selector: 'node[type = "address"]',
            style: {
              'shape': 'ellipse',
              'width': Math.round(fontSize * 4.4),
              'height': Math.round(fontSize * 4.4),
            },
          },
          // Transaction nodes
          {
            selector: 'node[type = "transaction"]',
            style: {
              'shape': 'round-rectangle',
              'width': Math.round(fontSize * 7.4),
              'height': Math.round(fontSize * 3.2),
            },
          },
          // UTXO nodes
          {
            selector: 'node[type = "utxo"]',
            style: {
              'shape': 'diamond',
              'width': Math.round(fontSize * 3.8),
              'height': Math.round(fontSize * 3.8),
            },
          },
          // Coinbase nodes
          {
            selector: 'node[type = "coinbase"]',
            style: {
              'shape': 'hexagon',
              'width': Math.round(fontSize * 4.4),
              'height': Math.round(fontSize * 4.4),
            },
          },
          // Center / focused node
          {
            selector: 'node[?is_center]',
            style: {
              'border-width': 3.5,
              'border-color': '#f59e0b',
              'border-style': 'solid',
              'underlay-color': '#f59e0b',
              'underlay-padding': Math.round(fontSize * 0.5),
              'underlay-opacity': 0.35,
              'z-index': 99,
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
              'underlay-opacity': 0.35,
              'z-index': 100,
            },
          },
          // Edges
          {
            selector: 'edge',
            style: {
              'width': 1.4,
              'line-color': '#454545',
              'target-arrow-color': '#454545',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'control-point-step-size': 25,
              'arrow-scale': 1.0,
              'label': isVeryDense ? '' : 'data(label)',
              'min-zoomed-font-size': 8, // Hide tiny edge labels when zoomed out
              'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              'font-size': `${Math.max(9, fontSize - 1)}px`,
              'font-weight': 600,
              'color': '#ededed',
              'text-background-color': '#0a0a0a',
              'text-background-opacity': 0.85,
              'text-background-padding': '2px',
              'text-background-shape': 'rectangle',
              'text-rotation': 'autorotate',
            },
          },
          {
            selector: 'edge[?is_center]',
            style: {
              'label': 'data(label)',
              'width': 2.4,
              'line-color': '#ffffff',
              'target-arrow-color': '#ffffff',
              'color': '#ffffff',
              'text-background-opacity': 1,
              'z-index': 99,
            },
          },
          {
            selector: 'edge:selected',
            style: {
              'label': 'data(label)',
              'width': 2.8,
              'line-color': '#ffffff',
              'target-arrow-color': '#ffffff',
              'color': '#ffffff',
              'text-background-opacity': 1,
              'z-index': 100,
            },
          },
          {
            selector: 'edge.hover',
            style: {
              'label': 'data(label)',
              'width': 2.2,
              'line-color': '#a3a3a3',
              'target-arrow-color': '#a3a3a3',
              'z-index': 90,
            },
          },
        ],
        layout: getLayoutOptions(layout, fontSize, nodeCount) as any,
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

      cy.on('mouseover', 'edge', (evt: EventObject) => {
        evt.target.addClass('hover');
      });

      cy.on('mouseout', 'edge', (evt: EventObject) => {
        evt.target.removeClass('hover');
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
    const l = cyRef.current.layout(
      getLayoutOptions(layout, fontSize, data?.nodes?.length || 0) as any
    );
    l.run();
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, bg: '#000000', scale: 2 });
    const a = document.createElement('a');
    a.href = png;
    a.download = `chainscope-flow-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {/* Top-Left Density & Element Count Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#121212]/90 backdrop-blur-xs px-2.5 py-1.5 rounded-md border border-neutral-800 text-[11px] font-mono text-neutral-300 pointer-events-none shadow-md">
        <span className="font-semibold text-white">{data?.nodes?.length || 0}</span>
        <span>nodes</span>
        <span className="text-neutral-600">•</span>
        <span className="font-semibold text-white">{data?.edges?.length || 0}</span>
        <span>edges</span>
        {(data?.nodes?.length || 0) >= 80 && (
          <span className="ml-1 px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[10px] font-bold border border-neutral-700">
            Optimized
          </span>
        )}
      </div>

      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10 bg-[#121212]/95 backdrop-blur-xs p-1.5 rounded-lg border border-neutral-800 shadow-xl">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          title="Fit view to canvas"
        >
          <Maximize2 size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetLayout}
          className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          title="Re-run layout calculation"
        >
          <RotateCcw size={15} />
        </button>

        <div className="h-px bg-neutral-800 my-0.5" />

        {/* Text Size Quick Increment / Decrement */}
        {onFontSizeChange && (
          <>
            <button
              type="button"
              onClick={() => onFontSizeChange(Math.min(18, fontSize + 2))}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer font-bold text-xs font-mono"
              title="Increase text size"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => onFontSizeChange(Math.max(8, fontSize - 2))}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer font-bold text-xs font-mono"
              title="Decrease text size"
            >
              A-
            </button>
            <div className="h-px bg-neutral-800 my-0.5" />
          </>
        )}

        {/* Color Mode Toggle */}
        {onColorModeChange && (
          <button
            type="button"
            onClick={() => onColorModeChange(colorMode === 'hash' ? 'type' : 'hash')}
            className={`p-2 rounded transition-colors cursor-pointer ${
              colorMode === 'hash'
                ? 'text-black bg-white'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
            title={`Toggle Color Mode (Current: ${colorMode === 'hash' ? 'Monochrome Entity' : 'Entity Type'})`}
          >
            <Palette size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={handleExportPNG}
          className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          title="Export high-res PNG"
        >
          <Download size={15} />
        </button>
      </div>

      {/* Mini Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#121212]/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] font-mono flex items-center gap-3.5 text-neutral-300 pointer-events-none shadow-lg">
        {colorMode === 'hash' ? (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-purple-400 border border-white/60" />
            <span className="text-white font-medium">Distinct Entity Colors</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 border border-emerald-300" />
              <span className="text-white font-medium">Address</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded-xs bg-purple-400 border border-purple-300" />
              <span className="text-white font-medium">Transaction</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-2.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-400 bg-amber-950/60" />
          <span className="text-amber-400 font-medium">Target</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400 text-[10px] border-l border-neutral-800 pl-2.5">
          <Type size={11} className="text-neutral-400" />
          <span>{fontSize}px</span>
        </div>
      </div>
    </div>
  );
};
