import { Dimensions, EquipmentCatalog, Icon, Section, Toggle } from './ui.jsx';
import { downloadSpec } from '../equipment/catalog.js';

export function EquipmentInspector({
  item,
  layout,
  lightOn,
  onSelect,
  onPlace,
  onLight,
  opened,
  onOpen,
  onReference,
}) {
  const { spec } = item,
    d = spec.dimensions;
  const chair = spec.id === 'office-chair-z1';
  const placedCount = layout.items.filter((placed) => placed.equipmentId === spec.id).length;
  return (
    <div className="inspector-scroll equipment-details">
      <EquipmentCatalog selectedId={spec.id} onSelect={onSelect} />
      <section className="panel-section equipment-summary">
        <div className="section-title">
          <span className="equipment-code">EQ — {item.code}</span>
          <span className="state-pill">{item.placeable ? '可试摆' : '已建模'}</span>
        </div>
        <h3>{spec.name}</h3>
        <p className="equipment-subtitle">{item.subtitle}</p>
        <div className="equipment-tags">
          {item.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {item.placeable ? (
          <>
            <button className="button place-button" id="place-equipment" onClick={onPlace}>
              <Icon name="plus" />
              <span>添加到办公室</span>
            </button>
            <p className="placement-caption">
              {placedCount
                ? `办公室已有 ${placedCount} 件 · 可继续添加`
                : '按真实尺寸放入，可移动和旋转'}
            </p>
            {spec.id === 'office-desk-1400' && (
              <button
                className="button structure-preview-button"
                aria-pressed={opened}
                onClick={() => onOpen(!opened)}
              >
                <Icon name="layers" />
                {opened ? '收起内部结构' : '查看内部结构'}
              </button>
            )}
            {chair && (
              <button
                className="button structure-preview-button"
                aria-pressed={opened}
                onClick={() => onOpen(!opened)}
              >
                <Icon name="chair" />
                {opened ? '恢复直立 · 收起脚托' : '135° 后仰 · 展开脚托'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className="button place-button"
              id="inspect-structure"
              aria-pressed={opened}
              onClick={() => onOpen(!opened)}
            >
              <Icon name="layers" />
              <span>{opened ? '收起内部结构' : '查看内部结构'}</span>
            </button>
            <p className="placement-caption">抽屉 / 柜门 / 桌面走线盖</p>
          </>
        )}
      </section>
      <Section title="设备尺寸" unit="mm" className="equipment-size">
        <Dimensions
          values={[
            [chair ? '总宽' : '长度', d.length],
            [chair ? '收纳深度' : '进深', d.depth],
            ['总高', d.overallHeight],
          ]}
        />
        <dl className="spec-list">
          {item.details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {chair && (
          <p className="equipment-copy chair-pose-caption">
            {opened
              ? '当前为后仰展示姿态，需额外活动空间。图示尺寸为直立收纳状态。'
              : '默认座高 500 mm；总宽与收纳占地包含扶手和五爪脚。'}
          </p>
        )}
      </Section>
      <Section
        title="结构与材质"
        meta={spec.id === 'esd-workbench-1500' ? '已确认参数' : '按参考图还原'}
      >
        {item.materials.map(([swatch, title, text]) => (
          <div className="equipment-material" key={title}>
            <span className={`material-dot ${swatch}`}>{swatch === 'profile' ? 'C' : ''}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
        {spec.id === 'esd-workbench-1500' ? (
          <Toggle
            id="task-light-toggle"
            name="sun"
            label="工作灯与开关"
            description="顶层搁板下方 · 可切换预览"
            checked={lightOn}
            onChange={onLight}
          />
        ) : chair ? (
          <Toggle
            id="chair-lounge"
            name="chair"
            label="后仰与脚托"
            description="135° 后仰 · 伸缩脚托展开"
            checked={opened}
            onChange={onOpen}
          />
        ) : (
          <Toggle
            id="desk-open"
            name="layers"
            label="内部结构"
            description="开启抽屉、柜门及桌面走线盖"
            checked={opened}
            onChange={onOpen}
          />
        )}
      </Section>
      <Section title="参考与模型" meta="1 : 1">
        <button
          className="reference-image"
          id="show-reference"
          onClick={onReference}
          aria-label={`查看${spec.name}参考图`}
        >
          <img src={item.reference} alt={`${spec.name}多视角参考图`} />
          <span>
            <Icon name="expand" />
            查看参考图
          </span>
        </button>
        <div className="equipment-button-row">
          <a className="button" href={item.model} download={`${spec.id}.glb`}>
            <Icon name="download" />
            下载 GLB
          </a>
          <button className="button" id="download-spec" onClick={() => downloadSpec(spec)}>
            <Icon name="info" />
            设备信息
          </button>
        </div>
        <details className="structure-details">
          <summary>
            建模说明与待确认项 <Icon name="down" />
          </summary>
          {item.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <p>模型单位为米，原点位于地面占地中心，正面朝 +Z。</p>
        </details>
      </Section>
      {spec.id === 'esd-workbench-1500' && (
        <Section title="摆放建议" icon="top">
          <p className="equipment-copy">
            靠西侧白墙布置，背面预留约 100 mm 走线空间，操作面朝室内。前方建议预留 1000
            mm，便于座椅、操作和通行。
          </p>
          <span className="text-meta">以上间距为布局建议，可按实际工位调整。</span>
        </Section>
      )}
    </div>
  );
}
