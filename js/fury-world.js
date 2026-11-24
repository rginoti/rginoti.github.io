/**
 * 3D HERO WORLD & PLAYABLE FURY FLIGHT DECK (Three.js)
 * Features:
 *  - Monumental 3D illuminated "RONALD GINOTI" monoliths
 *  - Playable 3D Fury aircraft with Runway Takeoff, Banking Flight, and Landing physics
 *  - 3D Warzone Combat Compound with repetitive tracer fire & particle grenade explosions
 *  - 3D Water Polo Arena with animated water waves & lane markers
 */

import * as THREE from 'three';

export class FuryWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.isFlying = false;
    this.isVisible = true;
    this.autopilotTarget = 'name';
    this.autoLanding = false;

    this.keys = {};
    this.stick = { x: 0, y: 0 };

    // Fury Flight State
    this.flight = {
      pos: new THREE.Vector3(0, 1.35, 145),
      vel: new THREE.Vector3(0, 0, 0),
      yaw: Math.PI, // Facing -Z (down runway toward the 3D Name)
      pitch: 0,
      roll: 0,
      speed: 0,
      throttle: 0,
      grounded: true,
    };

    this.tracers = [];
    this.explosions = [];
    this.combatTimer = 0;

    this._initScene();
    this._buildTerrainAndRunway();
    this._buildMonumentalName();
    this._buildWarzoneCompound();
    this._buildWaterPoloArena();
    this._buildFuryAircraft();
    this._bindControls();
    this._observeVisibility();

    this.clock = new THREE.Clock();
    this._animate();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080d);
    this.scene.fog = new THREE.FogExp2(0x06080d, 0.0028);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.5, 1200);
    this.camera.position.set(0, 26, 175);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Lighting
    const hemi = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.75);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xe2e8f0, 1.4);
    dir.position.set(80, 140, 60);
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rim.position.set(-90, 45, -100);
    this.scene.add(rim);

    // Subtle Starfield
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 650; i++) {
      starVerts.push((Math.random() - 0.5) * 900, 70 + Math.random() * 260, (Math.random() - 0.5) * 900);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.1, transparent: true, opacity: 0.65 });
    this.scene.add(new THREE.Points(starGeo, starMat));

    window.addEventListener('resize', () => {
      const w = this.canvas.parentElement.clientWidth;
      const h = this.canvas.parentElement.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  _buildTerrainAndRunway() {
    // Tactical Grid Floor
    const grid = new THREE.GridHelper(640, 64, 0x1e293b, 0x0f172a);
    grid.position.y = 0.02;
    this.scene.add(grid);

    const groundGeo = new THREE.PlaneGeometry(700, 700);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.92, metalness: 0.15 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Tactical Runway Strip (Z from 165 down to 35)
    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.18, 130),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 })
    );
    runway.position.set(0, 0.09, 100);
    this.scene.add(runway);

    // Runway Centerline & Edge Lights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let z = 40; z <= 160; z += 12) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 4.5), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
      dash.position.set(0, 0.12, z);
      this.scene.add(dash);

      const leftL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), z > 140 ? amberMat : lightMat);
      leftL.position.set(-8.2, 0.35, z);
      const rightL = leftL.clone();
      rightL.position.x = 8.2;
      this.scene.add(leftL, rightL);
    }
  }

  _buildMonumentalName() {
    // Crisp high-res illuminated 3D architectural typography monoliths for "RONALD GINOTI"
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 2048;
    textCanvas.height = 512;
    const ctx = textCanvas.getContext('2d');
    ctx.clearRect(0, 0, 2048, 512);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 210px "Instrument Serif", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
    ctx.shadowBlur = 32;
    ctx.fillText('RONALD GINOTI', 1024, 240);

    ctx.font = '500 34px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillText('AUTONOMY  //  SYSTEMS  //  FLIGHT SOFTWARE', 1024, 375);

    const tex = new THREE.CanvasTexture(textCanvas);
    tex.anisotropy = 8;

    const signGroup = new THREE.Group();
    const frontMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(118, 29.5), frontMat);
    plane.position.set(0, 24, -40);
    signGroup.add(plane);

    // Architectural support pylons beneath the name
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    [-46, 0, 46].forEach((px) => {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 16, 2.2), pylonMat);
      pylon.position.set(px, 8, -40);
      signGroup.add(pylon);
    });

    this.scene.add(signGroup);
  }

  _buildWarzoneCompound() {
    // Landmark 02: Warzone Combat Zone at (-95, 0, -20)
    const group = new THREE.Group();
    group.position.set(-95, 0, -20);

    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.85, metalness: 0.2 });
    const coords = [
      [-18, 7, -14, 14, 14, 12],
      [16, 10, -10, 12, 20, 14],
      [-12, 5, 16, 18, 10, 10],
      [18, 6, 14, 12, 12, 12],
      [0, 3, 0, 8, 6, 8],
    ];
    coords.forEach(([x, y, z, w, h, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat);
      m.position.set(x, y, z);
      group.add(m);
    });

    // Combat Beacon Glow
    this.warzoneFlash = new THREE.PointLight(0xf97316, 0, 75);
    this.warzoneFlash.position.set(0, 10, 0);
    group.add(this.warzoneFlash);

    this.warzoneGroup = group;
    this.scene.add(group);
  }

  _buildWaterPoloArena() {
    // Landmark 03: Water Polo Arena at (+95, 0, -15)
    const group = new THREE.Group();
    group.position.set(95, 0, -15);

    // Pool Deck
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(44, 0.8, 62),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    deck.position.y = 0.4;
    group.add(deck);

    // Glowing Animated Water Surface
    const waterGeo = new THREE.PlaneGeometry(34, 52, 20, 28);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.poolWater = new THREE.Mesh(waterGeo, waterMat);
    this.poolWater.position.y = 0.95;
    group.add(this.poolWater);

    // Floating Lane Lines & Goals
    const goalMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    [-24, 24].forEach((gz) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 0.4), goalMat);
      bar.position.set(0, 2.4, gz);
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), goalMat);
      postL.position.set(-3.3, 1.6, gz);
      const postR = postL.clone();
      postR.position.x = 3.3;
      group.add(bar, postL, postR);
    });

    const poolLight = new THREE.PointLight(0x22d3ee, 2.2, 70);
    poolLight.position.set(0, 14, 0);
    group.add(poolLight);

    this.scene.add(group);
  }

  _buildFuryAircraft() {
    const fury = new THREE.Group();

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.72,
      roughness: 0.28,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.2,
    });

    // Sleek stealth fuselage
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.95, 5.6, 6), hullMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.8;
    fury.add(nose);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 4.6), hullMat);
    body.position.z = -1.2;
    fury.add(body);

    // Dorsal Intake Scoop (iconic Fury CCA silhouette)
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 2.4), darkMat);
    intake.position.set(0, 0.48, -0.4);
    fury.add(intake);

    // Swept Lambda Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 1.2);
    wingShape.lineTo(5.6, -2.6);
    wingShape.lineTo(5.1, -3.5);
    wingShape.lineTo(0, -1.6);
    wingShape.lineTo(-5.1, -3.5);
    wingShape.lineTo(-5.6, -2.6);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.14, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);
    const wings = new THREE.Mesh(wingGeo, hullMat);
    wings.position.set(0, 0.05, 0.3);
    fury.add(wings);

    // Twin Canted V-Tails
    const tailGeo = new THREE.BoxGeometry(0.12, 1.7, 1.9);
    const tailL = new THREE.Mesh(tailGeo, hullMat);
    tailL.position.set(-0.95, 0.75, -3.1);
    tailL.rotation.z = 0.55;
    const tailR = tailL.clone();
    tailR.position.x = 0.95;
    tailR.rotation.z = -0.55;
    fury.add(tailL, tailR);

    // Afterburner Plume
    this.burner = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 2.4, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    this.burner.rotation.x = -Math.PI / 2;
    this.burner.position.set(0, 0, -4.6);
    fury.add(this.burner);

    this.furyMesh = fury;
    this.furyMesh.position.copy(this.flight.pos);
    this.furyMesh.rotation.y = this.flight.yaw;
    this.scene.add(this.furyMesh);
  }

  _bindControls() {
    window.addEventListener('keydown', (e) => {
      if (!this.isFlying) return;
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape') this.setFlying(false);
      if (e.code === 'KeyL') this.triggerAutoLand();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mobile Throttle Slider
    const slider = document.getElementById('fury-throttle-slider');
    if (slider) {
      slider.addEventListener('input', () => {
        this.flight.throttle = Number(slider.value) / 100;
        this.autoLanding = false;
      });
    }

    // Mobile Virtual Stick
    const pad = document.getElementById('fury-stick');
    const knob = document.getElementById('fury-stick-knob');
    if (pad && knob) {
      let active = false;
      const updateStick = (clientX, clientY) => {
        const r = pad.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const maxR = r.width * 0.38;
        const dx = Math.max(-maxR, Math.min(maxR, clientX - cx));
        const dy = Math.max(-maxR, Math.min(maxR, clientY - cy));
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.stick.x = dx / maxR;
        this.stick.y = dy / maxR;
      };
      pad.addEventListener('pointerdown', (e) => {
        active = true;
        pad.setPointerCapture(e.pointerId);
        updateStick(e.clientX, e.clientY);
      });
      pad.addEventListener('pointermove', (e) => {
        if (active) updateStick(e.clientX, e.clientY);
      });
      const resetStick = () => {
        active = false;
        knob.style.transform = 'translate(-50%, -50%)';
        this.stick.x = 0;
        this.stick.y = 0;
      };
      pad.addEventListener('pointerup', resetStick);
      pad.addEventListener('pointercancel', resetStick);
    }

    const mobileLand = document.getElementById('btn-mobile-land');
    if (mobileLand) mobileLand.addEventListener('click', () => this.triggerAutoLand());
  }

  _observeVisibility() {
    const obs = new IntersectionObserver(
      (entries) => {
        this.isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    obs.observe(this.canvas);
  }

  setFlying(active) {
    this.isFlying = active;
    this.autoLanding = false;
    const heroStage = document.getElementById('top');
    const hud = document.getElementById('flight-hud');
    if (heroStage) heroStage.classList.toggle('is-flying', active);
    if (hud) hud.setAttribute('aria-hidden', String(!active));

    if (active) {
      // Place Fury cleanly on the runway ready for takeoff
      this.flight.pos.set(0, 1.35, 148);
      this.flight.yaw = Math.PI;
      this.flight.pitch = 0;
      this.flight.roll = 0;
      this.flight.speed = 0;
      this.flight.throttle = 0.25;
      this.flight.grounded = true;
      const slider = document.getElementById('fury-throttle-slider');
      if (slider) slider.value = '25';
    }
  }

  focusLandmark(target) {
    this.autopilotTarget = target;
  }

  triggerAutoLand() {
    this.autoLanding = true;
  }

  _updateWarzoneEffects(dt) {
    this.combatTimer += dt;
    // Repetitive tracer fire every 0.28s
    if (this.combatTimer > 0.28) {
      this.combatTimer = 0;
      const start = new THREE.Vector3(-95 + (Math.random() - 0.5) * 32, 4 + Math.random() * 6, -20 + (Math.random() - 0.5) * 30);
      const end = new THREE.Vector3(-95 + (Math.random() - 0.5) * 32, 3 + Math.random() * 5, -20 + (Math.random() - 0.5) * 30);
      const tracer = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 3.2),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0xf59e0b : 0xef4444 })
      );
      tracer.position.copy(start);
      tracer.lookAt(end);
      this.scene.add(tracer);
      this.tracers.push({ mesh: tracer, vel: end.clone().sub(start).normalize().multiplyScalar(115), life: 0.42 });

      // Periodic grenade explosion
      if (Math.random() < 0.26) {
        const expPos = new THREE.Vector3(-95 + (Math.random() - 0.5) * 28, 2.2, -20 + (Math.random() - 0.5) * 28);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 })
        );
        sphere.position.copy(expPos);
        this.scene.add(sphere);
        this.explosions.push({ mesh: sphere, life: 0.55 });
        this.warzoneFlash.intensity = 6;
      }
    }

    this.warzoneFlash.intensity = Math.max(0, this.warzoneFlash.intensity - dt * 16);

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.mesh.position.addScaledVector(tr.vel, dt);
      tr.life -= dt;
      if (tr.life <= 0) {
        this.scene.remove(tr.mesh);
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= dt;
      const scale = 1 + (0.55 - ex.life) * 14;
      ex.mesh.scale.setScalar(scale);
      ex.mesh.material.opacity = Math.max(0, ex.life * 1.6);
      if (ex.life <= 0) {
        this.scene.remove(ex.mesh);
        this.explosions.splice(i, 1);
      }
    }
  }

  _updateWaterWaves(t) {
    if (!this.poolWater) return;
    const pos = this.poolWater.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.35 + t * 3) * 0.18 + Math.cos(z * 0.25 + t * 2.4) * 0.16);
    }
    pos.needsUpdate = true;
  }

  _updateFlightPhysics(dt, elapsed) {
    const f = this.flight;

    if (!this.isFlying) {
      // Cinematic Autopilot Orbit
      const targets = {
        name: new THREE.Vector3(0, 22, -40),
        runway: new THREE.Vector3(0, 6, 100),
        warzone: new THREE.Vector3(-95, 10, -20),
        pool: new THREE.Vector3(95, 8, -15),
      };
      const lookTarget = targets[this.autopilotTarget] || targets.name;
      const orbitR = this.autopilotTarget === 'name' ? 128 : 68;
      const angle = elapsed * 0.22;

      const camDesired = new THREE.Vector3(
        lookTarget.x + Math.sin(angle) * orbitR,
        lookTarget.y + 24 + Math.sin(elapsed * 0.5) * 4,
        lookTarget.z + Math.cos(angle) * orbitR
      );
      this.camera.position.lerp(camDesired, 0.035);
      this.camera.lookAt(lookTarget);

      // Fury gently circles above the name monument in autopilot
      const fAngle = elapsed * 0.45;
      this.furyMesh.position.set(Math.cos(fAngle) * 76, 34 + Math.sin(elapsed) * 3, -30 + Math.sin(fAngle) * 58);
      this.furyMesh.rotation.set(0.04, -fAngle, 0.38);
      this.burner.scale.set(1, 1.3, 1);
      return;
    }

    // Active Player Flight Mode
    if (this.autoLanding) {
      // Smoothly guide back to runway centerline and touch down
      const targetPos = new THREE.Vector3(0, 1.35, 115);
      f.pos.lerp(targetPos, dt * 1.4);
      f.pitch *= 0.92;
      f.roll *= 0.92;
      f.speed = Math.max(0, f.speed - dt * 22);
      f.throttle = Math.max(0, f.throttle - dt * 0.4);
      if (f.pos.distanceTo(targetPos) < 2.2) {
        f.pos.y = 1.35;
        f.grounded = true;
        f.speed = 0;
        this.autoLanding = false;
      }
    } else {
      // Throttle
      if (this.keys.KeyW) f.throttle = Math.min(1, f.throttle + dt * 0.55);
      if (this.keys.KeyS) f.throttle = Math.max(0, f.throttle - dt * 0.55);

      const targetSpeed = f.throttle * 95;
      f.speed += (targetSpeed - f.speed) * dt * 1.3;

      // Pitch & Roll inputs
      let pitchInput = this.stick.y;
      let rollInput = this.stick.x;
      if (this.keys.ArrowDown) pitchInput = 1; // Pull back = pitch up
      if (this.keys.ArrowUp) pitchInput = -1;
      if (this.keys.KeyA || this.keys.ArrowLeft) rollInput = -1;
      if (this.keys.KeyD || this.keys.ArrowRight) rollInput = 1;

      if (f.grounded) {
        f.roll *= 0.85;
        f.yaw -= rollInput * dt * 0.9;
        // Takeoff rotation once airspeed exceeds 38 (~75 KTS)
        if (f.speed > 38 && pitchInput > 0.15) {
          f.grounded = false;
          f.pitch = 0.22;
        } else {
          f.pitch = 0;
        }
      } else {
        f.pitch = THREE.MathUtils.clamp(f.pitch + pitchInput * dt * 1.15, -0.68, 0.72);
        f.roll = THREE.MathUtils.clamp(f.roll + (rollInput * 0.85 - f.roll) * dt * 4, -0.95, 0.95);
        f.yaw -= f.roll * dt * 1.35;
      }

      // Forward vector from yaw + pitch
      const forward = new THREE.Vector3(
        Math.sin(f.yaw) * Math.cos(f.pitch),
        Math.sin(f.pitch),
        Math.cos(f.yaw) * Math.cos(f.pitch)
      );
      f.pos.addScaledVector(forward, f.speed * dt);

      // Ground / Runway touchdown check
      if (f.pos.y <= 1.35) {
        f.pos.y = 1.35;
        f.pitch = 0;
        f.roll *= 0.8;
        f.grounded = true;
      }
      f.pos.y = Math.min(180, f.pos.y);
    }

    // Apply transform to Fury mesh
    this.furyMesh.position.copy(f.pos);
    this.furyMesh.rotation.order = 'YXZ';
    this.furyMesh.rotation.y = f.yaw;
    this.furyMesh.rotation.x = -f.pitch;
    this.furyMesh.rotation.z = -f.roll;

    this.burner.scale.set(1, 0.4 + f.throttle * 1.8, 1);

    // Chase Camera behind Fury
    const chaseOffset = new THREE.Vector3(0, 5.2, -16).applyEuler(new THREE.Euler(0, f.yaw, 0));
    const camGoal = f.pos.clone().add(chaseOffset);
    this.camera.position.lerp(camGoal, 0.1);
    this.camera.lookAt(f.pos.clone().add(new THREE.Vector3(Math.sin(f.yaw) * 18, f.pitch * 10, Math.cos(f.yaw) * 18)));

    // Update Cockpit HUD Readouts
    const kts = Math.round(f.speed * 2.1);
    const alt = Math.max(0, Math.round((f.pos.y - 1.35) * 12));
    const hdg = (((-f.yaw * 180) / Math.PI) % 360 + 360) % 360;
    const onRunway = Math.abs(f.pos.x) < 12 && f.pos.z > 35 && f.pos.z < 168;

    const elSpeed = document.getElementById('hud-airspeed');
    const elAlt = document.getElementById('hud-altitude');
    const elHdg = document.getElementById('hud-heading');
    const elThr = document.getElementById('hud-throttle');
    const elState = document.getElementById('hud-flight-state');

    if (elSpeed) elSpeed.textContent = String(kts).padStart(3, '0');
    if (elAlt) elAlt.textContent = String(alt).padStart(4, '0');
    if (elHdg) elHdg.textContent = String(Math.round(hdg)).padStart(3, '0');
    if (elThr) elThr.textContent = String(Math.round(f.throttle * 100)).padStart(2, '0');
    if (elState) {
      if (this.autoLanding) elState.textContent = 'AUTO-LANDING';
      else if (f.grounded && kts < 10) elState.textContent = onRunway ? 'RUNWAY // READY' : 'GROUNDED';
      else if (f.grounded) elState.textContent = kts > 75 ? 'ROTATE — PULL UP' : 'TAKEOFF ROLL';
      else elState.textContent = 'AIRBORNE // NOMINAL';
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (!this.isVisible) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this._updateWarzoneEffects(dt);
    this._updateWaterWaves(elapsed);
    this._updateFlightPhysics(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  }
}
