import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Metres, +Y up, front +Z, floor-centred origin. No remote textures or assets.
export function oakTexture() {
  const w = 1024, h = 512;
  const data = new Uint8Array(w * h * 4);
  let seed = 91823;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const bands = Array.from({ length: h + 20 }, () => rand() - .5);
  const toneAt = y => {
    const k = Math.floor(y), t = y - k, smooth = t * t * (3 - 2 * t);
    return bands[k + 5] * (1 - smooth) + bands[k + 6] * smooth;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const warp = y + 1.8 * Math.sin(x * .006 + y * .018) + .7 * Math.sin(x * .019 + y * .027);
      const grain = Math.sin(warp * 2.3 + Math.sin(warp * .16) * 3);
      const coarse = toneAt(warp / 24 + Math.sin(x * .003 + y * .007) * .16) * 2;
      const pores = Math.pow(Math.max(0, Math.sin(warp * 4.9 + Math.sin(x * .012) * .6)), 14);
      const board = Math.floor(y / 103);
      const seam = y % 103 < 1 ? -3 : 0;
      const tone = coarse * 4 + grain * 2.2 - pores * 5 + bands[Math.floor(warp + 5)] * 2 + (rand() - .5) * 3 + [1, -2, 2, -1, 0][board] + seam;
      const i = (y * w + x) * 4;
      data[i] = 187 + tone; data[i + 1] = 163 + tone; data[i + 2] = 132 + tone; data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  texture.name = 'Light oak grain, embedded';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function roundedRect(w, h, r, cx = 0, cy = 0, Shape = THREE.Shape) {
  const s = new Shape(), l = cx - w / 2, b = cy - h / 2;
  s.moveTo(l + r, b); s.lineTo(l + w - r, b); s.quadraticCurveTo(l + w, b, l + w, b + r);
  s.lineTo(l + w, b + h - r); s.quadraticCurveTo(l + w, b + h, l + w - r, b + h);
  s.lineTo(l + r, b + h); s.quadraticCurveTo(l, b + h, l, b + h - r);
  s.lineTo(l, b + r); s.quadraticCurveTo(l, b, l + r, b); s.closePath();
  return s;
}

export function createOfficeDesk(spec) {
  const root = new THREE.Group();
  root.name = spec.id;
  root.userData = { equipmentId: spec.id, units: 'metres', front: '+Z', dimensionsMm: spec.dimensions, inferredMm: spec.inferred };
  const mm = n => n / 1000;
  const d = spec.dimensions, p = spec.inferred;
  const W = mm(d.length), D = mm(d.depth), H = mm(d.overallHeight), T = mm(d.worktopThickness);
  const white = new THREE.MeshStandardMaterial({ name: 'Warm white powder coat', color: spec.materials.legs.color, roughness: .5, metalness: .12 });
  const cabinet = new THREE.MeshStandardMaterial({ name: 'White cabinet', color: spec.materials.cabinet.color, roughness: .58, metalness: .02 });
  const oak = new THREE.MeshStandardMaterial({ name: 'Light oak veneer', map: oakTexture(), roughness: .63, metalness: 0 });
  const silver = new THREE.MeshStandardMaterial({ name: 'Brushed aluminium', color: '#c4c8c6', metalness: .8, roughness: .29 });
  const dark = new THREE.MeshStandardMaterial({ name: 'Black rubber and lock', color: '#252b2a', roughness: .65 });
  const inside = new THREE.MeshStandardMaterial({ name: 'Cabinet interior', color: '#d9dcd6', roughness: .8 });
  const mesh = (name, geometry, material, pos, parent = root) => {
    const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(...pos);
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (name, size, pos, material = white, parent = root, radius = .001) => mesh(name, new RoundedBoxGeometry(...size, 2, radius), material, pos, parent);
  const cylinder = (name, radius, height, pos, material = silver, parent = root) => mesh(name, new THREE.CylinderGeometry(radius, radius, height, 32), material, pos, parent);
  const beam = (name, a, b, width, depth, material = white, parent = root) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const m = box(name, [width, start.distanceTo(end), depth], start.clone().add(end).multiplyScalar(.5).toArray(), material, parent, .002);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return m;
  };

  // A real opening is cut into the top, underneath the removable cable lid.
  const coverW = mm(p.cableCoverWidth), coverD = mm(p.cableCoverDepth), coverZ = -D / 2 + .12;
  const topShape = roundedRect(W - .002, D - .002, .003);
  topShape.holes.push(roundedRect(coverW, coverD, .004, 0, -coverZ, THREE.Path));
  const topGeometry = new THREE.ExtrudeGeometry(topShape, { depth: T - .002, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .001, bevelThickness: .001, curveSegments: 8 });
  topGeometry.rotateX(-Math.PI / 2);
  const uv = topGeometry.attributes.uv, position = topGeometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + W / 2) / W, (position.getZ(i) + D / 2) / D);
  mesh('Oak worktop 1400 × 700 × 25 mm', topGeometry, oak, [0, H - T + .001, 0]);
  const frameShape = roundedRect(coverW + .01, coverD + .01, .006);
  frameShape.holes.push(roundedRect(coverW - .01, coverD - .01, .003, 0, 0, THREE.Path));
  const frameGeometry = new THREE.ExtrudeGeometry(frameShape, { depth: .0015, bevelEnabled: false });
  frameGeometry.rotateX(-Math.PI / 2);
  mesh('Cable hatch metal rim', frameGeometry, silver, [0, H - .002, coverZ]);
  const hatch = new THREE.Group(); hatch.name = 'Cable hatch hinged lid'; hatch.position.set(0, H - .002, coverZ - coverD / 2 + .004); root.add(hatch);
  box('Cable hatch lid', [coverW - .012, .002, coverD - .011], [0, -.0005, (coverD - .011) / 2], white, hatch, .0007);
  box('Cable brush aperture', [coverW - .025, .0015, .004], [0, -.001, coverD - .006], dark, hatch, .0005);
  for (const x of [-.08, .08]) {
    const hinge = cylinder('Cable lid hinge pin', .0018, .016, [x, H - .002, coverZ - coverD / 2 + .004]); hinge.rotation.z = Math.PI / 2;
  }

  const cw = mm(p.cabinetWidth), cd = mm(p.cabinetDepth), footH = mm(p.cabinetFootHeight), ch = mm(p.cabinetBodyHeight);
  const cx = -W / 2 + .045 + cw / 2, cz = D / 2 - mm(p.cabinetFrontInset) - cd / 2;
  const frontZ = cz + cd / 2, wall = .016;
  for (const x of [cx - cw / 2 + .035, cx + cw / 2 - .035]) for (const z of [cz - cd / 2 + .035, cz + cd / 2 - .035]) cylinder('Cabinet adjustable foot', .016, footH, [x, footH / 2, z], dark);
  box('Cabinet outer side wall', [wall, ch, cd], [cx - cw / 2 + wall / 2, footH + ch / 2, cz], cabinet);
  const sideShape = roundedRect(cd, ch, .001);
  const sidePortY = .605, sidePortZ = [cz + .15, cz + .07], sidePortR = mm(p.cablePortDiameter) / 2;
  for (const z of sidePortZ) { const hole = new THREE.Path(); hole.absarc(-(z - cz), sidePortY - footH - ch / 2, sidePortR, 0, Math.PI * 2, true); sideShape.holes.push(hole); }
  const sideGeometry = new THREE.ExtrudeGeometry(sideShape, { depth: wall, bevelEnabled: false, curveSegments: 24 }); sideGeometry.rotateY(Math.PI / 2);
  mesh('Cabinet inner side with round cable ports', sideGeometry, cabinet, [cx + cw / 2 - wall, footH + ch / 2, cz]);
  for (const z of sidePortZ) {
    for (const x of [cx + cw / 2 + .001, cx + cw / 2 - wall - .001]) {
      const ring = mesh('Cabinet side cable port ring', new THREE.TorusGeometry(sidePortR + .001, .003, 12, 40), silver, [x, sidePortY, z]); ring.rotation.y = Math.PI / 2;
    }
    const sleeve = mesh('Cabinet side hollow grommet sleeve', new THREE.CylinderGeometry(sidePortR, sidePortR, wall, 40, 1, true), dark, [cx + cw / 2 - wall / 2, sidePortY, z]); sleeve.rotation.z = Math.PI / 2;
  }
  for (const y of [footH + wall / 2, footH + ch - wall / 2, H - T - .0025]) box('Cabinet horizontal panel', [cw - wall * 2, y > .72 ? .005 : wall, cd - .016], [cx, y, cz], cabinet);
  box('Cabinet rear wall', [cw - wall * 2, ch - wall * 2, .012], [cx, footH + ch / 2, cz - cd / 2 + .006], cabinet);
  const drawerH = mm(p.drawerFrontHeight), drawerTop = footH + ch - .003;
  box('Recessed drawer joint', [cw - .006, .003, .003], [cx, drawerTop - drawerH - .0005, frontZ - .016], dark, root, .0004);
  box('Drawer dividing shelf', [cw - .032, .016, cd - .04], [cx, drawerTop - drawerH - .012, cz], inside);
  box('Lower cabinet shelf', [cw - .032, .016, cd - .05], [cx, .29, cz], inside);

  const drawer = new THREE.Group(); drawer.name = 'Upper drawer assembly'; root.add(drawer);
  box('Drawer front', [cw - .004, drawerH - .003, .016], [cx, drawerTop - drawerH / 2, frontZ - .008], cabinet, drawer);
  box('Drawer bottom', [cw - .05, .009, cd - .07], [cx, drawerTop - drawerH + .025, cz - .01], inside, drawer);
  for (const x of [cx - cw / 2 + .026, cx + cw / 2 - .026]) box('Drawer side', [.01, drawerH - .045, cd - .07], [x, drawerTop - drawerH / 2 + .01, cz - .01], silver, drawer);
  box('Drawer back', [cw - .05, drawerH - .045, .01], [cx, drawerTop - drawerH / 2 + .01, cz - cd / 2 + .027], inside, drawer);
  box('Black recessed lock escutcheon', [.018, .053, .003], [cx, drawerTop - drawerH / 2 + .012, frontZ + .0015], dark, drawer, .005);
  const lock = cylinder('Drawer lock cylinder', .006, .003, [cx, drawerTop - drawerH / 2 + .026, frontZ + .004], silver, drawer); lock.rotation.x = Math.PI / 2;
  box('Key slot', [.0013, .007, .001], [cx, drawerTop - drawerH / 2 + .026, frontZ + .006], dark, drawer, .0003);

  const door = new THREE.Group(); door.name = 'Lower cabinet hinged door'; door.position.set(cx - cw / 2 + .003, 0, frontZ - .008); root.add(door);
  const doorBottom = footH + .003, doorTop = drawerTop - drawerH - .004;
  box('Lower cabinet door', [cw - .006, doorTop - doorBottom, .016], [(cw - .006) / 2, (doorTop + doorBottom) / 2, 0], cabinet, door);

  const lx = W / 2 - .085, legTopY = H - T - .045, soleH = .008;
  for (const sign of [-1, 1]) {
    const a = [lx, soleH + .009, sign * .29], b = [lx, legTopY, sign * .095];
    beam('Splayed A-frame leg', a, b, mm(p.legSectionWidth), mm(p.legSectionDepth));
    // Flat, floor-aligned rubber sole under each angled leg.
    box('A-frame black floor pad', [.044, soleH, .05], [lx, soleH / 2, sign * .29], dark, root, .003);
  }
  box('Right top support rail', [.055, .032, D - .08], [lx, H - T - .016, 0]);
  const plate = new THREE.Shape();
  plate.moveTo(-.30, .018); plate.lineTo(.30, .018); plate.lineTo(.21, -.035); plate.lineTo(-.21, -.035); plate.closePath();
  const plateGeometry = new THREE.ExtrudeGeometry(plate, { depth: .003, bevelEnabled: false }); plateGeometry.rotateY(Math.PI / 2);
  mesh('A-frame trapezoid end plate', plateGeometry, white, [lx + .028, H - T - .016, 0]);
  // Small geometric lettering stays editable and travels with the GLB.
  const glyphs = {
    E: [[0,0,0,1],[0,1,.6,1],[0,.5,.5,.5],[0,0,.6,0]], L: [[0,1,0,0],[0,0,.6,0]], I: [[.3,0,.3,1]],
    N: [[0,0,0,1],[0,1,.6,0],[.6,0,.6,1]], S: [[.6,1,0,1],[0,1,0,.5],[0,.5,.6,.5],[.6,.5,.6,0],[.6,0,0,0]],
  };
  [...'ELINS'].forEach((letter, i) => glyphs[letter].forEach(([a,b,c,e]) => {
    const u = (i - 2.3) * .018;
    beam('ELINS frame lettering', [lx + .032, H - T - .034 + b * .018, -(u + a * .018)], [lx + .032, H - T - .034 + e * .018, -(u + c * .018)], .0012, .0014, dark);
  }));

  // The updated reference has an open knee space with no modesty panel.
  box('Rear worktop support beam', [lx - cx, .028, .03], [(lx + cx) / 2, H - T - .018, -D / 2 + .065]);
  return root;
}

export function setDeskOpenings(root, { drawer = false, door = false, hatch = false } = {}) {
  root.getObjectByName('Upper drawer assembly').position.z = drawer ? .28 : 0;
  root.getObjectByName('Lower cabinet hinged door').rotation.y = door ? -Math.PI * .58 : 0;
  root.getObjectByName('Cable hatch hinged lid').rotation.x = hatch ? -Math.PI * .42 : 0;
}
