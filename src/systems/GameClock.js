// Single authoritative clock. Only advances when update() is called (pause = stop calling it).
export default class GameClock{
  constructor(len=720){this.t=0;this.len=len}
  update(dt){this.t+=dt}
  get hour(){return Math.min(6,Math.floor(this.t/(this.len/6)))}
  get done(){return this.t>=this.len}
  label(){const m=Math.min(360,Math.floor(this.t/this.len*360));const h=Math.floor(m/60);return `${h===0?12:h}:${String(m%60).padStart(2,'0')} AM`}
}
