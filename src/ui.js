export const T = (scene, x, y, value, size = 14, color = '#c8d4d0', weight = 'normal') =>
  scene.add.text(x, y, value, {
    fontFamily: 'Arial Narrow, Arial, Helvetica, sans-serif',
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
    letterSpacing: size <= 12 ? 0.55 : 0.2,
    lineSpacing: 3,
    stroke: '#050909',
    strokeThickness: 0.15
  });

export function panel(scene, x, y, w, h, accent = 0x435a56) {
  const g = scene.add.graphics();
  g.fillStyle(0x050909, 0.98).fillRoundedRect(x, y, w, h, 5);
  g.fillStyle(0x111a18, 0.92).fillRoundedRect(x + 1, y + 1, w - 2, Math.min(23, h - 2), 4);
  g.fillStyle(0x0a100f, 0.5).fillRect(x + 1, y + 23, w - 2, Math.max(0, h - 24));
  g.lineStyle(1, accent, 0.88).strokeRoundedRect(x, y, w, h, 5);
  g.fillStyle(accent, 0.92).fillRect(x + 10, y + 8, 2, 10);
  g.fillStyle(0x9aada5, 0.25).fillRect(x + 17, y + 8, Math.min(52, w - 30), 1);
  return g;
}

export function btn(scene, x, y, w, h, label, fn, style = 'normal') {
  const palette = style === 'danger'
    ? { fill: 0x211312, line: 0x8b4942, text: '#f0c5bf', hover: 0x3a201d, edge: 0xc45b50 }
    : style === 'accent'
      ? { fill: 0x14231f, line: 0x58796d, text: '#d5e7df', hover: 0x223b32, edge: 0x83a797 }
      : { fill: 0x101816, line: 0x3b514a, text: '#c7d5cf', hover: 0x1d2b27, edge: 0x6f8a7e };
  const shadow = scene.add.rectangle(x, y + 2, w, h, 0x000000, 0.48).setOrigin(0);
  const r = scene.add.rectangle(x, y, w, h, palette.fill, 1)
    .setOrigin(0).setStrokeStyle(1, palette.line, 1)
    .setInteractive({ useHandCursor: true });
  const edge = scene.add.rectangle(x + 7, y + 6, 2, h - 12, palette.edge, 0.75).setOrigin(0);
  const t = scene.add.text(x + w / 2 + 2, y + h / 2, label, {
    fontFamily: 'Arial Narrow, Arial, Helvetica, sans-serif', fontSize: '11px',
    fontStyle: 'bold', color: palette.text, letterSpacing: 0.7
  }).setOrigin(0.5);
  const show = (value) => {
    [shadow, r, edge, t].forEach((item) => item.setVisible(value));
    if (r.input) r.input.enabled = value;
  };
  r.on('pointerdown', () => { if (r.visible && r.input?.enabled !== false) fn(); });
  r.on('pointerover', () => { r.setFillStyle(palette.hover, 1); r.setStrokeStyle(1, palette.edge, 1); });
  r.on('pointerout', () => { r.setFillStyle(palette.fill, 1); r.setStrokeStyle(1, palette.line, 1); });
  return {
    r, t,
    show,
    dim(value) {
      const alpha = value ? 0.42 : 1;
      [r, edge, t].forEach((item) => item.setAlpha(alpha));
    },
    label(value) { t.setText(value); }
  };
}
