import { deflateSync } from 'node:zlib';

// Minimal RGBA canvas bridge for GLTFExporter DataTextures. No native dependency.
// ImageData is copied as-is, matching CanvasRenderingContext2D.putImageData.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
function png(image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width); header.writeUInt32BE(image.height, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let y = 0; y < image.height; y++) rows.set(image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4), y * (image.width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
export function installGltfNodeBridge() {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
    readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
  };
  globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
  globalThis.OffscreenCanvas = class {
    constructor(width, height) { Object.assign(this, { width, height }); }
    getContext() { return { putImageData: image => { this.image = image; }, translate() {}, scale() {} }; }
    async convertToBlob() { if (!this.image) throw new Error('Only RGBA DataTextures are supported by the Node canvas bridge.'); return new Blob([png(this.image)], { type: 'image/png' }); }
  };
}
