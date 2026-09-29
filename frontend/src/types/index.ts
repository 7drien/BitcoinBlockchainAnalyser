export type GraphMode = 'address' | 'utxo';
export type LayoutType = 'breadthfirst' | 'cose' | 'concentric' | 'circle';
export type ColorMode = 'hash' | 'type';

export interface NodeStatus {
  network: string;
  node_connected: boolean;
  blocks: number;
  indexed_blocks: number;
  indexed_transactions: number;
  indexed_addresses: number;
  is_external_fallback: boolean;
}

export interface HeuristicFinding {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
  evidence: Record<string, any>;
}

export interface GraphNodeData {
  id: string;
  label: string;
  type: 'address' | 'transaction' | 'utxo' | 'cluster';
  full_id?: string;
  full_address?: string;
  script_type?: string;
  balance_sats?: number;
  value_sats?: number;
  value_btc?: number;
  fee_sats?: number;
  fee_rate?: number;
  vsize?: number;
  block_height?: number;
  block_time?: number;
  is_center?: boolean;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  amount_sats?: number;
  amount_btc?: number;
  txid?: string;
  fee_sats?: number;
  block_height?: number;
}

export interface GraphElement {
  data: GraphNodeData | GraphEdgeData;
}

export interface GraphData {
  nodes: GraphElement[];
  edges: GraphElement[];
}

export interface Investigation {
  id: number;
  name: string;
  description?: string;
  root_subject_type: string;
  root_subject_id: string;
  network: string;
  snapshot_height?: number;
  created_at?: string;
  findings?: HeuristicFinding[];
}
