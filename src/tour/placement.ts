import type { Edges } from '../core/geometry';
import { clamp, type Point } from '../core/motion';

export interface Size {
  width: number;
  height: number;
}

export type DockEdge = 'top' | 'bottom';

export const PANEL_MARGIN = 12;
export const DOCK_BREAKPOINT = 640;

export function viewportEdges(): Edges {
  const visual = globalThis.visualViewport;
  if (visual) {
    return {
      left: visual.offsetLeft,
      top: visual.offsetTop,
      right: visual.offsetLeft + visual.width,
      bottom: visual.offsetTop + visual.height
    };
  }
  return { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
}

export function placePanel(target: Edges | null, size: Size, view: Edges, clearance: number): Point {
  const minX = view.left + PANEL_MARGIN;
  const maxX = Math.max(minX, view.right - PANEL_MARGIN - size.width);
  const preferredX = target ? target.left : (view.left + view.right - size.width) / 2;
  const x = clamp(preferredX, minX, maxX);
  const lowest = view.bottom - PANEL_MARGIN - size.height;
  const highest = view.top + PANEL_MARGIN;

  if (!target) return { x, y: lowest };

  const below = target.bottom + clearance;
  if (below <= lowest) return { x, y: below };

  const above = target.top - PANEL_MARGIN - size.height;
  if (above >= highest) return { x, y: above };

  const targetInUpperHalf = (target.top + target.bottom) / 2 < (view.top + view.bottom) / 2;
  return { x, y: targetInUpperHalf ? lowest : highest };
}

export function dockEdge(target: Edges | null, view: Edges, panelHeight: number): DockEdge {
  if (!target || target.bottom <= view.bottom - PANEL_MARGIN - panelHeight) return 'bottom';
  return target.top >= view.top + PANEL_MARGIN + panelHeight ? 'top' : 'bottom';
}

export function dockedPanel(edge: DockEdge, size: Size, view: Edges): Point {
  return {
    x: view.left + PANEL_MARGIN,
    y: edge === 'bottom' ? view.bottom - PANEL_MARGIN - size.height : view.top + PANEL_MARGIN
  };
}
