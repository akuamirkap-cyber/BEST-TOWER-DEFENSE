import * as THREE from 'three';

/**
 * Ragdoll for dead orcs: every part becomes its own rigid body.
 *  - pivot = the part's centre of mass (parts are re-wrapped in a holder so they tumble around their middle, not around the shoulder/hip)
 *  - launched AWAY from whatever hit them, inheriting the orc's walking momentum; torque comes from lever-arm × impulse, so heads and
 *    limbs spin the way they should
 *  - sphere vs. ground with restitution + friction, rolling coupling (spin follows sliding speed), settling to rest, mutual separation
 *    between the pieces of the same orc, fall off the edge of the island, then shrink away softly (no sudden popping)
 */
interface Body {
  holder: THREE.Group; v: THREE.Vector3; w: THREE.Vector3; r: number; gid: number;
  rest: number; life: number; light: boolean; grav: number; drag: number; hits: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const _q = new THREE.Quaternion(), _axis = new THREE.Vector3(), _d = new THREE.Vector3();

export class Ragdoll {
  bodies: Body[] = [];
  private gid = 0;
  constructor(private scene: THREE.Scene, private onImpact: (p: THREE.Vector3, speed: number) => void, private hx = 9.8, private hz = 6.8, private groundY = 0.05) {}

  /** Detach every part of a dead enemy into its own tumbling body. `away` = unit direction of the blow (XZ), `travel` = enemy momentum. */
  burst(root: THREE.Object3D, parts: THREE.Object3D[], center: THREE.Vector3, away: THREE.Vector3, power: number, travel: THREE.Vector3, azBase = 0) {
    root.updateMatrixWorld(true);
    const gid = ++this.gid;
    for (const part of parts) {
      const light = part.userData.light === true;
      const az = part.userData.az as number | undefined;
      const box = new THREE.Box3().setFromObject(part); const empty = box.isEmpty();
      const c = empty ? part.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
      const size = empty ? new THREE.Vector3(0.3, 0.3, 0.3) : box.getSize(new THREE.Vector3());
      const r = clamp(0.5 * ((size.x + size.y + size.z) / 3) * 0.9, 0.06, light ? 0.4 : 0.5);

      const holder = new THREE.Group(); holder.position.copy(c); this.scene.add(holder); holder.updateMatrixWorld(true);
      holder.attach(part); // keeps the world pose, but the pivot is now the part's centre

      const off = c.clone().sub(center);
      const radial = new THREE.Vector3(off.x, 0, off.z);
      if (radial.lengthSq() < 1e-4) radial.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      radial.normalize();
      const dir = away.clone();
      if (az !== undefined) dir.lerp(new THREE.Vector3(Math.sin(az + azBase), 0, Math.cos(az + azBase)), 0.7).normalize();

      const pw = power * (light ? 0.95 : 1) * (0.75 + Math.random() * 0.5);
      const v = dir.clone().multiplyScalar(pw).addScaledVector(radial, 0.8 + Math.random() * 1.1).add(travel);
      v.y = (light ? 3.0 : 3.3) + Math.random() * 2.6 + Math.max(0, off.y) * 1.3;

      // torque = lever arm × impulse direction (higher parts tumble more), plus a little noise
      const w = off.clone().cross(new THREE.Vector3(away.x, 0, away.z)).multiplyScalar((pw * 2.6) / (0.4 + off.lengthSq() * 0.6));
      w.x += (Math.random() - 0.5) * 7; w.y += (Math.random() - 0.5) * 7; w.z += (Math.random() - 0.5) * 7; w.clampLength(0, 15);

      this.bodies.push({ holder, v, w, r, gid, rest: 0, life: light ? 4.2 + Math.random() : 3.2 + Math.random() * 1.2, light, grav: light ? 4.2 : 12, drag: light ? 2.4 : 0.12, hits: 0 });
    }
    // too many pieces on screen: the oldest ones fade out gracefully instead of popping
    const extra = this.bodies.length - 120;
    for (let i = 0; i < extra; i++) this.bodies[i].life = Math.min(this.bodies[i].life, 0.5);
  }

