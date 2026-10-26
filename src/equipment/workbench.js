import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Reusable, texture-free model. Metres; origin at floor centre; front is +Z.
export function createWorkbench(spec) {
  const mm = value => value / 1000;
  const d = spec.dimensions;
  const width = mm(d.length), depth = mm(d.depth), top = mm(d.worktopHeight);
  const thickness = mm(d.worktopThickness), height = mm(d.overallHeight);
  const inferred = spec.inferred;
  const root = new THREE.Group();
  root.name = spec.id;
  root.userData = { equipmentId: spec.id, units: 'metres', front: '+Z', dimensionsMm: d };
  const steel = new THREE.MeshStandardMaterial({ color: spec.materials.legs.color, metalness: .65, roughness: .38 });
  const panelSteel = new THREE.MeshStandardMaterial({ color: spec.materials.panels.color, metalness: .55, roughness: .47 });
  const edge = new THREE.MeshStandardMaterial({ color: '#20272a', roughness: .55 });
  const green = new THREE.MeshStandardMaterial({ color: spec.materials.worktop.color, roughness: .78, metalness: .01, envMapIntensity: .2 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#b8bfc0', metalness: .88, roughness: .26 });
  const white = new THREE.MeshStandardMaterial({ color: '#e8e6dc', roughness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#151c20', roughness: .75 });
  const emission = new THREE.MeshStandardMaterial({ color: '#fffbe9', emissive: '#fff3d4', emissiveIntensity: 2.2, roughness: .38 });
  const mesh = (name, geometry, material, position, parent = root) => {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(...position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (name, size, position, material = steel, parent = root) => mesh(name, new THREE.BoxGeometry(...size), material, position, parent);
  const cylinder = (name, radius, length, position, material = chrome) => mesh(name, new THREE.CylinderGeometry(radius, radius, length, 16), material, position);
  const bolt = (x, y, z) => {
    const screw = cylinder('Frame bolt', .0045, .003, [x, y, z]);
    screw.rotation.x = Math.PI / 2;
  };

  mesh('50 mm worktop with black edging', new RoundedBoxGeometry(width, thickness - .004, depth, 3, .01), edge, [0, top - .004 - (thickness - .004) / 2, 0]);
  // Both layers together retain exactly 50 mm total thickness.
  mesh('Green ESD work surface', new RoundedBoxGeometry(width - .012, .004, depth - .012, 3, .002), green, [0, top - .002, 0]);

  const legW = mm(spec.materials.legs.width), legD = mm(spec.materials.legs.depth);
  const wall = mm(spec.materials.legs.wallThickness);
  const footH = mm(inferred.feetHeight), legHeight = top - thickness - footH;
  // True open C section, including the specified 1.7 mm wall.
  const profile = new THREE.Shape();
  const points = [
    [-legW / 2, -legD / 2], [legW / 2, -legD / 2], [legW / 2, -legD / 2 + wall],
    [-legW / 2 + wall, -legD / 2 + wall], [-legW / 2 + wall, legD / 2 - wall],
    [legW / 2, legD / 2 - wall], [legW / 2, legD / 2], [-legW / 2, legD / 2],
  ];
  points.forEach(([x, y], i) => i ? profile.lineTo(x, y) : profile.moveTo(x, y));
  profile.closePath();
  const legGeometry = new THREE.ExtrudeGeometry(profile, { depth: legHeight, bevelEnabled: false, steps: 1 });
  legGeometry.rotateX(-Math.PI / 2);
  const legX = width / 2 - .09, legZ = depth / 2 - .09;
  for (const x of [-legX, legX]) {
    for (const z of [-legZ, legZ]) {
      const leg = mesh('C leg 100 × 45 × 1.7 mm', legGeometry, steel, [x, footH, z]);
      if (x > 0) leg.rotation.y = Math.PI;
      box('Foot mounting plate', [legW, .004, legD], [x, footH + .002, z]);
      cylinder('Adjustable foot thread', .008, .016, [x, .018, z]);
      cylinder('Leveling foot chrome rim', .023, .006, [x, .008, z]);
      cylinder('Leveling foot rubber pad', .022, .005, [x, .0025, z], edge);
      for (const y of [top - .095, top - .19]) bolt(x, y, z + legD / 2 + .002);
    }
    box('Side lower crossbar', [.04, .04, 2 * legZ], [x, .16, 0]);
    box('Side top rail', [.04, .07, 2 * legZ], [x, top - thickness - .035, 0]);
  }
  box('Rear lower crossbar', [2 * legX, .04, .04], [0, .16, -legZ]);
  for (const z of [-legZ, legZ]) box('Worktop support rail', [2 * legX, .07, .04], [0, top - thickness - .035, z]);

  const upper = new THREE.Group();
  upper.name = 'Backboards and shelves';
  root.add(upper);
  const postW = mm(inferred.rearPostWidth), postD = mm(inferred.rearPostDepth);
  const postX = width / 2 - .075, backZ = -depth / 2 + postD / 2;
  for (const x of [-postX, postX]) {
    box('Rear upright', [postW, height - top - .018, postD], [x, (height + top) / 2 - .009, backZ], steel, upper);
    for (const y of [top + .065, top + .3, height - .065]) bolt(x, y, backZ + postD / 2 + .003);
  }
  const innerWidth = postX * 2 - postW;
  const panelT = mm(spec.materials.panels.thickness);
  const middleY = mm(inferred.middleShelfHeight);

  function perforatedPanel(name, panelHeight, centerY, pattern) {
    const shape = new THREE.Shape();
    const w = innerWidth;
    shape.moveTo(-w / 2, -panelHeight / 2);
    shape.lineTo(w / 2, -panelHeight / 2);
    shape.lineTo(w / 2, panelHeight / 2);
    shape.lineTo(-w / 2, panelHeight / 2);
    shape.closePath();
    const pitchX = pattern === 'peg' ? mm(inferred.pegHolePitch) : .062;
    const pitchY = pattern === 'peg' ? mm(inferred.pegHolePitch) : .042;
    const holeW = pattern === 'peg' ? mm(inferred.pegHoleSize) : .044;
    const holeH = pattern === 'peg' ? mm(inferred.pegHoleSize) : .006;
    const columns = Math.floor((w - .06) / pitchX);
    const rows = Math.floor((panelHeight - .05) / pitchY);
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        const x = (col - (columns - 1) / 2) * pitchX;
        const y = (row - (rows - 1) / 2) * pitchY;
        const hole = new THREE.Path();
        hole.moveTo(x - holeW / 2, y - holeH / 2);
        hole.lineTo(x - holeW / 2, y + holeH / 2);
        hole.lineTo(x + holeW / 2, y + holeH / 2);
        hole.lineTo(x + holeW / 2, y - holeH / 2);
        hole.closePath();
        // Keep the outlet mounting area solid.
        if (pattern === 'peg' || x < w / 2 - .18 || y > -.045) shape.holes.push(hole);
      }
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: panelT, bevelEnabled: false, steps: 1 });
    mesh(name, geometry, panelSteel, [0, centerY, backZ - panelT / 2], upper);
    for (const y of [centerY - panelHeight / 2, centerY + panelHeight / 2]) box('Panel folded edge', [w, .014, .018], [0, y, backZ], steel, upper);
  }
  const bottom = top + .045, lowerTop = middleY - .026;
  perforatedPanel('1 mm slotted cold-rolled steel lower panel', lowerTop - bottom, (lowerTop + bottom) / 2, 'slot');
  const upperBottom = middleY + .032, upperTop = height - .055;
  perforatedPanel('1 mm perforated cold-rolled steel upper panel', upperTop - upperBottom, (upperTop + upperBottom) / 2, 'peg');
  for (const [name, y, shelfDepth] of [['Middle shelf', middleY, mm(inferred.middleShelfDepth)], ['Top shelf', height - .009, mm(inferred.topShelfDepth)]]) {
    box(name, [width, .018, shelfDepth], [0, y, -depth / 2 + shelfDepth / 2], steel, upper);
    box(`${name} front fold`, [width, .014, .012], [0, y - .009, -depth / 2 + shelfDepth - .006], steel, upper);
    for (const x of [-postX, postX]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(shelfDepth - .04, 0); shape.lineTo(0, -.12); shape.closePath();
      const brace = mesh('Triangular shelf bracket', new THREE.ExtrudeGeometry(shape, { depth: .004, bevelEnabled: false }), steel, [x, y - .009, backZ], upper);
      brace.rotation.y = -Math.PI / 2;
    }
  }
  // Brackets at the worktop follow the reference image.
  for (const x of [-postX, postX]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(.14, 0); shape.lineTo(0, .16); shape.closePath();
    const brace = mesh('Worktop upright gusset', new THREE.ExtrudeGeometry(shape, { depth: .004, bevelEnabled: false }), steel, [x, top, backZ], upper);
    brace.rotation.y = -Math.PI / 2;
  }
  const outletX = innerWidth / 2 - .09, outletY = top + .12;
  box('Reference outlet plate — specification unconfirmed', [.105, .075, .01], [outletX, outletY, backZ + .012], white, upper);
  for (const x of [outletX - .025, outletX + .025]) {
    for (const offset of [-.008, .008]) box('Outlet aperture', [.003, .013, .002], [x + offset, outletY, backZ + .018], dark, upper);
    box('Outlet earth aperture', [.003, .008, .002], [x, outletY + .02, backZ + .018], dark, upper);
  }
  const lampZ = -depth / 2 + mm(inferred.topShelfDepth) - .04;
  box('Task light aluminum housing', [1.12, .025, .043], [0, height - .04, lampZ], chrome, upper);
  const diffuser = box('Task light diffuser', [1.07, .006, .032], [0, height - .055, lampZ], emission, upper);
  diffuser.castShadow = false;
  box('Light switch housing', [.046, .07, .021], [postX - .06, middleY + .09, backZ + .02], edge, upper);
  box('Light rocker switch', [.024, .041, .006], [postX - .06, middleY + .09, backZ + .034], dark, upper);
  box('Switch on indicator', [.009, .002, .001], [postX - .06, middleY + .1, backZ + .038], emission, upper);
  const cable = new THREE.CubicBezierCurve3(
    new THREE.Vector3(postX - .035, middleY + .09, backZ - .014),
    new THREE.Vector3(postX - .035, height - .09, backZ - .014),
    new THREE.Vector3(.53, height - .04, backZ - .014),
    new THREE.Vector3(.53, height - .04, lampZ),
  );
  mesh('Task light cable', new THREE.TubeGeometry(cable, 12, .003, 6, false), edge, [0, 0, 0], upper);
  const taskLight = new THREE.SpotLight('#fff0d0', 2.4, 2.3, Math.PI * .35, .65, 2);
  taskLight.name = 'Workbench task light';
  taskLight.position.set(0, height - .07, lampZ);
  taskLight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, top - (height - .07), .12 - lampZ).normalize());
  // This target convention also preserves the beam direction in the GLB.
  taskLight.target.position.set(0, 0, -1);
  taskLight.add(taskLight.target);
  root.add(taskLight);
  return root;
}

export function setWorkbenchLight(root, enabled) {
  root.traverse(object => {
    if (object.isLight) object.visible = enabled;
    if (object.name === 'Task light diffuser' || object.name === 'Switch on indicator') object.material.emissiveIntensity = enabled ? 2.2 : 0;
  });
}
