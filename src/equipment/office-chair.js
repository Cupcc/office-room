import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Metres, +Y up, +Z front. All surfaces and the open weave travel with the GLB.
function wovenMeshTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = x % 16;
      const weft = y % 16;
      const chevron = (x + (Math.floor(x / 16) % 2 ? y : -y) + 128) % 16;
      const thread = warp < 6 || weft < 4 || chevron < 3;
      const highlight = warp === 1 || weft === 1;
      const tone = highlight ? 158 : 110 + Math.round(13 * Math.sin((x + y) * 1.7));
      const i = (y * size + x) * 4;
      data[i] = tone;
      data[i + 1] = tone + 4;
      data[i + 2] = tone + 3;
      data[i + 3] = thread ? 255 : 0;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'Embedded grey fishbone open weave';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function roundedOutline(width, height, radius) {
  const shape = new THREE.Shape();
  const x = width / 2,
    y = height / 2;
  shape.moveTo(-x + radius, -y);
  shape.lineTo(x - radius, -y);
  shape.quadraticCurveTo(x, -y, x, -y + radius);
  shape.lineTo(x, y - radius);
  shape.quadraticCurveTo(x, y, x - radius, y);
  shape.lineTo(-x + radius, y);
  shape.quadraticCurveTo(-x, y, -x, y - radius);
  shape.lineTo(-x, -y + radius);
  shape.quadraticCurveTo(-x, -y, -x + radius, -y);
  return shape;
}

