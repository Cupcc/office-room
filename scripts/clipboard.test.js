import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPastedEquipment,
  decodeEquipmentClipboard,
  encodeEquipmentClipboard,
} from '../src/equipment/clipboard.js';
import { createEditorState, editorReducer } from '../src/equipment/editor.js';
import {
  createPlacedEquipment,
  DESK_ID,
  WORKBENCH_ID,
  normalizeLayout,
} from '../src/equipment/layout.js';

const desk = createPlacedEquipment(DESK_ID, [], { x: -1, z: 0.5, rotation: 30 }, 'desk');
const bench = createPlacedEquipment(WORKBENCH_ID, [], { x: 1, z: -0.5, rotation: 270 }, 'bench');
const nextId = () => {
  let id = 0;
  return () => `pasted-${++id}`;
};
const paste = (items) => ({
  type: 'change',
  update: ({ layout }) => ({
    layout: { items: [...layout.items, ...items] },
    selected: items.map((item) => item.id),
  }),
});

test('clipboard round trip preserves a mixed group independently of later source edits', () => {
  const source = [{ ...desk }, { ...bench }];
  const text = encodeEquipmentClipboard(source);
  source[0].rotation = 180;
  source[1].lightOn = false;
  assert.deepEqual(decodeEquipmentClipboard(text), { items: [desk, bench], cut: false });
  assert.equal(decodeEquipmentClipboard(encodeEquipmentClipboard([desk], true)).cut, true);
});

test('ordinary text, foreign JSON, empty and unsupported model payloads are not pasted', () => {
  for (const text of [
    '',
    'hello',
    'null',
    '{}',
    '{bad json',
    JSON.stringify({ format: 'other', version: 1, items: [desk] }),
    JSON.stringify({ format: 'office-room/equipment', version: 2, items: [desk] }),
    encodeEquipmentClipboard([]),
    encodeEquipmentClipboard([{ ...desk, equipmentId: 'unknown' }]),
    encodeEquipmentClipboard([null]),
    encodeEquipmentClipboard([desk, desk]),
  ])
    assert.equal(decodeEquipmentClipboard(text), null);
});

test('pasting makes new independent IDs and retains orientation, light and group spacing', () => {
  const source = [desk, bench];
  const result = createPastedEquipment(source, source, 1, nextId());
  assert.deepEqual(
    result.map((item) => item.id),
    ['pasted-1', 'pasted-2'],
  );
  assert.equal(result[1].x - result[0].x, bench.x - desk.x);
  assert.equal(result[1].z - result[0].z, bench.z - desk.z);
  result.forEach((item, index) => {
    assert.equal(item.rotation, source[index].rotation);
    assert.equal(item.lightOn, source[index].lightOn);
    assert.notDeepEqual([item.x, item.z], [source[index].x, source[index].z]);
  });
  assert.deepEqual(source, [desk, bench]);
});

test('repeated paste near the wall stays visible and within the room', () => {
  const source = [
    createPlacedEquipment(WORKBENCH_ID, [], { x: 100, z: 100, rotation: 270 }, 'edge'),
  ];
  let existing = [...source];
  const createId = nextId();
  for (let index = 1; index <= 12; index++) {
    const [item] = createPastedEquipment(source, existing, index, createId);
    assert.ok(existing.every((other) => other.x !== item.x || other.z !== item.z));
    assert.equal(item.x, normalizeLayout(item).x);
    assert.equal(item.z, normalizeLayout(item).z);
    existing = [...existing, item];
  }
  assert.equal(new Set(existing.map((item) => item.id)).size, 13);
});

test('paste works without a selection, and undo/redo restores the entire pasted group', () => {
  let state = editorReducer(createEditorState({ items: [desk, bench] }), {
    type: 'select',
    ids: [],
  });
  const before = state.present;
  const copies = createPastedEquipment([desk, bench], before.layout.items, 1, nextId());
  state = editorReducer(state, paste(copies));
  const after = state.present;
  assert.equal(after.layout.items.length, 4);
  assert.deepEqual(
    after.selected,
    copies.map((item) => item.id),
  );
  assert.equal(state.past.length, 1);
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present, before);
  state = editorReducer(state, { type: 'redo' });
  assert.deepEqual(state.present, after);
});

test('cut and paste into an empty room retain position and are separate undo steps', () => {
  let state = createEditorState({ items: [desk, bench] });
  state = editorReducer(state, { type: 'select', ids: ['desk', 'bench'] });
  const before = state.present;
  const buffer = decodeEquipmentClipboard(encodeEquipmentClipboard(before.layout.items, true));
  state = editorReducer(state, {
    type: 'change',
    update: () => ({ layout: { items: [] }, selected: [] }),
  });
  const copies = createPastedEquipment(buffer.items, [], 0, nextId());
  assert.deepEqual(
    copies.map(({ x, z }) => [x, z]),
    [
      [desk.x, desk.z],
      [bench.x, bench.z],
    ],
  );
  state = editorReducer(state, paste(copies));
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present.layout.items, []);
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.present, before);
});
