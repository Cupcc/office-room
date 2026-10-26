import { normalizeLayout, normalizeRoomLayout } from './layout.js';

const HISTORY_LIMIT = 100;
const sameLayout = (a, b) => JSON.stringify(a.layout) === JSON.stringify(b.layout);
const checkpoint = (past, value) => [...past, value].slice(-HISTORY_LIMIT);

function snapshot(layout, selected) {
  const normalized = normalizeRoomLayout(layout);
  const ids = new Set(normalized.items.map((item) => item.id));
  return { layout: normalized, selected: [...new Set(selected)].filter((id) => ids.has(id)) };
}

export function createEditorState(layout) {
  return {
    past: [],
    present: snapshot(layout, []),
    future: [],
    transaction: null,
  };
}

// Pointer gestures and held keys share one checkpoint, regardless of frame count.
export function editorReducer(state, action) {
  switch (action.type) {
    case 'select': {
      const { id, additive, preserve, ids } = action;
      const current = state.present.selected;
      const selected =
        ids ??
        (id == null
          ? []
          : additive
            ? current.includes(id)
              ? current.filter((value) => value !== id)
              : [...current, id]
            : preserve && current.includes(id)
              ? current
              : [id]);
      const present = snapshot(state.present.layout, selected);
      if (JSON.stringify(present.selected) === JSON.stringify(current)) return state;
      return { ...editorReducer(state, { type: 'end' }), present };
    }
    case 'begin':
      return state.transaction ? state : { ...state, transaction: state.present };
    case 'end': {
      if (!state.transaction) return state;
      return {
        ...state,
        past: sameLayout(state.transaction, state.present)
          ? state.past
          : checkpoint(state.past, state.transaction),
        transaction: null,
      };
    }
    case 'change': {
      const next = action.update(state.present);
      const present = snapshot(next.layout, next.selected ?? state.present.selected);
      if (sameLayout(state.present, present)) return { ...state, present };
      return {
        ...state,
        present,
        future: [],
        past: state.transaction ? state.past : checkpoint(state.past, state.present),
      };
    }
    case 'undo': {
      const current = editorReducer(state, { type: 'end' });
      if (!current.past.length) return current;
      return {
        ...current,
        present: current.past.at(-1),
        past: current.past.slice(0, -1),
        future: [current.present, ...current.future],
      };
    }
    case 'redo': {
      const current = editorReducer(state, { type: 'end' });
      if (!current.future.length) return current;
      return {
        ...current,
        present: current.future[0],
        future: current.future.slice(1),
        past: checkpoint(current.past, current.present),
      };
    }
    default:
      return state;
  }
}

export function selectionCenter(items) {
  return {
    x: items.reduce((sum, item) => sum + item.x, 0) / (items.length || 1),
    z: items.reduce((sum, item) => sum + item.z, 0) / (items.length || 1),
  };
}

// Apply the same bounded translation to the whole selection to retain its spacing.
export function transformItems(items, ids, { dx = 0, dz = 0, rotation = 0 } = {}) {
  const selected = items.filter((item) => ids.includes(item.id));
  if (!selected.length) return items;
  const center = selectionCenter(selected);
  const angle = (rotation * Math.PI) / 180;
  const candidates = selected.map((item) => ({
    ...item,
    rotation: normalizeLayout({ ...item, rotation: item.rotation + rotation }).rotation,
    x: center.x + (item.x - center.x) * Math.cos(angle) + (item.z - center.z) * Math.sin(angle),
    z: center.z - (item.x - center.x) * Math.sin(angle) + (item.z - center.z) * Math.cos(angle),
  }));
  let minX = -Infinity,
    maxX = Infinity,
    minZ = -Infinity,
    maxZ = Infinity;
  for (const item of candidates) {
    const lower = normalizeLayout({ ...item, x: -100, z: -100 });
    const upper = normalizeLayout({ ...item, x: 100, z: 100 });
    minX = Math.max(minX, lower.x - item.x);
    maxX = Math.min(maxX, upper.x - item.x);
    minZ = Math.max(minZ, lower.z - item.z);
    maxZ = Math.min(maxZ, upper.z - item.z);
  }
  if (minX > maxX || minZ > maxZ) return items;
  const offsetX = Math.max(minX, Math.min(maxX, dx));
  const offsetZ = Math.max(minZ, Math.min(maxZ, dz));
  const transformed = new Map(
    candidates.map((item) => [
      item.id,
      {
        ...item,
        ...normalizeLayout({ ...item, x: item.x + offsetX, z: item.z + offsetZ }),
      },
    ]),
  );
  return items.map((item) => transformed.get(item.id) ?? item);
}
