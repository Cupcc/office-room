import { readFile, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createWorkbench } from '../src/equipment/workbench.js';
import { createOfficeDesk } from '../src/equipment/office-desk.js';
import { createOfficeChair } from '../src/equipment/office-chair.js';
import { installGltfNodeBridge } from './gltf-node.js';

// GLTFExporter uses FileReader in browsers; Node provides the underlying Blob API.
installGltfNodeBridge();
for (const [id, createModel] of [['esd-workbench-1500', createWorkbench], ['office-desk-1400', createOfficeDesk], ['office-chair-z1', createOfficeChair]]) {
  const directory = new URL(`../assets/equipment/${id}/`, import.meta.url);
  const spec = JSON.parse(await readFile(new URL('equipment.json', directory), 'utf8'));
  const model = createModel(spec);
  model.updateMatrixWorld(true);
  const data = await new GLTFExporter().parseAsync(model, { binary: true });
  await writeFile(new URL('model.glb', directory), Buffer.from(data));
  console.log(`Exported ${spec.id}: ${(data.byteLength / 1024 / 1024).toFixed(2)} MB, metres, +Y up, +Z front.`);
}
