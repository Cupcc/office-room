// Model units are metres. Plan orientation: up = south, left = east.
export const ROOM = Object.freeze({
  width: 8,
  depth: 8,
  height: 3,
  post: 0.05,
  startBeam: 0.2,
  endBeam: 0.35,
  glassBays: Object.freeze({ east: 6, north: 4 }),
  floorTile: 0.8,
  ceilingTile: 0.6,
  skirtingHeight: 0.1,
  windowSill: 1,
  windowTop: 2.8,
  windowSide: 0.2,
  windowPier: 0.65,
});

export function wallSegments(wallName = 'north') {
  const count = ROOM.glassBays[wallName];
  const length = wallName === 'east' ? ROOM.depth : ROOM.width;
  const bayWidth = (length - ROOM.startBeam - ROOM.endBeam - (count + 1) * ROOM.post) / count;
  const segments = [{ type: 'beam', start: 0, width: ROOM.startBeam }];
  let cursor = ROOM.startBeam;
  for (let index = 0; index <= count; index++) {
    segments.push({ type: 'post', start: cursor, width: ROOM.post });
    cursor += ROOM.post;
    if (index < count) {
      segments.push({ type: 'glass', start: cursor, width: bayWidth, bay: index });
      cursor += bayWidth;
    }
  }
  segments.push({ type: 'beam', start: cursor, width: ROOM.endBeam });
  return segments;
}

export function windowOpenings() {
  const width = (ROOM.width - ROOM.windowSide * 2 - ROOM.windowPier) / 2;
  return [
    { start: -ROOM.width / 2 + ROOM.windowSide, width },
    { start: ROOM.windowPier / 2, width },
  ];
}

export function ceilingGrid() {
  const count = Math.floor(ROOM.width / ROOM.ceilingTile);
  const border = (ROOM.width - count * ROOM.ceilingTile) / 2;
  return [
    0,
    ...Array.from({ length: count + 1 }, (_, i) => border + i * ROOM.ceilingTile),
    ROOM.width,
  ];
}
