import { useEffect, useRef } from 'react';
import { defaultEquipmentLayout } from '../equipment/layout.js';
import { equipmentById } from '../equipment/catalog.js';
import { Dimensions, Icon, Section, Toggle } from './ui.jsx';
import { DaylightControl } from './DaylightControl.jsx';
import { ROOM, wallSegments, windowOpenings } from '../room-spec.js';

export function EquipmentEditor({
  layout,
  item,
  saved,
  editMode,
  onMode,
  onPatch,
  onMove,
  onFocus,
  onInspect,
  onBegin,
  onEnd,
}) {
  const facing = ['北', '西', '南', '东'][Math.round(layout.rotation / 90) % 4];
  const positionInput = (axis, label) => {
    const value = Number(((layout[axis] + 4) * 100).toFixed(2));
    return (
      <label>
        {label}
        <span>cm</span>
        <input
          key={value}
          defaultValue={value}
          type="number"
          min="0"
          max="800"
          step="1"
          inputMode="decimal"
          onBlur={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onPatch({ [axis]: n / 100 - 4 });
            else e.target.value = value;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </label>
    );
  };
  return (
    <Section
      title={item.spec.name}
      icon="workbench"
      className="placed-equipment"
      meta={saved ? '已本地保存' : '已放置'}
    >
      <p className="equipment-copy edit-description">
        拖动物品移动，拖动圆环旋转 360°。
        <br />
        旋转每 15° 刻度吸附 · 地面 1 cm 网格吸附
      </p>
      <div className="equipment-edit-tabs" role="group" aria-label="物品编辑模式">
        {[
          ['translate', 'move', '移动'],
          ['rotate', 'rotate', '旋转'],
        ].map(([id, name, label]) => (
          <button
            key={id}
            data-edit-mode={id}
            className={editMode === id ? 'selected' : ''}
            aria-pressed={editMode === id}
            onClick={() => onMode(id)}
          >
            <Icon name={name} />
            {label}
          </button>
        ))}
        <button onClick={onFocus}>
          <Icon name="focus" />
          定位
        </button>
      </div>
      <div className="position-inputs">
        {positionInput('x', '中心距东墙')}
        {positionInput('z', '中心距南墙')}
      </div>
      <div className="nudge-controls" role="group" aria-label="移动物品">
        <button data-nudge="south" onClick={() => onMove('south')}>
          ↑ 南
        </button>
        <button data-nudge="east" onClick={() => onMove('east')}>
          ← 东
        </button>
        <span>每次 1 cm</span>
        <button data-nudge="west" onClick={() => onMove('west')}>
          西 →
        </button>
        <button data-nudge="north" onClick={() => onMove('north')}>
          北 ↓
        </button>
      </div>
      <div className="rotation-title">
        <label htmlFor="equipment-rotation">转向角度</label>
        <output>
          {layout.rotation}° · 朝{facing}
        </output>
      </div>
      <input
        id="equipment-rotation"
        type="range"
        min="0"
        max="359"
        step="1"
        value={Math.round(layout.rotation) % 360}
        style={{ '--range-value': `${(layout.rotation / 359) * 100}%` }}
        onPointerDown={onBegin}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        onLostPointerCapture={onEnd}
        onBlur={onEnd}
        onKeyDown={(event) => {
          if (
            [
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              'Home',
              'End',
              'PageUp',
              'PageDown',
            ].includes(event.key)
          )
            onBegin();
        }}
        onKeyUp={onEnd}
        onChange={(e) => onPatch({ rotation: Number(e.target.value) })}
      />
      <div className="equipment-button-row rotation-buttons">
        {[
          [-15, '左转 15°'],
          [15, '右转 15°'],
          [90, '旋转 90°'],
        ].map(([n, label]) => (
          <button
            className="button"
            key={n}
            onClick={() => onPatch({ rotation: layout.rotation + n })}
          >
            {label}
          </button>
        ))}
      </div>
      {item.spec.id === 'esd-workbench-1500' && (
        <Toggle
          id="room-task-light"
          name="sun"
          label="操作台工作灯"
          description="与办公室日光 / 夜景独立控制"
          checked={layout.lightOn}
          onChange={(lightOn) => onPatch({ lightOn })}
        />
      )}
      <div className="equipment-button-row placement-secondary">
        <button
          className="button"
          onClick={() =>
            onPatch({ ...defaultEquipmentLayout(item.spec.id), lightOn: layout.lightOn })
          }
        >
          恢复默认位置
        </button>
        <button className="button" onClick={onInspect}>
          查看设备
        </button>
        <button className="button" onClick={() => onPatch({ placed: false })}>
          移出空间
        </button>
      </div>
    </Section>
  );
}

export function RoomInspector({
  layout,
  activeLayout,
  activeItem,
  selected,
  onSelect,
  onAdd,
  saved,
  editMode,
  settings,
  onSettings,
  onPatch,
  onMode,
  onMove,
  onFocus,
  onInspect,
  onBegin,
  onEnd,
  onRotate,
  onCopy,
  onCut,
  onDuplicate,
  onDelete,
  onSelectAll,
}) {
  const opening = settings.curtain;
  return (
    <div className="inspector-scroll" id="room-details">
      <DaylightControl time={settings.time} onChange={(time) => onSettings({ time })} />
      <Section
        title="办公室物品"
        meta={`${layout.items.length} 件`}
        className="room-equipment-list"
      >
        <button className="button room-add-button" onClick={onAdd} aria-haspopup="menu">
          <Icon name="plus" />
          添加物品
        </button>
        {layout.items.length > 0 && (
          <div className="selection-actions">
            <span>
              {selected.length ? `已选 ${selected.length} 件` : 'Shift / Ctrl / ⌘ + 单击多选'}
            </span>
            <button onClick={onSelectAll}>全选</button>
            {selected.length > 0 && <button onClick={() => onSelect(null)}>取消</button>}
          </div>
        )}
        {layout.items.length ? (
          <div className="room-item-list">
            {layout.items.map((placed, index) => (
              <button
                key={placed.id}
                className={selected.includes(placed.id) ? 'selected' : ''}
                aria-pressed={selected.includes(placed.id)}
                onClick={(event) => onSelect(placed.id, event)}
              >
                <Icon name={equipmentById(placed.equipmentId).icon ?? 'workbench'} />
                <span>
                  {equipmentById(placed.equipmentId).spec.name}
                  <small>物品 {String(index + 1).padStart(2, '0')}</small>
                </span>
                <Icon name={selected.includes(placed.id) ? 'check' : 'arrow'} />
              </button>
            ))}
          </div>
        ) : (
          <p className="equipment-copy">点击添加物品，或在办公室右键选择。</p>
        )}
      </Section>
      {selected.length > 1 && (
        <Section
          title={`已选 ${selected.length} 件物品`}
          icon="layers"
          className="placed-equipment"
        >
          <p className="equipment-copy">
            拖动任一选中物品可整体移动；圆环与 R 键围绕选区中心旋转。
          </p>
          <div className="equipment-edit-tabs">
            <button
              className={editMode === 'translate' ? 'selected' : ''}
              onClick={() => onMode('translate')}
            >
              <Icon name="move" />
              移动
            </button>
            <button
              className={editMode === 'rotate' ? 'selected' : ''}
              onClick={() => onMode('rotate')}
            >
              <Icon name="rotate" />
              旋转
            </button>
            <button onClick={onFocus}>
              <Icon name="focus" />
              定位
            </button>
          </div>
          <div className="equipment-button-row rotation-buttons">
            <button className="button" onClick={() => onRotate(-15)}>
              左转 15°
            </button>
            <button className="button" onClick={() => onRotate(15)}>
              右转 15°
            </button>
            <button className="button" onClick={() => onRotate(90)}>
              旋转 90°
            </button>
          </div>
          <div className="equipment-button-row placement-secondary">
            <button className="button" title="复制（⌘ / Ctrl + C）" onClick={onCopy}>
              <Icon name="copy" />
              复制
            </button>
            <button className="button" title="剪切（⌘ / Ctrl + X）" onClick={onCut}>
              <Icon name="cut" />
              剪切
            </button>
            <button className="button" title="创建副本（⌘ / Ctrl + D）" onClick={onDuplicate}>
              <Icon name="copy" />
              副本
            </button>
            <button className="button danger-button" onClick={onDelete}>
              <Icon name="trash" />
              删除所选
            </button>
          </div>
        </Section>
      )}
      {activeLayout && selected.length === 1 && (
        <EquipmentEditor
          key={activeLayout.id}
          layout={activeLayout}
          item={activeItem}
          {...{ saved, editMode, onPatch, onMode, onMove, onFocus, onInspect, onBegin, onEnd }}
        />
      )}
      <Section title="房间尺寸" unit="cm" className="room-section">
        <Dimensions
          values={[
            ['长度', 800],
            ['宽度', 800],
            ['高度', 300],
          ]}
        />
        <div className="area-row">
          <span>室内面积</span>
          <strong>
            64.00 <span>m²</span>
          </strong>
        </div>
      </Section>
      <Section
        title="窗帘控制"
        icon="curtain"
        className="curtain-section"
        meta={opening === 100 ? '已打开' : opening === 0 ? '已闭合' : '部分打开'}
      >
        <p className="section-description">南侧两组窗户 · 两对布艺窗帘同步开合</p>
        <div
          className="curtain-preview"
          aria-hidden="true"
          style={{
            '--curtain-width': `${50 - opening * 0.42}%`,
            '--pier-width': `${(ROOM.windowPier / (ROOM.width - ROOM.windowSide * 2)) * 100}%`,
          }}
        >
          {windowOpenings().map((window, index) => (
            <div className="preview-opening" key={window.start}>
              <div className="preview-window">
                <i />
                <i />
              </div>
              <div className="preview-curtain left" />
              <div className="preview-curtain right" />
              {index === 0 && <div className="preview-pier" />}
            </div>
          ))}
          <span className="sun-glow" />
        </div>
        <div className="slider-title">
          <label htmlFor="curtain-range">开启程度</label>
          <output>
            {opening}
            <span>%</span>
          </output>
        </div>
        <input
          id="curtain-range"
          type="range"
          min="0"
          max="100"
          value={opening}
          style={{ '--range-value': `${opening}%` }}
          onChange={(e) => onSettings({ curtain: Number(e.target.value) })}
        />
        <div className="slider-labels">
          <span>完全闭合</span>
          <span>完全打开</span>
        </div>
        <button
          className="button curtain-button"
          onClick={() => onSettings({ curtain: opening > 50 ? 0 : 100 })}
        >
          <Icon name="curtain" />
          <span>{opening > 50 ? '关闭窗帘' : '打开窗帘'}</span>
        </button>
      </Section>
      <Section title="显示与交互">
        <Toggle
          id="ceiling-toggle"
          name="grid"
          label="天花板"
          description="60 × 60 cm 方格板"
          checked={settings.ceiling}
          onChange={(ceiling) => onSettings({ ceiling })}
        />
        <Toggle
          id="dimension-toggle"
          name="ruler"
          label="尺寸标注"
          description="显示房间与设备尺寸"
          checked={settings.dimensions}
          onChange={(dimensions) => onSettings({ dimensions })}
        />
        <Toggle
          id="door-toggle"
          name="door"
          label="双开玻璃门"
          description="北侧左端 · 总宽 180 cm"
          checked={settings.door}
          onChange={(door) => onSettings({ door })}
        />
      </Section>
      <Section title="空间材质" meta="3 种" className="materials-section">
        {[
          ['marble', '灰色大理石', '地面 · 80 × 80 cm'],
          ['glass', '通透玻璃', '东侧 6 格 · 北侧 4 个开间'],
          ['wall', '暖白墙面', '西侧 · 纯白哑光'],
        ].map(([swatch, title, description], i) => (
          <div className="material" key={swatch}>
            <span className={`swatch ${swatch}`} />
            <div>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>
            <span className="material-code">0{i + 1}</span>
          </div>
        ))}
      </Section>
      <details className="structure-details room-structure-notes">
        <summary>
          查看玻璃墙尺寸分段 <Icon name="down" />
        </summary>
        <p>东侧玻璃分为 6 格，7 根 5 cm 立柱；保持 800 cm 总长，每格约 118.33 cm。</p>
        <div>
          20 + 7 × 5 + 6 × 118.333… + 35 = <strong>800 cm</strong>
        </div>
        <p>北侧 4 个 180 cm 开间，5 根 5 cm 立柱；第一个开间为双开门。</p>
        <div>
          20 + 5 + 180 + 5 + 180 + 5 + 180 + 5 + 180 + 5 + 35 = <strong>800 cm</strong>
        </div>
        <p>
          踢脚线高 10 cm；南侧窗底距地 100 cm，窗顶高 280 cm，中间承重墙宽 65
          cm；左右各一对窗帘，共两对四片。双开门通高，天花板四周采用 10 cm 收边。
        </p>
      </details>
      <div className="inspector-note">
        <Icon name="leaf" />
        自然采光，通透而有序。
      </div>
    </div>
  );
}

export function RoomPlan({
  layout,
  selected,
  onTransform,
  onSelect,
  onFocus,
  onBegin,
  onEnd,
  gestureRef,
}) {
  const svgRef = useRef(null),
    dragRef = useRef(null);
  useEffect(() => {
    const finish = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      onEnd();
      if (svgRef.current?.hasPointerCapture(drag.pointerId))
        svgRef.current.releasePointerCapture(drag.pointerId);
    };
    gestureRef.current = finish;
    return () => {
      finish();
      gestureRef.current = null;
    };
  }, [gestureRef, onEnd]);
  const point = (e) => {
    const matrix = svgRef.current.getScreenCTM();
    return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const startDrag = (e, placed) => {
    if (e.button !== 0) return;
    const p = point(e);
    if (!p) return;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    onSelect(placed.id, { ...e, shiftKey: additive, preserve: !additive });
    e.stopPropagation();
    if (additive) {
      e.preventDefault();
      return;
    }
    onBegin();
    dragRef.current = {
      pointerId: e.pointerId,
      ids: selected.includes(placed.id) ? selected : [placed.id],
      items: layout.items,
      point: p,
    };
    svgRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const moveDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const p = point(e);
    if (p)
      onTransform(
        drag.ids,
        { dx: (p.x - drag.point.x) / 20, dz: (p.y - drag.point.y) / 20 },
        drag.items,
      );
  };
  const endDrag = (e) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    onEnd();
    if (svgRef.current.hasPointerCapture(e.pointerId))
      svgRef.current.releasePointerCapture(e.pointerId);
  };
  return (
    <Section title="户型俯视" meta="上方为南" className="room-plan-dock">
      <div className="plan-diagram">
        <span className="plan-direction south">南 · 窗户 / 窗帘</span>
        <span className="plan-direction east">东 · 玻璃</span>
        <span className="plan-direction west">西 · 白墙</span>
        <svg
          ref={svgRef}
          viewBox="0 0 250 210"
          role="group"
          aria-label="办公室平面图，上南下北"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onPointerDown={(event) => {
            if (event.button === 0) onSelect(null);
          }}
        >
          <defs>
            <pattern
              id="plan-grid"
              x="44"
              y="25"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <path d="M16 0H0v16" fill="none" stroke="#dce2dd" strokeWidth=".5" />
            </pattern>
          </defs>
          <rect x="44" y="25" width="160" height="160" fill="url(#plan-grid)" />
          <path d="M45 25h159v160" fill="none" stroke="#aeb7ae" strokeWidth="6" />
          {windowOpenings().map((opening) => (
            <line
              key={opening.start}
              x1={44 + (opening.start + ROOM.width / 2) * 20}
              x2={44 + (opening.start + ROOM.width / 2 + opening.width) * 20}
              y1="25"
              y2="25"
              stroke="#95b6ad"
              strokeWidth="3"
            />
          ))}
          {['east', 'north'].map((wallName) => (
            <g key={wallName}>
              {wallSegments(wallName).map((segment, index) => {
                if (wallName === 'north' && segment.type === 'glass' && segment.bay === 0)
                  return null;
                const start = segment.start * 20;
                const end = (segment.start + segment.width) * 20;
                return (
                  <line
                    key={index}
                    x1={wallName === 'east' ? 44 : 44 + start}
                    x2={wallName === 'east' ? 44 : 44 + end}
                    y1={wallName === 'east' ? 25 + start : 185}
                    y2={wallName === 'east' ? 25 + end : 185}
                    stroke={segment.type === 'glass' ? '#8db4ad' : '#425b50'}
                    strokeWidth={segment.type === 'glass' ? 2 : segment.type === 'post' ? 4 : 6}
                  />
                );
              })}
            </g>
          ))}
          <path
            d="M49 185v-18m36 18v-18M49 185a18 18 0 0 1 18-18M85 185a18 18 0 0 0-18-18"
            fill="none"
            stroke="#688a7b"
          />
          <text x="124" y="102" textAnchor="middle" fill="#617367" fontSize="13">
            64 m²
          </text>
          <text x="124" y="120" textAnchor="middle" fill="#99a39b" fontSize="8">
            800 × 800 cm
          </text>
          {layout.items.map((placed) => {
            const { spec } = equipmentById(placed.equipmentId);
            const width = spec.dimensions.length / 50,
              depth = spec.dimensions.depth / 50;
            const desk = spec.id === 'office-desk-1400';
            const chair = spec.id === 'office-chair-z1';
            return (
              <g
                key={placed.id}
                className={`plan-equipment ${selected.includes(placed.id) ? 'selected' : ''} ${placed.lightOn ? 'light-on' : ''} ${desk ? 'plan-desk' : ''} ${chair ? 'plan-chair' : ''}`}
                role="button"
                tabIndex="0"
                aria-label={`${spec.name}，拖动调整位置`}
                aria-pressed={selected.includes(placed.id)}
                transform={`translate(${44 + (placed.x + 4) * 20} ${25 + (placed.z + 4) * 20}) rotate(${-placed.rotation})`}
                onPointerDown={(e) => startDrag(e, placed)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (e.shiftKey || e.ctrlKey || e.metaKey || e.key === ' ')
                      onSelect(placed.id, e);
                    else onFocus(placed.id);
                  }
                }}
              >
                <rect
                  className="plan-equipment-body"
                  x={-width / 2}
                  y={-depth / 2}
                  width={width}
                  height={depth}
                  rx={chair ? width / 2 : 1}
                />
                <path
                  className="plan-equipment-front"
                  d={`M${-width / 2 + 3} ${depth / 2}h${width - 6}M0 ${depth / 2 + 0.5}v6m-3-3 3 3 3-3`}
                />
                {spec.id === 'esd-workbench-1500' && (
                  <circle
                    className="plan-equipment-light"
                    cx={width / 2 - 4}
                    cy={-depth / 2 + 3.5}
                    r="1.7"
                  />
                )}
              </g>
            );
          })}
        </svg>
        <span className="plan-direction north">北 · 玻璃 / 双开门</span>
      </div>
      {layout.items.length > 0 && (
        <p className="plan-equipment-caption">
          绿：操作台 · 木色：办公桌 · 灰：办公椅 · Shift + 点击多选
        </p>
      )}
    </Section>
  );
}

