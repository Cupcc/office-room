import equipment from '../../assets/equipment/esd-workbench-1500/equipment.json' with { type: 'json' };
import desk from '../../assets/equipment/office-desk-1400/equipment.json' with { type: 'json' };
import chair from '../../assets/equipment/office-chair-z1/equipment.json' with { type: 'json' };
import { ROOM } from '../room-spec.js';

export const LAYOUT_STORAGE_KEY = 'office-room.equipment-layout.v1';
export const DEFAULT_LAYOUT = Object.freeze({
  placed: true,
  x: equipment.placement.defaultPositionMetres[0],
  z: equipment.placement.defaultPositionMetres[2],
  rotation: 270,
  lightOn: true,
});
export const WORKBENCH_ID = equipment.id;
export const DESK_ID = desk.id;
export const CHAIR_ID = chair.id;
export const EQUIPMENT_SPECS = { [equipment.id]: equipment, [desk.id]: desk, [chair.id]: chair };

export function defaultEquipmentLayout(equipmentId) {
  return equipmentId !== equipment.id && EQUIPMENT_SPECS[equipmentId]
    ? { placed: true, x: 0, z: 0, rotation: 0, lightOn: false }
    : { ...DEFAULT_LAYOUT };
}

export const ROTATION_STEP = 15;
const wrapRotation = (rotation) => ((rotation % 360) + 360) % 360;
const rotationDistance = (a, b) => Math.abs(wrapRotation(a - b + 180) - 180);

// A wider release range keeps a held tick steady until the pointer pulls away.
export function snapRotation(rotation, previousSnap = null) {
  const nearest = wrapRotation(Math.round(rotation / ROTATION_STEP) * ROTATION_STEP);
  const snapAngle =
    previousSnap !== null && rotationDistance(rotation, previousSnap) <= 5
      ? previousSnap
      : rotationDistance(rotation, nearest) <= 3
        ? nearest
        : null;
  return { rotation: snapAngle ?? wrapRotation(Math.round(rotation)), snapAngle };
}

// Clamp the rotated footprint, rather than just the origin, to the room floor.
export function normalizeLayout(value = {}, equipmentId = value?.equipmentId) {
  if (!value || typeof value !== 'object') value = {};
  const spec = EQUIPMENT_SPECS[equipmentId] ?? equipment;
  const defaults = defaultEquipmentLayout(spec.id);
  const finite = (key) =>
    typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] : defaults[key];
  const rotation = wrapRotation(finite('rotation'));
  const angle = (rotation * Math.PI) / 180;
  const halfWidth = spec.dimensions.length / 2000;
  const halfDepth = spec.dimensions.depth / 2000;
  const extentX = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfDepth;
  const extentZ = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfDepth;
  const margin = 0.04; // Keep the footprint clear of the wall skirting.
  const round = (number) => Math.round(number * 1e6) / 1e6 || 0;
  const snap = (number) => Math.round(number * 100) / 100;
  // Round the usable boundary inward so rotation cannot push a snapped corner out.
  const limitX = Math.floor((ROOM.width / 2 - margin - extentX + 1e-8) * 100) / 100;
  const limitZ = Math.floor((ROOM.depth / 2 - margin - extentZ + 1e-8) * 100) / 100;
  return {
    placed: typeof value.placed === 'boolean' ? value.placed : defaults.placed,
    x: round(Math.max(-limitX, Math.min(limitX, snap(finite('x'))))),
    z: round(Math.max(-limitZ, Math.min(limitZ, snap(finite('z'))))),
    rotation: round(rotation),
    lightOn: typeof value.lightOn === 'boolean' ? value.lightOn : defaults.lightOn,
  };
}

// Keep existing locally saved workbench layouts when upgrading to multiple items.
export function normalizeRoomLayout(value) {
  if (!Array.isArray(value?.items)) {
    const legacy = normalizeLayout(value);
    return {
      items: legacy.placed ? [{ id: 'workbench-1', equipmentId: equipment.id, ...legacy }] : [],
    };
  }
  const ids = new Set();
  return {
    items: value.items.flatMap((item, index) => {
      if (!item || !EQUIPMENT_SPECS[item.equipmentId] || item.placed === false) return [];
      const id = typeof item.id === 'string' && item.id ? item.id : `equipment-${index + 1}`;
      if (ids.has(id)) return [];
      ids.add(id);
      return [{ id, equipmentId: item.equipmentId, ...normalizeLayout(item) }];
    }),
  };
}

export function createPlacedEquipment(equipmentId, items, position, id = crypto.randomUUID()) {
  const defaults = defaultEquipmentLayout(equipmentId);
  const candidate = (point) => normalizeLayout({ ...defaults, ...point }, equipmentId);
  let state = candidate(position);
  if (!position) {
    const extents = (item) => {
      const { length, depth } = EQUIPMENT_SPECS[item.equipmentId].dimensions;
      const angle = (item.rotation * Math.PI) / 180;
      return [
        (Math.abs(Math.cos(angle)) * length) / 2000 + (Math.abs(Math.sin(angle)) * depth) / 2000,
        (Math.abs(Math.sin(angle)) * length) / 2000 + (Math.abs(Math.cos(angle)) * depth) / 2000,
      ];
    };
    const fits = (next) => {
      const [x, z] = extents({ ...next, equipmentId });
      return items.every((item) => {
        const [otherX, otherZ] = extents(item);
        return (
          Math.abs(next.x - item.x) >= x + otherX + 0.15 ||
          Math.abs(next.z - item.z) >= z + otherZ + 0.15
        );
      });
    };
    if (!fits(state)) {
      const candidates = [];
      for (let x = -3; x <= 3; x += 0.5)
        for (let z = -3; z <= 3; z += 0.5) candidates.push(candidate({ x, z }));
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - defaults.x, a.z - defaults.z) -
          Math.hypot(b.x - defaults.x, b.z - defaults.z),
      );
      state = candidates.find(fits) ?? state;
    }
  }
  return { id, equipmentId, ...state };
}
