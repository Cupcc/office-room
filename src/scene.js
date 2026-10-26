import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ROOM, wallSegments, windowOpenings, ceilingGrid } from './room-spec.js';
import equipmentSpec from '../assets/equipment/esd-workbench-1500/equipment.json';
import deskSpec from '../assets/equipment/office-desk-1400/equipment.json';
import chairSpec from '../assets/equipment/office-chair-z1/equipment.json';
import { createWorkbench, setWorkbenchLight } from './equipment/workbench.js';
import { createOfficeDesk, setDeskOpenings } from './equipment/office-desk.js';
import { createOfficeChair, setChairLounge } from './equipment/office-chair.js';
import { EQUIPMENT_SPECS, normalizeRoomLayout, ROTATION_STEP, snapRotation } from './equipment/layout.js';

import { selectionCenter } from './equipment/editor.js';
import { daylightAt, normalizeTime } from './daylight.js';

const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const CAMERA_VIEWS = {
  perspective: { position: [-12.8, 10.7, 14.2], target: [0, 1, 0], fov: 37, minDistance: 5, maxDistance: 40, maxPolarAngle: Math.PI * .485 },
  top: { position: [0, 23, .001], target: [0, 0, 0], fov: 33, minDistance: 5, maxDistance: 40, maxPolarAngle: Math.PI * .485 },
  interior: { position: [-2.8, 1.65, 2.9], target: [.7, 1.45, -2.4], fov: 72, minDistance: .2, maxDistance: 12, maxPolarAngle: Math.PI * .9 },
};
const PRODUCT_VIEWS = {
  perspective: { position: [2.65, 2.25, 3.4], target: [0, .88, 0], fov: 37, minDistance: 1.1, maxDistance: 12, maxPolarAngle: Math.PI * .49 },
  top: { position: [0, 5.8, .001], target: [0, .8, 0], fov: 34, minDistance: 1.1, maxDistance: 12, maxPolarAngle: Math.PI * .499 },
  interior: { position: [0, 1.03, 4.8], target: [0, .95, 0], fov: 34, minDistance: 1.1, maxDistance: 12, maxPolarAngle: Math.PI * .49 },
  rear: { position: [-2.65, 2.25, -3.4], target: [0, .88, 0], fov: 37, minDistance: 1.1, maxDistance: 12, maxPolarAngle: Math.PI * .49 },
  side: { position: [4.8, 1.03, 0], target: [0, .95, 0], fov: 34, minDistance: 1.1, maxDistance: 12, maxPolarAngle: Math.PI * .49 },
};
const DESK_VIEWS = Object.fromEntries(Object.entries({
  perspective: [2.15, 1.5, 2.65], top: [0, 3.65, .001], interior: [0, .76, 3.5],
  rear: [-2.15, 1.6, -2.65], side: [3.5, .76, 0],
}).map(([view, position]) => [view, { position, target: [0, .37, 0], fov: 34, minDistance: 1, maxDistance: 8, maxPolarAngle: Math.PI * .495 }]));
const CHAIR_VIEWS = Object.fromEntries(Object.entries({
  perspective: [1.75, 1.35, 2.3], top: [0, 3.25, .001], interior: [0, .73, 3.1],
  rear: [-1.75, 1.35, -2.3], side: [3.55, .73, 0],
}).map(([view, position]) => [view, { position, target: [0, .57, .015], fov: 34, minDistance: .65, maxDistance: 8, maxPolarAngle: Math.PI * .495 }]));