export function EquipmentToolbar({
  item,
  count,
  editMode,
  lightOn,
  onMode,
  onLight,
  onFocus,
  onFinish,
  onCopy,
  onCut,
  onDelete,
}) {
  return (
    <div className="equipment-toolbar" role="group" aria-label="选中物品的操作">
      <span className="toolbar-equipment-name">
        <Icon name={item.icon ?? 'workbench'} />
        {count > 1
          ? `已选 ${count} 件`
          : (item.spec.shortName ?? (item.spec.id === 'office-desk-1400' ? '办公桌' : '操作台'))}
      </span>
      {[
        ['translate', 'move', '移动'],
        ['rotate', 'rotate', '旋转'],
      ].map(([id, name, label]) => (
        <button
          key={id}
          className={editMode === id ? 'selected' : ''}
          aria-pressed={editMode === id}
          onClick={() => onMode(id)}
        >
          <Icon name={name} />
          {label}
        </button>
      ))}
      {count === 1 && item.spec.id === 'esd-workbench-1500' && (
        <button id="quick-task-light" aria-pressed={lightOn} onClick={onLight}>
          <Icon name="sun" />
          <span>{lightOn ? '灯已开' : '灯已关'}</span>
        </button>
      )}
      <button aria-label="复制所选物品" title="复制（⌘ / Ctrl + C）" onClick={onCopy}>
        <Icon name="copy" />
      </button>
      <button aria-label="剪切所选物品" title="剪切（⌘ / Ctrl + X）" onClick={onCut}>
        <Icon name="cut" />
      </button>
      <button aria-label="删除所选物品" title="删除（Delete / Backspace）" onClick={onDelete}>
        <Icon name="trash" />
      </button>
      <button aria-label="定位物品" onClick={onFocus}>
        <Icon name="focus" />
      </button>
      <button aria-label="结束物品编辑" onClick={onFinish}>
        <Icon name="check" />
      </button>
    </div>
  );
}
