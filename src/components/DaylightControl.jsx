import { DAYLIGHT_PRESETS, formatTime, timePeriod } from '../daylight.js';
import { Icon, Section } from './ui.jsx';

export function DaylightControl({ time, onChange }) {
  const period = timePeriod(time);
  return (
    <Section title="日光与时间" icon="sun" meta={period} className="daylight-section">
      <div className={`daylight-clock ${period === '夜晚' ? 'is-night' : ''}`}>
        <span className="daylight-orb">
          <Icon name={period === '夜晚' ? 'moon' : 'sun'} />
        </span>
        <div>
          <output htmlFor="daylight-time">{formatTime(time)}</output>
          <span>光线随时间流转</span>
        </div>
        <span className="daylight-clock-label">24H</span>
      </div>
      <label className="daylight-range-label" htmlFor="daylight-time">
        调整时间
      </label>
      <input
        id="daylight-time"
        type="range"
        min="0"
        max="1440"
        step="5"
        value={time}
        aria-valuetext={`${period} ${formatTime(time)}`}
        style={{ '--range-value': `${time / 14.4}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="slider-labels daylight-labels">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      <div className="daylight-presets" role="group" aria-label="时间预设">
        {DAYLIGHT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={time === preset.time ? 'selected' : ''}
            aria-pressed={time === preset.time}
            onClick={() => onChange(preset.time)}
          >
            <Icon name={preset.icon} />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
      <p className="daylight-note">太阳由东向西移动，光影实时变化。示意日出 06:00、日落 18:00。</p>
    </Section>
  );
}
