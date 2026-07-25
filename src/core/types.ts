/** Which tree flavour a structure represents. */
export type TreeMode = "btree" | "bplus";

/**
 * A live node in the tree. `next` singly-links B+ tree leaves in key order;
 * it stays `null` on internal nodes and on every B-tree node.
 */
export interface TreeNode {
  id: number;
  leaf: boolean;
  keys: number[];
  children: TreeNode[];
  next: TreeNode | null;
}

/**
 * An acyclic snapshot of a node, captured for a single animation frame.
 * Parent/`next` pointers are intentionally dropped so snapshots can be cloned
 * and stored without circular references; B+ leaf links are re-derived from
 * left-to-right leaf order at layout time.
 */
export interface SnapshotNode {
  id: number;
  leaf: boolean;
  keys: number[];
  children: SnapshotNode[];
}

/** Extra fields a recorded step may carry, used to drive the animation UI. */
export interface FrameExtra {
  reads?: number;
  searching?: number;
  found?: number;
  notfound?: number;
  /** The connector [parentId, childId] being traversed on this step. */
  edge?: [number, number];
  /** A key that was just placed into a node on this step (green landing pulse). */
  placed?: number;
  /** A key about to be removed on this step (red pulse before it disappears). */
  removing?: number;
  /** The neighbour node a rebalance borrows from / merges with (secondary highlight). */
  source?: number;
}

/** One recorded step of an operation, replayed by the animation player. */
export interface Frame extends FrameExtra {
  root: SnapshotNode | null;
  msg: string;
  active: number | null;
}

/** Outcome of a `search`, including how many nodes (disk reads) were visited. */
export interface SearchResult {
  found: boolean;
  reads: number;
  path: number[];
}
