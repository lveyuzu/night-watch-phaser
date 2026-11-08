export default class PowerManager {
  constructor() { this.p = 100; }
  update(dt, drain = 0) { this.p = Math.max(0, this.p - drain * dt); }
  spend(amount) { this.p = Math.max(0, this.p - amount); }
  gain(amount) { this.p = Math.min(100, this.p + amount); }
  get out() { return this.p <= 0; }
}