// A gridded, curved membrane, with a separate perimeter and an actual open back.
function membraneGeometry(width, height, radius, surface) {
  const positions = [],
    uvs = [],
    indices = [];
  const columns = 40,
    rows = 40;
  for (let row = 0; row <= rows; row++) {
    const y = (row / rows - 0.5) * height;
    const cornerY = Math.max(0, Math.abs(y) - height / 2 + radius);
    const halfWidth = width / 2 - radius + Math.sqrt(Math.max(0, radius ** 2 - cornerY ** 2));
    for (let column = 0; column <= columns; column++) {
      const x = ((column / columns) * 2 - 1) * halfWidth;
      positions.push(...surface(x, y));
      // One 64px tile is 12mm: four 3mm weave cells, consistent on every panel.
      uvs.push((x + width / 2) / 0.012, (y + height / 2) / 0.012);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column,
          b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function spokeGeometry() {
  const positions = [],
    indices = [];
  const sections = 16;
  const corners = [
    [-0.8, 1],
    [0.8, 1],
    [1, 0.6],
    [1, -0.6],
    [0.8, -1],
    [-0.8, -1],
    [-1, -0.6],
    [-1, 0.6],
  ];
  for (let i = 0; i <= sections; i++) {
    const t = i / sections;
    const radius = 0.027 + t * 0.269;
    const y = 0.17 - 0.086 * t + 0.016 * Math.sin(t * Math.PI);
    const halfWidth = 0.033 * (1 - t) + 0.016 * t;
    const halfHeight = 0.024 * (1 - t) + 0.011 * t;
    for (const [u, v] of corners) positions.push(radius, y + v * halfHeight, u * halfWidth);
    if (i < sections)
      for (let j = 0; j < 8; j++) {
        const a = i * 8 + j,
          b = i * 8 + ((j + 1) % 8);
        indices.push(a, b + 8, b, a, a + 8, b + 8);
      }
  }
  for (let j = 1; j < 7; j++) {
    indices.push(0, j + 1, j);
    const end = sections * 8;
    indices.push(end, end + j, end + j + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createOfficeChair(spec) {
  const root = new THREE.Group();
  root.name = spec.id;
  root.userData = {
    equipmentId: spec.id,
    units: 'metres',
    front: '+Z',
    dimensionsMm: spec.dimensions,
    inferredMm: spec.inferred,
  };
  const frame = new THREE.MeshStandardMaterial({
    name: 'Satin grey polymer frame',
    color: spec.materials.frame.color,
    roughness: 0.46,
    metalness: 0.08,
  });
  const base = new THREE.MeshStandardMaterial({
    name: 'Satin silver grey five-star base',
    color: '#a2a9a7',
    roughness: 0.32,
    metalness: 0.62,
  });
  const chrome = new THREE.MeshStandardMaterial({
    name: 'Gas lift and telescopic rails',
    color: '#c3cccb',
    metalness: 0.92,
    roughness: 0.2,
  });
  const mechanism = new THREE.MeshStandardMaterial({
    name: 'Graphite tilt mechanism',
    color: '#454c4b',
    roughness: 0.5,
    metalness: 0.38,
  });
  const rubber = new THREE.MeshStandardMaterial({
    name: 'Soft charcoal caster tyres',
    color: '#292f2f',
    roughness: 0.8,
  });
  const soft = new THREE.MeshStandardMaterial({
    name: 'Grey soft-touch arm pads',
    color: '#787f7d',
    roughness: 0.78,
  });
  const gasket = new THREE.MeshStandardMaterial({
    name: 'Mesh retaining gasket',
    color: '#535b58',
    roughness: 0.76,
  });
  const net = new THREE.MeshStandardMaterial({
    name: 'Grey fishbone breathable mesh',
    color: '#8d9690',
    map: wovenMeshTexture(),
    transparent: true,
    depthWrite: false,
    forceSinglePass: true,
    side: THREE.DoubleSide,
    roughness: 0.92,
    metalness: 0,
  });
  const mesh = (name, geometry, material, position = [0, 0, 0], parent = root) => {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(...position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (name, size, position, material = frame, parent = root, radius = 0.006) =>
    mesh(name, new RoundedBoxGeometry(...size, 3, radius), material, position, parent);
  const cylinder = (name, radius, height, position, material = chrome, parent = root) =>
    mesh(name, new THREE.CylinderGeometry(radius, radius, height, 32), material, position, parent);
  const group = (name, position, parent = root) => {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(...position);
    parent.add(object);
    return object;
  };
  const tube = (name, points, radius, material = frame, parent = root) => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    return mesh(
      name,
      new THREE.TubeGeometry(curve, 32, radius, 10, false),
      material,
      [0, 0, 0],
      parent,
    );
  };
  const beam = (name, a, b, width, depth, material = frame, parent = root) => {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b);
    const object = box(
      name,
      [width, start.distanceTo(end), depth],
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      material,
      parent,
      Math.min(width, depth) * 0.25,
    );
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return object;
  };
  const panel = (name, width, height, radius, position, surface, parent, rim = 0.013) => {
    const assembly = group(name, position, parent);
    const membrane = mesh(
      `${name} / woven membrane`,
      membraneGeometry(width, height, radius, surface),
      net,
      [0, 0, 0.001],
      assembly,
    );
    membrane.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: net.map,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
    });
    const outline = roundedOutline(width, height, radius).getSpacedPoints(144);
    const curve = new THREE.CatmullRomCurve3(
      outline.slice(0, -1).map((p) => new THREE.Vector3(...surface(p.x, p.y))),
      true,
    );
    const surround = new THREE.TubeGeometry(curve, 160, rim, 12, true);
    mesh(`${name} / moulded perimeter`, surround, frame, [0, 0, -0.006], assembly);
    const sealCurve = new THREE.CatmullRomCurve3(
      outline.slice(0, -1).map((p) => new THREE.Vector3(...surface(p.x * 0.97, p.y * 0.95))),
      true,
    );
    mesh(
      `${name} / retaining bead`,
      new THREE.TubeGeometry(sealCurve, 144, 0.0023, 6, true),
      gasket,
      [0, 0, 0.003],
      assembly,
    );
    return assembly;
  };

  // Five swept, tapered spokes and five genuine twin-wheel caster assemblies.
  const spoke = spokeGeometry();
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 + (i * Math.PI * 2) / 5;
    const leg = mesh(`Five-star base / spoke ${i + 1}`, spoke, base);
    leg.rotation.y = -angle;
    const caster = group(`Twin caster ${i + 1}`, [
      0.297 * Math.cos(angle),
      0.032,
      0.297 * Math.sin(angle),
    ]);
    caster.rotation.y = -angle + 0.35;
    cylinder('Caster swivel stem', 0.007, 0.044, [0, 0.035, 0], chrome, caster);
    box('Caster fork', [0.043, 0.025, 0.039], [0, 0.016, 0], mechanism, caster, 0.01);
    for (const side of [-1, 1]) {
      const wheel = cylinder('Soft twin wheel', 0.032, 0.014, [side * 0.019, 0, 0], rubber, caster);
      wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(
        'Recessed wheel hub',
        0.017,
        0.0018,
        [side * 0.0265, 0, 0],
        mechanism,
        caster,
      );
      hub.rotation.z = Math.PI / 2;
      const cap = cylinder('Caster axle cap', 0.005, 0.002, [side * 0.028, 0, 0], base, caster);
      cap.rotation.z = Math.PI / 2;
    }
  }
  const hubProfile = [
    [0, 0.145],
    [0.046, 0.145],
    [0.051, 0.166],
    [0.048, 0.192],
    [0.033, 0.205],
    [0, 0.205],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh('Sculpted base hub', new THREE.LatheGeometry(hubProfile, 48), base);
  cylinder('Gas lift outer sleeve', 0.029, 0.165, [0, 0.245, 0], mechanism);
  cylinder('Gas lift sleeve collar', 0.033, 0.016, [0, 0.322, 0], frame);
  cylinder('Exposed gas piston', 0.018, 0.116, [0, 0.38, 0]);

  const upper = group('Seat and upper assembly', [0, spec.dimensions.seatHeight / 1000, 0]);
  box(
    'Synchronous tilt housing',
    [0.125, 0.056, 0.185],
    [0, -0.076, -0.012],
    mechanism,
    upper,
    0.019,
  );
  box('Seat underside bridge', [0.29, 0.024, 0.29], [0, -0.049, 0.006], frame, upper, 0.011);
  for (const x of [-0.145, 0.145])
    beam('Seat side carrier', [x, -0.045, -0.17], [x, -0.027, 0.205], 0.024, 0.024, frame, upper);
  const tension = cylinder(
    'Tilt tension adjustment knob',
    0.027,
    0.044,
    [0, -0.105, 0.107],
    rubber,
    upper,
  );
  tension.rotation.x = Math.PI / 2;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    box(
      'Tension knob grip',
      [0.004, 0.004, 0.033],
      [Math.cos(a) * 0.026, -0.105 + Math.sin(a) * 0.026, 0.107],
      mechanism,
      upper,
      0.001,
    );
  }
  tube(
    'Seat height control stalk',
    [
      [0.055, -0.075, 0],
      [0.16, -0.066, 0.01],
      [0.225, -0.063, 0.055],
    ],
    0.0045,
    chrome,
    upper,
  );
  box('Seat height paddle', [0.048, 0.013, 0.035], [0.23, -0.063, 0.06], mechanism, upper, 0.006);
  const seat = panel(
    'Waterfall mesh seat 500 × 500 mm',
    0.474,
    0.474,
    0.075,
    [0, -0.008, 0.025],
    (x, y) => [
      x,
      y,
      -0.017 * (1 - (x / 0.237) ** 2) * (1 - (y / 0.237) ** 2) -
        0.012 * Math.exp(-(((y + 0.225) / 0.04) ** 2)),
    ],
    upper,
  );
  seat.rotation.x = -Math.PI / 2;

  // Independent telescopic arm stems, pivot discs and soft 6D-style pads.
  for (const sign of [-1, 1]) {
    const arm = group(`${sign < 0 ? 'Left' : 'Right'} adjustable armrest`, [0, 0, 0], upper);
    tube(
      'Arm under-seat bracket',
      [
        [sign * 0.2, -0.043, -0.135],
        [sign * 0.275, -0.033, -0.115],
        [sign * 0.29, 0.045, -0.095],
      ],
      0.017,
      frame,
      arm,
    );
    box(
      'Arm telescopic outer column',
      [0.036, 0.134, 0.044],
      [sign * 0.29, 0.098, -0.095],
      frame,
      arm,
      0.012,
    );
    box(
      'Arm telescopic inner slider',
      [0.024, 0.09, 0.03],
      [sign * 0.29, 0.184, -0.095],
      base,
      arm,
      0.005,
    );
    const button = cylinder(
      'Arm height release',
      0.009,
      0.003,
      [sign * 0.309, 0.135, -0.095],
      mechanism,
      arm,
    );
    button.rotation.z = Math.PI / 2;
    cylinder('Arm pad swivel joint', 0.022, 0.015, [sign * 0.29, 0.217, -0.065], mechanism, arm);
    box(
      'Arm pad lower shell',
      [0.07, 0.018, 0.228],
      [sign * 0.295, 0.225, -0.004],
      frame,
      arm,
      0.009,
    );
    box('Soft 6D arm pad', [0.068, 0.019, 0.232], [sign * 0.295, 0.239, -0.002], soft, arm, 0.009);
  }

  const back = group('Reclining back assembly', [0, 0, -0.205], upper);
  for (const sign of [-1, 1]) {
    tube(
      'Backrest lower hinge carrier',
      [
        [sign * 0.17, -0.06, 0.05],
        [sign * 0.205, -0.04, -0.035],
        [sign * 0.21, 0.08, -0.055],
        [sign * 0.19, 0.195, -0.06],
      ],
      0.019,
      frame,
      back,
    );
    const pivot = cylinder(
      'Backrest hinge cap',
      0.023,
      0.014,
      [sign * 0.211, -0.024, 0.018],
      base,
      back,
    );
    pivot.rotation.z = Math.PI / 2;
  }
  box('Back height spine', [0.055, 0.345, 0.027], [0, 0.272, -0.098], frame, back, 0.013);
  box('Spine adjustment inset', [0.027, 0.112, 0.004], [0, 0.264, -0.114], mechanism, back, 0.008);
  for (let i = 0; i < 5; i++)
    box(
      'Back height detent',
      [0.017, 0.002, 0.002],
      [0, 0.23 + i * 0.012, -0.117],
      base,
      back,
      0.0005,
    );

  // The Y support is a broad moulded part, visible through the woven membrane.
  const yoke = new THREE.Shape();
  yoke.moveTo(-0.026, 0.19);
  yoke.bezierCurveTo(-0.026, 0.29, -0.16, 0.355, -0.222, 0.471);
  yoke.quadraticCurveTo(-0.235, 0.501, -0.204, 0.494);
  yoke.bezierCurveTo(-0.14, 0.432, -0.05, 0.378, 0, 0.349);
  yoke.bezierCurveTo(0.05, 0.378, 0.14, 0.432, 0.204, 0.494);
  yoke.quadraticCurveTo(0.235, 0.501, 0.222, 0.471);
  yoke.bezierCurveTo(0.16, 0.355, 0.026, 0.29, 0.026, 0.19);
  yoke.closePath();
  const yokeGeometry = new THREE.ExtrudeGeometry(yoke, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 3,
    curveSegments: 16,
  });
  const positions = yokeGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++)
    positions.setZ(i, positions.getZ(i) - 0.095 - positions.getY(i) * 0.09);
  yokeGeometry.computeVertexNormals();
  mesh('Sculpted rear Y support', yokeGeometry, frame, [0, 0, 0], back);
  for (const sign of [-1, 1])
    tube(
      'Lower back frame branch',
      [
        [0, 0.25, -0.105],
        [sign * 0.09, 0.244, -0.09],
        [sign * 0.185, 0.22, -0.072],
      ],
      0.013,
      frame,
      back,
    );
  panel(
    'Upper back mesh',
    0.494,
    0.314,
    0.063,
    [0, 0.365, -0.045],
    (x, y) => [x * (1 - 0.08 * (0.5 - y / 0.314)), y, 0.028 * (x / 0.247) ** 2 - y * 0.14],
    back,
    0.015,
  );

  // Separate convex lumbar cushion and its articulated horseshoe support.
  const lumbar = group('Floating 4D lumbar assembly', [0, 0.128, 0.033], back);
  for (const sign of [-1, 1])
    tube(
      'Lumbar articulated side link',
      [
        [sign * 0.15, -0.018, -0.071],
        [sign * 0.205, 0, -0.045],
        [sign * 0.205, 0.035, -0.007],
      ],
      0.011,
      frame,
      lumbar,
    );
  panel(
    'Lumbar mesh 460 mm',
    0.436,
    0.158,
    0.047,
    [0, 0, 0],
    (x, y) => [x, y, 0.041 * (1 - (x / 0.218) ** 2) * (1 - (y / 0.079) ** 2)],
    lumbar,
    0.012,
  );
  for (const sign of [-1, 1])
    beam(
      'Lumbar rear flex rib',
      [sign * 0.04, -0.063, -0.025],
      [sign * 0.095, 0.06, -0.018],
      0.018,
      0.015,
      frame,
      lumbar,
    );

  // Height-adjustable headrest, rear slide, tilt hinge and curved open-mesh pad.
  box('Headrest height track', [0.038, 0.153, 0.025], [0, 0.52, -0.112], frame, back, 0.01);
  box('Headrest track inset', [0.015, 0.075, 0.003], [0, 0.529, -0.126], mechanism, back, 0.004);
  for (const sign of [-1, 1])
    tube(
      'Headrest curved link',
      [
        [sign * 0.022, 0.558, -0.112],
        [sign * 0.049, 0.578, -0.103],
        [sign * 0.055, 0.602, -0.067],
      ],
      0.009,
      frame,
      back,
    );
  const headHinge = cylinder('Headrest tilt axle', 0.012, 0.095, [0, 0.596, -0.084], frame, back);
  headHinge.rotation.z = Math.PI / 2;
  panel(
    'Curved headrest 370 mm',
    0.344,
    0.132,
    0.038,
    [0, 0.601, -0.065],
    (x, y) => [x, y, 0.038 * (x / 0.172) ** 2 + 0.008 * (y / 0.066) ** 2],
    back,
    0.013,
  );

  // Footrest rails slide into the under-seat guides; no floating components.
  for (const x of [-0.13, 0.13]) {
    const guide = cylinder(
      'Footrest fixed guide',
      0.009,
      0.35,
      [x, -0.065, -0.005],
      mechanism,
      upper,
    );
    guide.rotation.x = Math.PI / 2;
    box('Footrest guide bracket', [0.031, 0.027, 0.027], [x, -0.058, 0.14], frame, upper, 0.005);
  }
  const footrest = group('Sliding footrest assembly', [0, 0, 0], upper);
  for (const x of [-0.13, 0.13]) {
    const rail = cylinder(
      'Footrest telescopic chrome rail',
      0.006,
      0.45,
      [x, -0.065, -0.055],
      chrome,
      footrest,
    );
    rail.rotation.x = Math.PI / 2;
    beam(
      'Footrest hinge arm',
      [x, -0.065, 0.17],
      [x, -0.054, 0.195],
      0.019,
      0.016,
      frame,
      footrest,
    );
    const hinge = cylinder('Footrest pivot cap', 0.012, 0.01, [x, -0.052, 0.195], base, footrest);
    hinge.rotation.z = Math.PI / 2;
  }
  const footPad = panel(
    'Retractable mesh leg support',
    0.328,
    0.158,
    0.043,
    [0, -0.055, 0.17],
    (x, y) => [x, y, 0.008 * (y / 0.079) ** 2],
    footrest,
    0.012,
  );
  footPad.rotation.x = -Math.PI / 2;

  setChairLounge(root, false);
  return root;
}

export function setChairLounge(root, enabled) {
  root.getObjectByName('Reclining back assembly').rotation.x = enabled ? -Math.PI / 4 : 0;
  root.getObjectByName('Sliding footrest assembly').position.z = enabled ? 0.43 : 0;
  root.userData.pose = enabled ? '135° recline with extended footrest' : 'Upright, footrest stowed';
}
