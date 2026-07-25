import { describe, expect, it } from "vitest";
import { BPlusTree, BTree, makeTree, resetIds } from "./trees";
import type { TreeNode } from "./types";

/**
 * Randomised stress test. For each tree flavour and order we run many trials of
 * random insert/delete operations against a reference `Set`, re-validating every
 * structural invariant after each step. This is the correctness guardrail: if it
 * fails, the algorithm is wrong — fix it before touching anything else.
 */

const sortedAsc = (xs: number[]): boolean => xs.every((x, i) => i === 0 || xs[i - 1] < x);

function leafDepthsEqual(root: TreeNode | null): boolean {
  const depths: number[] = [];
  (function go(n: TreeNode, d: number): void {
    if (n.leaf) {
      depths.push(d);
      return;
    }
    n.children.forEach((c) => go(c, d + 1));
  })(root ?? mkEmptyLeaf(), 0);
  return depths.every((d) => d === depths[0]);
}

const mkEmptyLeaf = (): TreeNode => ({ id: -1, leaf: true, keys: [], children: [], next: null });

/** Validate all B-tree invariants; returns a list of human-readable violations. */
function checkBTree(tree: BTree): string[] {
  const errs: string[] = [];
  const { root, maxKeys, minKeys } = tree;
  if (!root) return errs;
  if (!leafDepthsEqual(root)) errs.push("leaves are not all at the same depth");

  (function visit(n: TreeNode, isRoot: boolean, lo: number, hi: number): void {
    if (!sortedAsc(n.keys)) errs.push(`node ${n.id} keys not strictly sorted: ${n.keys}`);
    if (n.keys.length > maxKeys)
      errs.push(`node ${n.id} overflows (${n.keys.length} > ${maxKeys})`);
    if (!isRoot && n.keys.length < minKeys)
      errs.push(`node ${n.id} underflows (${n.keys.length} < ${minKeys})`);
    for (const k of n.keys)
      if (k <= lo || k >= hi) errs.push(`key ${k} in node ${n.id} out of bounds`);
    if (!n.leaf) {
      if (n.children.length !== n.keys.length + 1)
        errs.push(`node ${n.id}: children ${n.children.length} != keys ${n.keys.length} + 1`);
      const bounds = [lo, ...n.keys, hi];
      n.children.forEach((c, i) => visit(c, false, bounds[i], bounds[i + 1]));
    }
  })(root, true, -Infinity, Infinity);

  return errs;
}

/** Validate all B+ tree invariants; returns a list of human-readable violations. */
function checkBPlus(tree: BPlusTree, reference: number[]): string[] {
  const errs: string[] = [];
  const { root, maxKeys, minLeaf, minInt } = tree;
  if (!root) return errs;
  if (!leafDepthsEqual(root)) errs.push("leaves are not all at the same depth");

  const smallest = (n: TreeNode): number => {
    while (!n.leaf) n = n.children[0];
    return n.keys[0];
  };

  (function visit(n: TreeNode, isRoot: boolean): void {
    if (!sortedAsc(n.keys)) errs.push(`node ${n.id} keys not sorted: ${n.keys}`);
    if (n.keys.length > maxKeys) errs.push(`node ${n.id} overflows`);
    if (n.leaf) {
      if (!isRoot && n.keys.length < minLeaf) errs.push(`leaf ${n.id} underflows`);
    } else {
      if (!isRoot && n.keys.length < minInt) errs.push(`internal ${n.id} underflows`);
      if (n.children.length !== n.keys.length + 1)
        errs.push(`internal ${n.id}: children != keys + 1`);
      // every separator equals the smallest key of its right subtree
      for (let j = 0; j < n.keys.length; j++) {
        const sep = smallest(n.children[j + 1]);
        if (n.keys[j] !== sep) errs.push(`separator ${n.keys[j]} in ${n.id} should be ${sep}`);
      }
      n.children.forEach((c) => visit(c, false));
    }
  })(root, true);

  // leaf chain must visit every key in ascending order and match the reference set
  let leaf: TreeNode | null = root;
  while (leaf && !leaf.leaf) leaf = leaf.children[0];
  const chain: number[] = [];
  while (leaf) {
    chain.push(...leaf.keys);
    leaf = leaf.next;
  }
  if (!sortedAsc(chain)) errs.push("leaf chain is not globally sorted");
  if (chain.join(",") !== reference.join(",")) errs.push("leaf chain != reference set");

  return errs;
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

describe.each([2, 3, 4, 5, 6])("order maxKeys=%i", (maxKeys) => {
  it("BTree holds all invariants across random insert/delete", () => {
    for (let trial = 0; trial < 40; trial++) {
      resetIds();
      const tree = new BTree(maxKeys);
      const ref = new Set<number>();
      for (let op = 0; op < 60; op++) {
        const key = 1 + randInt(50);
        if (ref.has(key) && Math.random() < 0.5) {
          tree.delete(key);
          ref.delete(key);
        } else {
          tree.insert(key);
          ref.add(key);
        }
        expect(checkBTree(tree)).toEqual([]);
        expect(tree.entries()).toEqual([...ref].sort((a, b) => a - b));
      }
    }
  });

  it("BPlusTree holds all invariants across random insert/delete", () => {
    for (let trial = 0; trial < 40; trial++) {
      resetIds();
      const tree = new BPlusTree(maxKeys);
      const ref = new Set<number>();
      for (let op = 0; op < 60; op++) {
        const key = 1 + randInt(50);
        if (ref.has(key) && Math.random() < 0.5) {
          tree.delete(key);
          ref.delete(key);
        } else {
          tree.insert(key);
          ref.add(key);
        }
        const sorted = [...ref].sort((a, b) => a - b);
        expect(checkBPlus(tree, sorted)).toEqual([]);
        expect(tree.entries()).toEqual(sorted);
      }
    }
  });
});

describe("conversion between B-tree and B+ tree", () => {
  it("both flavours store the same key set for the same inserts", () => {
    for (let trial = 0; trial < 50; trial++) {
      resetIds();
      const maxKeys = 2 + randInt(5);
      const bt = new BTree(maxKeys);
      const bp = new BPlusTree(maxKeys);
      const ref = new Set<number>();
      for (let op = 0; op < 80; op++) {
        const key = 1 + randInt(120);
        ref.add(key);
        bt.insert(key);
        bp.insert(key);
      }
      const sorted = [...ref].sort((a, b) => a - b);
      expect(bt.entries()).toEqual(sorted);
      expect(bp.entries()).toEqual(sorted);
    }
  });
});

describe("read counts", () => {
  it("a search never reads more nodes than the tree is tall", () => {
    for (const mode of ["btree", "bplus"] as const) {
      resetIds();
      const tree = makeTree(mode, 4);
      const keys = Array.from({ length: 200 }, (_, i) => (i * 7 + 3) % 500);
      const present = new Set<number>();
      for (const k of keys) {
        tree.insert(k);
        present.add(k);
      }
      const h = tree.height();
      for (const k of present) {
        const r = tree.search(k);
        expect(r.found).toBe(true);
        expect(r.reads).toBeLessThanOrEqual(h);
      }
      // a key we never inserted is reported missing
      const missing = tree.search(999);
      expect(missing.found).toBe(false);
      expect(missing.reads).toBeLessThanOrEqual(h);
    }
  });
});
