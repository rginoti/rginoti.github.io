/**
 * FIRST-PERSON ZOMBIES ARENA (Three.js) — ACTIVISION ERA GAME SWAP
 * Features:
 *  - Unlimited Rifle Ammo + Recoil + Muzzle Flash + Raycast Hitmarkers
 *  - Unlimited Parabolic Frag Grenades (G / Right-Click / Mobile Button) with AoE Blast & Screen Shake
 *  - Endless Advancing Zombie Waves
 */

import * as THREE from 'three';

export class ZombiesGame {
  constructor(canvas, moduleEl) {
    this.canvas = canvas;
    this.moduleEl = moduleEl;
    this.isPlaying = false;
    this.isVisible = false;

    this.yaw = 0;
    this.pitch = 0;
    this.recoil = 0;
    this.shake = 0;
    this.kills = 0;
    this.wave = 1;

    this.zombies = [];
    this.grenades = [];
    this.blasts = [];
    this.spawnTimer = 0;

    this.raycaster = new THREE.Raycaster();
    this._initScene();
    this._buildArena();
    this._buildWeapon();
    this._bindControls();
    this._observeVisibility();

    this.clock = new THREE.Clock();
    this._animate();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080b);
    this.scene.fog = new THREE.FogExp2(0x07080b, 0.032);

