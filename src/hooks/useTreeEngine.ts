import { useCallback, useEffect, useRef, useState } from "react";
import { cloneRoot, makeTree, type Base } from "../core/trees";
import type { Frame, SnapshotNode, TreeMode } from "../core/types";
import { randKey } from "../lib/format";

export interface Stats {
  n: number;
  h: number;
  nodes: number;
}

export interface LastSearch {
  key: number;
  found: boolean;
  reads: number;
}

const STEP_MS = 980;
const COMMIT_MS = 650;
const SEED_SIZE = 12;
const MAX_KEYS_MIN = 2;
const MAX_KEYS_MAX = 6;

/**
 * Owns the live tree, the animation frame queue, and every mutating action.
 *
 * Single operations record frames (`tree.rec = true`) and play them step by
 * step; once the last frame settles we commit the real tree and clear the
 * queue. Bulk inserts skip recording entirely — you can't watch 500 splits.
 */
export function useTreeEngine(cap: number) {
  const treeRef = useRef<Base | null>(null);

  const [mode, setMode] = useState<TreeMode>("btree");
  const [maxKeys, setMaxKeys] = useState(4);
  const [displayRoot, setDisplayRoot] = useState<SnapshotNode | null>(null);
  const [stats, setStats] = useState<Stats>({ n: 0, h: 0, nodes: 0 });
  const [lastSearch, setLastSearch] = useState<LastSearch | null>(null);

  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [opId, setOpId] = useState(0);
  const [bulkId, setBulkId] = useState(0);
  const [token, setToken] = useState<{ text: string; tone: string } | null>(null);

  const statsFrom = (t: Base): Stats => ({
    n: t.entries().length,
    h: t.height(),
    nodes: t.nodeCount(),
  });

  const commit = useCallback(() => {
    const t = treeRef.current;
    if (!t) return;
    setDisplayRoot(cloneRoot(t.root));
    setStats(statsFrom(t));
  }, []);

  const rebuild = useCallback((m: TreeMode, mk: number, keys: number[]) => {
    const t = makeTree(m, mk);
    keys.forEach((k) => t.insert(k));
    treeRef.current = t;
    setFrames(null);
    setPlaying(false);
    setToken(null);
    setDisplayRoot(cloneRoot(t.root));
    setStats(statsFrom(t));
  }, []);

  // seed a small starter tree on mount
  useEffect(() => {
    const seed = new Set<number>();
    while (seed.size < SEED_SIZE) seed.add(randKey(seed));
    rebuild("btree", 4, [...seed]);
  }, [rebuild]);

  const runAnimated = useCallback((fn: (t: Base) => void) => {
    const t = treeRef.current;
    if (!t) return;
    t.rec = true;
    t.frames = [];
    fn(t);
    t.rec = false;
    const recorded: Frame[] = t.frames.length
      ? t.frames
      : [{ root: cloneRoot(t.root), msg: "Done.", active: null }];
    setFrames(recorded);
    setStep(0);
    setPlaying(true);
    setStats(statsFrom(t));
    setOpId((n) => n + 1);
  }, []);

  // auto-advance the animation
  useEffect(() => {
    if (!playing || !frames) return;
    if (step >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(
      () => setStep((s) => Math.min(s + 1, frames.length - 1)),
      STEP_MS / speed,
    );
    return () => clearTimeout(id);
  }, [playing, step, frames, speed]);

  // commit the real tree and clear frames a beat after the last step
  useEffect(() => {
    if (frames && !playing && step >= frames.length - 1) {
      const id = setTimeout(() => {
        commit();
        setFrames(null);
        setStep(0);
        setToken(null);
      }, COMMIT_MS);
      return () => clearTimeout(id);
    }
  }, [frames, playing, step, commit]);

  // ---- actions -------------------------------------------------------------

  const insert = useCallback(
    (key: number) => {
      if (stats.n >= cap) return;
      setToken({ text: `Inserting ${key}`, tone: "var(--green)" });
      runAnimated((t) => t.insert(key));
    },
    [runAnimated, stats.n, cap],
  );

  const remove = useCallback(
    (key: number) => {
      setToken({ text: `Deleting ${key}`, tone: "var(--rose)" });
      runAnimated((t) => t.delete(key));
    },
    [runAnimated],
  );

  const search = useCallback(
    (key: number) => {
      const t = treeRef.current;
      if (!t) return;
      t.rec = false;
      const r = t.search(key);
      setLastSearch({ key, found: r.found, reads: r.reads });
      setToken({ text: `Searching ${key}`, tone: "var(--amber)" });
      runAnimated((tt) => tt.search(key));
    },
    [runAnimated],
  );

  const update = useCallback(
    (oldKey: number, newKey: number) => {
      setToken({ text: `Updating ${oldKey} → ${newKey}`, tone: "var(--amber)" });
      runAnimated((t) => {
        t.note(`Update ${oldKey} → ${newKey} = delete ${oldKey}, then insert ${newKey}.`);
        t.delete(oldKey);
        t.insert(newKey);
      });
    },
    [runAnimated],
  );

  const addRandom = useCallback(
    (count: number) => {
      const t = treeRef.current;
      if (!t) return;
      t.rec = false;
      const have = new Set(t.entries());
      let added = 0;
      let guard = 0;
      while (added < count && have.size < cap && guard < count * 40) {
        const k = 1 + Math.floor(Math.random() * Math.max(999, cap * 2));
        guard++;
        if (!have.has(k)) {
          have.add(k);
          t.insert(k);
          added++;
        }
      }
      setFrames(null);
      setPlaying(false);
      setToken(null);
      commit();
      setBulkId((n) => n + 1);
    },
    [cap, commit],
  );

  const suggestKey = useCallback(() => randKey(new Set(treeRef.current?.entries() ?? [])), []);

  const contains = useCallback(
    (key: number) => treeRef.current?.entries().includes(key) ?? false,
    [],
  );

  const randomExisting = useCallback((): number | null => {
    const entries = treeRef.current?.entries() ?? [];
    return entries.length ? entries[Math.floor(Math.random() * entries.length)] : null;
  }, []);

  const reset = useCallback(() => {
    rebuild(mode, maxKeys, []);
    setLastSearch(null);
  }, [rebuild, mode, maxKeys]);

  const switchMode = useCallback(
    (m: TreeMode) => {
      if (m === mode || !treeRef.current) return;
      const keys = treeRef.current.entries();
      setMode(m);
      rebuild(m, maxKeys, keys);
    },
    [mode, maxKeys, rebuild],
  );

  const changeMaxKeys = useCallback(
    (value: number) => {
      const mk = Math.max(MAX_KEYS_MIN, Math.min(MAX_KEYS_MAX, value));
      const keys = treeRef.current?.entries() ?? [];
      setMaxKeys(mk);
      rebuild(mode, mk, keys);
    },
    [mode, rebuild],
  );

  // ---- derived view state --------------------------------------------------

  const active = frames ? frames[step] : null;
  const shownRoot = active ? active.root : displayRoot;
  const activeEdge = active?.edge ?? null;
  const placedKey = active?.placed ?? null;
  const removingKey = active?.removing ?? null;
  const sourceId = active?.source ?? null;
  const animating = frames !== null;

  // Minimum keys per node, derived purely from mode + order (no ref reads in render).
  const minLabel = mode === "btree" ? Math.ceil((maxKeys + 1) / 2) - 1 : Math.ceil(maxKeys / 2);

  return {
    // config
    mode,
    maxKeys,
    order: maxKeys + 1,
    minLabel,
    cap,
    // data
    stats,
    lastSearch,
    shownRoot,
    // animation
    frames,
    step,
    playing,
    speed,
    active,
    message: active?.msg ?? null,
    highlightId: active?.active ?? null,
    foundKey: active?.found ?? null,
    searchingKey: active?.searching ?? null,
    activeEdge,
    placedKey,
    removingKey,
    sourceId,
    animating,
    token,
    opId,
    bulkId,
    setStep,
    setPlaying,
    setSpeed,
    // actions
    insert,
    remove,
    search,
    update,
    addRandom,
    reset,
    switchMode,
    changeMaxKeys,
    suggestKey,
    contains,
    randomExisting,
  };
}

export type TreeEngine = ReturnType<typeof useTreeEngine>;
