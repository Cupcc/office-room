import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import spec from '../assets/equipment/office-chair-z1/equipment.json' with { type: 'json' };
import { createOfficeChair, setChairLounge } from '../src/equipment/office-chair.js';
import {
  CHAIR_ID,
  createPlacedEquipment,
  normalizeLayout,
  normalizeRoomLayout,
} from '../src/equipment/layout.js';

test('chair geometry matches reference width/height and fits its declared stowed footprint', () => {
  const chair = createOfficeChair(spec);
  const bounds = new Box3().setFromObject(chair);
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(size.x - 0.66) < 0.001);
  assert.ok(Math.abs(size.y - 1.18) < 0.001);
  assert.ok(bounds.min.y >= -0.00001);
  assert.ok(bounds.min.z >= -spec.dimensions.depth / 2000);
  assert.ok(bounds.max.z <= spec.dimensions.depth / 2000);
  const seat = new Box3().setFromObject(chair.getObjectByName('Waterfall mesh seat 500 × 500 mm'));
  assert.ok(Math.abs(seat.getSize(new Vector3()).x - 0.5) < 0.002);
  const head = new Box3().setFromObject(chair.getObjectByName('Curved headrest 370 mm'));
  assert.ok(Math.abs(head.getSize(new Vector3()).x - 0.37) < 0.002);
  chair.traverse((object) => {
    if (!object.isMesh) return;
    assert.ok(
      Array.from(object.geometry.attributes.position.array).every(Number.isFinite),
      object.name,
    );
  });
  const membrane = chair.getObjectByName('Upper back mesh / woven membrane');
  assert.ok(membrane.material.transparent);
  const pixels = membrane.material.map.image.data;
  assert.ok(
    pixels.some((value, i) => i % 4 === 3 && value === 0),
    'weave contains open pores',
  );
});

test('lounge pose moves the back and leg support and restores without changing the base', () => {
  const chair = createOfficeChair(spec);
  const initial = new Box3().setFromObject(chair);
  const caster = chair.getObjectByName('Twin caster 1').matrixWorld.clone();
  setChairLounge(chair, true);
  const lounge = new Box3().setFromObject(chair);
  assert.ok(lounge.min.z < initial.min.z - 0.3);
  assert.ok(lounge.max.z > initial.max.z + 0.3);
  assert.ok(lounge.max.y < initial.max.y - 0.15);
  assert.deepEqual(chair.getObjectByName('Twin caster 1').matrixWorld.elements, caster.elements);
  setChairLounge(chair, false);
  assert.ok(new Box3().setFromObject(chair).equals(initial));
});

test('chair placements survive storage and stay inside the room when rotated', () => {
  const placed = createPlacedEquipment(CHAIR_ID, [], null, 'chair-1');
  assert.equal(placed.lightOn, false);
  assert.deepEqual(normalizeRoomLayout(JSON.parse(JSON.stringify({ items: [placed] }))), {
    items: [placed],
  });
  for (let rotation = 0; rotation < 360; rotation += 5) {
    const state = normalizeLayout({ x: 100, z: -100, rotation }, CHAIR_ID);
    const angle = (rotation * Math.PI) / 180;
    assert.ok(
      state.x + Math.abs(Math.cos(angle)) * 0.33 + Math.abs(Math.sin(angle)) * 0.35 <= 3.960001,
    );
    assert.ok(
      -state.z + Math.abs(Math.sin(angle)) * 0.33 + Math.abs(Math.cos(angle)) * 0.35 <= 3.960001,
    );
  }
});
