import { icon } from '../icons.js';
import { EQUIPMENT, routeUrl } from '../equipment/catalog.js';

export function Icon({ name }) {
  return (
    <span
      className="icon-slot"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon(name) }}
    />
  );
}

export function Header({ workspace, onWorkspace, onExport }) {
  return (
    <header className="header">
      <a
        className="brand"
        href={routeUrl('room')}
        onClick={(e) => {
          e.preventDefault();
          onWorkspace('room');
        }}
        aria-label="方寸空间首页"
      >
        <span className="brand-mark">
          <Icon name="cube" />
        </span>
        <span className="brand-name">
          方寸<span>SPACE STUDIO</span>
        </span>
      </a>
      <span className="header-divider" />
      <nav className="breadcrumbs" aria-label="当前位置">
        <span>我的空间</span>
        <Icon name="arrow" />
        <strong>{workspace === 'equipment' ? '设备库' : '玻璃办公室'}</strong>
        <span className="project-badge">方案 01</span>
      </nav>
      <div className="workspace-tabs" role="group" aria-label="工作区">
        {[
          ['room', '空间'],
          ['equipment', '设备库'],
        ].map(([id, label]) => (
          <button
            key={id}
            data-workspace={id}
            className={workspace === id ? 'selected' : ''}
            aria-pressed={workspace === id}
            onClick={() => onWorkspace(id)}
          >
            {label}
            {id === 'equipment' && <span>{EQUIPMENT.length}</span>}
          </button>
        ))}
      </div>
      <div className="header-actions">
        <span className="saved">
          <i />
          已在本地就绪
        </span>
        <button className="button export-button" id="export" onClick={onExport}>
          <Icon name="camera" />
          <span>导出视图</span>
        </button>
      </div>
    </header>
  );
}

export function ToolRail({
  product,
  dimensions,
  ceiling,
  night,
  onWorkspace,
  onDimensions,
  onCeiling,
  onNight,
  onHelp,
}) {
  return (
    <aside className="tool-rail" aria-label="场景工具">
      <div className="rail-top">
        <button
          className={`rail-button ${product ? '' : 'active'}`}
          id="scene-tool"
          aria-label="空间模型"
          title="空间模型"
          onClick={() => onWorkspace('room')}
        >
          <Icon name="cube" />
        </button>
        <button
          className={`rail-button ${product ? 'active' : ''}`}
          id="equipment-tool"
          aria-label="设备库"
          title="设备库"
          onClick={() => onWorkspace('equipment')}
        >
          <Icon name="workbench" />
        </button>
        <button
          className="rail-button"
          id="dimensions-tool"
          aria-label="切换尺寸标注"
          title="尺寸标注"
          aria-pressed={dimensions}
          onClick={onDimensions}
        >
          <Icon name="ruler" />
        </button>
        {!product && (
          <button
            className="rail-button"
            id="ceiling-tool"
            aria-label="切换天花板"
            title="天花板"
            aria-pressed={ceiling}
            onClick={onCeiling}
          >
            <Icon name="layers" />
          </button>
        )}
        <span className="rail-separator" />
        {!product && (
          <button
            className="rail-button"
            id="lighting-tool"
            aria-label="切换日光和夜景"
            title="日光 / 夜景"
            aria-pressed={night}
            onClick={onNight}
          >
            <Icon name={night ? 'moon' : 'sun'} />
          </button>
        )}
      </div>
      <button
        className="rail-button"
        id="help"
        aria-label="操作帮助"
        title="操作帮助"
        onClick={onHelp}
      >
        <Icon name="help" />
      </button>
    </aside>
  );
}

export function ViewControls({ product, view, onView, presentation, onPresent }) {
  const items = [
    ['perspective', 'cube', product ? '立体' : '立体视图'],
    ['top', 'top', product ? '俯视' : '平面俯视'],
    ['interior', 'eye', product ? '正面' : '室内视角'],
  ];
  if (product) items.push(['rear', 'reset', '背面'], ['side', 'layers', '右侧']);
  return (
    <div className="view-controls" role="group" aria-label="预设视角">
      {items.map(([id, name, label]) => (
        <button
          key={id}
          data-view={id}
          className={view === id && presentation === 'stopped' ? 'selected' : ''}
          aria-pressed={view === id && presentation === 'stopped'}
          onClick={() => onView(id)}
        >
          <Icon name={name} />
          <span>{label}</span>
        </button>
      ))}
      {!product && (
        <button
          id="presentation-start"
          className={`presentation-button ${presentation !== 'stopped' ? 'selected' : ''}`}
          aria-pressed={presentation !== 'stopped'}
          title={
            presentation === 'playing'
              ? '暂停展示'
              : presentation === 'paused'
                ? '继续展示'
                : '开始展示'
          }
          onClick={onPresent}
        >
          <Icon name={presentation === 'playing' ? 'pause' : 'play'} />
          <span>展示模式</span>
        </button>
      )}
    </div>
  );
}

export function ViewportFooter({ editing, presentation }) {
  return (
    <div className="viewport-footer">
      <span>
        <Icon name={presentation !== 'stopped' ? 'play' : editing ? 'move' : 'mouse'} />
        {presentation !== 'stopped' ? (
          '拖动接管镜头 · Esc 退出展示'
        ) : editing ? (
          'Shift + 单击多选 · 拖动移动 · 圆环 15° 吸附'
        ) : (
          <>
            拖动旋转<span className="hint-separator">·</span>右键拖动平移
            <span className="hint-separator">·</span>滚轮缩放
          </>
        )}
      </span>
      <span className="render-state">
        <i />
        实时渲染<span className="footer-dot">·</span>Three.js
      </span>
    </div>
  );
}

export function EquipmentCatalog({ selectedId, onSelect }) {
  return (
    <Section title="设备库" meta={`${EQUIPMENT.length} 件`}>
      <div className="equipment-catalog">
        {EQUIPMENT.map((item, index) => (
          <a
            key={item.spec.id}
            href={routeUrl('equipment', item.spec.id)}
            aria-current={selectedId === item.spec.id ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onSelect(item.spec.id);
            }}
          >
            {String(index + 1).padStart(2, '0')} · {item.spec.name}
            <Icon name={selectedId === item.spec.id ? 'check' : 'arrow'} />
          </a>
        ))}
      </div>
    </Section>
  );
}

export function Section({ title, icon: name, meta, unit, className = '', children }) {
  return (
    <section className={`panel-section ${className}`}>
      <div className="section-title">
        <h3>
          {name && <Icon name={name} />}
          {title}
        </h3>
        {(meta || unit) && <span className={unit ? 'unit-pill' : 'text-meta'}>{unit || meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function Dimensions({ values }) {
  return (
    <div className="dimension-cards">
      {values.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function Toggle({ id, name, label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <label htmlFor={id}>
        <span>
          {name && <Icon name={name} />}
          {label}
        </span>
        {description && <small>{description}</small>}
      </label>
      <input
        className="switch"
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

export function InspectorHeading({ product }) {
  return (
    <div className="inspector-heading">
      <div>
        <span className="eyebrow">{product ? 'EQUIPMENT LIBRARY' : 'SPACE DETAILS'}</span>
        <h2>{product ? '设备信息' : '空间设置'}</h2>
      </div>
      <span className="round-icon">
        <Icon name="sliders" />
      </span>
    </div>
  );
}

export function Dialog({ dialogRef, title, eyebrow, className = '', closeLabel, children }) {
  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <button
        className="dialog-close"
        aria-label={closeLabel}
        onClick={() => dialogRef.current.close()}
      >
        <Icon name="close" />
      </button>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
