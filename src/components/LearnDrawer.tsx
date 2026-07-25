import { type ReactNode } from "react";
import { X } from "lucide-react";
import { minDegree } from "../lib/format";
import type { TreeMode } from "../core/types";
import styles from "./LearnDrawer.module.css";

interface Props {
  open: boolean;
  mode: TreeMode;
  order: number;
  maxKeys: number;
  minLabel: number;
  onClose: () => void;
}

function K({ children }: { children: ReactNode }) {
  return <b className={styles.k}>{children}</b>;
}

export function LearnDrawer({ open, mode, order, maxKeys, minLabel, onClose }: Props) {
  if (!open) return null;
  const isB = mode === "btree";
  const t = minDegree(order);

  const rules: ReactNode[] = [
    <>
      Order m = <K>{order}</K> — a node holds at most <K>{maxKeys}</K> keys and <K>{order}</K>{" "}
      children.
    </>,
    <>
      A node with <K>k</K> keys has exactly <K>k + 1</K> children.
    </>,
    ...(isB
      ? [
          <>
            Every node except the root keeps at least <K>{minLabel}</K> keys (⌈m/2⌉ − 1), so nodes
            stay at least half full.
          </>,
          <>
            Keys in a node are sorted; each key separates two subtrees — everything left is smaller,
            everything right is larger.
          </>,
          <>Keys (and their data) can live in both internal nodes and leaves.</>,
        ]
      : [
          <>
            All real keys and data live in the <strong>leaves</strong>; internal nodes hold only
            separator keys that route a search to the right leaf.
          </>,
          <>
            Leaves are chained left → right into a linked list, so ordered scans and range queries
            are cheap.
          </>,
          <>
            Each leaf keeps at least <K>{minLabel}</K> keys (⌈m/2⌉); internal nodes at least{" "}
            <K>{Math.ceil(order / 2) - 1}</K>.
          </>,
        ]),
    <>All leaves sit at the same depth — the tree is always height-balanced.</>,
    <>
      On overflow a node <strong>splits</strong>:{" "}
      {isB
        ? "the median key moves up into the parent."
        : "a leaf copies its first key up; an internal node pushes its median up."}{" "}
      The tree grows taller only when the root splits.
    </>,
  ];

  const complexity: [string, string][] = [
    ["Search", "O(log n)"],
    ["Insert", "O(log n)"],
    ["Delete", "O(log n)"],
    ["Range scan", isB ? "O(k · log n)" : "O(log n + k)"],
    ["Space", "O(n)"],
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="How it works">
        <div className={styles.head}>
          <div className={styles.title}>{isB ? "How a B-tree works" : "How a B+ tree works"}</div>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>Rules</div>
          <ul className={styles.rules}>
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          <div className={styles.section}>Time complexity</div>
          <table className={styles.table}>
            <tbody>
              {complexity.map(([op, big]) => (
                <tr key={op}>
                  <td>{op}</td>
                  <td>{big}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.fanout}>
            The log <em>base is the fan-out</em>. A binary search tree is <K>log₂ n</K>; this tree
            branches up to <K>{order}</K> ways, so its height grows like{" "}
            <K>
              log<sub>{t}</sub> n
            </K>{" "}
            — far shallower. That is why a billion rows are only a handful of reads.
            {!isB && (
              <>
                {" "}
                The leaf chain makes a range scan of <K>k</K> results just <K>log n + k</K>, versus{" "}
                <K>k · log n</K> for a B-tree.
              </>
            )}
          </div>

          <div className={styles.section} style={{ marginTop: 22 }}>
            Reading the canvas
          </div>
          <div className={styles.legendList}>
            <div className={styles.legendRow}>
              <span className={styles.swInternal} />
              <span>Internal node — routes a search toward the right child.</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.swLeaf} />
              <span>Leaf — the bottom level; all leaves sit at the same depth.</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.swActive} />
              <span>Amber outline — the node the current step is working on.</span>
            </div>
            <div className={styles.legendRow}>
              <span className={styles.swSource} />
              <span>Dashed outline — the sibling being borrowed from or merged with.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
