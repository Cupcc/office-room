# 木纹侧柜办公桌

## 预览入口

启动项目后，在设备库中选择「02 · 木纹侧柜办公桌」，或访问 `/?model=office-desk-1400#desk`。构建后可直接双击项目根目录下的 `dist/desk.html`，离线旋转查看和下载模型。设备界面用毫米标注尺寸。

## 尺寸与结构

- 已确认整体尺寸：**1400 × 700 × 750 mm**（长 × 深 × 高）。
- 浅橡木纹桌面、白色左侧柜体、带锁上抽屉和下柜门、右侧 A 字形金属腿与黑色脚垫。
- 桌面下面没有挡板。桌面矩形走线盖、侧柜内侧板双圆形走线孔均有真实开孔；可切换开启抽屉、柜门和走线盖查看结构。
- 桌面厚度暂按 25 mm，柜体宽深暂按 330 × 600 mm，其余细部按参考图估算，记录于 `inferred`。

## 预览与办公室摆放

- 支持立体、正面、右侧、背面、俯视，尺寸标注、PNG 视图导出、GLB 和参数下载。
- 点击「添加到办公室」放入空间，可与操作台同时摆放；支持重复添加、独立移动与旋转、户型图拖动和本地保存。

## 设备文件

模型文件位于本文件夹：

- [reference.png](reference.png)：原始参考图。
- [equipment.json](equipment.json)：尺寸、材料、已确认参数和估算参数。
- [model.glb](model.glb)：内嵌木纹贴图的独立模型，单位米，+Y 向上、+Z 为正面，原点为地面占地中心。

## 开发与导出

参数化构建函数为 [src/equipment/office-desk.js](../../../src/equipment/office-desk.js)。在项目根目录运行 `npm run equipment:export` 同时导出两件设备；`npm run build` 先导出模型，再生成完整离线页面。

- [src/equipment/catalog.js](../../../src/equipment/catalog.js)：设备档案、材料、参考图、下载资源和入口地址。
- [src/equipment/layout.js](../../../src/equipment/layout.js)：办公室摆放、吸附和旋转逻辑。
- [src/components/EquipmentInspector.jsx](../../../src/components/EquipmentInspector.jsx)：共用设备详情面板。
- [src/components/EquipmentPicker.jsx](../../../src/components/EquipmentPicker.jsx)：添加物品按钮与右键菜单共用的选择器。

设备工作区与房间共用同一个 React 应用和 Three.js 渲染器，切换时不重新加载页面；`dist/desk.html` 为办公桌默认入口，`dist/office.html` 为房间默认入口。页面样式统一在 [src/style.css](../../../src/style.css) 中维护。
