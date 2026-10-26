import { normalizeRoomLayout } from './layout.js';
import { transformItems } from './editor.js';

export const EQUIPMENT_CLIPBOARD_TYPE = 'application/x-office-room-equipment+json';
const FORMAT = 'office-room/equipment';

export function encodeEquipmentClipboard(items, cut = false) {
  return JSON.stringify({ format: FORMAT, version: 1, cut, items });
}

export function decodeEquipmentClipboard(text) {
  try {
    const value = JSON.parse(text);
    if (value?.format !== FORMAT || value.version !== 1 || !Array.isArray(value.items)) return null;
    const { items } = normalizeRoomLayout({ items: value.items });
    if (!items.length || items.length !== value.items.length) return null;
    return { items, cut: value.cut === true };
  } catch {
    return null;
  }
}

// Retain the group's spacing and find a visible offset, including next to walls.
export function createPastedEquipment(
  source,
  existing,
  pasteIndex = 1,
  createId = () => crypto.randomUUID(),
) {
  const copies = source.map((item) => ({ ...item, id: createId() }));
  const ids = copies.map((item) => item.id);
  const offsets = pasteIndex === 0 ? [[0, 0]] : [];
  for (let step = Math.max(1, pasteIndex); step < Math.max(1, pasteIndex) + 20; step++) {
    const offset = step * 0.2;
    offsets.push(
      [offset, offset],
      [-offset, offset],
      [offset, -offset],
      [-offset, -offset],
      [offset, 0],
      [-offset, 0],
      [0, offset],
      [0, -offset],
    );
  }
  for (const [dx, dz] of offsets) {
    const candidate = transformItems(copies, ids, { dx, dz });
    const overlaps = candidate.some((item) =>
      existing.some(
        (other) =>
          item.equipmentId === other.equipmentId &&
          Math.abs(item.x - other.x) < 0.01 &&
          Math.abs(item.z - other.z) < 0.01,
      ),
    );
    if (!overlaps) return candidate;
  }
  return transformItems(copies, ids, { dx: 0.2, dz: 0.2 });
}
