export const X = 20;
export const Y = 54;
export const W = 610;
export const H = 344;
export const CAMERA_POINTS = [
  { x: 406, y: 252 },
  { x: 336, y: 206 },
  { x: 425, y: 218 },
  { x: 388, y: 230 }
];

export function drawCam(graphics, time, signalLoss = false) {
  graphics.clear();
  graphics.fillStyle(0x07100f, 0.10).fillRect(X, Y, W, H);
  for (let y = 0; y < H; y += 4) {
    graphics.fillStyle(0x030707, 0.18).fillRect(X, Y + y, W, 1);
  }
  graphics.fillStyle(0x000000, 0.22).fillRect(X, Y, W, 8);
  graphics.fillStyle(0x000000, 0.18).fillRect(X, Y + H - 8, W, 8);
  if (signalLoss) {
    for (let i = 0; i < 34; i++) {
      const yy = Y + ((i * 29 + Math.floor(time * 90)) % H);
      graphics.fillStyle(0xd5e3df, 0.12).fillRect(X + ((i * 47) % W), yy, 28 + (i % 5) * 10, 1);
    }
  }
}
