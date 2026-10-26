const paths = {
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  moon: '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>',
  sunrise: '<path d="M2 18h20M4 21h16M6 15a6 6 0 0 1 12 0M12 2v6m-3-3 3-3 3 3M3 9l2 2m14 0 2-2"/>',
  sunset: '<path d="M2 18h20M4 21h16M6 15a6 6 0 0 1 12 0M12 2v6m-3-3 3 3 3-3M3 9l2 2m14 0 2-2"/>',
  undo: '<path d="M3 10h11a7 7 0 0 1 0 14M3 10l6-6M3 10l6 6" transform="translate(0 -2)"/>',
  redo: '<path d="M21 8H10a7 7 0 0 0 0 14M21 8l-6-6M21 8l-6 6"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  paste:
    '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.2 8.2 12.3 12.3M8.2 15.8 20.5 3.5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  rotate: '<path d="M4 8a8 8 0 1 1-1 7M4 3v5h5"/>',
  focus: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="3"/>',
  workbench:
    '<path d="M3 13h18v2H3zM5 15v6m14-6v6M5 13V3h14v10M5 8h14M8 5h.1M12 5h.1M16 5h.1M8 10h.1M12 10h.1M16 10h.1"/>',
  chair:
    '<rect x="8" y="2" width="8" height="3" rx="1"/><rect x="6" y="6" width="12" height="8" rx="2"/><path d="M4 12v5h16v-5M3 11h3m12 0h3M12 17v4m-6 1 6-2 6 2M5 17v-2m14 2v-2"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  cube: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z"/><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6ZM2 13l10 6 10-6M2 17l10 6 10-6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  camera: '<path d="M9 4 7 7H3v13h18V7h-4l-2-3H9Z"/><circle cx="12" cy="13" r="4"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2.5 8M3 4v6h6"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
  ruler: '<path d="m3 16 13-13 5 5L8 21l-5-5ZM7 12l3 3M11 8l3 3M15 4l3 3"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6l1.4 1.4M5 19l1.4-1.4M17.6 6.4l1.4-1.4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  top: '<path d="M3 3h18v18H3zM3 8h18M8 8v13"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7"/>',
  move: '<path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  curtain: '<path d="M3 3h18M4 3v18l8-6 8 6V3M8 3v15M16 3v15M12 3v12"/>',
  door: '<path d="M3 21V3h18v18M12 3v18M9 12v3M15 12v3M1 21h22"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17v.1"/>',
  leaf: '<path d="M20 3C8 1 2 7 5 15c8 4 16-1 15-12ZM3 21 16 8"/>',
  sliders:
    '<path d="M4 7h4m6 0h6M4 17h10m6 0h0"/><circle cx="11" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cube}</svg>`;
}
