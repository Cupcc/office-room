import { useEffect, useRef } from 'react';
import { EQUIPMENT } from '../equipment/catalog.js';
import { Icon } from './ui.jsx';

export function EquipmentPicker({ menu, onAdd, onClose }) {
  const menuRef = useRef(null);
  useEffect(() => {
    menuRef.current?.querySelector('button')?.focus();
    const dismiss = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);
  return (
    <div
      ref={menuRef}
      className="equipment-picker"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      aria-label="添加物品"
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          onClose();
          return;
        }
        const buttons = [...menuRef.current.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        const next = {
          ArrowDown: (index + 1) % buttons.length,
          ArrowUp: (index - 1 + buttons.length) % buttons.length,
          Home: 0,
          End: buttons.length - 1,
        }[event.key];
        if (next !== undefined) {
          event.preventDefault();
          buttons[next].focus();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="picker-heading">
        添加物品 <span>{menu.position ? '放在此处' : '选择物品放入办公室'}</span>
      </div>
      {EQUIPMENT.filter((item) => item.placeable).map(({ spec, icon }) => (
        <button key={spec.id} role="menuitem" onClick={() => onAdd(spec.id, menu.position)}>
          <span className={`picker-icon ${spec.id === 'office-desk-1400' ? 'desk' : (icon ?? '')}`}>
            <Icon name={icon ?? 'workbench'} />
          </span>
          <span>
            <strong>{spec.name}</strong>
            <small>
              {spec.dimensions.length} × {spec.dimensions.depth} × {spec.dimensions.overallHeight}{' '}
              mm
            </small>
          </span>
          <Icon name="plus" />
        </button>
      ))}
    </div>
  );
}