function random(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function marbleTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = random(seed);
  const image = ctx.createImageData(512, 512);
  const offset = rng() * 20;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const index = (y * 512 + x) * 4;
      const cloud = Math.sin(x * .012 + Math.sin(y * .016 + offset) * 2) * 3.8
        + Math.cos(y * .026 + x * .008) * 2.6 + (rng() - .5) * 3;
      image.data[index] = 145 + cloud;
      image.data[index + 1] = 151 + cloud;
      image.data[index + 2] = 149 + cloud;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  for (let vein = 0; vein < 22; vein++) {
    const start = rng() * 1000 - 250;
    const phase = rng() * 20;
    const slope = .35 + rng() * .6;
    const points = [];
    for (let x = -20; x <= 532; x += 5) {
      points.push([x, start + x * slope + Math.sin(x * .013 + phase) * 27 + Math.sin(x * .047 + phase) * 5]);
    }
    for (const [width, opacity] of [[6, .025], [2, .08], [.6, .22]]) {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = vein % 4 === 0 ? `rgba(239,241,233,${opacity * 2})` : `rgba(96,108,108,${opacity})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    if (vein % 3 === 0) {
      const branch = points[40];
      ctx.beginPath();
      ctx.moveTo(...branch);
      ctx.bezierCurveTo(branch[0] + 20, branch[1] - 30, branch[0] + 100, branch[1] - 45, branch[0] + 200, branch[1] - 120);
      ctx.strokeStyle = 'rgba(100,112,111,.12)';
      ctx.lineWidth = .7;
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function fabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dedede';
  ctx.fillRect(0, 0, 128, 128);
  const rng = random(47);
  for (let i = 0; i < 128; i += 2) {
    ctx.strokeStyle = `rgba(102,102,102,${.03 + rng() * .045})`;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 9);
  return texture;
}

export class OfficeScene {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f2f3ef');
    this.scene.fog = new THREE.Fog('#f2f3ef', 30, 75);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.setAttribute('aria-label', '8 米 × 8 米 × 3 米办公室三维模型，拖动旋转，滚轮缩放');
    container.appendChild(this.renderer.domElement);
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'scene-labels';
    container.appendChild(this.labelRenderer.domElement);
    this.view = 'perspective';
    this.mode = 'room';
    this.fitScale = 1;
    const initialView = this.getViewPreset();
    this.camera = new THREE.PerspectiveCamera(initialView.fov, 1, .025, 150);
    this.camera.position.copy(initialView.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(initialView.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .075;
    this.controls.screenSpacePanning = true;
    this.updateViewSettings();
    this.controls.update();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.doorOpening = this.doorTarget = 0;
    this.curtainOpening = this.curtainTarget = 1;
    this.timeOfDay = 720;
    this.presentationState = 'stopped';
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.materials = {
      wall: new THREE.MeshStandardMaterial({ color: '#f5f4ee', roughness: .89 }),
      beam: new THREE.MeshStandardMaterial({ color: '#e5e5df', roughness: .76 }),
      frame: new THREE.MeshStandardMaterial({ color: '#394542', metalness: .58, roughness: .34 }),
      sill: new THREE.MeshStandardMaterial({ color: '#d8d9d2', roughness: .45 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#a8cdd0', metalness: .04, roughness: .07, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: .65 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#a7b3ae', metalness: .9, roughness: .2 }),
    };
    this.setupLight();
    this.buildGround();
    this.buildFloor();
    this.buildWalls();
    this.buildCurtains();
    this.buildCeiling();
    this.setTime(this.timeOfDay, false);
    this.buildDimensions();
    this.buildAnnotations();
    this.buildEquipmentPreview();
    this.setupEquipmentControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.controls.addEventListener('start', () => {
      this.setPresentation('stopped');
      this.cameraTransition = null;
      this.updateViewSettings();
    });
    this.controls.addEventListener('change', () => {
      this.updateZoom();
      this.updateOrientation();
    });
    this.updateOrientation();
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
  }

  updateOrientation() {
    // South is world -Z; its compass angle follows the camera's orbit azimuth.
    this.callbacks.onOrientation?.(this.controls.getAzimuthalAngle());
  }

  updateZoom() {
    const distance = this.camera.position.distanceTo(this.controls.target);
    this.callbacks.onZoom?.(Math.round(this.initialDistance / distance * 100));
  }

  getViewPreset(view = this.view) {
    const productViews = this.productSpec?.id === chairSpec.id ? CHAIR_VIEWS : this.productSpec?.id === deskSpec.id ? DESK_VIEWS : PRODUCT_VIEWS;
    const preset = this.mode === 'room' && view === 'detail' ? this.equipmentFocusPreset : (this.mode === 'equipment' ? productViews : CAMERA_VIEWS)[view];
    const target = new THREE.Vector3(...preset.target);
    const scale = this.mode === 'room' && ['interior', 'detail'].includes(view) ? 1 : this.fitScale;
    // Scale the orbit around its target so loading, resizing and resetting agree.
    const position = new THREE.Vector3(...preset.position).sub(target).multiplyScalar(scale).add(target);
    return { ...preset, position, target, maxDistance: preset.maxDistance * scale };
  }

  updateViewSettings() {
    const preset = this.getViewPreset();
    this.initialDistance = preset.position.distanceTo(preset.target);
    this.controls.minDistance = preset.minDistance;
    this.controls.maxDistance = preset.maxDistance;
    this.controls.maxPolarAngle = preset.maxPolarAngle;
    if (this.cameraTransition) {
      // Let the whole transition finish before enforcing the destination limits.
      const offset = this.cameraTransition.from.clone().sub(this.cameraTransition.fromTarget);
      const orbit = new THREE.Spherical().setFromVector3(offset);
      this.controls.minDistance = Math.min(preset.minDistance, orbit.radius);
      this.controls.maxDistance = Math.max(preset.maxDistance, orbit.radius);
      this.controls.maxPolarAngle = Math.max(preset.maxPolarAngle, orbit.phi);
    }
  }

  box(width, height, depth, x, y, z, material, group = this.scene, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  setupLight() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.environment = pmrem.fromScene(environment, .04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = .65;
    environment.dispose();
    pmrem.dispose();
    this.ambient = new THREE.HemisphereLight('#eff4f4', '#b5b3a6', 1.5);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#fff8e9', 2.4);
    this.sun.position.set(-5, 10, -6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 35 });
    this.sun.shadow.normalBias = .025;
    this.sun.shadow.bias = -.00008;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight('#e9f0f5', .8);
    this.fill.position.set(-3, 6, 7);
    this.scene.add(this.fill);
    this.interiorLights = [];
    for (const x of [-1.8, 1.8]) {
      for (const z of [-1.8, 1.8]) {
        const light = new THREE.PointLight('#fff2d8', 3, 10, 2);
        light.position.set(x, 2.78, z);
        this.interiorLights.push(light);
        this.scene.add(light);
      }
    }
  }

  buildGround() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#eceee7', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.21;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(90, 90, '#d9ddd3', '#e1e4db');
    grid.position.y = -.205;
    grid.material.transparent = true;
    grid.material.opacity = .52;
    this.scene.add(grid);
  }

  buildFloor() {
    this.box(8.14, .17, 8.14, 0, -.085, 0, new THREE.MeshStandardMaterial({ color: '#bfc3bb', roughness: .7 }));
    this.box(8.02, .02, 8.02, 0, -.005, 0, new THREE.MeshStandardMaterial({ color: '#848f89', roughness: .9 }));
    const tileMaterials = Array.from({ length: 6 }, (_, i) => new THREE.MeshStandardMaterial({
      map: marbleTexture(620 + i * 191), roughness: .3, metalness: .06,
      color: new THREE.Color().setScalar(.97 + i * .008),
    }));
    const geometry = new THREE.BoxGeometry(ROOM.floorTile - .004, .018, ROOM.floorTile - .004);
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const tile = new THREE.Mesh(geometry, tileMaterials[(i * 7 + j * 11) % 6]);
        tile.position.set(-3.6 + i * .8, .009, -3.6 + j * .8);
        tile.rotation.y = ((i * 3 + j) % 4) * Math.PI / 2;
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }
  }

  buildWalls() {
    const { wall, beam, frame, sill, glass } = this.materials;
    // West (right in plan): continuous white wall, built outside the 8 m floor.
    this.box(.14, 3, 8.14, 4.07, 1.5, 0, wall);
    this.box(.035, ROOM.skirtingHeight, 8, 3.985, ROOM.skirtingHeight / 2, 0, sill);
    // South: two windows above a 100 cm sill, separated by a 65 cm structural pier.
    const windowHeight = ROOM.windowTop - ROOM.windowSill;
    const windowCenter = (ROOM.windowTop + ROOM.windowSill) / 2;
    const headHeight = ROOM.height - ROOM.windowTop;
    this.box(ROOM.width, ROOM.windowSill, .14, 0, ROOM.windowSill / 2, -4.07, wall);
    this.box(ROOM.width, headHeight, .14, 0, ROOM.windowTop + headHeight / 2, -4.07, wall);
    for (const side of [-1, 1]) this.box(ROOM.windowSide, windowHeight, .14, side * (ROOM.width - ROOM.windowSide) / 2, windowCenter, -4.07, wall);
    this.box(ROOM.windowPier, windowHeight, .14, 0, windowCenter, -4.07, wall);
    this.box(ROOM.width, ROOM.skirtingHeight, .035, 0, ROOM.skirtingHeight / 2, -3.985, sill);
    const frameWidth = .045;
    for (const opening of windowOpenings()) {
      const center = opening.start + opening.width / 2;
      this.box(opening.width + .1, .045, .23, center, ROOM.windowSill - .0225, -3.99, sill);
      for (const y of [ROOM.windowSill + frameWidth / 2, ROOM.windowTop - frameWidth / 2]) this.box(opening.width, frameWidth, .055, center, y, -4, frame);
      const paneStep = (opening.width - frameWidth) / 2;
      for (let i = 0; i <= 2; i++) this.box(frameWidth, windowHeight, .055, opening.start + frameWidth / 2 + paneStep * i, windowCenter, -4, frame);
      for (let i = 0; i < 2; i++) this.box(paneStep - frameWidth, windowHeight - frameWidth * 2, .012, opening.start + frameWidth / 2 + paneStep * (i + .5), windowCenter, -4, glass, this.scene, false);
    }
    // Keep each glass wall within the 800 cm room while using its own bay count.
    this.doorLeaves = [];
    for (const wallName of ['east', 'north']) {
      const segments = wallSegments(wallName);
      const group = new THREE.Group();
      if (wallName === 'east') {
        group.position.set(-4, 0, -4);
        group.rotation.y = -Math.PI / 2; // local +X follows plan top to bottom.
      } else group.position.set(-4, 0, 4);
      this.scene.add(group);
      for (const segment of segments) {
        const center = segment.start + segment.width / 2;
        if (segment.type === 'beam') {
          this.box(segment.width, 3, .14, center, 1.5, 0, beam, group);
          this.box(segment.width, ROOM.skirtingHeight, .035, center, ROOM.skirtingHeight / 2, -.08, sill, group);
        } else if (segment.type === 'post') {
          this.box(segment.width, 3, .065, center, 1.5, 0, frame, group);
        } else if (wallName === 'north' && segment.bay === 0) {
          this.buildDoor(group, segment);
        } else {
          this.box(segment.width, 2.94, .012, center, 1.5, 0, glass, group, false);
          this.box(segment.width, .028, .04, center, .025, 0, frame, group);
        }
      }
      this.box(7.4, .04, .065, 3.95, 2.98, 0, frame, group);
    }
  }

  buildDoor(parent, segment) {
    const { frame, glass, chrome } = this.materials;
    const half = segment.width / 2;
    for (let side = 0; side < 2; side++) {
      const pivot = new THREE.Group();
      pivot.position.x = segment.start + side * segment.width;
      const direction = side === 0 ? 1 : -1;
      parent.add(pivot);
      const width = half - .004;
      const center = direction * half / 2;
      this.box(width, 2.934, .014, center, 1.5, 0, glass, pivot, false);
      for (const y of [.035, 2.965]) this.box(width, .025, .035, center, y, 0, frame, pivot);
      for (const x of [direction * .015, direction * (half - .015)]) this.box(.025, 2.94, .035, x, 1.5, 0, frame, pivot);
      for (const z of [-.065, .065]) {
        this.box(.019, .36, .019, direction * (half - .105), 1.2, z, chrome, pivot);
        for (const y of [1.05, 1.35]) this.box(.017, .017, .12, direction * (half - .105), y, 0, chrome, pivot);
      }
      for (const y of [.24, 2.7]) this.box(.04, .065, .045, direction * .017, y, 0, chrome, pivot);
      this.doorLeaves.push({ pivot, direction });
    }
  }

  buildCurtains() {
    const fabric = new THREE.MeshStandardMaterial({ map: fabricTexture(), color: '#a6a6a6', side: THREE.DoubleSide, roughness: 1 });
    const geometry = new THREE.PlaneGeometry(1, 2.7, 180, 20);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const u = positions.getX(i) + .5;
      const y = positions.getY(i);
      positions.setXYZ(i, u, y, Math.sin(u * Math.PI * 2 * 18) * .063 + Math.sin(u * Math.PI * 2 * 36) * .008);
    }
    geometry.computeVertexNormals();
    this.curtainPanels = [];
    for (const opening of windowOpenings()) {
      const closedWidth = opening.width / 2;
      const openWidth = .28;
      for (const side of [-1, 1]) {
        const curtain = new THREE.Mesh(geometry, fabric);
        curtain.position.set(side < 0 ? opening.start : opening.start + opening.width, 1.48, -3.72);
        curtain.scale.x = mix(closedWidth, openWidth, this.curtainOpening) * -side;
        curtain.castShadow = true;
        curtain.receiveShadow = true;
        this.scene.add(curtain);
        this.curtainPanels.push({ curtain, sign: -side, closedWidth, openWidth });
      }
      this.box(opening.width + .06, .04, .07, opening.start + closedWidth, 2.88, -3.72, this.materials.chrome);
      for (const x of [opening.start + .1, opening.start + opening.width - .1]) this.box(.05, .04, .28, x, 2.88, -3.88, this.materials.chrome);
    }
  }

  buildCeiling() {
    this.ceiling = new THREE.Group();
    this.ceiling.visible = false;
    this.scene.add(this.ceiling);
    const coordinates = ceilingGrid();
    const panel = new THREE.MeshStandardMaterial({ color: '#f5f4ec', roughness: .92 });
    const rail = new THREE.MeshStandardMaterial({ color: '#b7bcb5', metalness: .3, roughness: .48 });
    const light = this.ceilingLightMaterial = new THREE.MeshStandardMaterial({ color: '#fff9ea', emissive: '#fff3d9', emissiveIntensity: 1.5, roughness: .6 });
    for (let i = 0; i < coordinates.length - 1; i++) {
      for (let j = 0; j < coordinates.length - 1; j++) {
        const w = coordinates[i + 1] - coordinates[i];
        const d = coordinates[j + 1] - coordinates[j];
        const isLight = [4, 10].includes(i) && [4, 10].includes(j);
        this.box(w - .008, .035, d - .008, (coordinates[i + 1] + coordinates[i]) / 2 - 4, 3.02, (coordinates[j + 1] + coordinates[j]) / 2 - 4, isLight ? light : panel, this.ceiling);
      }
    }
    for (const coordinate of coordinates) {
      this.box(.012, .025, 8, coordinate - 4, 2.995, 0, rail, this.ceiling);
      this.box(8, .025, .012, 0, 2.995, coordinate - 4, rail, this.ceiling);
    }
  }

  label(text, position, className = '', parent = this.scene) {
    const element = document.createElement('div');
    element.className = `scene-label ${className}`;
    element.textContent = text;
    const object = new CSS2DObject(element);
    object.position.set(...position);
    parent.add(object);
    return object;
  }

  line(points, parent = this.scene, dashed = false, color = '#7d9083') {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const material = dashed ? new THREE.LineDashedMaterial({ color, dashSize: .07, gapSize: .055, transparent: true, opacity: .62 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7 });
    const line = new THREE.Line(geometry, material);
    if (dashed) line.computeLineDistances();
    parent.add(line);
    return line;
  }

  buildDimensions() {
    this.dimensions = new THREE.Group();
    this.scene.add(this.dimensions);
    const group = this.dimensions;
    const tick = (x, z, alongX) => this.line([[x - (alongX ? .07 : 0), .026, z - (alongX ? 0 : .07)], [x + (alongX ? .07 : 0), .026, z + (alongX ? 0 : .07)]], group);
    this.line([[-4, .025, 4.72], [4, .025, 4.72]], group);
    for (const x of [-4, 4]) {
      this.line([[x, .025, 4.25], [x, .025, 4.88]], group, true);
      tick(x, 4.72, false);
    }
    this.label('800 cm', [0, .035, 4.74], 'dimension-label', group);
    this.line([[-4.7, .025, -4], [-4.7, .025, 4]], group);
    for (const z of [-4, 4]) {
      this.line([[-4.22, .025, z], [-4.88, .025, z]], group, true);
      tick(-4.7, z, true);
    }
    this.label('800 cm', [-4.72, .035, 0], 'dimension-label', group);
    this.heightDimensions = new THREE.Group();
    group.add(this.heightDimensions);
    this.line([[4.35, .025, 4.25], [4.35, 3, 4.25]], this.heightDimensions);
    for (const y of [.025, 3]) this.line([[4.2, y, 4.25], [4.5, y, 4.25]], this.heightDimensions);
    this.label('300 cm', [4.38, 1.5, 4.25], 'dimension-label', this.heightDimensions);
    this.bayDimensions = new THREE.Group();
    group.add(this.bayDimensions);
    const bay = wallSegments().find(segment => segment.type === 'glass' && segment.bay === 2);
    const a = bay.start - 4;
    const b = a + bay.width;
    this.line([[a, 3.25, 4], [b, 3.25, 4]], this.bayDimensions);
    for (const x of [a, b]) this.line([[x, 3.1, 4], [x, 3.37, 4]], this.bayDimensions);
    this.label('180 cm', [(a + b) / 2, 3.28, 4], 'dimension-label small', this.bayDimensions);
  }

  buildAnnotations() {
    this.annotations = new THREE.Group();
    this.scene.add(this.annotations);
    this.label('南侧 · 窗户与窗帘', [-.7, 3.43, -4], 'feature-label', this.annotations);
    this.label('西侧 · 白色墙面', [4.08, 3.33, -.8], 'feature-label', this.annotations);
    this.doorLabel = this.label('双开门 · 180 cm', [-2.85, .2, 4.12], 'door-label', this.annotations);
    // Orientation remains attached to the architecture while the view rotates.
    this.label('南 S', [0, .028, -4.58], 'cardinal-label', this.annotations);
    this.label('北 N', [0, .028, 5.2], 'cardinal-label', this.annotations);
    this.label('东 E', [-5.15, .028, 0], 'cardinal-label', this.annotations);
    this.label('西 W', [4.62, .028, 0], 'cardinal-label', this.annotations);
  }

  buildEquipmentPreview() {
    this.equipmentScene = new THREE.Scene();
    this.equipmentScene.background = new THREE.Color('#f2f3ef');
    this.equipmentScene.environment = this.environment.texture;
    this.equipmentScene.environmentIntensity = .4;
    this.equipmentScene.fog = new THREE.Fog('#f2f3ef', 5, 16);
    this.equipmentScene.add(new THREE.HemisphereLight('#ffffff', '#b3b8af', 1));
    const key = new THREE.DirectionalLight('#fff8ed', 2.5);
    key.position.set(-2, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: .1, far: 15 });
    key.shadow.bias = -.0001;
    key.shadow.normalBias = .001;
    this.equipmentScene.add(key);
    const fill = new THREE.DirectionalLight('#eff6ff', .8);
    fill.position.set(3, 2, -2);
    this.equipmentScene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#f0f1eb', roughness: .9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.002;
    ground.receiveShadow = true;
    this.equipmentScene.add(ground);
    this.workbench = createWorkbench(equipmentSpec);
    this.desk = createOfficeDesk(deskSpec);
    this.chair = createOfficeChair(chairSpec);
    this.equipmentScene.add(this.workbench, this.desk, this.chair);
    this.productDimensions = new THREE.Group();
    this.equipmentScene.add(this.productDimensions);
    this.productDimensionSets = new Map();
    for (const spec of [equipmentSpec, deskSpec, chairSpec]) {
      const group = new THREE.Group(), heights = new THREE.Group();
      group.add(heights);
      this.productDimensions.add(group);
      const width = spec.dimensions.length / 1000, depth = spec.dimensions.depth / 1000;
      const height = spec.dimensions.overallHeight / 1000, top = (spec.dimensions.worktopHeight ?? spec.dimensions.seatHeight) / 1000;
      const dimension = (a, b, text, position, axis, parent = group) => {
        this.line([a, b], parent, false, '#6d8877');
        for (const point of [a, b]) {
          const start = [...point], end = [...point]; start[axis] -= .025; end[axis] += .025;
          this.line([start, end], parent);
        }
        this.label(text, position, 'dimension-label product-dimension', parent);
      };
      dimension([-width / 2, .01, depth / 2 + .18], [width / 2, .01, depth / 2 + .18], `${spec.dimensions.length} mm`, [0, .01, depth / 2 + .21], 2);
      dimension([-width / 2 - .2, .01, -depth / 2], [-width / 2 - .2, .01, depth / 2], `${spec.dimensions.depth} mm`, [-width / 2 - .24, .01, 0], 0);
      dimension([width / 2 + .2, 0, -depth / 2], [width / 2 + .2, height, -depth / 2], `总高 ${spec.dimensions.overallHeight} mm`, [width / 2 + .23, height / 2, -depth / 2], 0, heights);
      if (height !== top) dimension([width / 2 + .13, 0, depth / 2 + .05], [width / 2 + .13, top, depth / 2 + .05], `${spec.id === chairSpec.id ? '座高' : '台面'} ${Math.round(top * 1000)} mm`, [width / 2 + .16, top / 2, depth / 2 + .05], 0, heights);
      for (const x of [-width / 2, width / 2]) this.line([[x, .01, depth / 2], [x, .01, depth / 2 + .23]], group, true);
      this.productDimensionSets.set(spec.id, { group, heights });
    }
    this.workbenchLightOn = true;
    this.setProduct(equipmentSpec.id);
  }

  setProduct(id) {
    this.productSpec = EQUIPMENT_SPECS[id] ?? equipmentSpec;
    this.workbench.visible = this.productSpec.id === equipmentSpec.id;
    this.desk.visible = this.productSpec.id === deskSpec.id;
    this.chair.visible = this.productSpec.id === chairSpec.id;
    for (const [key, { group }] of this.productDimensionSets) group.visible = key === this.productSpec.id && (key !== chairSpec.id || !this.productOpened);
    this.productHeightDimensions = this.productDimensionSets.get(this.productSpec.id).heights;
  }

  setProductOpen(enabled) {
    setDeskOpenings(this.desk, { drawer: enabled, door: enabled, hatch: enabled });
    setChairLounge(this.chair, enabled);
    // Nominal stowed dimensions do not describe the reclined/extended pose.
    this.productDimensionSets.get(chairSpec.id).group.visible = this.productSpec.id === chairSpec.id && !enabled;
    this.productOpened = enabled;
  }

  setWorkspace(mode) {
    this.setPresentation('stopped');
    this.finishEquipmentGesture();
    this.mode = mode;
    this.renderer.toneMappingExposure = mode === 'equipment' ? .93 : this.lightingTarget.exposure;
    this.cameraTransition = null;
    this.labelRenderer.domElement.replaceChildren();
    this.labelRenderer.domElement.classList.remove('interior-labels');
    const d = this.productSpec.dimensions;
    this.renderer.domElement.setAttribute('aria-label', mode === 'equipment' ? `${this.productSpec.name}三维模型，长${d.length}、深${d.depth}、总高${d.overallHeight}毫米` : '8 米 × 8 米 × 3 米办公室三维模型');
    this.setView('perspective');
    this.updateEquipmentControls();
  }

  setWorkbenchLight(enabled) {
    this.workbenchLightOn = enabled;
    setWorkbenchLight(this.workbench, enabled);
  }

  setEquipmentState(state) {
    this.setPresentation('stopped');
    this.roomLayout = normalizeRoomLayout(state);
    this.placedObjects ??= new Map();
    const ids = new Set(this.roomLayout.items.map(item => item.id));
    for (const [id, object] of this.placedObjects) {
      if (ids.has(id)) continue;
      if (this.transform.object === object) this.transform.detach();
      this.scene.remove(object);
      this.placedObjects.delete(id);
      const resources = new Set();
      object.traverse(child => {
        if (child.geometry) resources.add(child.geometry);
        if (child.customDepthMaterial) resources.add(child.customDepthMaterial);
        for (const material of child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : []) {
          resources.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
        }
      });
      resources.forEach(resource => resource.dispose());
    }
    for (const item of this.roomLayout.items) {
      let object = this.placedObjects.get(item.id);
      if (!object) {
        object = item.equipmentId === chairSpec.id ? createOfficeChair(chairSpec) : item.equipmentId === deskSpec.id ? createOfficeDesk(deskSpec) : createWorkbench(equipmentSpec);
        object.userData.placementId = item.id;
        this.placedObjects.set(item.id, object);
        this.scene.add(object);
      }
      object.visible = true;
      object.position.set(item.x, .018, item.z);
      object.rotation.set(0, THREE.MathUtils.degToRad(item.rotation), 0);
      if (item.equipmentId === equipmentSpec.id) setWorkbenchLight(object, item.lightOn);
    }
    this.syncSelectedEquipment();
    this.updateEquipmentControls();
  }

  syncSelectedEquipment() {
    this.selectedEquipmentIds = (this.selectedEquipmentIds ?? []).filter(id => this.placedObjects?.has(id));
    this.selectedItems = this.selectedEquipmentIds.map(id => this.roomLayout?.items.find(item => item.id === id)).filter(Boolean);
    this.equipmentState = this.selectedItems.at(-1);
    this.placedEquipment = this.equipmentState ? this.placedObjects.get(this.equipmentState.id) : null;
    this.equipmentSelected = Boolean(this.equipmentState);
    this.selectionHelpers ??= new Map();
    for (const [id, helper] of this.selectionHelpers) {
      if (this.selectedEquipmentIds.includes(id)) continue;
      this.scene.remove(helper);
      helper.dispose();
      this.selectionHelpers.delete(id);
    }
    for (const item of this.selectedItems) {
      const object = this.placedObjects.get(item.id);
      object.updateMatrixWorld(true);
      let helper = this.selectionHelpers.get(item.id);
      if (!helper) {
        helper = new THREE.BoxHelper(object, '#458b74');
        helper.material.depthTest = false;
        helper.material.transparent = true;
        helper.material.opacity = .55;
        helper.renderOrder = 19;
        this.scene.add(helper);
        this.selectionHelpers.set(item.id, helper);
      }
      helper.visible = this.mode === 'room';
      helper.update();
    }
  }

  floorPosition(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const point = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.018), new THREE.Vector3());
    return point && Math.abs(point.x) <= 4 && Math.abs(point.z) <= 4 ? { x: point.x, z: point.z } : null;
  }

  setupEquipmentControls() {
    this.equipmentSelected = false;
    this.equipmentEditMode = 'rotate';
    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.setSize(.85);
    this.transform.setTranslationSnap(.01);
    this.transform.setRotationSnap(Math.PI / 180);
    this.placementGrid = new THREE.Group();
    for (const [divisions, opacity] of [[300, .13], [30, .3]]) {
      const grid = new THREE.GridHelper(3, divisions, '#789780', '#789780');
      grid.material.transparent = true;
      grid.material.opacity = opacity;
      grid.material.depthWrite = false;
      this.placementGrid.add(grid);
    }
    this.placementGrid.position.y = .022;
    this.scene.add(this.placementGrid);
    // A complete, floor-aligned ring is easier to grab than the standard half arcs.
    this.rotationRing = new THREE.Group();
    const radius = Math.hypot(equipmentSpec.dimensions.length, equipmentSpec.dimensions.depth) / 2000 + .16;
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#458b74', transparent: true, opacity: .92, depthTest: false, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .012, 8, 128), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 20;
    this.rotationRing.add(ring);
    const picker = new THREE.Mesh(new THREE.TorusGeometry(radius, .055, 6, 96), new THREE.MeshBasicMaterial({ visible: false }));
    picker.rotation.x = Math.PI / 2;
    picker.name = 'Rotation ring picker';
    this.rotationRing.add(picker);
    // Keep the scale fixed to the room, with only the facing indicator rotating.
    const tickMaterial = new THREE.MeshBasicMaterial({ color: '#74a38f', depthTest: false, depthWrite: false });
    const majorTickMaterial = new THREE.MeshBasicMaterial({ color: '#357660', depthTest: false, depthWrite: false });
    this.rotationSnapMaterial = new THREE.MeshBasicMaterial({ color: '#e9be64', depthTest: false, depthWrite: false });
    this.rotationTicks = [];
    for (let degrees = 0; degrees < 360; degrees += ROTATION_STEP) {
      const major = degrees % 90 === 0;
      const angle = THREE.MathUtils.degToRad(degrees);
      const tick = new THREE.Mesh(new THREE.BoxGeometry(major ? .022 : .013, .012, major ? .18 : .1), major ? majorTickMaterial : tickMaterial);
      const distance = radius + (major ? .035 : .015);
      tick.position.set(Math.sin(angle) * distance, .004, Math.cos(angle) * distance);
      tick.rotation.y = angle;
      tick.renderOrder = 21;
      this.rotationRing.add(tick);
      this.rotationTicks.push({ tick, degrees, material: tick.material });
    }
    this.rotationIndicator = new THREE.Group();
    this.rotationRing.add(this.rotationIndicator);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(.032, .11, 8), ringMaterial);
      arrow.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)));
      arrow.renderOrder = 21;
      this.rotationIndicator.add(arrow);
    }
    const front = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), this.rotationSnapMaterial);
    front.position.z = radius;
    front.renderOrder = 22;
    this.rotationIndicator.add(front);
    this.rotationReadout = this.label('', [0, .08, radius + .3], 'rotation-readout', this.rotationIndicator);
    this.rotationReadout.visible = false;
    this.scene.add(this.rotationRing);
    this.scene.add(this.transform.getHelper());
    this.selectionPivot = new THREE.Group();
    this.scene.add(this.selectionPivot);
    this.transform.addEventListener('dragging-changed', event => {
      this.controls.enabled = !event.value;
      if (event.value) {
        this.cameraTransition = null;
        this.transformDrag = { items: this.roomLayout.items, ids: [...this.selectedEquipmentIds], center: { x: this.selectionPivot.position.x, z: this.selectionPivot.position.z } };
        this.callbacks.onEditStart?.();
      } else {
        this.transformDrag = null;
        this.callbacks.onEditEnd?.();
        this.updateEquipmentControls();
      }
    });
    this.transform.addEventListener('objectChange', () => {
      const drag = this.transformDrag;
      if (!drag) return;
      this.callbacks.onEquipmentTransform?.(drag.ids, { dx: this.selectionPivot.position.x - drag.center.x, dz: this.selectionPivot.position.z - drag.center.z }, drag.items);
    });
    const canvas = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.018);
    const setRay = event => {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    };
    const pickEquipment = () => {
      const objects = [...(this.placedObjects?.values() ?? [])].filter(object => object.visible);
      const hit = raycaster.intersectObjects(objects, true).find(hit => hit.object.isMesh);
      if (!hit) return null;
      let object = hit.object;
      while (object && !object.userData.placementId) object = object.parent;
      return object?.userData.placementId ?? null;
    };
    const selectPicked = (id, additive = false, preserve = false) => {
      const ids = this.selectedEquipmentIds ?? [];
      this.selectEquipment(id == null ? [] : additive
        ? ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]
        : preserve && ids.includes(id) ? ids : [id]);
    };
    this.marqueeElement = document.createElement('div');
    this.marqueeElement.className = 'selection-marquee';
    this.marqueeElement.hidden = true;
    this.container.appendChild(this.marqueeElement);
    this.onEquipmentPointerDown = event => {
      this.setPresentation('stopped');
      this.pickStart = { x: event.clientX, y: event.clientY, axis: this.transform.axis };
      if (event.button === 2) this.contextStart = { x: event.clientX, y: event.clientY, moved: false };
      if (event.button !== 0 || this.mode !== 'room') return;
      setRay(event);
      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      const pickedId = pickEquipment();
      if (additive) {
        // Modifier selection takes precedence over the rotate/translate handles.
        event.stopImmediatePropagation();
        this.pickStart = null;
        if (pickedId) { selectPicked(pickedId, true); return; }
        this.marqueeDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, ids: [...(this.selectedEquipmentIds ?? [])] };
        this.controls.enabled = false;
        this.cameraTransition = null;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (this.transform.enabled && this.transform.axis) return;
      if (this.rotationRing.visible && raycaster.intersectObject(this.rotationRing, true).length) {
        const point = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
        if (!point) return;
        const center = selectionCenter(this.selectedItems);
        const rotation = this.selectedItems.length === 1 ? this.equipmentState.rotation : 0;
        this.rotationDrag = { pointerId: event.pointerId, angle: Math.atan2(point.x - center.x, point.z - center.z), accumulated: 0, rotation, centerX: center.x, centerZ: center.z, snapAngle: null, ids: [...this.selectedEquipmentIds], items: this.roomLayout.items };
        this.callbacks.onEditStart?.();
        this.controls.enabled = false;
        this.cameraTransition = null;
        canvas.setPointerCapture(event.pointerId);
        this.updateEquipmentControls();
        return;
      }
      if (!pickedId) return;
      selectPicked(pickedId, false, true);
      const point = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
      if (!point) return;
      this.objectDrag = { pointerId: event.pointerId, point, items: this.roomLayout.items, ids: [...this.selectedEquipmentIds] };
      this.callbacks.onEditStart?.();
      this.controls.enabled = false;
      this.cameraTransition = null;
      canvas.setPointerCapture(event.pointerId);
      this.updateEquipmentControls();
    };
    this.onEquipmentPointerMove = event => {
      if (this.contextStart && Math.hypot(event.clientX - this.contextStart.x, event.clientY - this.contextStart.y) > 5) this.contextStart.moved = true;
      if (this.marqueeDrag?.pointerId === event.pointerId) {
        const drag = this.marqueeDrag;
        const rect = canvas.getBoundingClientRect();
        Object.assign(this.marqueeElement.style, { left: `${Math.min(drag.x, event.clientX) - rect.left}px`, top: `${Math.min(drag.y, event.clientY) - rect.top}px`, width: `${Math.abs(event.clientX - drag.x)}px`, height: `${Math.abs(event.clientY - drag.y)}px` });
        this.marqueeElement.hidden = false;
        return;
      }
      if (this.rotationDrag?.pointerId === event.pointerId) {
        setRay(event);
        const point = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
        if (!point) return;
        const drag = this.rotationDrag;
        const angle = Math.atan2(point.x - drag.centerX, point.z - drag.centerZ);
        drag.accumulated += Math.atan2(Math.sin(angle - drag.angle), Math.cos(angle - drag.angle));
        drag.angle = angle;
        const snapped = snapRotation(drag.rotation + THREE.MathUtils.radToDeg(drag.accumulated), drag.snapAngle);
        drag.snapAngle = snapped.snapAngle;
        drag.currentRotation = snapped.rotation;
        this.callbacks.onEquipmentTransform?.(drag.ids, { rotation: snapped.rotation - drag.rotation }, drag.items);
        return;
      }
      if (!this.objectDrag || this.objectDrag.pointerId !== event.pointerId) return;
      setRay(event);
      const point = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
      if (!point) return;
      const drag = this.objectDrag;
      this.callbacks.onEquipmentTransform?.(drag.ids, { dx: point.x - drag.point.x, dz: point.z - drag.point.z }, drag.items);
    };
    this.onEquipmentPointerUp = event => {
      if (event.button === 2) {
        const start = this.contextStart;
        this.contextStart = null;
        this.pickStart = null;
        if (this.mode === 'room' && event.type === 'pointerup' && start && !start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 5) {
          this.callbacks.onContextMenu?.({ clientX: event.clientX, clientY: event.clientY, position: this.floorPosition(event.clientX, event.clientY) });
        }
        return;
      }
      if (this.marqueeDrag?.pointerId === event.pointerId) {
        const drag = this.marqueeDrag;
        this.marqueeDrag = null;
        this.marqueeElement.hidden = true;
        if (event.type === 'pointerup' && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) {
          const rect = canvas.getBoundingClientRect();
          const ids = this.roomLayout.items.filter(item => {
            const point = new THREE.Vector3(item.x, EQUIPMENT_SPECS[item.equipmentId].dimensions.overallHeight / 2000, item.z).project(this.camera);
            const x = rect.left + (point.x + 1) * rect.width / 2;
            const y = rect.top + (1 - point.y) * rect.height / 2;
            return point.z > -1 && point.z < 1 && x >= Math.min(drag.x, event.clientX) && x <= Math.max(drag.x, event.clientX) && y >= Math.min(drag.y, event.clientY) && y <= Math.max(drag.y, event.clientY);
          }).map(item => item.id);
          this.selectEquipment([...new Set([...drag.ids, ...ids])]);
        }
        this.controls.enabled = true;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        return;
      }
      if (this.rotationDrag?.pointerId === event.pointerId || this.objectDrag?.pointerId === event.pointerId) {
        this.rotationDrag = null;
        this.objectDrag = null;
        this.pickStart = null;
        this.controls.enabled = true;
        this.callbacks.onEditEnd?.();
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        this.updateEquipmentControls();
        return;
      }
      const start = this.pickStart;
      this.pickStart = null;
      if (event.type !== 'pointerup' || event.button !== 0 || this.mode !== 'room' || !start || start.axis || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
      setRay(event);
      selectPicked(pickEquipment(), false, true);
    };
    canvas.addEventListener('pointerdown', this.onEquipmentPointerDown, true);
    canvas.addEventListener('pointermove', this.onEquipmentPointerMove);
    canvas.addEventListener('pointerup', this.onEquipmentPointerUp);
    canvas.addEventListener('pointercancel', this.onEquipmentPointerUp);
    canvas.addEventListener('lostpointercapture', this.onEquipmentPointerUp);
    this.onSceneWheel = () => this.setPresentation('stopped');
    canvas.addEventListener('wheel', this.onSceneWheel, { capture: true, passive: true });
    this.updateEquipmentControls();
  }

  updateEquipmentControls() {
    if (!this.transform) return;
    const enabled = this.mode === 'room' && this.presentationState === 'stopped' && this.equipmentState?.placed && this.equipmentSelected;
    this.transform.enabled = Boolean(enabled && this.equipmentEditMode === 'translate');
    this.placementGrid.visible = Boolean(enabled && (this.equipmentEditMode === 'translate' || this.objectDrag));
    this.rotationRing.visible = Boolean(enabled && this.equipmentEditMode === 'rotate');
    if (this.placedEquipment) {
      const center = selectionCenter(this.selectedItems);
      this.rotationRing.position.set(center.x, .04, center.z);
      const radius = Math.max(...this.selectedItems.map(item => {
        const spec = EQUIPMENT_SPECS[item.equipmentId];
        return Math.hypot(item.x - center.x, item.z - center.z) + Math.hypot(spec.dimensions.length, spec.dimensions.depth) / 2000 + .16;
      }));
      const baseRadius = Math.hypot(equipmentSpec.dimensions.length, equipmentSpec.dimensions.depth) / 2000 + .16;
      this.rotationRing.scale.set(radius / baseRadius, 1, radius / baseRadius);
      const rotation = this.selectedItems.length === 1 ? this.equipmentState.rotation : this.rotationDrag?.currentRotation ?? 0;
      this.rotationIndicator.rotation.y = THREE.MathUtils.degToRad(rotation);
      const aligned = rotation % ROTATION_STEP === 0;
      const snapping = this.rotationDrag?.snapAngle != null;
      for (const { tick, degrees, material } of this.rotationTicks) {
        const active = aligned && degrees === rotation;
        tick.material = active ? this.rotationSnapMaterial : material;
        tick.scale.set(active ? 1.5 : 1, 1, active ? 1.15 : 1);
      }
      this.rotationReadout.visible = Boolean(this.rotationDrag);
      this.rotationReadout.element.textContent = `${rotation}°${snapping ? ' · 已吸附' : ''}`;
      this.rotationReadout.element.classList.toggle('snapped', snapping);
      this.placementGrid.position.set(clamp(center.x, -2.5, 2.5), .022, clamp(center.z, -2.5, 2.5));
      if (!this.transformDrag) this.selectionPivot.position.set(center.x, .018, center.z);
    }
    if (this.transform.enabled) {
      this.transform.attach(this.selectionPivot);
      this.transform.setMode('translate');
      this.transform.showX = true;
      this.transform.showY = false;
      this.transform.showZ = true;
    } else this.transform.detach();
    for (const helper of this.selectionHelpers?.values() ?? []) helper.visible = this.mode === 'room' && this.presentationState === 'stopped';
  }

  finishEquipmentGesture() {
    const drag = this.objectDrag ?? this.rotationDrag ?? this.marqueeDrag;
    this.objectDrag = null;
    this.rotationDrag = null;
    this.marqueeDrag = null;
    this.pickStart = null;
    this.marqueeElement.hidden = true;
    this.controls.enabled = true;
    if (this.transform.dragging) this.transform.pointerUp(null);
    this.callbacks.onEditEnd?.();
    const canvas = this.renderer.domElement;
    if (drag && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
    this.updateEquipmentControls();
  }

  selectEquipment(ids = this.selectedEquipmentIds ?? [], notify = true) {
    const next = Array.isArray(ids) ? ids : ids ? [ids] : [];
    if (next.join(',') !== (this.selectedEquipmentIds ?? []).join(',')) this.setPresentation('stopped');
    this.selectedEquipmentIds = next;
    this.syncSelectedEquipment();
    this.updateEquipmentControls();
    if (notify) this.callbacks.onEquipmentSelection?.(this.selectedEquipmentIds);
  }

  setEquipmentEditMode(mode) {
    this.finishEquipmentGesture();
    this.equipmentEditMode = mode === 'rotate' ? 'rotate' : 'translate';
    this.selectEquipment();
  }

  focusEquipment() {
    if (!this.equipmentState?.placed) return;
    const { x, z } = selectionCenter(this.selectedItems);
    const { rotation } = this.equipmentState;
    const spread = Math.max(0, ...this.selectedItems.map(item => Math.hypot(item.x - x, item.z - z)));
    if (spread > 0) {
      this.equipmentFocusPreset = {
        position: [x + spread + 3, spread * 1.5 + 4, z + spread + 4], target: [x, .5, z],
        fov: 48, minDistance: .65, maxDistance: 30, maxPolarAngle: Math.PI * .85,
      };
      this.setView('detail');
      return;
    }
    const angle = THREE.MathUtils.degToRad(rotation);
    this.equipmentFocusPreset = {
      position: [clamp(x + Math.sin(angle) * 3.3 + Math.cos(angle) * 1.6, -3.8, 3.8), 2.4, clamp(z + Math.cos(angle) * 3.3 - Math.sin(angle) * 1.6, -3.8, 3.8)],
      target: [x, EQUIPMENT_SPECS[this.equipmentState.equipmentId].dimensions.overallHeight / 2000, z], fov: 48, minDistance: .65, maxDistance: 20, maxPolarAngle: Math.PI * .85,
    };
    this.selectEquipment();
    this.setView('detail');
  }

  setCurtain(opening, animate = true) {
    this.curtainTarget = clamp(opening, 0, 1);
    if (!animate) this.curtainOpening = this.curtainTarget;
  }

  setDoor(open) { this.doorTarget = open ? 1 : 0; }
  setCeiling(visible) {
    if (visible) this.setPresentation('stopped');
    this.ceiling.visible = visible;
  }
  setDimensions(visible) {
    this.dimensionsEnabled = visible;
    this.dimensions.visible = visible && this.view !== 'detail';
    this.productDimensions.visible = visible;
  }

  setTime(minutes, animate = true) {
    this.timeOfDay = normalizeTime(minutes);
    this.lightingTarget = daylightAt(this.timeOfDay);
    this.lightingTarget.position = new THREE.Vector3(...this.lightingTarget.position);
    if (!animate || this.reducedMotion) this.updateDaylight(1);
  }

  updateDaylight(blend) {
    const target = this.lightingTarget;
    this.sun.position.lerp(target.position, blend);
    this.sun.color.lerp(target.sunColor, blend);
    this.sun.intensity = mix(this.sun.intensity, target.sunIntensity, blend);
    this.ambient.color.lerp(target.skyColor, blend);
    this.ambient.intensity = mix(this.ambient.intensity, target.ambientIntensity, blend);
    this.fill.intensity = mix(this.fill.intensity, target.fillIntensity, blend);
    this.scene.background.lerp(target.background, blend);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.environmentIntensity = mix(this.scene.environmentIntensity, target.environmentIntensity, blend);
    for (const light of this.interiorLights) light.intensity = mix(light.intensity, target.interiorIntensity, blend);
    if (this.ceilingLightMaterial) this.ceilingLightMaterial.emissiveIntensity = mix(.8, 2, (target.interiorIntensity - 3) / 22);
    if (this.mode === 'room') this.renderer.toneMappingExposure = mix(this.renderer.toneMappingExposure, target.exposure, blend);
  }

  setPresentation(state) {
    if (state === this.presentationState) return;
    if (state === 'playing' && this.mode !== 'room') return;
    if (state === 'playing' && this.presentationState === 'stopped') {
      this.finishEquipmentGesture();
      this.setView('perspective');
      this.presentationOriginalTime = this.timeOfDay;
      this.presentationDisplayedTime = this.timeOfDay;
      this.callbacks.onPresentationTime?.(this.timeOfDay);
      this.presentationOrbit = null;
    }
    this.presentationState = state;
    this.controls.enabled = state !== 'playing';
    if (state === 'stopped') {
      this.presentationOrbit = null;
      this.cameraTransition = null;
      if (this.presentationOriginalTime != null) {
        this.setTime(this.presentationOriginalTime);
        this.callbacks.onPresentationTime?.(this.presentationOriginalTime);
        this.presentationOriginalTime = null;
      }
    }
    if (state === 'paused') this.updateDaylight(1);
    this.updateEquipmentControls();
    this.callbacks.onPresentationChange?.(state);
  }

  updatePresentation(delta) {
    if (this.presentationState !== 'playing' || this.cameraTransition) return;
    if (!this.presentationOrbit) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      this.presentationOrbit = {
        time: 0, angle: Math.atan2(offset.x, offset.z),
        radius: Math.hypot(offset.x, offset.z) / this.fitScale,
        height: offset.y / this.fitScale,
        target: this.controls.target.clone(),
      };
    }
    const orbit = this.presentationOrbit;
    orbit.time += delta;
    // A day lasts 120 seconds, while the orbit lasts 80: successive angles
    // are seen under different light instead of repeating the same pairing.
    this.setTime((this.presentationOriginalTime + orbit.time * 12) % 1440);
    const displayedTime = Math.floor(this.timeOfDay / 5) * 5;
    if (displayedTime !== this.presentationDisplayedTime) {
      this.presentationDisplayedTime = displayedTime;
      this.callbacks.onPresentationTime?.(displayedTime);
    }
    const phase = orbit.time * Math.PI * 2 / 80;
    const angle = orbit.angle + phase;
    const radius = orbit.radius * this.fitScale * (1 + .04 * Math.sin(phase));
    this.controls.target.copy(orbit.target);
    this.camera.position.set(
      orbit.target.x + Math.sin(angle) * radius,
      orbit.target.y + (orbit.height + 1.5 * Math.sin(phase * 2)) * this.fitScale,
      orbit.target.z + Math.cos(angle) * radius,
    );
  }

  setView(view) {
    this.setPresentation('stopped');
    this.view = view;
    const preset = this.getViewPreset();
    this.cameraTransition = {
      time: 0, duration: this.reducedMotion ? .001 : 1,
      from: this.camera.position.clone(), to: preset.position,
      fromTarget: this.controls.target.clone(), toTarget: preset.target,
      fromFov: this.camera.fov, toFov: preset.fov,
    };
    this.updateViewSettings();
    this.updateZoom();
    this.annotations.visible = !['interior', 'detail'].includes(view);
    this.dimensions.visible = this.dimensionsEnabled !== false && view !== 'detail';
    this.bayDimensions.visible = view !== 'top';
    this.heightDimensions.visible = view !== 'top';
    this.productHeightDimensions.visible = view !== 'top';
    this.labelRenderer.domElement.classList.toggle('interior-labels', this.mode === 'room' && view === 'interior');
  }

  zoom(factor) {
    this.setPresentation('stopped');
    this.cameraTransition = null;
    this.updateViewSettings();
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(distance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    const fitScale = Math.max(1, (this.mode === 'equipment' && this.productSpec.id === chairSpec.id ? .8 : 1.12) / this.camera.aspect);
    if ((this.mode === 'equipment' || !['interior', 'detail'].includes(this.view)) && Math.abs(fitScale - this.fitScale) > .001) {
      const ratio = fitScale / this.fitScale;
      this.camera.position.sub(this.controls.target).multiplyScalar(ratio).add(this.controls.target);
      if (this.cameraTransition) {
        const transition = this.cameraTransition;
        transition.from.sub(transition.fromTarget).multiplyScalar(ratio).add(transition.fromTarget);
        transition.to.sub(transition.toTarget).multiplyScalar(ratio).add(transition.toTarget);
      }
    }
    this.fitScale = fitScale;
    this.updateViewSettings();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    this.controls.update();
    this.updateZoom();
  }

  animate(timestamp) {
    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), .05);
    const damping = this.reducedMotion ? 1 : 1 - Math.exp(-7 * delta);
    this.updateDaylight(damping);
    this.curtainOpening = mix(this.curtainOpening, this.curtainTarget, damping);
    this.doorOpening = mix(this.doorOpening, this.doorTarget, damping);
    for (const { curtain, sign, closedWidth, openWidth } of this.curtainPanels) {
      curtain.scale.x = mix(closedWidth, openWidth, this.curtainOpening) * sign;
    }
    for (const { pivot, direction } of this.doorLeaves) pivot.rotation.y = this.doorOpening * Math.PI / 2 * direction;
    if (this.cameraTransition && this.presentationState !== 'paused') {
      const transition = this.cameraTransition;
      transition.time += delta;
      const t = clamp(transition.time / transition.duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(transition.from, transition.to, eased);
      this.controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      this.camera.fov = mix(transition.fromFov, transition.toFov, eased);
      this.camera.updateProjectionMatrix();
      if (t === 1) {
        this.cameraTransition = null;
        this.updateViewSettings();
      }
    }
    this.updatePresentation(delta);
    this.controls.update();
    const activeScene = this.mode === 'equipment' ? this.equipmentScene : this.scene;
    this.renderer.render(activeScene, this.camera);
    this.labelRenderer.render(activeScene, this.camera);
  }

  async exportImage() {
    // Compose the render and enabled dimension labels at the same resolution.
    const activeScene = this.mode === 'equipment' ? this.equipmentScene : this.scene;
    this.renderer.render(activeScene, this.camera);
    const source = this.renderer.domElement;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const ratio = this.renderer.getPixelRatio();
    const bounds = this.container.getBoundingClientRect();
    this.labelRenderer.render(activeScene, this.camera);
    for (const element of this.labelRenderer.domElement.querySelectorAll('.scene-label')) {
      if (!element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const rect = element.getBoundingClientRect();
      if (rect.right < bounds.left || rect.left > bounds.right || rect.top > bounds.bottom || rect.bottom < bounds.top) continue;
      const x = (rect.x - bounds.x) * ratio;
      const y = (rect.y - bounds.y) * ratio;
      const style = getComputedStyle(element);
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(x, y, rect.width * ratio, rect.height * ratio, 5 * ratio);
      ctx.fill();
      ctx.fillStyle = style.color;
      ctx.font = `${style.fontWeight} ${parseFloat(style.fontSize) * ratio}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(element.textContent, x + rect.width * ratio / 2, y + rect.height * ratio / 2);
    }
    ctx.fillStyle = '#385b4d';
    ctx.font = `600 ${18 * ratio}px sans-serif`;
    ctx.textAlign = 'left';
    const product = this.mode === 'equipment';
    ctx.fillText(product ? `方寸 / ${this.productSpec.name}` : '方寸 / 玻璃办公室', 30 * ratio, 38 * ratio);
    ctx.font = `${11 * ratio}px sans-serif`;
    const d = this.productSpec.dimensions;
    const sizeCaption = this.productSpec.id === chairSpec.id
      ? (this.productOpened ? '135° 后仰 · 脚托展开' : `${d.length} × ${d.depth} × ${d.overallHeight} mm · 座高 ${d.seatHeight} mm`)
      : `${d.length} × ${d.depth} × ${d.overallHeight} mm · 台面高 ${d.worktopHeight} mm`;
    ctx.fillText(product ? sizeCaption : '800 × 800 × 300 cm  ·  64 m²', 30 * ratio, 61 * ratio);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image export failed');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product ? this.productSpec.name : '玻璃办公室'}-${this.view}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.timer.dispose();
    this.controls.dispose();
    this.transform.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.onEquipmentPointerDown, true);
    this.renderer.domElement.removeEventListener('pointermove', this.onEquipmentPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.onEquipmentPointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.onEquipmentPointerUp);
    this.renderer.domElement.removeEventListener('lostpointercapture', this.onEquipmentPointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.onSceneWheel, true);
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const collect = object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.customDepthMaterial) materials.add(object.customDepthMaterial);
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    };
    this.scene.traverse(collect);
    this.equipmentScene.traverse(collect);
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
    this.environment.dispose();
    this.renderer.dispose();
    this.container.replaceChildren();
  }
}
