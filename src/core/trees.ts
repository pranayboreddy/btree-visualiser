// Verified B-tree & B+ tree of order m (maxKeys = m - 1).
//
// The algorithms here are stress-tested (see trees.test.ts): all B-tree
// invariants, the B+ leaf-chain, conversion between the two, and read counts
// are checked across thousands of random operations.
//
// Each tree is instrumented with an optional step recorder (`this.rec`) used
// only for animation. Recorder calls are side-effect-free no-ops when `rec` is
// false, so they never influence algorithm correctness — the stress test runs
// with recording off and exercises the exact code paths below.

import type { Frame, FrameExtra, SearchResult, SnapshotNode, TreeMode, TreeNode } from "./types";

let _id = 0;
export const resetIds = (): void => {
  _id = 0;
};
const nid = (): number => ++_id;

export const mkNode = (leaf: boolean): TreeNode => ({
  id: nid(),
  leaf,
  keys: [],
  children: [],
  next: null,
});

/** Deep-clone a live subtree into an acyclic snapshot (drops `next` pointers). */
export function cloneRoot(n: TreeNode | null): SnapshotNode | null {
  return n === null ? null : cloneNode(n);
}
function cloneNode(n: TreeNode): SnapshotNode {
  return {
    id: n.id,
    leaf: n.leaf,
    keys: [...n.keys],
    children: n.leaf ? [] : n.children.map(cloneNode),
  };
}

export abstract class Base {
  maxKeys: number;
  root: TreeNode | null = null;
  rec = false;
  frames: Frame[] = [];

  constructor(maxKeys: number) {
    this.maxKeys = maxKeys;
  }

  protected _snap(msg: string, active: number | null, extra: FrameExtra = {}): void {
    if (!this.rec) return;
    this.frames.push({ root: cloneRoot(this.root), msg, active: active ?? null, ...extra });
  }

  /** Record a free-form narration step — used by composite UI operations (e.g. update). */
  note(message: string): void {
    this._snap(message, null);
  }

  height(): number {
    let h = 0;
    let n = this.root;
    while (n) {
      h++;
      if (n.leaf) break;
      n = n.children[0];
    }
    return h;
  }

  nodeCount(): number {
    let c = 0;
    (function go(n: TreeNode | null): void {
      if (!n) return;
      c++;
      if (!n.leaf) n.children.forEach(go);
    })(this.root);
    return c;
  }

  abstract search(key: number): SearchResult;
  abstract insert(key: number): void;
  abstract delete(key: number): void;
  abstract entries(): number[];
  abstract minLabel(): number;
}

export class BTree extends Base {
  minKeys: number;

  constructor(maxKeys: number) {
    super(maxKeys);
    this.minKeys = Math.ceil((maxKeys + 1) / 2) - 1;
  }

  private _ci(node: TreeNode, key: number): number {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    return i;
  }

  search(key: number): SearchResult {
    let reads = 0;
    let node = this.root;
    const path: number[] = [];
    while (node) {
      reads++;
      path.push(node.id);
      this._snap(`Read node #${reads}: is ${key} here?`, node.id, { reads, searching: key });
      const i = this._ci(node, key);
      if (i < node.keys.length && node.keys[i] === key) {
        this._snap(`Found ${key} after ${reads} read${reads > 1 ? "s" : ""}.`, node.id, {
          reads,
          found: key,
        });
        return { found: true, reads, path };
      }
      if (node.leaf) {
        this._snap(`${key} is not in the tree. ${reads} reads.`, node.id, { reads, notfound: key });
        return { found: false, reads, path };
      }
      this._snap(`Not here → follow child ${i + 1}.`, node.id, {
        reads,
        searching: key,
        edge: [node.id, node.children[i].id],
      });
      node = node.children[i];
    }
    return { found: false, reads, path };
  }

  insert(key: number): void {
    this._snap(`Insert ${key}: start at the root.`, this.root ? this.root.id : null);
    if (!this.root) {
      this.root = mkNode(true);
      this.root.keys.push(key);
      this._snap(`Empty tree → new root leaf [${key}].`, this.root.id, { placed: key });
      return;
    }
    this._ins(this.root, key);
    if (this.root.keys.length > this.maxKeys) {
      const nr = mkNode(false);
      nr.children.push(this.root);
      this._split(nr, 0);
      this.root = nr;
      this._snap(`Root was full → split it. The tree grows one level taller.`, this.root.id);
    }
    this._snap(`Done inserting ${key}.`, null);
  }

