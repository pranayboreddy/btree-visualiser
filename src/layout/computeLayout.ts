import { CH, CW, GAP, LEVEL } from "../theme/tokens";
import type { SnapshotNode, TreeMode } from "../core/types";

export interface LaidOutNode {
  id: number;
  x: number;
  y: number;
  w: number;
  keys: number[];
  leaf: boolean;
  depth: number;
  childIds: number[];
}

export interface Edge {
  id: string;
  d: string;
}

export interface LeafLink {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Layout {
  nodes: LaidOutNode[];
  edges: Edge[];
  leafLinks: LeafLink[];
  bounds: Bounds;
  byId: Record<number, LaidOutNode>;
}

const EMPTY_ROOT: SnapshotNode = { id: 0, keys: [], leaf: true, children: [] };

/**
 * Assign (x, y) positions to every node with a simple tidy-tree pass: leaves are
 * laid out left-to-right, internal nodes centre over their children. Edges are
 * cubic Béziers; B+ leaf links are re-derived from left-to-right leaf order.
 */
export function computeLayout(root: SnapshotNode | null, mode: TreeMode): Layout {
  const nodes: LaidOutNode[] = [];
  const byId: Record<number, LaidOutNode> = {};
  let cursor = 0;

  const width = (n: SnapshotNode): number => Math.max(n.keys.length, 1) * CW + 16;

  (function place(n: SnapshotNode, depth: number): void {
    const w = width(n);
    let x: number;
    if (n.leaf || n.children.length === 0) {
      x = cursor + w / 2;
      cursor += w + GAP;
    } else {
      n.children.forEach((c) => place(c, depth + 1));
      const first = byId[n.children[0].id];
      const last = byId[n.children[n.children.length - 1].id];
      x = (first.x + last.x) / 2;
    }
    const node: LaidOutNode = {
      id: n.id,
      x,
      y: depth * LEVEL,
      w,
      keys: n.keys,
      leaf: n.leaf,
      depth,
      childIds: n.children.map((c) => c.id),
    };
    nodes.push(node);
    byId[n.id] = node;
  })(root ?? EMPTY_ROOT, 0);

  const edges: Edge[] = [];
  nodes.forEach((p) => {
    if (p.leaf) return;
    const k = p.childIds.length;
    p.childIds.forEach((cid, i) => {
      const c = byId[cid];
      if (!c) return;
      const sx = p.x - p.w / 2 + (p.w * (i + 0.5)) / k;
      const sy = p.y + CH;
      const ex = c.x;
      const ey = c.y;
      edges.push({
        id: `${p.id}-${cid}`,
        d: `M ${sx} ${sy} C ${sx} ${sy + 44}, ${ex} ${ey - 44}, ${ex} ${ey}`,
      });
    });
  });

  const leafLinks: LeafLink[] = [];
  if (mode === "bplus") {
    const leaves = nodes.filter((n) => n.leaf).sort((a, b) => a.x - b.x);
    for (let i = 0; i < leaves.length - 1; i++) {
      const a = leaves[i];
      const b = leaves[i + 1];
      leafLinks.push({
        id: `ll${a.id}`,
        x1: a.x + a.w / 2,
        y1: a.y + CH / 2,
        x2: b.x - b.w / 2,
        y2: b.y + CH / 2,
      });
    }
  }

  const xs = nodes.map((n) => n.x - n.w / 2);
  const xe = nodes.map((n) => n.x + n.w / 2);
  const ys = nodes.map((n) => n.y);
  const ye = nodes.map((n) => n.y + CH);
  const bounds: Bounds = {
    minX: Math.min(0, ...xs),
    maxX: Math.max(100, ...xe),
    minY: Math.min(0, ...ys),
    maxY: Math.max(100, ...ye),
  };

  return { nodes, edges, leafLinks, bounds, byId };
}
