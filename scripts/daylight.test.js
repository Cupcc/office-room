import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daylightAt, formatTime, timePeriod } from '../src/daylight.js';

test('sun moves east to west and is highest at noon', () => {
  const morning = daylightAt(480);
  const noon = daylightAt(720);
  const evening = daylightAt(1050);
  assert.ok(morning.position[0] < 0);
  assert.ok(evening.position[0] > 0);
  assert.ok(noon.position[1] > morning.position[1]);
  assert.ok(noon.position[1] > evening.position[1]);
  assert.ok(noon.sunIntensity > morning.sunIntensity);
  assert.ok(noon.sunIntensity > evening.sunIntensity);
});

test('night has no sunlight and stronger indoor lights', () => {
  const day = daylightAt(720);
  for (const minute of [0, 240, 1200, 1440]) {
    const night = daylightAt(minute);
    assert.equal(night.sunIntensity, 0);
    assert.ok(night.interiorIntensity > day.interiorIntensity);
    assert.ok(night.environmentIntensity < day.environmentIntensity);
    assert.ok(night.background.r < day.background.r);
  }
});

test('lighting is continuous at sunrise, sunset, keyframes and midnight', () => {
  for (const minute of [300, 360, 480, 720, 960, 1050, 1080, 1140]) {
    const before = daylightAt(minute - 0.001);
    const after = daylightAt(minute + 0.001);
    for (const property of ['sunIntensity', 'ambientIntensity', 'interiorIntensity']) {
      assert.ok(Math.abs(before[property] - after[property]) < 0.001, `${minute}: ${property}`);
    }
    assert.ok(Math.abs(before.background.r - after.background.r) < 0.001);
  }
  const start = daylightAt(0);
  const end = daylightAt(1440);
  assert.equal(start.sunIntensity, end.sunIntensity);
  assert.ok(start.background.equals(end.background));
  start.position.forEach((value, index) =>
    assert.ok(Math.abs(value - end.position[index]) < 1e-10),
  );
});

test('time labels cover midnight, preset periods and invalid inputs', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(1050), '17:30');
  assert.equal(formatTime(1440), '24:00');
  assert.equal(formatTime(NaN), '12:00');
  assert.equal(timePeriod(480), '早晨');
  assert.equal(timePeriod(720), '中午');
  assert.equal(timePeriod(1050), '傍晚');
  assert.equal(timePeriod(1260), '夜晚');
  assert.equal(daylightAt(-10).sunIntensity, 0);
  assert.equal(daylightAt(2000).sunIntensity, 0);
});