  private _ins(node: TreeNode, key: number): void {
    const i = this._ci(node, key);
    if (i < node.keys.length && node.keys[i] === key) {
      this._snap(`${key} already exists — no change.`, node.id);
      return;
    }
    if (node.leaf) {
      node.keys.splice(i, 0, key);
      this._snap(`Place ${key} into this leaf, keeping it sorted.`, node.id, { placed: key });
      return;
    }
    this._snap(`${key}: follow child ${i + 1}.`, node.id, {
      edge: [node.id, node.children[i].id],
    });
    this._ins(node.children[i], key);
    if (node.children[i].keys.length > this.maxKeys) this._split(node, i);
  }

  private _split(parent: TreeNode, i: number): void {
    const c = parent.children[i];
    const mid = Math.floor(c.keys.length / 2);
    const promote = c.keys[mid];
    const right = mkNode(c.leaf);
    right.keys = c.keys.slice(mid + 1);
    if (!c.leaf) right.children = c.children.slice(mid + 1);
    c.keys = c.keys.slice(0, mid);
    if (!c.leaf) c.children = c.children.slice(0, mid + 1);
    parent.keys.splice(i, 0, promote);
    parent.children.splice(i + 1, 0, right);
    this._snap(`Node overflowed → split. Median ${promote} moves up.`, parent.id);
  }

  delete(key: number): void {
    this._snap(`Delete ${key}: locate it.`, this.root ? this.root.id : null);
    if (!this.root) return;
    this._del(this.root, key);
    if (!this.root.leaf && this.root.keys.length === 0) {
      this.root = this.root.children[0];
      this._snap(`Root emptied → tree shrinks a level.`, this.root ? this.root.id : null);
    } else if (this.root.leaf && this.root.keys.length === 0) {
      this.root = null;
      this._snap(`The tree is now empty.`, null);
    }
    this._snap(`Done deleting ${key}.`, null);
  }

  private _del(node: TreeNode, key: number): void {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (i < node.keys.length && node.keys[i] === key) {
      if (node.leaf) {
        this._snap(`Remove ${key} from this leaf.`, node.id, { removing: key });
        node.keys.splice(i, 1);
        this._snap(`Removed ${key}.`, node.id);
        return;
      }
      let cur = node.children[i];
      while (!cur.leaf) cur = cur.children[cur.children.length - 1];
      const pred = cur.keys[cur.keys.length - 1];
      this._snap(`${key} is in an internal node → replace with predecessor ${pred}.`, node.id, {
        removing: key,
      });
      node.keys[i] = pred;
      this._snap(`Copied predecessor ${pred} up into this node.`, node.id, { placed: pred });
      this._del(node.children[i], pred);
      if (node.children[i].keys.length < this.minKeys) this._rebalance(node, i);
    } else {
      if (node.leaf) {
        this._snap(`${key} not found.`, node.id);
        return;
      }
      this._snap(`${key}: descend into child ${i + 1}.`, node.id, {
        edge: [node.id, node.children[i].id],
      });
      this._del(node.children[i], key);
      if (node.children[i].keys.length < this.minKeys) this._rebalance(node, i);
    }
  }

  private _rebalance(node: TreeNode, i: number): void {
    const child = node.children[i];
    if (i > 0 && node.children[i - 1].keys.length > this.minKeys) {
      const sib = node.children[i - 1];
      this._snap(`Child underflowed → borrow from the left sibling.`, child.id, { source: sib.id });
      this._borrowP(node, i);
      this._snap(`Borrowed a key from the left sibling.`, child.id, {
        source: sib.id,
        placed: child.keys[0],
      });
    } else if (i < node.keys.length && node.children[i + 1].keys.length > this.minKeys) {
      const sib = node.children[i + 1];
      this._snap(`Child underflowed → borrow from the right sibling.`, child.id, {
        source: sib.id,
      });
      this._borrowN(node, i);
      this._snap(`Borrowed a key from the right sibling.`, child.id, {
        source: sib.id,
        placed: child.keys[child.keys.length - 1],
      });
    } else if (i < node.keys.length) {
      const sib = node.children[i + 1];
      this._snap(`Child underflowed → merge with the right sibling.`, child.id, { source: sib.id });
      this._merge(node, i);
      this._snap(`Merged with the right sibling.`, node.children[i].id);
    } else {
      const sib = node.children[i - 1];
      this._snap(`Child underflowed → merge with the left sibling.`, child.id, { source: sib.id });
      this._merge(node, i - 1);
      this._snap(`Merged into the left sibling.`, node.children[i - 1].id);
    }
  }

  private _borrowP(node: TreeNode, i: number): void {
    const c = node.children[i];
    const s = node.children[i - 1];
    c.keys.unshift(node.keys[i - 1]);
    node.keys[i - 1] = s.keys.pop()!;
    if (!c.leaf) c.children.unshift(s.children.pop()!);
  }

  private _borrowN(node: TreeNode, i: number): void {
    const c = node.children[i];
    const s = node.children[i + 1];
    c.keys.push(node.keys[i]);
    node.keys[i] = s.keys.shift()!;
    if (!c.leaf) c.children.push(s.children.shift()!);
  }

