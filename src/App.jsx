import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { equipmentById, readRoute, routeUrl } from './equipment/catalog.js';
import {
  createPlacedEquipment,
  LAYOUT_STORAGE_KEY,
  normalizeRoomLayout,
} from './equipment/layout.js';
import { createEditorState, editorReducer, transformItems } from './equipment/editor.js';
import {
  createPastedEquipment,
  decodeEquipmentClipboard,
  encodeEquipmentClipboard,
  EQUIPMENT_CLIPBOARD_TYPE,
} from './equipment/clipboard.js';
import { useOfficeScene } from './hooks/useOfficeScene.js';
import { formatTime, timePeriod } from './daylight.js';
import {
  Dialog,
  Header,
  Icon,
  InspectorHeading,
  ToolRail,
  ViewControls,
  ViewportFooter,
} from './components/ui.jsx';
import { EquipmentPicker } from './components/EquipmentPicker.jsx';
import { EquipmentInspector } from './components/EquipmentInspector.jsx';
import { EquipmentToolbar, RoomInspector, RoomPlan } from './components/RoomInspector.jsx';

function loadLayout() {
  try {
    return normalizeRoomLayout(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || '{}'));
  } catch {
    return normalizeRoomLayout();
  }
}

export default function App() {
  const [route, setRoute] = useState(readRoute),
    [editor, dispatch] = useReducer(editorReducer, undefined, () =>
      createEditorState(loadLayout()),
    );
  const { layout, selected } = editor.present;
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState('rotate'),
    [view, setView] = useState('perspective');
  const [settings, setSettings] = useState({
    curtain: 100,
    ceiling: false,
    dimensions: true,
    door: false,
    time: 720,
  });
  const [presentation, setPresentation] = useState('stopped');
  const [presentationTime, setPresentationTime] = useState(null);
  const time =
    presentation !== 'stopped' && presentationTime !== null ? presentationTime : settings.time;
  const [zoom, setZoom] = useState(100),
    [previewLightOn, setPreviewLightOn] = useState(true),
    [opened, setOpened] = useState(false),
    [toast, setToast] = useState(''),
    [addMenu, setAddMenu] = useState(null),
    [clipboardCount, setClipboardCount] = useState(0);
  const containerRef = useRef(null),
    viewportRef = useRef(null),
    compassRef = useRef(null);
  const helpRef = useRef(null),
    referenceRef = useRef(null),
    toastTimer = useRef(null),
    planGestureRef = useRef(null),
    clipboardRef = useRef(null);
  const item = equipmentById(route.equipmentId),
    product = route.workspace === 'equipment';
  const activeLayout = layout.items.find((placed) => placed.id === selected.at(-1));
  const activeItem = activeLayout ? equipmentById(activeLayout.equipmentId) : null;
  const editing = !product && Boolean(activeLayout);
  const closeAddMenu = useCallback(() => setAddMenu(null), []);
  const openAddMenu = useCallback(({ clientX, clientY, position = null }) => {
    const rect = viewportRef.current.getBoundingClientRect();
    setAddMenu({
      x: Math.max(8, Math.min(rect.width - 284, clientX - rect.left)),
      y: Math.max(8, Math.min(rect.height - 270, clientY - rect.top)),
      position,
    });
  }, []);
  const selectEquipment = useCallback((id, event = {}) => {
    dispatch({
      type: 'select',
      id,
      additive: Boolean(event.shiftKey || event.ctrlKey || event.metaKey),
      preserve: event.preserve,
    });
  }, []);
  const beginEdit = useCallback(() => dispatch({ type: 'begin' }), []);
  const endEdit = useCallback(() => dispatch({ type: 'end' }), []);
  const updateLayout = useCallback((patch) => {
    dispatch({
      type: 'change',
      update: ({ layout: current, selected: ids }) => ({
        layout: {
          items: current.items.map((placed) =>
            ids.includes(placed.id)
              ? { ...placed, ...(typeof patch === 'function' ? patch(placed) : patch) }
              : placed,
          ),
        },
      }),
    });
  }, []);
  const transformEquipment = useCallback((ids, transform, initialItems) => {
    dispatch({
      type: 'change',
      update: ({ layout: current }) => {
        const transformed = transformItems(initialItems ?? current.items, ids, transform);
        return {
          layout: {
            items: current.items.map((placed) =>
              ids.includes(placed.id)
                ? (transformed.find((item) => item.id === placed.id) ?? placed)
                : placed,
            ),
          },
        };
      },
    });
  }, []);
  const transformSelection = useCallback((transform) => {
    dispatch({
      type: 'change',
      update: ({ layout: current, selected: ids }) => ({
        layout: { items: transformItems(current.items, ids, transform) },
      }),
    });
  }, []);
  const removeSelection = useCallback(() => {
    dispatch({
      type: 'change',
      update: ({ layout: current, selected: ids }) => ({
        layout: { items: current.items.filter((placed) => !ids.includes(placed.id)) },
        selected: [],
      }),
    });
  }, []);
  const selectAll = useCallback(
    () => dispatch({ type: 'select', ids: layout.items.map((placed) => placed.id) }),
    [layout.items],
  );
  const updateSettings = useCallback(
    (patch) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const callbacks = useMemo(
    () => ({
      onZoom: (value) => {
        if (Number.isFinite(value)) setZoom(value);
      },
      onOrientation: (angle) =>
        compassRef.current?.style.setProperty('--compass-angle', `${angle}rad`),
      onEquipmentTransform: transformEquipment,
      onEditStart: beginEdit,
      onEditEnd: endEdit,
      onContextMenu: openAddMenu,
      onEquipmentSelection: (ids) => dispatch({ type: 'select', ids }),
      onPresentationChange: setPresentation,
      onPresentationTime: setPresentationTime,
    }),
    [transformEquipment, beginEdit, endEdit, openAddMenu],
  );
  const { sceneRef, status } = useOfficeScene(containerRef, callbacks);
  const undo = useCallback(() => {
    sceneRef.current?.finishEquipmentGesture();
    planGestureRef.current?.();
    dispatch({ type: 'undo' });
  }, [sceneRef]);
  const redo = useCallback(() => {
    sceneRef.current?.finishEquipmentGesture();
    planGestureRef.current?.();
    dispatch({ type: 'redo' });
  }, [sceneRef]);
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);
  const finishEdit = useCallback(() => {
    sceneRef.current?.finishEquipmentGesture();
    planGestureRef.current?.();
    endEdit();
  }, [sceneRef, endEdit]);
  const copySelection = useCallback(
    (cut = false, clipboardData = null) => {
      const items = layout.items
        .filter((placed) => selected.includes(placed.id))
        .map((placed) => ({ ...placed }));
      if (!items.length) return false;
      finishEdit();
      const text = encodeEquipmentClipboard(items, cut);
      const buffer = { text, items, cut, pasteCount: 0, localOnly: !clipboardData };
      clipboardRef.current = buffer;
      setClipboardCount(items.length);
      if (clipboardData) {
        clipboardData.setData('text/plain', text);
        // Some browsers only allow plain text clipboard formats.
        try {
          clipboardData.setData(EQUIPMENT_CLIPBOARD_TYPE, text);
        } catch {
          /* Plain text carries the same model data. */
        }
      } else {
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            buffer.localOnly = false;
          })
          .catch(() => {});
      }
      if (cut) removeSelection();
      notify(`已${cut ? '剪切' : '复制'} ${items.length} 件物品，按 ⌘ / Ctrl + V 粘贴`);
      return true;
    },
    [layout.items, selected, finishEdit, removeSelection, notify],
  );
  const pasteEquipment = useCallback(
    (text = null) => {
      let buffer = clipboardRef.current;
      if (text !== null && text !== buffer?.text) {
        const decoded = decodeEquipmentClipboard(text);
        if (!decoded) {
          if (!buffer?.localOnly) return false;
        } else {
          buffer = { ...decoded, text, pasteCount: 0, localOnly: false };
        }
      }
      if (!buffer?.items.length) return false;
      finishEdit();
      const index = buffer.cut ? buffer.pasteCount : buffer.pasteCount + 1;
      const pasted = createPastedEquipment(buffer.items, layout.items, index);
      clipboardRef.current = { ...buffer, pasteCount: buffer.pasteCount + 1 };
      setClipboardCount(buffer.items.length);
      dispatch({
        type: 'change',
        update: ({ layout: current }) => ({
          layout: { items: [...current.items, ...pasted] },
          selected: pasted.map((placed) => placed.id),
        }),
      });
      notify(`已粘贴 ${pasted.length} 件物品`);
      return true;
    },
    [layout.items, finishEdit, notify],
  );
  const duplicateSelection = useCallback(() => {
    const items = layout.items.filter((placed) => selected.includes(placed.id));
    if (!items.length) return;
    finishEdit();
    const copies = createPastedEquipment(items, layout.items);
    dispatch({
      type: 'change',
      update: ({ layout: current }) => ({
        layout: { items: [...current.items, ...copies] },
        selected: copies.map((placed) => placed.id),
      }),
    });
  }, [layout.items, selected, finishEdit]);
  useEffect(() => {
    const enabled = (event) =>
      !product &&
      !addMenu &&
      !document.querySelector('dialog[open]') &&
      !event.target.closest(
        'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
      );
    const copy = (event) => {
      if (
        enabled(event) &&
        event.clipboardData &&
        copySelection(event.type === 'cut', event.clipboardData)
      )
        event.preventDefault();
    };
    const paste = (event) => {
      if (!enabled(event)) return;
      const data = event.clipboardData;
      const text = data ? data.getData(EQUIPMENT_CLIPBOARD_TYPE) || data.getData('text/plain') : '';
      if (pasteEquipment(text)) event.preventDefault();
    };
    window.addEventListener('copy', copy);
    window.addEventListener('cut', copy);
    window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('copy', copy);
      window.removeEventListener('cut', copy);
      window.removeEventListener('paste', paste);
    };
  }, [product, addMenu, copySelection, pasteEquipment]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
      setSaved(true);
    } catch {
      setSaved(false);
    }
    sceneRef.current?.setEquipmentState(layout);
  }, [layout, sceneRef, status]);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setCurtain(settings.curtain / 100);
    scene.setCeiling(settings.ceiling);
    scene.setDimensions(settings.dimensions);
    scene.setDoor(settings.door);
    if (scene.presentationState === 'stopped') scene.setTime(settings.time);
  }, [settings, sceneRef, status]);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setProduct(route.equipmentId);
    scene.setWorkspace(route.workspace);
    scene.resize();
    window.scrollTo({ top: 0, behavior: 'auto' });
    setView('perspective');
    document.title = product ? `${item.spec.name} · 方寸设备库` : '方寸 · 玻璃办公室';
  }, [
    route.workspace,
    route.equipmentId,
    item.spec.name,
    product,
    sceneRef,
    status,
    updateSettings,
  ]);
  useEffect(() => {
    sceneRef.current?.setProductOpen(opened);
  }, [opened, route.equipmentId, sceneRef, status]);
  useEffect(() => {
    sceneRef.current?.setWorkbenchLight(previewLightOn);
  }, [previewLightOn, sceneRef, status]);
  useEffect(() => {
    sceneRef.current?.selectEquipment(selected, false);
  }, [selected, layout, sceneRef, status]);
  useEffect(() => {
    document.body.classList.toggle('equipment-mode', product);
    document.body.classList.toggle('has-equipment', layout.items.length > 0);
    document.body.classList.toggle('editing-equipment', editing);
    return () =>
      document.body.classList.remove('equipment-mode', 'has-equipment', 'editing-equipment');
  }, [product, layout.items.length, editing]);
  useEffect(() => {
    const restore = () => setRoute(readRoute());
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    };
  }, []);
  const navigate = useCallback(
    (workspace, equipmentId) => {
      setAddMenu(null);
      const next = { workspace, equipmentId: equipmentId ?? route.equipmentId };
      history.pushState(null, '', routeUrl(next.workspace, next.equipmentId));
      setRoute(next);
    },
    [route.equipmentId],
  );
  const moveEquipment = useCallback(
    (direction, step = 0.01) => {
      const [dx, dz] = { south: [0, -step], north: [0, step], east: [-step, 0], west: [step, 0] }[
        direction
      ];
      transformSelection({ dx, dz });
    },
    [transformSelection],
  );
  useEffect(() => {
    const keydown = (event) => {
      if (event.key === 'Escape') sceneRef.current?.setPresentation('stopped');
      const field = event.target.closest('input,textarea,select,[contenteditable="true"]');
      const rangeHistory =
        field?.type === 'range' &&
        (event.metaKey || event.ctrlKey) &&
        ['z', 'y'].includes(event.key.toLowerCase());
      if (
        product ||
        addMenu ||
        (field && !rangeHistory) ||
        document.querySelector('dialog[open]') ||
        event.altKey
      )
        return;
      const key = event.key.toLowerCase();
      if (event.metaKey || event.ctrlKey) {
        if (key === 'z') {
          event.preventDefault();
          if (!event.repeat) (event.shiftKey ? redo : undo)();
        } else if (key === 'y') {
          event.preventDefault();
          if (!event.repeat) redo();
        } else if (key === 'a') {
          event.preventDefault();
          selectAll();
        } else if (key === 'd' && selected.length) {
          event.preventDefault();
          if (!event.repeat) duplicateSelection();
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        sceneRef.current?.finishEquipmentGesture();
        planGestureRef.current?.();
        endEdit();
        selectEquipment(null);
        return;
      }
      if (!selected.length) return;
      const direction = {
        ArrowUp: 'south',
        ArrowDown: 'north',
        ArrowLeft: 'east',
        ArrowRight: 'west',
      }[event.key];
      if (direction || key === 'r') {
        event.preventDefault();
        beginEdit();
        if (direction) moveEquipment(direction, event.shiftKey ? 0.05 : 0.01);
        else transformSelection({ rotation: event.shiftKey ? -15 : 15 });
      } else if (key === 'l' && !event.repeat) {
        event.preventDefault();
        updateLayout((current) =>
          current.equipmentId === 'esd-workbench-1500' ? { lightOn: !current.lightOn } : {},
        );
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (!event.repeat) removeSelection();
      }
    };
    const keyup = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'r', 'R'].includes(event.key))
        endEdit();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', endEdit);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', endEdit);
    };
  }, [
    product,
    selected,
    addMenu,
    sceneRef,
    beginEdit,
    endEdit,
    moveEquipment,
    transformSelection,
    updateLayout,
    removeSelection,
    duplicateSelection,
    selectAll,
    selectEquipment,
    undo,
    redo,
  ]);
  const changeView = (next) => {
    setView(next);
    sceneRef.current?.setView(next);
    if (!product) updateSettings({ ceiling: next === 'interior' });
  };
  const changeSettings = (patch) => {
    if ('time' in patch) sceneRef.current?.setPresentation('stopped');
    updateSettings(patch);
  };
  const togglePresentation = () => {
    if (presentation !== 'stopped') {
      sceneRef.current?.setPresentation(presentation === 'playing' ? 'paused' : 'playing');
      return;
    }
    finishEdit();
    closeAddMenu();
    setView('perspective');
    updateSettings({ ceiling: false });
    sceneRef.current?.setPresentation('playing');
  };
  const focus = () => {
    sceneRef.current?.focusEquipment();
    setView('detail');
    updateSettings({ ceiling: false });
  };
  const mode = (next) => {
    setEditMode(next);
    sceneRef.current?.setEquipmentEditMode(next);
  };
  const place = (equipmentId = item.spec.id, position) => {
    const placed = createPlacedEquipment(equipmentId, layout.items, position);
    dispatch({
      type: 'change',
      update: ({ layout: current }) => ({
        layout: { items: [...current.items, placed] },
        selected: [placed.id],
      }),
    });
    setAddMenu(null);
    if (product) navigate('room');
    notify(`已添加${equipmentById(equipmentId).spec.name}，可拖动移动或旋转`);
  };
  const exportImage = async () => {
    if (!sceneRef.current) return;
    try {
      await sceneRef.current?.exportImage();
      notify('视图已导出为 PNG 图片');
    } catch (error) {
      console.error(error);
      notify('导出失败，请重试');
    }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewportRef.current.requestFullscreen();
    } catch {
      notify('当前浏览器不支持全屏预览');
    }
  };
  const viewLabel = {
    perspective: '立体视图',
    top: '平面俯视',
    interior: product ? '正面视图' : '室内视角',
    rear: '背面视图',
    side: '右侧视图',
    detail: '设备近景',
  }[view];

  return (
    <>
      <Header workspace={route.workspace} onWorkspace={navigate} onExport={exportImage} />
      <main className="workspace">
        <ToolRail
          product={product}
          dimensions={settings.dimensions}
          ceiling={settings.ceiling}
          night={timePeriod(time) === '夜晚'}
          onWorkspace={navigate}
          onDimensions={() => updateSettings({ dimensions: !settings.dimensions })}
          onCeiling={() => updateSettings({ ceiling: !settings.ceiling })}
          onNight={() => changeSettings({ time: timePeriod(time) === '夜晚' ? 720 : 1260 })}
          onHelp={() => helpRef.current.showModal()}
        />
        <section
          className={`viewport ${presentation !== 'stopped' ? 'is-presenting' : ''} ${!product && timePeriod(time) === '夜晚' ? 'is-night' : ''}`}
          ref={viewportRef}
          aria-label={product ? `${item.spec.name}三维交互预览` : '办公室三维交互预览'}
        >
          <div id="scene" ref={containerRef} />
          <div className="viewport-heading">
            <div className="eyebrow">
              <span />
              {product ? '设备预览' : '空间预览'}
              <span className="eyebrow-divider">/</span>
              {product ? `EQUIPMENT ${item.code}` : 'LIVE PREVIEW'}
            </div>
            <h1>
              {product ? item.spec.name : '玻璃办公室'}
              <span>{product ? item.label : '01'}</span>
            </h1>
            <p>{product ? item.description : '让空间的每一面，都清晰可见。'}</p>
          </div>
          <div className="viewport-badge">
            <span />
            <span>
              {presentation === 'paused'
                ? '展示模式 · 已暂停'
                : presentation === 'playing'
                  ? '展示模式'
                  : viewLabel}
            </span>
            {!product && <span className="badge-time">{formatTime(time)}</span>}
            <span className="badge-divider" />1 单位 = 1 米
          </div>
          <div className="scene-actions">
            {!product && (
              <div className="scene-edit-actions" role="group" aria-label="编辑历史">
                <button
                  id="undo"
                  aria-label="撤销"
                  title="撤销（⌘ / Ctrl + Z）"
                  disabled={
                    !editor.past.length &&
                    (!editor.transaction ||
                      JSON.stringify(editor.transaction.layout) === JSON.stringify(layout))
                  }
                  onClick={undo}
                >
                  <Icon name="undo" />
                </button>
                <button
                  id="redo"
                  aria-label="重做"
                  title="重做（⌘ / Ctrl + Shift + Z，Ctrl + Y）"
                  disabled={!editor.future.length}
                  onClick={redo}
                >
                  <Icon name="redo" />
                </button>
              </div>
            )}
            {!product && (
              <button
                className="add-equipment-button"
                id="add-equipment"
                aria-haspopup="menu"
                aria-expanded={Boolean(addMenu)}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  if (addMenu) closeAddMenu();
                  else openAddMenu({ clientX: rect.right - 276, clientY: rect.bottom + 8 });
                }}
              >
                <Icon name="plus" />
                <span>添加物品</span>
              </button>
            )}
            {!product && (
              <button
                className="paste-equipment-button"
                aria-label="粘贴物品"
                title="粘贴（⌘ / Ctrl + V）"
                disabled={!clipboardCount}
                onClick={() => pasteEquipment()}
              >
                <Icon name="paste" />
                <span>粘贴{clipboardCount > 0 ? ` ${clipboardCount} 件` : ''}</span>
              </button>
            )}
            <button
              id="reset"
              title="重置视角"
              aria-label="重置视角"
              onClick={() => changeView('perspective')}
            >
              <Icon name="reset" />
            </button>
            <button id="fullscreen" title="全屏预览" aria-label="全屏预览" onClick={fullscreen}>
              <Icon name="expand" />
            </button>
          </div>
          {!product && (
            <div
              className="compass"
              ref={compassRef}
              role="img"
              aria-label="场景实时朝向，绿色指针指向南方"
            >
              <div className="compass-rose">
                <span className="compass-direction compass-s">南 S</span>
                <span className="compass-direction compass-e">东</span>
                <div className="compass-needle">
                  <span />
                  <span />
                </div>
                <span className="compass-direction compass-w">西</span>
                <span className="compass-direction compass-n">北 N</span>
              </div>
            </div>
          )}
          <div className="floor-card">
            <span className="floor-card-icon">
              <Icon name={product ? (item.icon ?? 'workbench') : 'cube'} />
            </span>
            <div>
              <span>
                {product
                  ? item.spec.dimensions.seatHeight
                    ? `真实尺度 · 座高 ${item.spec.dimensions.seatHeight} mm`
                    : `真实尺度 · 台面高 ${item.spec.dimensions.worktopHeight} mm`
                  : '建筑空间'}
              </span>
              <strong>
                {product ? (
                  <>
                    {item.spec.dimensions.length} <small>×</small> {item.spec.dimensions.depth}{' '}
                    <small>mm</small>
                  </>
                ) : (
                  <>
                    64 <small>m²</small>
                    <i />
                    <span>层高 3.00 m</span>
                  </>
                )}
              </strong>
            </div>
          </div>
          {editing && presentation === 'stopped' && (
            <EquipmentToolbar
              editMode={editMode}
              item={activeItem}
              count={selected.length}
              lightOn={activeLayout.lightOn}
              onMode={mode}
              onLight={() => updateLayout({ lightOn: !activeLayout.lightOn })}
              onFocus={focus}
              onCopy={() => copySelection()}
              onCut={() => copySelection(true)}
              onDelete={removeSelection}
              onFinish={() => selectEquipment(null)}
            />
          )}
          {addMenu && !product && (
            <EquipmentPicker menu={addMenu} onAdd={place} onClose={closeAddMenu} />
          )}
          <ViewControls
            product={product}
            view={view}
            onView={changeView}
            presentation={presentation}
            onPresent={togglePresentation}
          />
          <div className="zoom-controls">
            <button id="zoom-out" aria-label="缩小" onClick={() => sceneRef.current?.zoom(1.18)}>
              <Icon name="minus" />
            </button>
            <span id="zoom-level">{zoom}%</span>
            <button id="zoom-in" aria-label="放大" onClick={() => sceneRef.current?.zoom(0.85)}>
              <Icon name="plus" />
            </button>
          </div>
          <ViewportFooter editing={editing} presentation={presentation} />
          <div className={`loading ${status === 'ready' ? 'loaded' : ''}`}>
            <span className="loading-cube">
              <Icon name={status === 'error' ? 'info' : 'cube'} />
            </span>
            <strong>{status === 'error' ? '3D 场景暂时无法启动' : '正在构建你的空间'}</strong>
            <span>
              {status === 'error'
                ? '请使用支持 WebGL 2 的浏览器，并开启硬件加速。'
                : '按真实尺寸建立模型，让每个细节清晰可见。'}
            </span>
          </div>
        </section>
        <aside className="inspector" aria-label={product ? '设备信息' : '空间设置'}>
          <InspectorHeading product={product} />
          {product ? (
            <EquipmentInspector
              key={item.spec.id}
              item={item}
              layout={layout}
              lightOn={previewLightOn}
              onSelect={(equipmentId) => navigate('equipment', equipmentId)}
              onPlace={() => place()}
              onLight={setPreviewLightOn}
              opened={opened}
              onOpen={setOpened}
              onReference={() => referenceRef.current.showModal()}
            />
          ) : (
            <RoomInspector
              layout={layout}
              activeLayout={activeLayout}
              activeItem={activeItem}
              selected={selected}
              onSelect={selectEquipment}
              onAdd={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                openAddMenu({ clientX: rect.left - 284, clientY: rect.top });
              }}
              saved={saved}
              editMode={editMode}
              settings={{ ...settings, time }}
              onSettings={changeSettings}
              onPatch={updateLayout}
              onBegin={beginEdit}
              onEnd={endEdit}
              onRotate={(rotation) => transformSelection({ rotation })}
              onDuplicate={duplicateSelection}
              onCopy={() => copySelection()}
              onCut={() => copySelection(true)}
              onDelete={removeSelection}
              onSelectAll={selectAll}
              onMode={mode}
              onMove={moveEquipment}
              onFocus={focus}
              onInspect={() => navigate('equipment', activeLayout.equipmentId)}
            />
          )}
          {!product && (
            <RoomPlan
              layout={layout}
              selected={selected}
              gestureRef={planGestureRef}
              onTransform={transformEquipment}
              onBegin={beginEdit}
              onEnd={endEdit}
              onSelect={selectEquipment}
              onFocus={(id) => {
                selectEquipment(id);
                sceneRef.current?.selectEquipment([id], false);
                focus();
              }}
            />
          )}
          <div className="inspector-footer">
            <i />
            {product ? '设备原点 · 地面中心' : '按真实尺寸构建'}
            <span>{product ? `EQ — ${item.code}` : 'v1.0'}</span>
          </div>
        </aside>
      </main>
      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
      <Dialog
        dialogRef={helpRef}
        title="自在探索你的空间"
        eyebrow="A LITTLE GUIDANCE"
        closeLabel="关闭帮助"
      >
        <p>鼠标左键拖动旋转，右键拖动平移，滚轮缩放。触屏上单指旋转，双指缩放和平移。</p>
        <p>使用底部预设视角检查模型，右下角按钮缩放；左侧尺子按钮切换尺寸标注。</p>
        <p>
          右侧「日光与时间」可拖动滑块或点击早晨、中午、傍晚、夜晚切换光照。点击底部「展示模式」开始自动环绕运镜并循环一天的光照，再次点击可同时暂停或继续镜头与时间；退出后恢复进入前的时间。拖动场景、缩放、切换视角或按
          Esc 可接管镜头。
        </p>
        <p>
          设备库中可切换模型、查看参考图及下载
          GLB。三款设备均可添加到办公室移动和旋转；办公桌可打开内部结构，办公椅可展开脚托并后仰展示。办公室右键单击或点击「添加物品」选择设备，右键拖动仍可平移。
        </p>
        <p>
          Shift / Ctrl / ⌘ + 单击可多选或取消选中，Shift + 拖动场景空白处可框选；⌘ / Ctrl + A
          全选，Esc 取消选择。 多选后可一起移动和旋转。方向键移动 1 cm，Shift + 方向键移动 5 cm；R /
          Shift + R 旋转 ±15°，L 开关工作灯。
        </p>
        <p>
          ⌘ / Ctrl + C 复制，⌘ / Ctrl + X 剪切，⌘ / Ctrl + V 粘贴模型；支持多选后整组复制粘贴。⌘ /
          Ctrl + D 直接创建副本，Delete / Backspace 删除。 ⌘ / Ctrl + Z 撤销，⌘ / Ctrl + Shift + Z
          或 Ctrl + Y 重做。 一次连续拖动、滑块调整或按住方向键只记录为一步，最多保留 100
          步布局操作。
        </p>
        <div className="help-note">
          房间朝向：上南、下北、左东、右西。位置、朝向和工作灯状态自动保存在本机。
        </div>
      </Dialog>
      <Dialog
        dialogRef={referenceRef}
        title={`${item.spec.name} · 参考图`}
        eyebrow={`REFERENCE / EQ — ${item.code}`}
        className="reference-dialog"
        closeLabel="关闭参考图"
      >
        <img src={item.reference} alt={`${item.spec.name}多视角参考图`} />
        {item.dimensionReference && (
          <img src={item.dimensionReference} alt={`${item.spec.name}尺寸参考图`} />
        )}
      </Dialog>
    </>
  );
}
