import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Maximize, Minus, Plus, Shrink } from "lucide-react";
import { CH, LEVEL } from "../theme/tokens";
import type { Layout } from "../layout/computeLayout";
import type { View } from "../hooks/usePanZoom";
import { NodeBox } from "./NodeBox";
import styles from "./Canvas.module.css";

interface Props {
  layout: Layout;
  view: View;
  dragging: boolean;
  playing: boolean;
  animate: boolean;
  speed: number;
  isBplus: boolean;
  highlightId: number | null;
  sourceId: number | null;
  foundKey: number | null;
  searchingKey: number | null;
  placedKey: number | null;
  removingKey: number | null;
  activeEdge: [number, number] | null;
  token: { text: string; tone: string } | null;
  wrapRef: React.Ref<HTMLDivElement>;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onPickKey: (key: number) => void;
}

export function Canvas(props: Props) {
  const { layout, view, playing, token } = props;
  const mult = 1 / props.speed;
  const activeEdgeId = props.activeEdge ? `${props.activeEdge[0]}-${props.activeEdge[1]}` : null;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === canvasRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const depths = [...new Set(layout.nodes.map((n) => n.depth))].sort((a, b) => a - b);

  return (
    <div ref={canvasRef} className={styles.canvas}>
      {token && (
        <div
          className={styles.token}
          style={{ color: token.tone, borderLeftColor: token.tone }}
          data-testid="op-token"
        >
          {token.text}
        </div>
      )}

      <div
        ref={props.wrapRef}
        className={styles.wrap}
        style={{ cursor: props.dragging ? "grabbing" : "grab" }}
        onPointerDown={props.handlers.onPointerDown}
        onPointerMove={props.handlers.onPointerMove}
        onPointerUp={props.handlers.onPointerUp}
        onPointerLeave={props.handlers.onPointerUp}
      >
        <svg width="100%" height="100%" style={{ display: "block" }}>
          <defs>
            <marker
              id="leaf-arrow"
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--bplus)" strokeWidth="1.2" />
            </marker>
          </defs>
          <g
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
              transition: playing ? "transform .55s cubic-bezier(.4,0,.2,1)" : "none",
            }}
          >
            {depths.map((d) => (
              <text
                key={`lv${d}`}
                x={layout.bounds.minX - 22}
                y={d * LEVEL + CH / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontFamily="var(--mono)"
                fontSize={11}
                fontWeight={500}
                fill="var(--ink-3)"
                opacity={0.75}
              >
                L{d}
              </text>
            ))}
            {layout.leafLinks.map((l) => (
              <line
                key={l.id}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="var(--bplus)"
                strokeWidth={1.4}
                strokeDasharray="5 4"
                opacity={0.7}
                markerEnd="url(#leaf-arrow)"
              />
            ))}
            {layout.edges.map((e) => {
              const on = e.id === activeEdgeId;
              return (
                <path
                  key={e.id}
                  d={e.d}
                  fill="none"
                  stroke={on ? "var(--accent)" : "var(--edge)"}
                  strokeWidth={on ? 2.6 : 1.5}
                  strokeDasharray={on ? "6 5" : undefined}
                  style={
                    on
                      ? { animation: "dashFlow .55s linear infinite" }
                      : { transition: "stroke .2s ease, stroke-width .2s ease" }
                  }
                />
              );
            })}
            {layout.nodes.map((n) => (
              <NodeBox
                key={n.id}
                node={n}
                highlight={n.id === props.highlightId}
                source={n.id === props.sourceId}
                foundKey={props.foundKey}
                searchingKey={props.searchingKey}
                placedKey={props.placedKey}
                removingKey={props.removingKey}
                mult={mult}
                animating={props.animate}
                onPickKey={props.onPickKey}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className={styles.zoomGroup}>
        <button className={styles.zoomBtn} onClick={props.onZoomIn} aria-label="Zoom in">
          <Plus size={15} />
        </button>
        <button className={styles.zoomBtn} onClick={props.onZoomOut} aria-label="Zoom out">
          <Minus size={15} />
        </button>
        <button className={styles.zoomBtn} onClick={props.onFit} aria-label="Fit tree to view">
          <Maximize size={15} />
        </button>
        <button
          className={styles.zoomBtn}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Shrink size={14} /> : <Expand size={14} />}
        </button>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swInternal} />
          internal
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swLeaf} />
          leaf
        </span>
        {props.isBplus && (
          <span className={styles.legendItem}>
            <span className={styles.swChain} />
            leaf chain
          </span>
        )}
      </div>
    </div>
  );
}
