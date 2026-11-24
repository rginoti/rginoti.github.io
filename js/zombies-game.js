/**
 * ACTIVISION ERA GAME SWAP — HIGH-CRAFT 3D FIRST-PERSON ZOMBIES ARENA (Three.js)
 */

import * as THREE from 'three';

export class ZombiesGame {
  constructor(canvas, stageEl) {
    this.canvas = canvas;
    this.stageEl = stageEl;
    this.overlayEl = document.getElementById('zombies-overlay');
    this.hitmarkerEl = document.getElementById('fps-hitmarker');
    this.feedEl = document.getElementById('fps-feed');

    this.isPlaying = false;
    this.isVisible = false;
    this.isFiring = false;
    this.fireCooldown = 0;

    this.yaw = 0;
    this.pitch = 0;
    this.recoil = 0;
    this.shake = 0;
    this.kills = 0;
    this.wave = 1;
    this.time = 0;

    this.zombies = [];
    this.grenades = [];
    this.blasts = [];
    this.casings = [];
    this.particles = [];
    this.spawnTimer = 0;

    this.audioOn = false;
    this.audioCtx = null;
    this.raycaster = new THREE.Raycaster();

    this._initScene();
    this._buildKillhouseArena();
    this._buildTacticalRifle();
    this._bindControls();
    this._observeVisibility();

    this.clock = new THREE.Clock();
    this._animate();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090a0e);
    this.scene.fog = new THREE.FogExp2(0x090a0e, 0.026);