  update(dt: number) {
    if (!this.bodies.length) return;
    const groups = new Map<number, Body[]>();
    for (let k = this.bodies.length - 1; k >= 0; k--) {
      const b = this.bodies[k]; const h = b.holder; const p = h.position;
      b.life -= dt;
      // integrate
      b.v.y -= b.grav * dt;
      const dr = Math.max(0, 1 - b.drag * dt); b.v.x *= dr; b.v.z *= dr; if (b.light) b.v.y *= dr;
      p.addScaledVector(b.v, dt);
      const wl = b.w.length();
      if (wl > 1e-3) { _axis.copy(b.w).multiplyScalar(1 / wl); _q.setFromAxisAngle(_axis, wl * dt); h.quaternion.premultiply(_q); }
      // ground (only above the island – pieces thrown off the edge keep falling into the void)
      const over = Math.abs(p.x) <= this.hx && Math.abs(p.z) <= this.hz;
      let contact = false;
      if (over && p.y - b.r < this.groundY) {
        contact = true; const impact = -b.v.y; p.y = this.groundY + b.r;
        if (b.v.y < 0) {
          if (impact > 2.4 && b.hits < 4) { b.hits++; this.onImpact(p, impact); }
          b.v.y = impact > 1.3 ? impact * (b.light ? 0.1 : 0.34) : 0; // restitution (resting contact kills the bounce)
        }
        const f = Math.pow(b.light ? 0.45 : 0.8, dt * 60); b.v.x *= f; b.v.z *= f; // friction
        const k2 = 1 - Math.pow(0.6, dt * 60); // rolling: spin follows the sliding speed
        b.w.x += (b.v.z / b.r - b.w.x) * k2; b.w.z += (-b.v.x / b.r - b.w.z) * k2; b.w.y *= Math.pow(0.88, dt * 60);
      } else b.w.multiplyScalar(Math.max(0, 1 - 0.12 * dt));
      // settle
      if (contact && b.v.lengthSq() < 0.12 && b.w.lengthSq() < 3) b.rest += dt; else b.rest = 0;
      if (b.rest > 0.2) { b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
      // soft fade (shrink) once at rest or at the end of life
      if (b.rest > 1.0 || b.life < 0.75) {
        const s = Math.max(0, h.scale.x - dt * 1.7); h.scale.setScalar(s);
        if (s < 0.06) { this.scene.remove(h); this.bodies.splice(k, 1); continue; }
      }
      if (b.life <= -0.6 || (!over && p.y < -8)) { this.scene.remove(h); this.bodies.splice(k, 1); continue; }
      let g = groups.get(b.gid); if (!g) { g = []; groups.set(b.gid, g); } g.push(b);
    }
    // pieces of the same orc push each other apart (and swap a bit of momentum) instead of ghosting through one another
    for (const arr of groups.values()) {
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], c = arr[j]; if (a.rest > 0.2 && c.rest > 0.2) continue;
        _d.subVectors(a.holder.position, c.holder.position); const dist = _d.length(); const min = (a.r + c.r) * 0.8;
        if (dist >= min || dist < 1e-4) continue;
        _d.multiplyScalar(1 / dist); const push = (min - dist) * 0.5;
        a.holder.position.addScaledVector(_d, push); c.holder.position.addScaledVector(_d, -push);
        const rv = (a.v.x - c.v.x) * _d.x + (a.v.y - c.v.y) * _d.y + (a.v.z - c.v.z) * _d.z;
        if (rv < 0) { const j2 = -rv * 0.45; a.v.addScaledVector(_d, j2); c.v.addScaledVector(_d, -j2); a.rest = 0; c.rest = 0; }
      }
    }
  }

  clear() { for (const b of this.bodies) this.scene.remove(b.holder); this.bodies = []; }
}