  private _merge(node: TreeNode, i: number): void {
    const c = node.children[i];
    const s = node.children[i + 1];
    c.keys.push(node.keys[i]);
    c.keys = c.keys.concat(s.keys);
    if (!c.leaf) c.children = c.children.concat(s.children);
    node.keys.splice(i, 1);
    node.children.splice(i + 1, 1);
  }

  entries(): number[] {
    const out: number[] = [];
    (function go(n: TreeNode | null): void {
      if (!n) return;
      if (n.leaf) {
        out.push(...n.keys);
        return;
      }
      for (let i = 0; i < n.keys.length; i++) {
        go(n.children[i]);
        out.push(n.keys[i]);
      }
      go(n.children[n.children.length - 1]);
    })(this.root);
    return out;
  }

  minLabel(): number {
    return this.minKeys;
  }
}

export class BPlusTree extends Base {
  minLeaf: number;
  minInt: number;

  constructor(maxKeys: number) {
    super(maxKeys);
    this.minLeaf = Math.ceil(maxKeys / 2);
    this.minInt = Math.ceil((maxKeys + 1) / 2) - 1;
  }

  private _desc(node: TreeNode, key: number): number {
    let i = 0;
    while (i < node.keys.length && key >= node.keys[i]) i++;
    return i;
  }

  search(key: number): SearchResult {
    let reads = 0;
    let node = this.root;
    const path: number[] = [];
    if (!node) return { found: false, reads, path };
    while (!node.leaf) {
      reads++;
      path.push(node.id);
      const j = this._desc(node, key);
      this._snap(`Read internal node #${reads}: route ${key}.`, node.id, {
        reads,
        searching: key,
        edge: [node.id, node.children[j].id],
      });
      node = node.children[j];
    }
    reads++;
    path.push(node.id);
    const found = node.keys.includes(key);
    this._snap(
      found
        ? `Found ${key} in a leaf after ${reads} reads.`
        : `${key} not in leaf. ${reads} reads.`,
      node.id,
      { reads, [found ? "found" : "notfound"]: key },
    );
    return { found, reads, path };
  }

  insert(key: number): void {
    this._snap(`Insert ${key}: descend to the right leaf.`, this.root ? this.root.id : null);
    if (!this.root) {
      this.root = mkNode(true);
      this.root.keys.push(key);
      this._snap(`Empty tree → new root leaf [${key}].`, this.root.id, { placed: key });
      return;
    }
    this._ins(this.root, key);
    if (this.root.keys.length > this.maxKeys) {
      const nr = mkNode(false);
      nr.children.push(this.root);
      this._split(nr, 0);
      this.root = nr;
      this._snap(`Root split → tree grows taller.`, this.root.id);
    }
    this._snap(`Done inserting ${key}.`, null);
  }

  private _ins(node: TreeNode, key: number): void {
    if (node.leaf) {
      let i = 0;
      while (i < node.keys.length && node.keys[i] < key) i++;
      if (node.keys[i] === key) {
        this._snap(`${key} already exists.`, node.id);
        return;
      }
      node.keys.splice(i, 0, key);
      this._snap(`Place ${key} into the leaf.`, node.id, { placed: key });
      return;
    }
    const i = this._desc(node, key);
    this._snap(`${key}: follow child ${i + 1}.`, node.id, {
      edge: [node.id, node.children[i].id],
    });
    this._ins(node.children[i], key);
    if (node.children[i].keys.length > this.maxKeys) this._split(node, i);
  }

  private _split(parent: TreeNode, i: number): void {
    const c = parent.children[i];
    if (c.leaf) {
      const mid = Math.ceil(c.keys.length / 2);
      const right = mkNode(true);
      right.keys = c.keys.slice(mid);
      c.keys = c.keys.slice(0, mid);
      right.next = c.next;
      c.next = right;
      parent.keys.splice(i, 0, right.keys[0]);
      parent.children.splice(i + 1, 0, right);
      this._snap(
        `Leaf full → split. Copy up the new leaf's first key (${right.keys[0]}).`,
        parent.id,
      );
    } else {
      const mid = Math.floor(c.keys.length / 2);
      const promote = c.keys[mid];
      const right = mkNode(false);
      right.keys = c.keys.slice(mid + 1);
      right.children = c.children.slice(mid + 1);
      c.keys = c.keys.slice(0, mid);
      c.children = c.children.slice(0, mid + 1);
      parent.keys.splice(i, 0, promote);
      parent.children.splice(i + 1, 0, right);
      this._snap(`Internal node full → split. Push up separator ${promote}.`, parent.id);
    }
  }

  private _smallest(node: TreeNode): number {
    while (!node.leaf) node = node.children[0];
    return node.keys[0];
  }

