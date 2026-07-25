import { useMemo } from "react";

export interface SystemCap {
  /** Hard ceiling on live keys, sized to the device (SVG DOM is the real limit). */
  cap: number;
  /** Reported RAM in GB, when the browser exposes it (Chromium only). */
  mem?: number;
  cores: number;
}

/**
 * Derive a bulk-insert ceiling from device hints. The absolute cap is 5000
 * because the SVG node count — not memory — is what actually gets heavy.
 */
export function useSystemCap(): SystemCap {
  return useMemo(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const mem = nav.deviceMemory;
    const cores = navigator.hardwareConcurrency || 4;
    let cap: number;
    if (mem) cap = mem >= 8 ? 3000 : mem >= 4 ? 1500 : 800;
    else cap = cores >= 8 ? 2000 : 1000;
    return { cap: Math.min(cap, 5000), mem, cores };
  }, []);
}