    const w = this.stageEl.clientWidth || 800;
    const h = this.stageEl.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.08, 120);
    this.camera.position.set(0, 1.72, 0);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene.add(new THREE.HemisphereLight(0x475569, 0x111318, 0.9));
    this.sodiumLight = new THREE.PointLight(0xf59e0b, 3.2, 48);
    this.sodiumLight.position.set(0, 11, -12);
    this.scene.add(this.sodiumLight);

    const redStrobe = new THREE.PointLight(0xef4444, 1.8, 36);
    redStrobe.position.set(-14, 7, -20);
    this.scene.add(redStrobe);

    this.muzzleLight = new THREE.PointLight(0xfde68a, 0, 18);
    this.muzzleLight.position.set(0.28, -0.1, -1.25);
    this.camera.add(this.muzzleLight);

    window.addEventListener('resize', () => {
      const nw = this.stageEl.clientWidth;
      const nh = this.stageEl.clientHeight;
      if (!nw || !nh) return;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });
  }

  _buildKillhouseArena() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.92, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(84, 28, 0x2a2e38, 0x1e212a);
    grid.position.y = 0.02;
    this.scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, roughness: 0.88 });
    const containerRed = new THREE.MeshStandardMaterial({ color: 0x5c241d, roughness: 0.72 });
    const containerSlate = new THREE.MeshStandardMaterial({ color: 0x26313e, roughness: 0.72 });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x544a3a, roughness: 0.95 });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(72, 12, 1.5), wallMat);
    backWall.position.set(0, 6, -34);
    this.scene.add(backWall);

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 3.2), containerRed);
    c1.position.set(-12, 1.8, -18);
    c1.rotation.y = 0.3;
    this.scene.add(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 3.2), containerSlate);
    c2.position.set(13, 1.8, -21);
    c2.rotation.y = -0.35;
    this.scene.add(c2);

    for (let x = -4.2; x <= 4.2; x += 1.4) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 0.75), sandbagMat);
      bag.position.set(x, 0.38, -4.8);
      this.scene.add(bag);
    }

    for (const px of [-18, 18]) {
      for (const pz of [-8, -24]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, 12, 1.1), wallMat);
        col.position.set(px, 6, pz);
        this.scene.add(col);
      }
    }
  }

  _buildTacticalRifle() {
    this.weapon = new THREE.Group();
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 0.35, metalness: 0.78 });
    const polymer = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.65, metalness: 0.25 });
    const opticGlass = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.56), gunMetal);
    this.weapon.add(receiver);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.42), polymer);
    handguard.position.set(0, 0.01, -0.44);
    this.weapon.add(handguard);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.36, 10), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.78);
    this.weapon.add(barrel);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.24, 0.12), polymer);
    mag.position.set(0, -0.16, -0.08);
    mag.rotation.x = 0.18;
    this.weapon.add(mag);

    const opticFrame = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.12), gunMetal);
    opticFrame.position.set(0, 0.11, 0.02);
    this.weapon.add(opticFrame);

    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.05), opticGlass);
    lens.position.set(0, 0.11, 0.082);
    this.weapon.add(lens);

    const redDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2d20 }));
    redDot.position.set(0, 0.11, 0.083);
    this.weapon.add(redDot);

    this.muzzleFlash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0 })
    );
    this.muzzleFlash.position.set(0, 0.02, -1.02);
    this.weapon.add(this.muzzleFlash);

    this.weapon.position.set(0.30, -0.27, -0.52);
    this.camera.add(this.weapon);
  }

  _spawnZombie() {
    const zGroup = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4b5d4e, roughness: 0.85 });
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x2b2927, roughness: 0.92 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.34), coatMat);
    torso.position.y = 1.18;
    torso.userData = { part: 'body', zombie: zGroup };
    zGroup.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.40, 0.38), skinMat);
    head.position.y = 1.88;
    head.userData = { part: 'head', zombie: zGroup };
    zGroup.add(head);

    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      eye.position.set(ex, 1.92, 0.2);
      zGroup.add(eye);
    }

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.72), skinMat);
    armL.position.set(-0.42, 1.42, 0.32);
    zGroup.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.42;
    zGroup.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.74, 0.24), coatMat);
    legL.position.set(-0.17, 0.37, 0);
    zGroup.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.17;
    zGroup.add(legR);

    const angle = (Math.random() - 0.5) * 1.45;
    const dist = 24 + Math.random() * 11;
    zGroup.position.set(Math.sin(angle) * dist, 0, -Math.cos(angle) * dist);
    zGroup.userData = {
      hp: 60 + this.wave * 15,
      speed: 2.3 + Math.min(3.5, this.wave * 0.28) + Math.random() * 0.8,
      phase: Math.random() * 6,
      legL, legR, armL, armR,
      dying: false,
      deathAge: 0,
    };

    this.scene.add(zGroup);
    this.zombies.push(zGroup);
  }

  _playSfx(type) {
    if (!this.audioOn) return;
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AC();
    }
    const ctx = this.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    if (type === 'shot') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.075);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.085);
    } else if (type === 'hit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1450, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'boom') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.42);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.46);
    }
  }

  _fireRifle() {
    this.recoil = 0.075;
    this.muzzleLight.intensity = 5.5;
    this.muzzleFlash.material.opacity = 0.95;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
    this._playSfx('shot');

    const casing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.045, 6),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
    );
    const origin = new THREE.Vector3(0.36, -0.22, -0.45).applyMatrix4(this.camera.matrixWorld);
    casing.position.copy(origin);
    const right = new THREE.Vector3(1, 0.65, 0.1).applyQuaternion(this.camera.quaternion).multiplyScalar(2.6);
    this.scene.add(casing);
    this.casings.push({ mesh: casing, vel: right, life: 0.7 });

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const targets = [];
    this.zombies.forEach((z) => {
      if (!z.userData.dying) z.children.forEach((c) => { if (c.userData.part) targets.push(c); });
    });

    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      const hit = hits[0];
      const isHead = hit.object.userData.part === 'head';
      const zombie = hit.object.userData.zombie;
      zombie.userData.hp -= isHead ? 95 : 38;
      zombie.position.z -= 0.35;
      this._triggerHitmarker();
      this._playSfx('hit');
      this._spawnHitSparks(hit.point, isHead ? 0xff4d00 : 0xef4444);

      if (zombie.userData.hp <= 0) {
        this._killZombie(zombie, isHead ? 'HEADSHOT +150' : 'ELIMINATED +100');
      }
    }
  }

  _throwGrenade() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.6, metalness: 0.3 })
    );
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2d20 }));
    led.position.y = 0.14;
    g.add(body, led);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    g.position.copy(this.camera.position).addScaledVector(dir, 0.8);
    const vel = dir.multiplyScalar(18).add(new THREE.Vector3(0, 5.8, 0));
    this.scene.add(g);
    this.grenades.push({ mesh: g, vel, fuse: 1.45 });
  }

  _detonateGrenade(pos) {
    this._playSfx('boom');
    this.shake = 0.36;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.92 })
    );
    sphere.position.copy(pos);
    this.scene.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.3, 24),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.15, pos.z);
    this.scene.add(ring);
    this.blasts.push({ sphere, ring, age: 0, maxAge: 0.72 });

    let multi = 0;
    this.zombies.forEach((z) => {
      if (!z.userData.dying && z.position.distanceTo(pos) < 8.5) {
        this._killZombie(z, 'FRAG BLAST +125');
        multi++;
      }
    });
    if (multi >= 2) this._pushFeed(`MULTI-KILL ×${multi}`);
  }

  _killZombie(z, label) {
    if (z.userData.dying) return;
    z.userData.dying = true;
    this.kills += 1;
    this.wave = 1 + Math.floor(this.kills / 10);
    const elK = document.getElementById('z-kills');
    const elW = document.getElementById('z-wave');
    if (elK) elK.textContent = String(this.kills).padStart(3, '0');
    if (elW) elW.textContent = String(this.wave).padStart(2, '0');
    this._pushFeed(label);
  }

  _triggerHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.classList.add('is-hit');
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => this.hitmarkerEl.classList.remove('is-hit'), 110);
  }

  _pushFeed(text) {
    if (!this.feedEl) return;
    const item = document.createElement('div');
    item.textContent = text;
    this.feedEl.prepend(item);
    while (this.feedEl.children.length > 4) this.feedEl.lastChild.remove();
    setTimeout(() => item.remove(), 1800);
  }

  _spawnHitSparks(point, colorHex) {
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: colorHex }));
      p.position.copy(point);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
      this.scene.add(p);
      this.particles.push({ mesh: p, vel, life: 0.35 });
    }
  }

  _bindControls() {
    const startBtn = document.getElementById('btn-play-zombies');
    const enterArena = () => {
      this.isPlaying = true;
      if (this.overlayEl) this.overlayEl.classList.add('is-hidden');
      if (this.canvas.requestPointerLock) {
        try { this.canvas.requestPointerLock(); } catch (_) {}
      }
    };
    startBtn?.addEventListener('click', enterArena);

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (!locked && this.isPlaying && !('ontouchstart' in window)) {
        this.isPlaying = false;
        this.isFiring = false;
        if (this.overlayEl) this.overlayEl.classList.remove('is-hidden');
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPlaying) return;
      if (document.pointerLockElement === this.canvas) {
        this.yaw -= e.movementX * 0.0022;
        this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.002, -0.55, 0.55);
      }
    });

    let lastTouch = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isPlaying) return;
      if (e.pointerType === 'touch') lastTouch = { x: e.clientX, y: e.clientY };
      else if (e.button === 0) this.isFiring = true;
      else if (e.button === 2) this._throwGrenade();
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isPlaying || e.pointerType !== 'touch' || !lastTouch) return;
      this.yaw -= (e.clientX - lastTouch.x) * 0.005;
      this.pitch = THREE.MathUtils.clamp(this.pitch - (e.clientY - lastTouch.y) * 0.004, -0.5, 0.5);
      lastTouch = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', () => { this.isFiring = false; lastTouch = null; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (!this.isPlaying) return;
      if (e.code === 'KeyG') this._throwGrenade();
    });

    const fireBtn = document.getElementById('z-btn-fire');
    if (fireBtn) {
      fireBtn.addEventListener('pointerdown', () => { if (!this.isPlaying) enterArena(); this.isFiring = true; });
      fireBtn.addEventListener('pointerup', () => (this.isFiring = false));
      fireBtn.addEventListener('pointerleave', () => (this.isFiring = false));
    }
    document.getElementById('z-btn-grenade')?.addEventListener('click', () => {
      if (!this.isPlaying) enterArena();
      this._throwGrenade();
    });
    document.getElementById('z-audio-toggle')?.addEventListener('click', (e) => {
      this.audioOn = !this.audioOn;
      e.currentTarget.setAttribute('aria-pressed', String(this.audioOn));
      e.currentTarget.textContent = this.audioOn ? 'SFX: ON' : 'SFX: OFF';
    });
  }

  _observeVisibility() {
    const io = new IntersectionObserver((entries) => { this.isVisible = entries[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(this.stageEl);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (!this.isVisible) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    this.sodiumLight.intensity = 2.9 + Math.sin(this.time * 19) * 0.18 + (Math.random() > 0.96 ? -0.9 : 0);

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.isPlaying && this.isFiring && this.fireCooldown <= 0) {
      this._fireRifle();
      this.fireCooldown = 0.095;
    }

    this.recoil = THREE.MathUtils.lerp(this.recoil, 0, dt * 14);
    this.shake = THREE.MathUtils.lerp(this.shake, 0, dt * 8);
    this.muzzleLight.intensity = THREE.MathUtils.lerp(this.muzzleLight.intensity, 0, dt * 26);
    this.muzzleFlash.material.opacity = THREE.MathUtils.lerp(this.muzzleFlash.material.opacity, 0, dt * 28);

    this.weapon.position.z = -0.52 + this.recoil;
    this.weapon.position.y = -0.27 + Math.sin(this.time * 2.2) * 0.006;
    this.weapon.rotation.x = this.recoil * 1.6;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + (Math.random() - 0.5) * this.shake * 0.15;
    this.camera.rotation.x = this.pitch + this.recoil * 0.25 + (Math.random() - 0.5) * this.shake * 0.15;

    this.spawnTimer += dt;
    const maxZombies = Math.min(18, 6 + this.wave * 2);
    if (this.spawnTimer > Math.max(0.65, 1.8 - this.wave * 0.12) && this.zombies.length < maxZombies) {
      this.spawnTimer = 0;
      this._spawnZombie();
    }

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.userData.dying) {
        z.userData.deathAge += dt;
        z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, -Math.PI / 2, dt * 8);
        z.position.y = Math.max(-0.5, z.position.y - dt * 0.8);
        if (z.userData.deathAge > 0.75) { this.scene.remove(z); this.zombies.splice(i, 1); }
        continue;
      }
      const toPlayer = new THREE.Vector3(0, 0, 0).sub(z.position);
      if (toPlayer.length() > 3.2) {
        toPlayer.normalize();
        z.position.addScaledVector(toPlayer, z.userData.speed * dt);
        z.lookAt(0, 0, 0);
        const s = Math.sin(this.time * 6 + z.userData.phase);
        z.userData.legL.rotation.x = s * 0.55;
        z.userData.legR.rotation.x = -s * 0.55;
        z.userData.armL.rotation.x = -0.15 + s * 0.12;
        z.userData.armR.rotation.x = -0.15 - s * 0.12;
      } else {
        z.position.set((Math.random() - 0.5) * 32, 0, -28);
      }
    }

    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.vel.y -= 18 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += 8 * dt;
      if (g.mesh.position.y < 0.16) {
        g.mesh.position.y = 0.16;
        g.vel.y *= -0.45;
        g.vel.x *= 0.72;
        g.vel.z *= 0.72;
      }
      g.fuse -= dt;
      if (g.fuse <= 0) {
        this._detonateGrenade(g.mesh.position.clone());
        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }

    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      b.age += dt;
      const p = b.age / b.maxAge;
      b.sphere.scale.setScalar(1 + p * 6.5);
      b.sphere.material.opacity = Math.max(0, 1 - p);
      b.ring.scale.setScalar(1 + p * 11);
      b.ring.material.opacity = Math.max(0, 1 - p * 1.15);
      if (b.age >= b.maxAge) { this.scene.remove(b.sphere, b.ring); this.blasts.splice(i, 1); }
    }
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.vel.y -= 12 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.z += 15 * dt;
      c.life -= dt;
      if (c.life <= 0) { this.scene.remove(c.mesh); this.casings.splice(i, 1); }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vel.y -= 10 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
