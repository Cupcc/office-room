import { Color, MathUtils } from 'three';

export const DAYLIGHT_PRESETS = [
  { label: '早晨', time: 480, icon: 'sunrise' },
  { label: '中午', time: 720, icon: 'sun' },
  { label: '傍晚', time: 1050, icon: 'sunset' },
  { label: '夜晚', time: 1260, icon: 'moon' },
];

// An illustrative day, with sunrise at 06:00 and sunset at 18:00.
// Values join continuously at midnight; no location or date is assumed.
const KEYFRAMES = [
  [0, 0, '#99aedb', '#242d40', '#8799c2'],
  [300, 0, '#99aedb', '#242d40', '#8799c2'],
  [360, 0.08, '#ffb377', '#b5a0a0', '#c7acb4'],
  [480, 0.7, '#ffe0ae', '#eef0e9', '#e1e9ef'],
  [720, 1, '#fff8e9', '#f2f3ef', '#eff4f4'],
  [960, 0.75, '#ffe0ae', '#eee9df', '#e9dcd5'],
  [1050, 0.22, '#ffab69', '#d3b4a7', '#d3b1b2'],
  [1080, 0.06, '#ffa571', '#a893a3', '#ae9cba'],
  [1140, 0, '#99aedb', '#242d40', '#8799c2'],
  [1440, 0, '#99aedb', '#242d40', '#8799c2'],
];

export function normalizeTime(minutes) {
  return Number.isFinite(minutes) ? MathUtils.clamp(minutes, 0, 1440) : 720;
}

export function formatTime(minutes) {
  const rounded = Math.round(normalizeTime(minutes));
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

export function timePeriod(minutes) {
  const hour = normalizeTime(minutes) / 60;
  if (hour < 6 || hour >= 19) return '夜晚';
  if (hour < 11) return '早晨';
  if (hour < 15) return '中午';
  if (hour < 17) return '午后';
  return '傍晚';
}

export function daylightAt(minutes) {
  const time = normalizeTime(minutes);
  const index = KEYFRAMES.findIndex((frame, i) => i > 0 && time <= frame[0]);
  const from = KEYFRAMES[index - 1];
  const to = KEYFRAMES[index];
  const t = MathUtils.smoothstep(time, from[0], to[0]);
  const daylight = MathUtils.lerp(from[1], to[1], t);
  const angle = ((time / 60 - 6) / 12) * Math.PI;
  const color = (column) => new Color(from[column]).lerp(new Color(to[column]), t);
  return {
    position: [-Math.cos(angle) * 14, Math.sin(angle) * 14, -6],
    sunColor: color(2),
    background: color(3),
    skyColor: color(4),
    sunIntensity: daylight * 2.4 * MathUtils.smoothstep(Math.sin(angle), 0, 0.14),
    ambientIntensity: MathUtils.lerp(0.32, 1.5, daylight),
    fillIntensity: MathUtils.lerp(0.18, 0.8, daylight),
    interiorIntensity: MathUtils.lerp(25, 3, daylight),
    environmentIntensity: MathUtils.lerp(0.16, 0.65, daylight),
    exposure: MathUtils.lerp(0.95, 1, daylight),
  };
}