  private _fixSep(node: TreeNode | null): void {
    if (!node || node.leaf) return;
    for (const ch of node.children) this._fixSep(ch);
    for (let j = 0; j < node.keys.length; j++) node.keys[j] = this._smallest(node.children[j + 1]);
  }

  delete(key: number): void {
    this._snap(`Delete ${key}: go to its leaf.`, this.root ? this.root.id : null);
    if (!this.root) return;
    this._del(this.root, key);
    if (this.root.leaf && this.root.keys.length === 0) {
      this.root = null;
      this._snap(`The tree is now empty.`, null);
      this._snap(`Done deleting ${key}.`, null);
      return;
    }
    if (!this.root.leaf && this.root.keys.length === 0) {
      this.root = this.root.children[0];
      this._snap(`Root emptied → tree shrinks.`, this.root.id);
    }
    this._fixSep(this.root);
    this._snap(`Done deleting ${key} (separators refreshed).`, null);
  }

  private _del(node: TreeNode, key: number): void {
    if (node.leaf) {
      const idx = node.keys.indexOf(key);
      if (idx >= 0) {
        this._snap(`Remove ${key} from this leaf.`, node.id, { removing: key });
        node.keys.splice(idx, 1);
        this._snap(`Removed ${key}.`, node.id);
      } else {
        this._snap(`${key} not found.`, node.id);
      }
      return;
    }
    const i = this._desc(node, key);
    this._snap(`Route ${key} → child ${i + 1}.`, node.id, {
      edge: [node.id, node.children[i].id],
    });
    this._del(node.children[i], key);
    const c = node.children[i];
    const minC = c.leaf ? this.minLeaf : this.minInt;
    if (c.keys.length < minC) this._rebalance(node, i);
  }

  private _rebalance(node: TreeNode, i: number): void {
    const c = node.children[i];
    const left = i > 0 ? node.children[i - 1] : null;
    const right = i < node.children.length - 1 ? node.children[i + 1] : null;
    const minOf = (x: TreeNode): number => (x.leaf ? this.minLeaf : this.minInt);
    if (left && left.keys.length > minOf(left)) {
      this._snap(`Child underflowed → borrow from the left sibling.`, c.id, { source: left.id });
      if (c.leaf) {
        c.keys.unshift(left.keys.pop()!);
        node.keys[i - 1] = c.keys[0];
      } else {
        c.keys.unshift(node.keys[i - 1]);
        node.keys[i - 1] = left.keys.pop()!;
        c.children.unshift(left.children.pop()!);
      }
      this._snap(`Borrowed a key from the left sibling.`, c.id, {
        source: left.id,
        placed: c.keys[0],
      });
    } else if (right && right.keys.length > minOf(right)) {
      this._snap(`Child underflowed → borrow from the right sibling.`, c.id, { source: right.id });
      if (c.leaf) {
        c.keys.push(right.keys.shift()!);
        node.keys[i] = right.keys[0];
      } else {
        c.keys.push(node.keys[i]);
        node.keys[i] = right.keys.shift()!;
        c.children.push(right.children.shift()!);
      }
      this._snap(`Borrowed a key from the right sibling.`, c.id, {
        source: right.id,
        placed: c.keys[c.keys.length - 1],
      });
    } else if (left) {
      this._snap(`Child underflowed → merge with the left sibling.`, c.id, { source: left.id });
      if (c.leaf) {
        left.keys = left.keys.concat(c.keys);
        left.next = c.next;
      } else {
        left.keys.push(node.keys[i - 1]);
        left.keys = left.keys.concat(c.keys);
        left.children = left.children.concat(c.children);
      }
      node.keys.splice(i - 1, 1);
      node.children.splice(i, 1);
      this._snap(`Merged into the left sibling.`, left.id);
    } else {
      this._snap(`Child underflowed → merge with the right sibling.`, c.id, { source: right!.id });
      if (c.leaf) {
        c.keys = c.keys.concat(right!.keys);
        c.next = right!.next;
      } else {
        c.keys.push(node.keys[i]);
        c.keys = c.keys.concat(right!.keys);
        c.children = c.children.concat(right!.children);
      }
      node.keys.splice(i, 1);
      node.children.splice(i + 1, 1);
      this._snap(`Merged with the right sibling.`, c.id);
    }
  }

  entries(): number[] {
    let n = this.root;
    if (!n) return [];
    while (!n.leaf) n = n.children[0];
    const out: number[] = [];
    let leaf: TreeNode | null = n;
    while (leaf) {
      out.push(...leaf.keys);
      leaf = leaf.next;
    }
    return out;
  }

  minLabel(): number {
    return this.minLeaf;
  }
}

export function makeTree(mode: TreeMode, maxKeys: number): Base {
  return mode === "btree" ? new BTree(maxKeys) : new BPlusTree(maxKeys);
}
