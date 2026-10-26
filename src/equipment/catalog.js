import workbench from '../../assets/equipment/esd-workbench-1500/equipment.json';
import desk from '../../assets/equipment/office-desk-1400/equipment.json';
import chair from '../../assets/equipment/office-chair-z1/equipment.json';
import workbenchReference from '../../assets/equipment/esd-workbench-1500/reference.png?inline';
import deskReference from '../../assets/equipment/office-desk-1400/reference.png?inline';
import chairReference from '../../assets/equipment/office-chair-z1/reference.png?inline';
import chairDimensions from '../../assets/equipment/office-chair-z1/dimensions.png?inline';
import workbenchModel from '../../assets/equipment/esd-workbench-1500/model.glb?url&inline';
import deskModel from '../../assets/equipment/office-desk-1400/model.glb?url&inline';
import chairModel from '../../assets/equipment/office-chair-z1/model.glb?url&inline';

export const EQUIPMENT = [
  {
    spec: workbench,
    code: '001',
    label: 'ESD',
    subtitle: 'ESD WORKBENCH / 1500',
    description: '每个细节，都为专注工作而设。',
    tags: ['电子装配', '双层挂板', '带工作灯'],
    reference: workbenchReference,
    model: workbenchModel,
    placeable: true,
    materials: [
      ['green', '深墨绿色防静电台面', '哑光表面 · 黑色包边 · 总厚 50 mm'],
      ['steel', '工业冷轧钢挂板', '壁厚 1.0 mm · 上孔板 / 下槽板'],
      ['profile', 'C 型钢桌腿', '截面 100 × 45 mm · 壁厚 1.7 mm'],
    ],
    details: [
      ['台面高度', '800 mm'],
      ['台面厚度', '50 mm'],
      ['台面以上背板', '1000 mm'],
      ['设备占地', '1.125 m²'],
    ],
    notes: [
      '台面、背板高度、钢板厚度和桌腿截面按已提供数据建立。整机总高 1800 mm。',
      '搁板深度、孔距、横梁及上部立柱截面按参考图估算；插座仅为外形占位。',
    ],
  },
  {
    spec: desk,
    code: '002',
    label: '1400',
    subtitle: 'OFFICE DESK / 1400',
    description: '浅木纹饰面 / 白色柜体 / A 字形支撑',
    tags: ['木纹饰面', '带锁侧柜', 'A 字形桌腿'],
    reference: deskReference,
    model: deskModel,
    placeable: true,
    materials: [
      ['oak', '浅橡木色桌面', '连续木纹 · 微倒角封边 · 矩形走线盖'],
      ['white', '白色柜体与 A 字腿', '左侧带锁抽屉 / 下柜门 · 黑色脚垫'],
      ['silver', '金属走线五金', '矩形走线盖 · 侧柜内侧板圆形走线环'],
    ],
    details: [
      ['台面高度', '750 mm'],
      ['台面厚度 · 估算', '25 mm'],
      ['侧柜宽 × 深 · 估算', '330 × 600 mm'],
      ['设备占地', '0.98 m²'],
    ],
    notes: [
      '长、深、高按已确认尺寸 1400 × 700 × 750 mm 建立。',
      '桌面下面没有挡板；双圆形走线孔位于侧柜内侧板。',
      '桌面厚度、柜体和五金细部按参考图比例估算；可开启抽屉、柜门及走线盖检查结构。',
    ],
  },
  {
    spec: chair,
    code: '003',
    label: 'Z1',
    icon: 'chair',
    subtitle: 'ERGONOMIC CHAIR / Z1',
    description: '灰框灰网 / 分体腰托 / 伸缩脚托',
    tags: ['鱼骨纹网面', '独立腰托', '135° 后仰'],
    reference: chairReference,
    dimensionReference: chairDimensions,
    model: chairModel,
    placeable: true,
    materials: [
      ['mesh', '灰色鱼骨纹网面', '曲面头枕 / 分体靠背 / 座面 / 脚托 · 透孔编织'],
      ['grey', '灰色人体工学框架', 'Y 字背撑 · 独立腰托 · 可调扶手外形'],
      ['silver', '五爪底座与金属气杆', '双轮脚轮 · 伸缩导轨 · 倾仰底盘'],
    ],
    details: [
      ['座面宽 × 深', '500 × 500 mm'],
      ['座高范围', '450–550 mm'],
      ['总高范围', '1080–1280 mm'],
      ['头枕宽 / 腰托宽', '370 / 460 mm'],
      ['扶手高度范围', '690–790 mm'],
      ['五爪脚直径', 'Φ 660 mm'],
    ],
    notes: chair.notes,
  },
];

export function equipmentById(id) {
  return EQUIPMENT.find((item) => item.spec.id === id) ?? EQUIPMENT[0];
}

export function readRoute() {
  const params = new URLSearchParams(location.search);
  const requestedId =
    params.get('model') ||
    (location.hash === '#chair' ? chair.id : location.hash === '#desk' ? desk.id : null) ||
    (!location.search && document.querySelector('#app')?.dataset.defaultModel);
  const selected = EQUIPMENT.find((item) => item.spec.id === requestedId);
  return {
    workspace:
      selected || params.get('view') === 'equipment' || location.hash === '#equipment'
        ? 'equipment'
        : 'room',
    equipmentId: selected?.spec.id ?? EQUIPMENT[0].spec.id,
  };
}

export function routeUrl(workspace, equipmentId) {
  return workspace === 'room'
    ? '?view=room#room'
    : equipmentId === workbench.id
      ? '?view=equipment#equipment'
      : `?model=${equipmentId}#${equipmentId === chair.id ? 'chair' : 'desk'}`;
}

export function downloadSpec(spec) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${spec.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
