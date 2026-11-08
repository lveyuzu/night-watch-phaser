// THE PATIENT only advances when the player makes a mistake or misses a dangerous anomaly.
// Stage 0..3 are visible on their corresponding camera. Stage 4 reaches the office.
export default class EntityAI {
  constructor() {
    this.stage = 0;
    this.ev = [];
    this.aggro = 0;
  }

  mistake() {
    if (this.stage >= 4) return;
    this.stage += 1;
    this.ev.push(this.stage >= 4 ? 'arrived' : 'moved');
  }

  update() {
    // Deliberately no autonomous movement: only mistakes move it closer.
  }
}
