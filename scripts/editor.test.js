import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditorState, editorReducer, transformItems } from '../src/equipment/editor.js';
import {
  createPlacedEquipment,
  DESK_ID,
  WORKBENCH_ID,
  normalizeLayout,
} from '../src/equipment/layout.js';

const desk = createPlacedEquipment(DESK_ID, [], { x: -1, z: 0 }, 'desk');
const bench = createPlacedEquipment(WORKBENCH_ID, [], { x: 1, z: 0 }, 'bench');
const initial = () =>
  editorReducer(createEditorState({ items: [desk, bench] }), { type: 'select', id: 'desk' });
const move = (dx, dz = 0) => ({
  type: 'change',
  update: ({ layout, selected }) => ({
    layout: { items: transformItems(layout.items, selected, { dx, dz }) },
  }),
});

test('modifier selection toggles items and plain selection replaces it without history', () => {
  let state = editorReducer(initial(), { type: 'select', id: 'bench', additive: true });
  assert.deepEqual(state.present.selected, ['desk', 'bench']);
  state = editorReducer(state, { type: 'select', id: 'desk', preserve: true });
  assert.deepEqual(state.present.selected, ['desk', 'bench']);
  state = editorReducer(state, { type: 'select', id: 'desk', additive: true });
  assert.deepEqual(state.present.selected, ['bench']);
  state = editorReducer(state, { type: 'select', ids: ['desk', 'desk', 'missing'] });
  assert.deepEqual(state.present.selected, ['desk']);
  assert.equal(state.past.length, 0);
});

test('a drag with many updates becomes one undo step and redo restores its final position', () => {
  const before = initial();
  let state = editorReducer(before, { type: 'begin' });
  for (let frame = 0; frame < 80; frame++) state = editorReducer(state, move(0.01));
  assert.equal(state.past.length, 0);
  state = editorReducer(state, { type: 'end' });
  assert.equal(state.past.length, 1);
  const after = state.present;
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present, before.present);
  state = editorReducer(state, { type: 'redo' });
  assert.deepEqual(state.present, after);
});

test('no-op gestures do not add steps; selection keeps redo, a new edit clears it', () => {
  let state = editorReducer(initial(), { type: 'begin' });
  state = editorReducer(state, move(0));
  state = editorReducer(state, { type: 'end' });
  assert.equal(state.past.length, 0);
  state = editorReducer(state, move(0.1));
  state = editorReducer(state, { type: 'undo' });
  state = editorReducer(state, { type: 'select', id: 'bench' });
  assert.equal(state.future.length, 1);
  state = editorReducer(state, move(0.1));
  assert.equal(state.future.length, 0);
});

test('undo during an active gesture finishes and undoes exactly that gesture', () => {
  const before = initial();
  let state = editorReducer(before, { type: 'begin' });
  state = editorReducer(state, move(0.4));
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present, before.present);
  assert.equal(state.transaction, null);
  assert.equal(state.future.length, 1);
});

test('changing selection finishes a gesture before editing a different item', () => {
  let state = editorReducer(initial(), { type: 'begin' });
  state = editorReducer(state, move(0.1));
  state = editorReducer(state, { type: 'select', id: 'bench' });
  state = editorReducer(state, move(0.2));
  assert.equal(state.past.length, 2);
  state = editorReducer(state, { type: 'undo' });
  assert.equal(state.present.layout.items[0].x, -0.9);
  assert.equal(state.present.layout.items[1].x, 1);
});

test('batch deletion restores all items, IDs, light state and selection with one undo', () => {
  let state = editorReducer(initial(), { type: 'select', ids: ['desk', 'bench'] });
  const before = state.present;
  state = editorReducer(state, {
    type: 'change',
    update: () => ({ layout: { items: [] }, selected: [] }),
  });
  assert.deepEqual(state.present, { layout: { items: [] }, selected: [] });
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present, before);
  state = editorReducer(state, { type: 'redo' });
  assert.deepEqual(state.present.layout.items, []);
});

test('adding a copied selection is one step, and restores both selections on undo/redo', () => {
  let state = initial();
  const copy = { ...desk, id: 'copy', x: desk.x + 0.2 };
  state = editorReducer(state, {
    type: 'change',
    update: ({ layout }) => ({
      layout: { items: [...layout.items, copy] },
      selected: ['copy'],
    }),
  });
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present.selected, ['desk']);
  assert.equal(state.present.layout.items.length, 2);
  state = editorReducer(state, { type: 'redo' });
  assert.deepEqual(state.present.selected, ['copy']);
  assert.deepEqual(state.present.layout.items.at(-1), copy);
});

test('history is capped at 100 committed edits', () => {
  let state = initial();
  for (let i = 0; i < 125; i++) state = editorReducer(state, move(i % 2 ? -0.01 : 0.01));
  assert.equal(state.past.length, 100);
});

test('moving against every wall preserves group spacing and leaves unselected items alone', () => {
  const items = [desk, bench, { ...desk, id: 'other', z: 2 }];
  for (const [dx, dz] of [
    [100, 0],
    [-100, 0],
    [0, 100],
    [0, -100],
  ]) {
    const result = transformItems(items, ['desk', 'bench'], { dx, dz });
    assert.ok(Math.abs(result[1].x - result[0].x - 2) < 1e-8);
    assert.equal(result[1].z, result[0].z);
    assert.deepEqual(result[2], items[2]);
    for (const item of result)
      assert.deepEqual(normalizeLayout(item), {
        placed: item.placed,
        x: item.x,
        z: item.z,
        rotation: item.rotation,
        lightOn: item.lightOn,
      });
  }
});

test('group rotation uses the selection center, wraps angles, and keeps every footprint inside', () => {
  const quarter = transformItems([desk, bench], ['desk', 'bench'], { rotation: 90 });
  assert.deepEqual(
    quarter.map(({ x, z, rotation }) => [x, z, rotation]),
    [
      [0, 1, 90],
      [0, -1, 0],
    ],
  );
  for (let rotation = 0; rotation < 360; rotation++) {
    const result = transformItems([desk, bench], ['desk', 'bench'], {
      dx: 100,
      dz: -100,
      rotation,
    });
    const distance = Math.hypot(result[1].x - result[0].x, result[1].z - result[0].z);
    assert.ok(Math.abs(distance - 2) < 0.015);
    for (const item of result) {
      const normalized = normalizeLayout(item);
      assert.equal(normalized.x, item.x);
      assert.equal(normalized.z, item.z);
    }
  }
});
