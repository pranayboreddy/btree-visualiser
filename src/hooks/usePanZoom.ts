import { useCallback, useEffect, useRef, useState } from "react";
import type { Bounds } from "../layout/computeLayout";

export interface View {
  z: number;
  x: number;
  y: number;
}

const clampZoom = (z: number): number => Math.max(0.1, Math.min(3, z));

// Gentle per-notch zoom; the exponential keeps trackpad and mouse-wheel deltas smooth.
const WHEEL_SENSITIVITY = 0.0016;

/**
 * Pan/zoom controller for the SVG canvas. Tracks a view transform, handles
 * pointer drag + wheel zoom, and can fit-to-bounds or focus a single node.
 * `userInteracted` gates auto-focus: once the user grabs the canvas we stop
 * chasing the active node until the next operation calls `resumeAutoFocus`.
 */
export function usePanZoom() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ z: 1, x: 60, y: 24 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const userInteracted = useRef(false);
  // true once a pointer-down turned into an actual drag — lets clicks on keys
  // distinguish "pick this key" from "I was panning".
  const movedRef = useRef(false);

  // Wheel zoom must be a NON-passive native listener so preventDefault() actually
  // stops the page from scrolling / pinch-zooming. React's onWheel is passive.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      userInteracted.current = true;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
      setView((v) => {
        const z = clampZoom(v.z * factor);
        const k = z / v.z;
        // keep the point under the cursor fixed while zooming
        return { z, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
      });
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      userInteracted.current = true;
      movedRef.current = false;
      dragRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [view.x, view.y],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) movedRef.current = true;
    setView((v) => ({ ...v, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  const zoomIn = useCallback(() => {
    userInteracted.current = true;
    setView((v) => ({ ...v, z: clampZoom(v.z * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    userInteracted.current = true;
    setView((v) => ({ ...v, z: clampZoom(v.z * 0.83) }));
  }, []);

  const fit = useCallback((bounds: Bounds) => {
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const gw = bounds.maxX - bounds.minX + 140;
    const gh = bounds.maxY - bounds.minY + 120;
    const z = Math.min(cw / gw, ch / gh, 1.4);
    setView({
      z,
      x: (cw - gw * z) / 2 - bounds.minX * z + 70 * z,
      y: Math.max(28, (ch - gh * z) / 2 + 24),
    });
  }, []);

  const focus = useCallback((node: { x: number; y: number }) => {
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    setView((v) => {
      const z = Math.max(0.55, Math.min(v.z, 1.25));
      return { z, x: cw / 2 - node.x * z, y: Math.max(28, ch * 0.3 - node.y * z) };
    });
  }, []);

  const resumeAutoFocus = useCallback(() => {
    userInteracted.current = false;
  }, []);

  return {
    wrapRef,
    view,
    dragging,
    userInteracted,
    movedRef,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
    zoomIn,
    zoomOut,
    fit,
    focus,
    resumeAutoFocus,
  };
}
