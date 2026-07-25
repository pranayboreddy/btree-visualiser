import { useEffect, useMemo, useRef, useState } from "react";
import { computeLayout } from "./layout/computeLayout";
import { clampInt } from "./lib/format";
import { useSystemCap } from "./hooks/useSystemCap";
import { useTheme } from "./hooks/useTheme";
import { usePanZoom } from "./hooks/usePanZoom";
import { useTreeEngine } from "./hooks/useTreeEngine";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ActionBar } from "./components/ActionBar";
import { Canvas } from "./components/Canvas";
import { PlaybackBar } from "./components/PlaybackBar";
import { LearnDrawer } from "./components/LearnDrawer";
import styles from "./App.module.css";

export default function App() {
  const sys = useSystemCap();
  const { theme, toggle } = useTheme();
  const engine = useTreeEngine(sys.cap);
  const pan = usePanZoom();

  const [keyVal, setKeyVal] = useState("");
  const [newVal, setNewVal] = useState("");
  const [learnOpen, setLearnOpen] = useState(false);

  const layout = useMemo(
    () => computeLayout(engine.shownRoot, engine.mode),
    [engine.shownRoot, engine.mode],
  );

  // ---- view fitting ----
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (didInitialFit.current || !engine.shownRoot) return;
    didInitialFit.current = true;
    const id = setTimeout(() => pan.fit(layout.bounds), 120);
    return () => clearTimeout(id);
  }, [engine.shownRoot, layout, pan]);

  useEffect(() => {
    const id = setTimeout(() => pan.fit(layout.bounds), 70);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.mode, engine.maxKeys, engine.bulkId]);

  useEffect(() => {
    const active = engine.active;
    if (!active || active.active == null || pan.userInteracted.current) return;
    const node = layout.byId[active.active];
    if (node) pan.focus(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.active]);

  useEffect(() => {
    pan.resumeAutoFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.opId]);

  // ---- derived UI ----
  const isB = engine.mode === "btree";
  const blurb = isB
    ? "Keys live at every level — a lookup can stop early."
    : "Keys live only in the leaves, chained for range scans.";

  const keyTyped = keyVal.trim() !== "";
  const typedKey = clampInt(keyVal);
  const keyExists = keyTyped && typedKey != null && engine.contains(typedKey);
  const statusColor = keyExists ? "var(--green)" : "var(--ink-3)";
  const statusText = !keyTyped
    ? "type a key, or click one in the tree"
    : keyExists
      ? `${typedKey} is in the tree`
      : `${typedKey} is new — ↵ to insert`;

  // ---- actions ----
  const doInsert = () => {
    const k = clampInt(keyVal);
    if (k == null || keyVal === "" || engine.stats.n >= sys.cap) return;
    engine.insert(k);
    setKeyVal(String(engine.suggestKey()));
  };
  const doDelete = () => {
    const k = clampInt(keyVal);
    if (k == null || keyVal === "") return;
    engine.remove(k);
  };
  const doSearch = () => {
    const k = clampInt(keyVal);
    if (k == null || keyVal === "") return;
    engine.search(k);
  };
  const doUpdate = () => {
    const a = clampInt(keyVal);
    const b = clampInt(newVal);
    if (a == null || b == null || keyVal === "" || newVal.trim() === "") return;
    engine.update(a, b);
    setKeyVal(String(b));
    setNewVal("");
  };
  const onKeyEnter = () => (keyExists ? doSearch() : doInsert());
  const randomKey = () => {
    const k = engine.randomExisting();
    if (k != null) setKeyVal(String(k));
  };
  const pickKey = (k: number) => {
    if (pan.movedRef.current) return;
    setKeyVal(String(k));
  };

  // ---- playback ----
  const stepBack = () => {
    engine.setPlaying(false);
    pan.resumeAutoFocus();
    engine.setStep((s) => Math.max(0, s - 1));
  };
  const stepFwd = () => {
    engine.setPlaying(false);
    pan.resumeAutoFocus();
    engine.setStep((s) => Math.min((engine.frames?.length ?? 1) - 1, s + 1));
  };
  const togglePlay = () => engine.setPlaying((p) => !p);

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && learnOpen) setLearnOpen(false);
      if (!engine.frames) return;
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepFwd();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBack();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.frames, learnOpen]);

  const total = engine.frames?.length ?? 0;

  return (
    <div className={styles.app} data-mode={engine.mode}>
      <Header
        mode={engine.mode}
        onModeChange={engine.switchMode}
        theme={theme}
        onToggleTheme={toggle}
        onOpenLearn={() => setLearnOpen(true)}
        blurb={blurb}
      />

      <div className={styles.shell}>
        <main className={styles.stage}>
          <ActionBar
            keyVal={keyVal}
            newVal={newVal}
            statusColor={statusColor}
            statusText={statusText}
            onKeyVal={setKeyVal}
            onNewVal={setNewVal}
            onKeyEnter={onKeyEnter}
            onNewEnter={doUpdate}
            onRandomKey={randomKey}
            onInsert={doInsert}
            onSearch={doSearch}
            onDelete={doDelete}
            onUpdate={doUpdate}
          />

          <Canvas
            layout={layout}
            view={pan.view}
            dragging={pan.dragging}
            playing={engine.playing}
            animate={engine.animating}
            speed={engine.speed}
            isBplus={!isB}
            highlightId={engine.highlightId}
            sourceId={engine.sourceId}
            foundKey={engine.foundKey}
            searchingKey={engine.searchingKey}
            placedKey={engine.placedKey}
            removingKey={engine.removingKey}
            activeEdge={engine.activeEdge}
            token={engine.token}
            wrapRef={pan.wrapRef}
            handlers={pan.handlers}
            onZoomIn={pan.zoomIn}
            onZoomOut={pan.zoomOut}
            onFit={() => pan.fit(layout.bounds)}
            onPickKey={pickKey}
          />

          <PlaybackBar
            hasFrames={engine.frames !== null}
            playing={engine.playing}
            message={engine.message ?? ""}
            pct={total ? ((engine.step + 1) / total) * 100 : 0}
            stepLabel={total ? `${engine.step + 1} / ${total}` : ""}
            speed={engine.speed}
            onStepBack={stepBack}
            onStepFwd={stepFwd}
            onTogglePlay={togglePlay}
            onSpeed={engine.setSpeed}
          />
        </main>

        <Sidebar
          mode={engine.mode}
          maxKeys={engine.maxKeys}
          order={engine.order}
          minLabel={engine.minLabel}
          statN={engine.stats.n}
          statH={engine.stats.h}
          statNodes={engine.stats.nodes}
          cap={sys.cap}
          mem={sys.mem}
          cores={sys.cores}
          lastSearch={engine.lastSearch}
          onChangeMaxKeys={engine.changeMaxKeys}
          onBulk={engine.addRandom}
          onReset={engine.reset}
        />
      </div>

      <LearnDrawer
        open={learnOpen}
        mode={engine.mode}
        order={engine.order}
        maxKeys={engine.maxKeys}
        minLabel={engine.minLabel}
        onClose={() => setLearnOpen(false)}
      />
    </div>
  );
}
