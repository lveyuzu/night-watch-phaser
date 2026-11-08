// Each camera can hold one live anomaly. Dangerous anomalies must be reported;
// ordinary environmental changes should be confirmed as normal.
export const TYPES = [
  { id: 'bed', cam: 0, d: 1, n: 'A patient is sitting up in the empty bed' },
  { id: 'wheel', cam: 0, d: 1, n: 'The equipment bench has shifted from its marked position' },
  { id: 'flicker', cam: 0, d: 1, n: 'The ward light is flickering' },
  { id: 'box', cam: 0, d: 0, n: 'A wall-mounted control box has appeared beside the bed' },
  { id: 'biohazard', cam: 0, d: 1, n: 'A biohazard placard has appeared on the wall' },
  { id: 'figure', cam: 1, d: 1, n: 'A figure is standing at the corridor end' },
  { id: 'door', cam: 1, d: 1, n: 'The fire door is open' },
  { id: 'brokenDoor', cam: 1, d: 1, n: 'The fire door is damaged' },
  { id: 'pipe', cam: 1, d: 0, n: 'A maintenance pipe is visible beside the corridor' },
  { id: 'doll', cam: 1, d: 1, n: 'Something is sitting on the floor' },
  { id: 'leak', cam: 1, d: 0, n: 'A leak has spread beneath the pipe' },
  { id: 'chair', cam: 2, d: 1, n: 'The storage rack has shifted into the walkway' },
  { id: 'sky', cam: 2, d: 1, n: 'The ceiling light is glowing red' },
  { id: 'flicker', cam: 2, d: 1, n: 'The corridor lights are flickering' },
  { id: 'paper', cam: 2, d: 0, n: 'A warning notice has fallen' },
  { id: 'slime', cam: 2, d: 1, n: 'An unfamiliar green spill has appeared' },
  { id: 'radiation', cam: 2, d: 1, n: 'A radiation warning sign has appeared' },
  { id: 'refl', cam: 3, d: 1, n: 'A person is reflected in the glass' },
  { id: 'crier', cam: 3, d: 1, n: 'Someone is crying in the washroom' },
  { id: 'twin', cam: 3, d: 1, n: 'A second figure is behind the stalls' },
  { id: 'moth', cam: 3, d: 0, n: 'A moth is near the ceiling light' },
  { id: 'quarantine', cam: 3, d: 0, n: 'A quarantine strip is lying on the floor' }
];

export default class AnomalyManager {
  constructor() {
    this.active = {};
    this.t = 2.5;
    this.fresh = null;
  }

  spawn(hr, stage) {
    const free = [0, 1, 2, 3].filter((cam) => !this.active[cam]);
    if (!free.length) return;
    const cam = free[Math.floor(Math.random() * free.length)];
    const dangerousChance = Math.min(0.78, 0.58 + hr * 0.035);
    const dangerous = Math.random() < dangerousChance;
    let pool = TYPES.filter((item) => item.cam === cam && item.d === (dangerous ? 1 : 0));
    if (stage >= 3) pool = pool.filter((item) => item.id !== 'twin');
    if (!pool.length) pool = TYPES.filter((item) => item.cam === cam);
    if (!pool.length) return;
    const anomaly = { ...pool[Math.floor(Math.random() * pool.length)], age: 0 };
    this.active[cam] = anomaly;
    this.fresh = anomaly;
  }

  update(dt, hr, stage) {
    const missed = [];
    for (const key of Object.keys(this.active)) {
      const anomaly = this.active[key];
      anomaly.age += dt;
      const lifetime = anomaly.d ? 15.5 : 17.5;
      if (anomaly.age >= lifetime) {
        if (anomaly.d) missed.push(anomaly);
        delete this.active[key];
      }
    }
    this.t -= dt;
    if (this.t <= 0) {
      this.spawn(hr, stage);
      this.t = 3.6 + Math.random() * 0.8;
    }
    return missed;
  }
}
