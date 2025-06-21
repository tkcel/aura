/**
 * Window-specific type definitions
 */

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowConfig {
  bounds: WindowBounds;
  isAlwaysOnTop: boolean;
  isVisible: boolean;
  level?: number;
}

export type WindowMode = 'bar' | 'settings';

export interface WindowManagerOptions {
  mode: WindowMode;
  alwaysOnTop?: boolean;
  visibleOnAllWorkspaces?: boolean;
  visibleOnFullScreen?: boolean;
}