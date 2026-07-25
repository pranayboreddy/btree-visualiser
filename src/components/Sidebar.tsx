import { useState } from "react";
import {
  Activity,
  Calculator,
  ChevronRight,
  Database,
  ListTree,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { bestCaseReads, minDegree, worstCaseReads } from "../lib/format";
import { cx } from "../lib/cx";
import type { TreeMode } from "../core/types";
import type { LastSearch } from "../hooks/useTreeEngine";
import styles from "./Sidebar.module.css";

interface Props {
  mode: TreeMode;
  maxKeys: number;
  order: number;
  minLabel: number;
  statN: number;
  statH: number;
  statNodes: number;
  cap: number;
  mem?: number;
  cores: number;
  lastSearch: LastSearch | null;
  onChangeMaxKeys: (v: number) => void;
  onBulk: (count: number) => void;
  onReset: () => void;
}

export function Sidebar(props: Props) {
  const { maxKeys, order, minLabel, statN, statH, statNodes, cap, lastSearch } = props;
  const [bulkN, setBulkN] = useState(250);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcN, setCalcN] = useState("1000000000");
  const [calcMk, setCalcMk] = useState(100);

  const t = minDegree(order);
  const bound = worstCaseReads(statN, order);
  const capPct = Math.min(100, (statN / cap) * 100);
  const indexBarPct = statN > 0 ? Math.max(2.5, (statH / statN) * 100) : 0;

  const cn = Math.max(0, Math.floor(Number(calcN)) || 0);
  const cOrder = calcMk + 1;
  const cT = minDegree(cOrder);
  const cWorst = worstCaseReads(cn, cOrder);
  const cBest = bestCaseReads(cn, cOrder);
  const speedup = cWorst > 0 ? Math.round(cn / cWorst) : 0;
  const fmt = (x: number) => x.toLocaleString();

  return (
    <aside className={styles.rail}>
      {/* Structure */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <ListTree size={12} />
          Structure
        </div>
        <div className={styles.rowLabel}>Keys per node</div>
        <div className={styles.stepper}>
          <button
            className={styles.stepBtn}
            onClick={() => props.onChangeMaxKeys(maxKeys - 1)}
            aria-label="Fewer keys per node"
          >
            <Minus size={15} />
          </button>
          <span className={styles.stepVal}>{maxKeys}</span>
          <button
            className={cx(styles.stepBtn, styles.stepBtnRight)}
            onClick={() => props.onChangeMaxKeys(maxKeys + 1)}
            aria-label="More keys per node"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <div className={styles.tileLabel}>Order m</div>
            <div className={styles.tileVal}>{order}</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.tileLabel}>Min keys</div>
            <div className={styles.tileVal}>{minLabel}</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.tileLabel}>Children</div>
            <div className={styles.tileVal}>{order}</div>
          </div>
        </div>
        <p className={styles.note}>
          Changing the fan-out rebuilds the tree from the same keys — watch the height change.
        </p>
      </section>

      {/* Keys in tree */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <Database size={12} />
          Keys in tree
        </div>
        <div className={styles.bigRow}>
          <span className={styles.bigNum}>{statN}</span>
          <span className={styles.capOf}>of {cap} max</span>
        </div>
        <div className={styles.capTrack}>
          <div className={styles.capFill} style={{ width: `${capPct}%` }} />
        </div>

        <div className={styles.rowLabel} style={{ marginTop: 14 }}>
          Add random keys
        </div>
        <div className={styles.segmented}>
          {[1, 10, 100, 500].map((n) => (
            <button key={n} className={styles.segBtn} onClick={() => props.onBulk(n)}>
              +{n}
            </button>
          ))}
        </div>
        <div className={styles.exactRow}>
          <span className={styles.exactLabel}>or exactly</span>
          <input
            className={styles.exactInput}
            type="number"
            value={bulkN}
            min={1}
            max={cap}
            onChange={(e) => setBulkN(Math.max(1, Math.min(cap, Number(e.target.value) || 0)))}
            aria-label="Custom key count"
          />
          <button className={styles.addBtn} onClick={() => props.onBulk(bulkN)}>
            Add
          </button>
          <button className={styles.emptyBtn} onClick={props.onReset}>
            <RotateCcw size={12} />
            Empty
          </button>
        </div>
        <div className={styles.capHint}>
          {props.mem ? `~${props.mem} GB RAM` : "RAM hidden by browser"} · {props.cores} cores → cap{" "}
          {cap} keys
        </div>
      </section>

      {/* Read cost */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <Activity size={12} />
          Read cost
        </div>
        <div className={styles.costTiles}>
          <div className={styles.tile}>
            <div className={styles.costVal} data-testid="stat-keys">
              {statN}
            </div>
            <div className={styles.tileLabel}>Keys</div>
          </div>
          <div className={styles.tile}>
            <div className={cx(styles.costVal, styles.accentVal)}>{statH}</div>
            <div className={styles.tileLabel}>Levels</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.costVal}>{statNodes}</div>
            <div className={styles.tileLabel}>Nodes</div>
          </div>
        </div>

        <div className={styles.bars}>
          <div>
            <div className={styles.barTop}>
              <span className={styles.barLabel}>With this index</span>
              <span className={styles.barValGreen}>{statN ? `≤ ${statH} reads` : "—"}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={styles.barGreen} style={{ width: `${indexBarPct}%` }} />
            </div>
          </div>
          <div>
            <div className={styles.barTop}>
              <span className={styles.barLabel}>Full table scan</span>
              <span className={styles.barValRose}>{statN ? `~${statN} reads` : "—"}</span>
            </div>
            <div className={styles.barTrack}>
              <div className={styles.barRose} style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        <div className={cx(styles.lastSearch, lastSearch && styles.lastSearchOn)}>
          <span className={styles.lastLabel}>Last search</span>
          <span
            className={styles.lastVal}
            style={{
              color: lastSearch
                ? lastSearch.found
                  ? "var(--green)"
                  : "var(--rose)"
                : "var(--ink-3)",
            }}
          >
            {lastSearch
              ? `${lastSearch.key} → ${lastSearch.reads} read${lastSearch.reads === 1 ? "" : "s"}, ${lastSearch.found ? "found" : "miss"}`
              : "not run yet"}
          </span>
        </div>

        <div className={styles.boundWrap}>
          <div className={styles.boundFormula}>
            reads ≤ ⌈log<sub>{t}</sub>((n+1)/2)⌉ + 1 = {bound}
          </div>
          t = ⌈m/2⌉ = {t}. Any key is found in at most {statH} node reads instead of ~{statN}.
        </div>
      </section>

      {/* Cost at scale */}
      <section className={styles.card}>
        <button className={styles.calcToggle} onClick={() => setCalcOpen((o) => !o)}>
          <Calculator size={12} />
          Cost at scale
          <span
            className={styles.calcCaret}
            style={{ transform: calcOpen ? "rotate(90deg)" : "none" }}
          >
            <ChevronRight size={13} />
          </span>
        </button>
        {calcOpen && (
          <div className={styles.calcBody}>
            <div className={styles.calcLabel}>Rows in the table</div>
            <input
              className={styles.calcInput}
              type="number"
              value={calcN}
              onChange={(e) => setCalcN(e.target.value)}
            />
            <div className={styles.calcLabel} style={{ marginTop: 10 }}>
              Keys per node (fan-out)
            </div>
            <div className={styles.calcStepper}>
              <button
                className={styles.stepBtn}
                onClick={() => setCalcMk((v) => Math.max(2, v - 10))}
                aria-label="Decrease fan-out"
              >
                <Minus size={14} />
              </button>
              <span className={styles.calcMkVal}>{calcMk}</span>
              <button
                className={cx(styles.stepBtn, styles.stepBtnRight)}
                onClick={() => setCalcMk((v) => Math.min(4000, v + 10))}
                aria-label="Increase fan-out"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className={styles.calcResult}>
              <div className={styles.calcRange}>
                {cBest}–{cWorst} reads
              </div>
              <div className={styles.calcNote}>
                Finding one row among <b>{fmt(cn)}</b> — about <b>{fmt(speedup)}×</b> fewer reads
                than scanning the table.
              </div>
              <div className={styles.calcFormula}>
                worst ≤ ⌈log<sub>{cT}</sub>((n+1)/2)⌉+1 · best = ⌈log<sub>{cOrder}</sub>(n+1)⌉
              </div>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
