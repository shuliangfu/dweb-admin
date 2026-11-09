/**
 * UI chrome caps for DataPanel (print/columns/density/fullscreen/copy).
 * Client-safe: no auth / database / rbac imports.
 * Auth caps live in caps.ts (server-only resolveResourceCaps).
 */
export const CHROME_CAPS = {
  print: true,
  columns: true,
  density: true,
  fullscreen: true,
  copy: true,
} as const;
