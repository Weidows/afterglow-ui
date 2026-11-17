/**
 * Stroke icons on a 24×24 grid, currentColor, 1.7 px stroke. Kept inline so a
 * component never needs an icon font or a sprite request.
 */

export type IconName =
  | "check" | "x" | "info" | "alert" | "chevronDown" | "chevronRight"
  | "search" | "copy" | "terminal" | "cpu" | "memory" | "disk" | "network"
  | "activity" | "sliders" | "sun" | "moon" | "plus" | "play" | "pause"
  | "refresh" | "external" | "trash" | "folder" | "layers" | "shield"
  | "arrowRight" | "more" | "gpu" | "command" | "bolt" | "panel";

const ICONS: Record<IconName, string> = {
  check: `<path d="M4.5 12.5l4.6 4.6L19.5 6.7"/>`,
  x: `<path d="M6 6l12 12M18 6L6 18"/>`,
  info: `<circle cx="12" cy="12" r="8.4"/><path d="M12 11.2v5"/><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none"/>`,
  alert: `<path d="M12 4.2 21 19.4H3z"/><path d="M12 9.4v4.2"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>`,
  chevronDown: `<path d="M6 9.5l6 6 6-6"/>`,
  chevronRight: `<path d="M9.5 6l6 6-6 6"/>`,
  search: `<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.4 15.4 20.5 20.5"/>`,
  copy: `<rect x="9" y="9" width="10.5" height="10.5" rx="2"/><path d="M6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>`,
  terminal: `<rect x="3" y="4" width="18" height="16" rx="2.4"/><path d="m7.4 9.4 3 2.6-3 2.6M13 15h4"/>`,
  cpu: `<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10.2" y="10.2" width="3.6" height="3.6" rx="1"/><path d="M9.4 3v3M14.6 3v3M9.4 18v3M14.6 18v3M3 9.4h3M3 14.6h3M18 9.4h3M18 14.6h3"/>`,
  memory: `<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 17v3M12 17v3M17 17v3M7 11h10"/>`,
  disk: `<rect x="4" y="5.5" width="16" height="13" rx="2.4"/><circle cx="12" cy="13" r="3"/><path d="M7 9h2"/>`,
  network: `<circle cx="12" cy="12" r="8.4"/><path d="M3.8 12h16.4M12 3.6c2.4 2.4 3.6 5.3 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.3-3.6-8.4S9.6 6 12 3.6z"/>`,
  activity: `<path d="M3 12.2h4.1L10.4 4l3.5 15.8 2.7-7.6H21"/>`,
  sliders: `<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--ag-bg, #07080b)"/><circle cx="15.5" cy="12" r="2" fill="var(--ag-bg, #07080b)"/><circle cx="8" cy="17" r="2" fill="var(--ag-bg, #07080b)"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/>`,
  moon: `<path d="M20 14.3A8.6 8.6 0 1 1 9.7 4a7 7 0 0 0 10.3 10.3z"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  play: `<path d="M8.5 5.2 19 12 8.5 18.8z"/>`,
  pause: `<path d="M8 5v14M16 5v14"/>`,
  refresh: `<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.5V9h-4.5"/>`,
  external: `<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4V7.6A1.6 1.6 0 0 1 5.6 6H10"/>`,
  trash: `<path d="M4 7h16M9.5 4h5M6.2 7l.9 12.2h9.8L17.8 7M10.2 10.8v5.2M13.8 10.8v5.2"/>`,
  folder: `<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l2 2.2h7.8A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>`,
  layers: `<path d="M12 3.2 21 8l-9 4.8L3 8z"/><path d="M3 12.4l9 4.8 9-4.8M3 16.8l9 4.8 9-4.8"/>`,
  shield: `<path d="M12 3.2 5 6v5.7c0 4.4 2.9 7.4 7 9.1 4.1-1.7 7-4.7 7-9.1V6z"/>`,
  arrowRight: `<path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5"/>`,
  more: `<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>`,
  gpu: `<rect x="2.6" y="6" width="14.8" height="12" rx="2"/><rect x="17.4" y="9" width="4" height="6" rx="1"/><circle cx="9.4" cy="12" r="3"/><path d="M4.6 18v2.6M15.4 18v2.6"/>`,
  command: `<path d="M9 6a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v12a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2z"/>`,
  bolt: `<path d="M13.4 2.8 5.6 13.4h5.2L10 21.2l8.4-11h-5.4z"/>`,
  panel: `<rect x="3" y="4" width="18" height="16" rx="2.4"/><path d="M9.4 4v16"/>`,
};

export interface IconOptions {
  size?: number;
  stroke?: number;
  className?: string;
}

/** Markup for a trusted, static icon. Never pass user content here. */
export function icon(name: IconName, options: IconOptions = {}): string {
  const size = options.size ?? 16;
  const stroke = options.stroke ?? 1.7;
  const className = options.className ? ` class="${options.className}"` : "";
  return `<svg${className} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

export function iconEl(name: IconName, options: IconOptions = {}): SVGSVGElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = icon(name, options);
  return wrapper.firstElementChild as SVGSVGElement;
}

export function iconNames(): IconName[] {
  return Object.keys(ICONS) as IconName[];
}
