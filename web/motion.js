// Closed-form damped harmonic oscillator. Values and velocities survive retargeting.
// SI time (seconds), mass = 1. No frame-count-dependent interpolation.
export function springStep(x, v, target, dt, stiffness = 360, damping = 34) {
  if (dt <= 0) return [x, v];
  const y = x - target, a = damping / 2, discriminant = stiffness - a * a;
  if (Math.abs(discriminant) < 1e-8) {
    const e = Math.exp(-a * dt), b = v + a * y;
    return [target + e * (y + b * dt), e * (v - a * b * dt)];
  }
  if (discriminant > 0) {
    const w = Math.sqrt(discriminant), e = Math.exp(-a * dt);
    const c = Math.cos(w * dt), s = Math.sin(w * dt), b = (v + a * y) / w;
    return [target + e * (y * c + b * s), e * (v * c - (a * b + w * y) * s)];
  }
  const w = Math.sqrt(-discriminant), r1 = -a + w, r2 = -a - w;
  const c1 = (v - r2 * y) / (r1 - r2), c2 = y - c1;
  const e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt);
  return [target + c1 * e1 + c2 * e2, r1 * c1 * e1 + r2 * c2 * e2];
}

export class Spring {
  constructor(value = 0, stiffness = 360, damping = 34) {
    this.x = value; this.v = 0; this.target = value;
    this.stiffness = stiffness; this.damping = damping;
  }
  to(value) { this.target = value; return this; }
  snap(value, velocity = 0) { this.x = value; this.target = value; this.v = velocity; return this; }
  step(dt) {
    [this.x, this.v] = springStep(this.x, this.v, this.target, dt, this.stiffness, this.damping);
    if (Math.abs(this.x - this.target) < .00008 && Math.abs(this.v) < .0008) {
      this.x = this.target; this.v = 0;
    }
    return this.x;
  }
  get moving() { return this.x !== this.target || this.v !== 0; }
}

export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, t) => { const p = clamp((t - a) / (b - a)); return p * p * (3 - 2 * p); };

// Authored event onsets from the source contact sheets; these are estimates at
// recording resolution, not claims about the source OS's hidden input events.
export const recordings = [
  {id: 1, name: '12:35 · 控制中心 / 通知', duration: 10.487,
   events: [[0,'home'],[.62,'control'],[1.90,'home'],[2.88,'control'],[3.56,'home'],[4.35,'notifications'],[5.14,'home'],[5.84,'notifications'],[6.57,'home'],[7.30,'control'],[8.35,'home'],[8.67,'control'],[9.07,'home']]},
  {id: 2, name: '12:37 · 卡片展开 / 负一屏', duration: 17.785,
   events: [[0,'home'],[.89,'control'],[3.30,'music'],[3.98,'control'],[6.13,'wifi'],[6.67,'control'],[7.87,'volume'],[8.37,'control'],[9.42,'brightness'],[9.92,'control'],[10.34,'control-scroll'],[10.87,'home'],[11.32,'assistant'],[11.90,'home'],[12.40,'assistant'],[13.41,'home'],[13.90,'assistant'],[14.39,'home']]},
  {id: 3, name: '12:47 · 应用开合 / 多任务', duration: 19.174,
   events: [[0,'home'],[.898,'control'],[1.498,'home'],[2.651,'control'],[3.193,'home'],[3.769,'assistant'],[4.226,'home'],[4.753,'assistant'],[5.162,'home'],[5.816,'app','notes'],[6.440,'home'],[7.343,'app','gallery'],[7.68,'home'],[7.867,'app','files'],[8.023,'home'],[8.875,'app','browser'],[10.164,'home'],[10.872,'app','browser'],[11.352,'home'],[12.616,'app','store'],[13.338,'home'],[13.924,'app','store'],[14.52,'home'],[15.382,'recents'],[16.39,'home'],[17.113,'recents'],[18.134,'home']]}
];
