import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LAYOUT,
  DESK_ID,
  WORKBENCH_ID,
  createPlacedEquipment,
  normalizeLayout,
  normalizeRoomLayout,
  snapRotation,
} from '../src/equipment/layout.js';

test('all position inputs snap to a 1 cm grid', () => {
  for (const coordinate of [-3.517, -1.234, -0.004, 0.006, 1.238, 3.527]) {
    const state = normalizeLayout({ x: coordinate, z: coordinate });
    assert.ok(Math.abs(state.x * 100 - Math.round(state.x * 100)) < 1e-8);
    assert.ok(Math.abs(state.z * 100 - Math.round(state.z * 100)) < 1e-8);
  }
});

test('rotated footprint stays within the walls at every angle', () => {
  for (let angle = 0; angle < 360; angle++) {
    const radians = (angle * Math.PI) / 180;
    const extentX = Math.abs(Math.cos(radians)) * 0.75 + Math.abs(Math.sin(radians)) * 0.375;
    const extentZ = Math.abs(Math.sin(radians)) * 0.75 + Math.abs(Math.cos(radians)) * 0.375;
    for (const direction of [-1, 1]) {
      const state = normalizeLayout({ x: direction * 100, z: direction * 100, rotation: angle });
      assert.ok(Math.abs(state.x) + extentX <= 3.96 + 1e-8, `X at ${angle}°`);
      assert.ok(Math.abs(state.z) + extentZ <= 3.96 + 1e-8, `Z at ${angle}°`);
    }
  }
});

test('a full turn wraps without losing placement or light state', () => {
  assert.deepEqual(
    normalizeLayout({ ...DEFAULT_LAYOUT, rotation: 630, placed: false, lightOn: false }),
    { ...DEFAULT_LAYOUT, placed: false, lightOn: false },
  );
  assert.equal(normalizeLayout({ rotation: -1 }).rotation, 359);
});

test('invalid stored coordinates recover with usable defaults', () => {
  assert.deepEqual(normalizeLayout(null), DEFAULT_LAYOUT);
  assert.deepEqual(normalizeLayout({ x: 'bad', z: Infinity, rotation: NaN }), DEFAULT_LAYOUT);
});

test('rotation snaps to nearby 15 degree ticks and stays free between them', () => {
  for (let tick = 0; tick < 360; tick += 15) {
    for (const offset of [-3, 0, 3]) {
      assert.deepEqual(snapRotation(tick + offset), { rotation: tick, snapAngle: tick });
    }
    assert.deepEqual(snapRotation(tick + 7), { rotation: (tick + 7) % 360, snapAngle: null });
  }
});

test('a held rotation tick releases after pulling away without jitter', () => {
  assert.deepEqual(snapRotation(43), { rotation: 45, snapAngle: 45 });
  assert.deepEqual(snapRotation(49, 45), { rotation: 45, snapAngle: 45 });
  assert.deepEqual(snapRotation(41, 45), { rotation: 45, snapAngle: 45 });
  assert.deepEqual(snapRotation(51, 45), { rotation: 51, snapAngle: null });
  assert.deepEqual(snapRotation(39, 45), { rotation: 39, snapAngle: null });
  assert.deepEqual(snapRotation(58, 45), { rotation: 60, snapAngle: 60 });
});

test('rotation snapping remains continuous across zero and multiple turns', () => {
  for (const rotation of [-722, -358, -2, 2, 358, 362, 718]) {
    assert.deepEqual(snapRotation(rotation), { rotation: 0, snapAngle: 0 });
  }
  assert.deepEqual(snapRotation(356, 0), { rotation: 0, snapAngle: 0 });
  assert.deepEqual(snapRotation(364, 0), { rotation: 0, snapAngle: 0 });
  assert.deepEqual(snapRotation(354, 0), { rotation: 354, snapAngle: null });
  assert.deepEqual(snapRotation(366, 0), { rotation: 6, snapAngle: null });
});

test('legacy saved workbench placement migrates without losing its settings', () => {
  const legacy = { x: 2.34, z: -1.12, rotation: 135, lightOn: false, placed: true };
  const migrated = normalizeRoomLayout(legacy);
  assert.deepEqual(migrated.items, [{ id: 'workbench-1', equipmentId: WORKBENCH_ID, ...legacy }]);
  assert.deepEqual(normalizeRoomLayout({ ...legacy, placed: false }), { items: [] });
  assert.deepEqual(normalizeRoomLayout({ items: [] }), { items: [] });
});

test('multiple instances retain independent positions and survive a storage round trip', () => {
  const first = createPlacedEquipment(DESK_ID, [], null, 'desk-1');
  const second = createPlacedEquipment(DESK_ID, [first], null, 'desk-2');
  assert.notDeepEqual([first.x, first.z], [second.x, second.z]);
  const room = {
    items: [first, second, { id: 'workbench-1', equipmentId: WORKBENCH_ID, ...DEFAULT_LAYOUT }],
  };
  assert.deepEqual(normalizeRoomLayout(JSON.parse(JSON.stringify(room))), room);
  const removed = normalizeRoomLayout({
    items: room.items.map((item) => (item.id === 'desk-1' ? { ...item, placed: false } : item)),
  });
  assert.deepEqual(removed.items, room.items.slice(1));
});

test('the desk footprint uses its own dimensions at every rotation', () => {
  for (let rotation = 0; rotation < 360; rotation++) {
    const radians = (rotation * Math.PI) / 180;
    const state = normalizeLayout({ x: 100, z: -100, rotation }, DESK_ID);
    assert.ok(
      state.x + Math.abs(Math.cos(radians)) * 0.7 + Math.abs(Math.sin(radians)) * 0.35 <=
        3.96 + 1e-8,
    );
    assert.ok(
      -state.z + Math.abs(Math.sin(radians)) * 0.7 + Math.abs(Math.cos(radians)) * 0.35 <=
        3.96 + 1e-8,
    );
  }
});

test('context placement snaps the clicked position and keeps the desk inside the room', () => {
  const placed = createPlacedEquipment(DESK_ID, [], { x: 1.234, z: -2.346 }, 'desk-click');
  assert.equal(placed.x, 1.23);
  assert.equal(placed.z, -2.35);
  const edge = createPlacedEquipment(DESK_ID, [], { x: 4, z: 4 }, 'desk-edge');
  assert.equal(edge.x, 3.26);
  assert.equal(edge.z, 3.61);
});

test('invalid or duplicate saved entries cannot replace usable instances', () => {
  const desk = createPlacedEquipment(DESK_ID, [], null, 'desk-1');
  assert.deepEqual(normalizeRoomLayout({ items: [null, { equipmentId: 'unknown' }, desk, desk] }), {
    items: [desk],
  });
});