    const w = this.canvas.parentElement.clientWidth || 800;
    const h = this.canvas.parentElement.clientHeight || 480;
    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 140);
    this.camera.position.set(0, 1.7, 0);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);

    const amb = new THREE.AmbientLight(0x334155, 0.9);
    this.scene.add(amb);

    const spot = new THREE.DirectionalLight(0xf59e0b, 1.1);
    spot.position.set(12, 24, 10);
    this.scene.add(spot);

    this.muzzleLight = new THREE.PointLight(0xfde68a, 0, 14);
    this.muzzleLight.position.set(0.3, -0.1, -1.2);
    this.camera.add(this.muzzleLight);

    window.addEventListener('resize', () => {
      const nw = this.canvas.parentElement.clientWidth;
      const nh = this.canvas.parentElement.clientHeight;
      if (!nw || !nh) return;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });
  }

  _buildArena() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x0f131a, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(100, 32, 0x334155, 0x161c26);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Concrete tactical barriers
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    [
      [-7, 0.7, -12, 4, 1.4, 1],
      [8, 0.7, -15, 4.5, 1.4, 1],
      [0, 0.7, -22, 5, 1.4, 1],
      [-14, 1.8, -24, 3, 3.6, 3],
      [15, 1.8, -20, 3, 3.6, 3],
    ].forEach(([x, y, z, w, h, d]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), barrierMat);
      b.position.set(x, y, z);
      this.scene.add(b);
    });
  }

  _buildWeapon() {
    const gun = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x090d14, metalness: 0.6, roughness: 0.5 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.62), metal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.52);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), dark);
    optic.position.set(0, 0.11, -0.05);

    const opticGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.035, 0.035),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    opticGlow.position.set(0, 0.11, 0.035);

    gun.add(receiver, barrel, optic, opticGlow);
    gun.position.set(0.32, -0.28, -0.58);
    this.weapon = gun;
    this.camera.add(gun);
  }

  _spawnZombie() {
    const zGroup = new THREE.Group();
    const angle = (Math.random() - 0.5) * 1.85; // In front 110-degree arc
    const dist = 26 + Math.random() * 16;
    zGroup.position.set(Math.sin(angle) * dist, 0, -Math.cos(angle) * dist);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f4e43, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x56695b, roughness: 0.85 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.42), bodyMat);
    torso.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), headMat);
    head.position.y = 1.98;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.05), eyeMat);
    eyeL.position.set(-0.1, 2.02, 0.24);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.85), bodyMat);
    armL.position.set(-0.48, 1.45, 0.35);
    const armR = armL.clone();
    armR.position.x = 0.48;

    zGroup.add(torso, head, eyeL, eyeR, armL, armR);
    zGroup.userData = {
      hp: 2 + Math.floor(this.wave / 3),
      speed: 2.3 + Math.min(3.5, this.wave * 0.28) + Math.random() * 0.8,
      wobble: Math.random() * 10,
    };

    this.scene.add(zGroup);
    this.zombies.push(zGroup);
  }

  _bindControls() {
    const btnPlay = document.getElementById('btn-play-zombies');
    const btnExit = document.getElementById('btn-z-exit');
    const btnFire = document.getElementById('btn-z-fire');
    const btnNade = document.getElementById('btn-z-nade');

    if (btnPlay) btnPlay.addEventListener('click', () => this.start());
    if (btnExit) btnExit.addEventListener('click', () => this.stop());
    if (btnFire) btnFire.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.fireWeapon(); });
    if (btnNade) btnNade.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.throwGrenade(); });

    // Pointer Lock & Touch/Mouse Drag Aiming
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isPlaying) return;
      if (e.button === 2) {
        this.throwGrenade();
        return;
      }
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      if (e.pointerType === 'mouse') {
        this.fireWeapon();
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPlaying) return;
      if (document.pointerLockElement === this.canvas) {
        this.yaw -= e.movementX * 0.0024;
        this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0024, -0.55, 0.55);
      } else if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        this.yaw -= dx * 0.0045;
        this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0045, -0.55, 0.55);
      }
    });

    window.addEventListener('pointerup', () => { dragging = false; });
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.isPlaying) e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isPlaying) return;
      if (e.code === 'KeyG') this.throwGrenade();
      if (e.code === 'Escape') this.stop();
    });
  }

  _observeVisibility() {
    const obs = new IntersectionObserver(
      (entries) => {
        this.isVisible = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0.05 }
    );
    obs.observe(this.moduleEl);
  }

  start() {
    this.isPlaying = true;
    this.moduleEl.classList.add('is-playing');
    if (this.canvas.requestPointerLock && window.matchMedia('(pointer: fine)').matches) {
      this.canvas.requestPointerLock();
    }
    if (this.zombies.length < 4) {
      for (let i = 0; i < 5; i++) this._spawnZombie();
    }
  }

  stop() {
    this.isPlaying = false;
    this.moduleEl.classList.remove('is-playing');
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  fireWeapon() {
    if (!this.isPlaying) return;
    this.recoil = 0.14;
    this.muzzleLight.intensity = 7;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.zombies, true);
    if (hits.length > 0) {
      let root = hits[0].object;
      while (root.parent && root.parent !== this.scene) root = root.parent;
      this._damageZombie(root, 1);
      this._flashHitmarker();
    }
  }

  throwGrenade() {
    if (!this.isPlaying) return;
    const nade = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x4d7c0f, emissive: 0xf59e0b, emissiveIntensity: 0.5 })
    );
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    nade.position.copy(this.camera.position).addScaledVector(dir, 1.1);
    const vel = dir.multiplyScalar(17);
    vel.y += 5.5;

    this.scene.add(nade);
    this.grenades.push({ mesh: nade, vel, fuse: 1.35 });
  }

  _detonateGrenade(pos) {
    this.shake = 0.35;
    const ring = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 })
    );
    ring.position.copy(pos);
    this.scene.add(ring);
    this.blasts.push({ mesh: ring, life: 0.42 });

    let hitAny = false;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      if (this.zombies[i].position.distanceTo(pos) < 8.5) {
        this._damageZombie(this.zombies[i], 99);
        hitAny = true;
      }
    }
    if (hitAny) this._flashHitmarker();
  }

  _damageZombie(zGroup, dmg) {
    if (!zGroup.userData) return;
    zGroup.userData.hp -= dmg;
    if (zGroup.userData.hp <= 0) {
      this.scene.remove(zGroup);
      const idx = this.zombies.indexOf(zGroup);
      if (idx !== -1) this.zombies.splice(idx, 1);
      this.kills++;
      this.wave = 1 + Math.floor(this.kills / 8);
      const kEl = document.getElementById('z-kills');
      const wEl = document.getElementById('z-wave');
      if (kEl) kEl.textContent = String(this.kills).padStart(2, '0');
      if (wEl) wEl.textContent = String(this.wave).padStart(2, '0');
    }
  }

  _flashHitmarker() {
    const hm = document.getElementById('z-hitmarker');
    if (!hm) return;
    hm.classList.add('is-hit');
    clearTimeout(this._hmTimer);
    this._hmTimer = setTimeout(() => hm.classList.remove('is-hit'), 110);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (!this.isVisible) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // Camera Aim + Screen Shake
    this.camera.rotation.order = 'YXZ';
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    this.camera.rotation.y = this.yaw + sx;
    this.camera.rotation.x = this.pitch + this.recoil * 0.4 + sy;

    this.recoil = Math.max(0, this.recoil - dt * 1.4);
    this.shake = Math.max(0, this.shake - dt * 1.2);
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 55);

    // Weapon Recoil & Idle Sway
    this.weapon.position.z = -0.58 + this.recoil;
    this.weapon.position.y = -0.28 + Math.sin(t * 2.5) * 0.008;

    if (this.isPlaying) {
      this.spawnTimer += dt;
      if (this.spawnTimer > Math.max(0.7, 2.0 - this.wave * 0.12) && this.zombies.length < 18) {
        this.spawnTimer = 0;
        this._spawnZombie();
      }

      // Advance Zombies
      for (const z of this.zombies) {
        const toPlayer = new THREE.Vector3(-z.position.x, 0, -z.position.z);
        const dist = toPlayer.length();
        z.lookAt(0, 0, 0);
        if (dist > 2.4) {
          toPlayer.normalize();
          z.position.addScaledVector(toPlayer, z.userData.speed * dt);
          z.rotation.z = Math.sin(t * 7 + z.userData.wobble) * 0.08;
        } else {
          // Reset close zombie back to perimeter so endless defense stays snappy
          const a = (Math.random() - 0.5) * 1.8;
          z.position.set(Math.sin(a) * 32, 0, -Math.cos(a) * 32);
          this.shake = 0.2;
        }
      }

      // Parabolic Grenades
      for (let i = this.grenades.length - 1; i >= 0; i--) {
        const g = this.grenades[i];
        g.vel.y -= 18 * dt;
        g.mesh.position.addScaledVector(g.vel, dt);
        if (g.mesh.position.y < 0.2) {
          g.mesh.position.y = 0.2;
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

      // Blast Spheres
      for (let i = this.blasts.length - 1; i >= 0; i--) {
        const b = this.blasts[i];
        b.life -= dt;
        b.mesh.scale.setScalar(1 + (0.42 - b.life) * 20);
        b.mesh.material.opacity = Math.max(0, b.life * 2);
        if (b.life <= 0) {
          this.scene.remove(b.mesh);
          this.blasts.splice(i, 1);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
