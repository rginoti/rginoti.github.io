/**
 * 3D MOJAVE WORLD & ACCURATELY SCULPTED ANDURIL YFQ-44A FURY FLIGHT DECK (Three.js)
 * Features:
 *  - Custom GLSL Mojave golden-hour / dusk atmospheric sky dome + procedural desert mountain basin
 *  - Accurately proportioned Anduril YFQ-44A Fury (20 ft L × 17 ft span): chined stealth fuselage,
 *    chin-mounted intake, swept trapezoidal wings with animated ailerons, twin AIM-120 AMRAAMs,
 *    cruciform tail + single vertical fin, retractable tricycle landing gear, volumetric afterburner & contrails
 *  - Monumental architectural 3D "RONALD GINOTI" monoliths ahead of Runway 22
 *  - Live 3D Warzone Combat Sector (continuous repetitive tracer fire & grenade explosions)
 *  - 3D NCAA Olympic Water Polo Arena (animated rippling water, stadium towers, goals, players & ball)
 *  - Desktop (WASD/Arrows + Shift + Space) + Mobile touch flight stick + Waypoint Autopilot + Web Audio turbine
 */

import * as THREE from 'three';

export class FuryWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.heroEl = document.getElementById('top');
    this.isFlying = false;
    this.isVisible = true;
    this.autoLanding = false;
    this.camMode = 'chase';
    this.waypoint = 'name';
    this.manualOverrideTimer = 0;

    this.keys = {};
    this.stick = { x: 0, y: 0 };
    this.boostHeld = false;

    this.flight = {
      pos: new THREE.Vector3(0, 1.42, 148),
      yaw: Math.PI,
      pitch: 0,
      roll: 0,
      speed: 0,
      throttle: 0,
      grounded: true,
      gearDeploy: 1.0,
    };

    this.tracers = [];
    this.explosions = [];
    this.combatTimer = 0;
    this.grenadeTimer = 0;
    this.time = 0;

    this.audioOn = false;
    this.audioCtx = null;

    this._initScene();
    this._buildSkyDome();
    this._buildMojaveTerrainAndRunway();
    this._buildMonumentalName();
    this._buildWarzoneSector();
    this._buildWaterPoloArena();
    this._buildFuryYFQ44A();
    this._bindControls();
    this._observeVisibility();

    this.clock = new THREE.Clock();
    this._animate();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0e14);
    this.scene.fog = new THREE.FogExp2(0x16141a, 0.00165);

    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(54, w / h, 0.4, 1600);
    this.camera.position.set(14, 9, 168);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const hemi = new THREE.HemisphereLight(0x88b4e6, 0x2c2019, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffb472, 2.2);
    sun.position.set(160, 85, -180);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 520;
    const d = 160;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    const coolRim = new THREE.DirectionalLight(0x60a5fa, 0.75);
    coolRim.position.set(-140, 70, 140);
    this.scene.add(coolRim);

    window.addEventListener('resize', () => {
      const nw = this.canvas.parentElement?.clientWidth || window.innerWidth;
      const nh = this.canvas.parentElement?.clientHeight || window.innerHeight;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });
  }

  _buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(1100, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.55, 0.22, -0.8).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 zenith = vec3(0.025, 0.035, 0.065);
          vec3 midSky = vec3(0.08, 0.10, 0.16);
          vec3 horizon = vec3(0.28, 0.16, 0.12);
          vec3 col = mix(horizon, midSky, smoothstep(0.0, 0.24, h));
          col = mix(col, zenith, smoothstep(0.2, 0.75, h));

          float sunAmt = max(dot(dir, uSunDir), 0.0);
          col += vec3(1.0, 0.45, 0.18) * pow(sunAmt, 10.0) * 0.55;
          col += vec3(1.0, 0.82, 0.62) * pow(sunAmt, 140.0) * 1.4;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    const starVerts = [];
    for (let i = 0; i < 700; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.36;
      const r = 920;
      starVerts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 40, r * Math.sin(phi) * Math.sin(theta));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 1.4, transparent: true, opacity: 0.6 });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  _buildMojaveTerrainAndRunway() {
    const size = 1200;
    const segs = 96;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = [];
    const cFloor = new THREE.Color(0x1b1918);
    const cSand = new THREE.Color(0x3a2e25);
    const cMesa = new THREE.Color(0x4b3428);
    const cPeak = new THREE.Color(0x28262b);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distFromCenter = Math.hypot(x, z - 20);
      const flatMask = THREE.MathUtils.smoothstep(distFromCenter, 195, 340);

      const n1 = Math.sin(x * 0.011) * Math.cos(z * 0.011) * 32;
      const n2 = Math.abs(Math.sin(x * 0.023 + z * 0.017)) * 22;
      const n3 = Math.sin(x * 0.055 - z * 0.041) * 6;
      const h = Math.max(0, (n1 + n2 + n3 + 22) * flatMask);
      pos.setY(i, h);

      if (h < 1.5) tmp.copy(cFloor).lerp(cSand, 0.35);
      else if (h < 22) tmp.copy(cSand).lerp(cMesa, h / 22);
      else tmp.copy(cMesa).lerp(cPeak, Math.min(1, (h - 22) / 38));
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.05 });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.22, 150),
      new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.88, metalness: 0.08 })
    );
    runway.position.set(0, 0.11, 100);
    runway.receiveShadow = true;
    this.scene.add(runway);

    const paintMat = new THREE.MeshBasicMaterial({ color: 0xe5e3dc });
    for (let z = 34; z <= 162; z += 11) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 5.5), paintMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.23, z);
      this.scene.add(dash);
    }
    for (let k = -7; k <= 7; k += 2.2) {
      if (Math.abs(k) < 1.5) continue;
      const key = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 6.5), paintMat);
      key.rotation.x = -Math.PI / 2;
      key.position.set(k, 0.23, 169);
      this.scene.add(key);
    }

    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6 });
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xff4d00 });
    this.runwayStrobes = [];
    for (let z = 28; z <= 172; z += 14) {
      for (const side of [-10.4, 10.4]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), edgeMat);
        lamp.position.set(side, 0.4, z);
        this.scene.add(lamp);
      }
    }
    for (let z = 180; z <= 216; z += 9) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), strobeMat.clone());
      s.position.set(0, 0.55, z);
      this.scene.add(s);
      this.runwayStrobes.push(s);
    }
  }

  _buildMonumentalName() {
    const group = new THREE.Group();
    group.position.set(0, 0, -28);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(74, 2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.6, metalness: 0.4 })
    );
    plinth.position.y = 1.1;
    plinth.receiveShadow = true;
    group.add(plinth);

    const texCanvas = document.createElement('canvas');
    texCanvas.width = 2048;
    texCanvas.height = 512;
    const tex = new THREE.CanvasTexture(texCanvas);
    tex.anisotropy = 8;

    const drawNameTexture = () => {
      const ctx = texCanvas.getContext('2d');
      ctx.fillStyle = '#0c0e13';
      ctx.fillRect(0, 0, 2048, 512);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 2;
      for (let y = 0; y < 512; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#FF4D00';
      ctx.fillRect(0, 0, 2048, 12);
      ctx.fillRect(0, 500, 2048, 12);
      ctx.fillStyle = '#9A9DA6';
      ctx.font = '500 34px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AUTONOMY · NETWORKS · SYSTEMS ENGINEERING', 1024, 125);
      ctx.fillStyle = '#F4F2EC';
      ctx.font = '400 220px "Instrument Serif", Georgia, serif';
      ctx.fillText('RONALD GINOTI', 1024, 345);
      ctx.fillStyle = '#FF4D00';
      ctx.font = '500 28px "JetBrains Mono", monospace';
      ctx.fillText('ANDURIL // FURY   ·   ACTIVISION // WARZONE   ·   UCSD // WATER POLO', 1024, 438);
      tex.needsUpdate = true;
    };

    drawNameTexture();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawNameTexture);

    const slabMat = new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.35, metalness: 0.72 });
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: tex,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.4,
    });

    const monolith = new THREE.Mesh(
      new THREE.BoxGeometry(66, 17, 3.2),
      [slabMat, slabMat, slabMat, slabMat, faceMat, faceMat]
    );
    monolith.position.y = 11.2;
    monolith.castShadow = true;
    group.add(monolith);

    const uplight = new THREE.PointLight(0xff6b2b, 3.2, 65);
    uplight.position.set(0, 8, 14);
    group.add(uplight);

    this.scene.add(group);
  }

  _buildWarzoneSector() {
    const wz = new THREE.Group();
    wz.position.set(-105, 0, -18);
    this.warzoneCenter = new THREE.Vector3(-105, 6, -18);

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x2d2c2a, roughness: 0.92 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.65, metalness: 0.4 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x5c4f3d, roughness: 0.95 });

    [
      { x: -22, z: -16, w: 16, h: 14, d: 14 },
      { x: 20, z: -18, w: 18, h: 11, d: 13 },
      { x: -18, z: 18, w: 14, h: 9, d: 14 },
      { x: 22, z: 16, w: 15, h: 16, d: 12 },
    ].forEach((b) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), concreteMat);
      m.position.set(b.x, b.h / 2, b.z);
      m.castShadow = true;
      m.receiveShadow = true;
      wz.add(m);
    });

    const containerMat = new THREE.MeshStandardMaterial({ color: 0x6b2d22, roughness: 0.78 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 4.2), containerMat);
    c1.position.set(-3, 1.8, 2);
    c1.rotation.y = 0.25;
    wz.add(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 4.2), darkSteelMat);
    c2.position.set(6, 1.8, -5);
    c2.rotation.y = -0.35;
    wz.add(c2);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 1.6), barrierMat);
      bar.position.set(Math.cos(a) * 32, 1.1, Math.sin(a) * 28);
      bar.rotation.y = -a + Math.PI / 2;
      wz.add(bar);
    }

    this.squadA = [
      new THREE.Vector3(-124, 2.4, -26),
      new THREE.Vector3(-118, 2.4, -2),
      new THREE.Vector3(-126, 2.4, -14),
    ];
    this.squadB = [
      new THREE.Vector3(-86, 2.4, -28),
      new THREE.Vector3(-84, 2.4, -4),
      new THREE.Vector3(-89, 2.4, -16),
    ];

    const opMatA = new THREE.MeshStandardMaterial({ color: 0x3b4d3b, roughness: 0.8 });
    const opMatB = new THREE.MeshStandardMaterial({ color: 0x4b3b34, roughness: 0.8 });
    [...this.squadA.map((p) => [p, opMatA]), ...this.squadB.map((p) => [p, opMatB])].forEach(([p, mat]) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.0, 8), mat);
      body.position.set(p.x, 1.0, p.z);
      this.scene.add(body);
    });

    this.warzoneFlash = new THREE.PointLight(0xff6a1a, 2.5, 80);
    this.warzoneFlash.position.set(-105, 8, -18);
    this.scene.add(this.warzoneFlash);
    this.scene.add(wz);
  }

  _buildWaterPoloArena() {
    const wp = new THREE.Group();
    wp.position.set(105, 0, -18);
    this.waterPoloCenter = new THREE.Vector3(105, 4, -18);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(58, 1.2, 42),
      new THREE.MeshStandardMaterial({ color: 0xd6d3cb, roughness: 0.82 })
    );
    deck.position.y = 0.6;
    deck.receiveShadow = true;
    wp.add(deck);

    const waterGeo = new THREE.PlaneGeometry(46, 30, 32, 20);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterGeo = waterGeo;
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.18,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 1.28;
    wp.add(water);

    const goalMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    for (const gx of [-21.5, 21.5]) {
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 7.2), goalMat);
      topBar.position.set(gx, 3.2, 0);
      wp.add(topBar);
      for (const gz of [-3.5, 3.5]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.1, 0.35), goalMat);
        post.position.set(gx, 2.2, gz);
        wp.add(post);
      }
    }

    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    [-16, 16].forEach((x) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 29.5), redMat);
      line.position.set(x, 1.38, 0);
      wp.add(line);
    });
    [-11, 11].forEach((x) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 29.5), yellowMat);
      line.position.set(x, 1.38, 0);
      wp.add(line);
    });

    this.poloPlayers = [];
    const capBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8 });
    const capWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 10), i < 5 ? capBlue : capWhite);
      const bx = (i < 5 ? -1 : 1) * (4 + (i % 5) * 3.1);
      const bz = ((i % 3) - 1) * 7.2;
      p.position.set(bx, 1.65, bz);
      p.userData = { baseX: bx, baseZ: bz, phase: i * 1.1 };
      wp.add(p);
      this.poloPlayers.push(p);
    }
    this.poloBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.3 })
    );
    this.poloBall.position.set(0, 2.4, 0);
    wp.add(this.poloBall);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    for (const sx of [-27, 27]) {
      for (const sz of [-19, 19]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 18, 8), poleMat);
        pole.position.set(sx, 9, sz);
        wp.add(pole);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.8), lampMat);
        lamp.position.set(sx, 18, sz);
        wp.add(lamp);
      }
    }

    const poolGlow = new THREE.PointLight(0x38bdf8, 2.8, 70);
    poolGlow.position.set(0, 14, 0);
    wp.add(poolGlow);
    this.scene.add(wp);
  }

  _buildFuryYFQ44A() {
    const fury = new THREE.Group();
    this.fury = fury;

    const ramMat = new THREE.MeshStandardMaterial({ color: 0x363b44, roughness: 0.36, metalness: 0.62 });
    const darkCarbonMat = new THREE.MeshStandardMaterial({ color: 0x16181e, roughness: 0.42, metalness: 0.55 });
    const orangeStripeMat = new THREE.MeshStandardMaterial({ color: 0xff4d00, emissive: 0xff4d00, emissiveIntensity: 0.25, roughness: 0.35 });
    const missileBodyMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.3, metalness: 0.2 });

    const fuseGeo = new THREE.CylinderGeometry(0.42, 0.68, 6.2, 6);
    fuseGeo.rotateX(Math.PI / 2);
    fuseGeo.scale(1.45, 0.72, 1.0);
    const fuselage = new THREE.Mesh(fuseGeo, ramMat);
    fuselage.position.set(0, 0, -0.1);
    fuselage.castShadow = true;
    fury.add(fuselage);

    const noseGeo = new THREE.ConeGeometry(0.61, 3.1, 6);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.scale(1.0, 0.62, 1.0);
    const nose = new THREE.Mesh(noseGeo, ramMat);
    nose.position.set(0, -0.02, -4.75);
    nose.castShadow = true;
    fury.add(nose);

    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.85, 6), darkCarbonMat);
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(0, -0.02, -6.55);
    fury.add(pitot);

    const spineGeo = new THREE.SphereGeometry(0.54, 16, 12);
    spineGeo.scale(0.88, 0.48, 3.6);
    const spine = new THREE.Mesh(spineGeo, darkCarbonMat);
    spine.position.set(0, 0.36, -1.35);
    fury.add(spine);

    const intakeOuter = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 2.4), darkCarbonMat);
    intakeOuter.position.set(0, -0.44, -1.9);
    fury.add(intakeOuter);

    const intakeLip = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.32, 0.14), new THREE.MeshBasicMaterial({ color: 0x050608 }));
    intakeLip.position.set(0, -0.44, -3.12);
    fury.add(intakeLip);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.6, -1.15);
    wingShape.lineTo(4.35, 0.95);
    wingShape.lineTo(4.35, 1.75);
    wingShape.lineTo(0.6, 1.85);
    wingShape.closePath();

    const wingExtrude = { depth: 0.11, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const rightWingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
    rightWingGeo.rotateX(Math.PI / 2);
    const rightWing = new THREE.Mesh(rightWingGeo, ramMat);
    rightWing.position.set(0, 0.02, 0.0);
    rightWing.castShadow = true;
    fury.add(rightWing);

    const leftWing = rightWing.clone();
    leftWing.scale.x = -1;
    fury.add(leftWing);

    this.aileronR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.32), darkCarbonMat);
    this.aileronR.position.set(2.9, -0.02, 1.82);
    fury.add(this.aileronR);

    this.aileronL = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.32), darkCarbonMat);
    this.aileronL.position.set(-2.9, -0.02, 1.82);
    fury.add(this.aileronL);

    const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2d20 }));
    navRed.position.set(-4.38, 0.0, 1.35);
    fury.add(navRed);
    const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    navGreen.position.set(4.38, 0.0, 1.35);
    fury.add(navGreen);

    for (const side of [-2.15, 2.15]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 1.2), darkCarbonMat);
      pylon.position.set(side, -0.22, 0.55);
      fury.add(pylon);
      const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), missileBodyMat);
      missile.rotation.x = Math.PI / 2;
      missile.position.set(side, -0.42, 0.5);
      fury.add(missile);
      const mNose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), darkCarbonMat);
      mNose.rotation.x = -Math.PI / 2;
      mNose.position.set(side, -0.42, -0.77);
      fury.add(mNose);
    }

    const stabShape = new THREE.Shape();
    stabShape.moveTo(0.45, 2.65);
    stabShape.lineTo(2.15, 3.65);
    stabShape.lineTo(2.15, 4.2);
    stabShape.lineTo(0.45, 4.15);
    stabShape.closePath();
    const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    stabGeo.rotateX(Math.PI / 2);
    const stabR = new THREE.Mesh(stabGeo, ramMat);
    fury.add(stabR);
    const stabL = stabR.clone();
    stabL.scale.x = -1;
    fury.add(stabL);

    const finShape = new THREE.Shape();
    finShape.moveTo(2.2, 0.25);
    finShape.lineTo(3.55, 2.45);
    finShape.lineTo(4.3, 2.45);
    finShape.lineTo(4.15, 0.25);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    finGeo.rotateY(-Math.PI / 2);
    finGeo.translate(0.05, 0, 0);
    const tailFin = new THREE.Mesh(finGeo, ramMat);
    tailFin.castShadow = true;
    fury.add(tailFin);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.85), orangeStripeMat);
    stripe.position.set(0, 1.95, 3.65);
    fury.add(stripe);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.85, 16), darkCarbonMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0, 3.35);
    fury.add(nozzle);

    const flameOuterGeo = new THREE.ConeGeometry(0.34, 2.8, 12, 1, true);
    flameOuterGeo.rotateX(Math.PI / 2);
    flameOuterGeo.translate(0, 0, 1.4);
    this.flameOuter = new THREE.Mesh(
      flameOuterGeo,
      new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    this.flameOuter.position.set(0, 0, 3.7);
    fury.add(this.flameOuter);

    const flameInnerGeo = new THREE.ConeGeometry(0.18, 1.7, 10, 1, true);
    flameInnerGeo.rotateX(Math.PI / 2);
    flameInnerGeo.translate(0, 0, 0.85);
    this.flameInner = new THREE.Mesh(
      flameInnerGeo,
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    this.flameInner.position.set(0, 0, 3.7);
    fury.add(this.flameInner);

    this.burnerLight = new THREE.PointLight(0xff6b1a, 0, 24);
    this.burnerLight.position.set(0, 0, 4.6);
    fury.add(this.burnerLight);

    this.gearGroup = new THREE.Group();
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.9 });
    [[0, -3.1], [-1.15, 0.85], [1.15, 0.85]].forEach(([gx, gz]) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 6), strutMat);
      strut.position.set(gx, -0.78, gz);
      this.gearGroup.add(strut);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 12), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(gx, -1.22, gz);
      this.gearGroup.add(tire);
    });
    fury.add(this.gearGroup);

    const makeRibbon = () => {
      const maxPts = 42;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.36 }));
      line.frustumCulled = false;
      this.scene.add(line);
      return { line, pts: [], maxPts };
    };
    this.ribbonL = makeRibbon();
    this.ribbonR = makeRibbon();

    fury.position.copy(this.flight.pos);
    this.scene.add(fury);
  }

  _bindControls() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'].includes(code)) {
        if (this.isVisible && document.activeElement?.tagName !== 'INPUT') {
          if (code === 'Space' && this.isFlying) e.preventDefault();
          this.keys[code] = true;
          if (code !== 'Space') this.manualOverrideTimer = 4.0;
          if (code === 'Space') {
            if (this.flight.grounded) this.initiateTakeoff();
            else this.initiateAutoLand();
          }
        }
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    document.getElementById('btn-takeoff')?.addEventListener('click', () => this.initiateTakeoff());
    document.getElementById('btn-land')?.addEventListener('click', () => this.initiateAutoLand());
    document.getElementById('touch-takeoff-land')?.addEventListener('click', () => {
      if (this.flight.grounded) this.initiateTakeoff();
      else this.initiateAutoLand();
    });

    const boostBtn = document.getElementById('touch-boost');
    if (boostBtn) {
      boostBtn.addEventListener('pointerdown', () => (this.boostHeld = true));
      boostBtn.addEventListener('pointerup', () => (this.boostHeld = false));
      boostBtn.addEventListener('pointerleave', () => (this.boostHeld = false));
    }

    document.getElementById('btn-cam-mode')?.addEventListener('click', (e) => {
      this.camMode = this.camMode === 'chase' ? 'cinematic' : 'chase';
      e.currentTarget.textContent = this.camMode === 'chase' ? 'CAM: CHASE' : 'CAM: ORBIT';
    });

    document.getElementById('btn-audio-toggle')?.addEventListener('click', (e) => this._toggleAudio(e.currentTarget));

    document.querySelectorAll('[data-waypoint]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-waypoint]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.waypoint = btn.dataset.waypoint;
        this.manualOverrideTimer = 0;
        if (this.flight.grounded) this.initiateTakeoff();
      });
    });

    const base = document.getElementById('fury-stick-base');
    const knob = document.getElementById('fury-stick-knob');
    if (base && knob) {
      let dragging = false;
      const updateStick = (clientX, clientY) => {
        const r = base.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const maxR = r.width * 0.38;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.stick.x = dx / maxR;
        this.stick.y = dy / maxR;
        this.manualOverrideTimer = 3.5;
      };
      base.addEventListener('pointerdown', (e) => {
        dragging = true;
        base.setPointerCapture(e.pointerId);
        if (this.flight.grounded) this.initiateTakeoff();
        updateStick(e.clientX, e.clientY);
      });
      base.addEventListener('pointermove', (e) => { if (dragging) updateStick(e.clientX, e.clientY); });
      const resetStick = () => { dragging = false; this.stick.x = 0; this.stick.y = 0; knob.style.transform = 'translate(-50%, -50%)'; };
      base.addEventListener('pointerup', resetStick);
      base.addEventListener('pointercancel', resetStick);
    }
  }

  _toggleAudio(btn) {
    this.audioOn = !this.audioOn;
    btn.setAttribute('aria-pressed', String(this.audioOn));
    btn.textContent = this.audioOn ? 'AUDIO: ON' : 'AUDIO: OFF';
    if (this.audioOn && !this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AC();
      const bufferSize = 2 * this.audioCtx.sampleRate;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.jetFilter = this.audioCtx.createBiquadFilter();
      this.jetFilter.type = 'bandpass';
      this.jetFilter.frequency.value = 260;
      this.jetFilter.Q.value = 1.4;

      this.jetGain = this.audioCtx.createGain();
      this.jetGain.gain.value = 0.0;

      whiteNoise.connect(this.jetFilter);
      this.jetFilter.connect(this.jetGain);
      this.jetGain.connect(this.audioCtx.destination);
      whiteNoise.start();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended' && this.audioOn) this.audioCtx.resume();
    if (this.jetGain && !this.audioOn) this.jetGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.12);
  }

  initiateTakeoff() {
    this.autoLanding = false;
    this.isFlying = true;
    this.flight.grounded = false;
    this.flight.throttle = 0.85;
    if (this.flight.speed < 24) this.flight.speed = 28;
    if (this.heroEl) this.heroEl.classList.add('is-flying');
    const lbl = document.getElementById('btn-takeoff-label');
    if (lbl) lbl.textContent = 'AIRBORNE · ACTIVE';
    const tl = document.getElementById('touch-takeoff-land');
    if (tl) tl.textContent = 'LAND';
  }

  initiateAutoLand() {
    if (this.flight.grounded) return;
    this.autoLanding = true;
    this.manualOverrideTimer = 0;
  }

  _observeVisibility() {
    const io = new IntersectionObserver((entries) => { this.isVisible = entries[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(this.canvas);
  }

  _updateWarzoneCombat(dt) {
    this.combatTimer += dt;
    this.grenadeTimer += dt;

    if (this.combatTimer > 0.14) {
      this.combatTimer = 0;
      const fromA = Math.random() > 0.5;
      const srcList = fromA ? this.squadA : this.squadB;
      const dstList = fromA ? this.squadB : this.squadA;
      const src = srcList[Math.floor(Math.random() * srcList.length)].clone();
      const dst = dstList[Math.floor(Math.random() * dstList.length)].clone();
      dst.x += (Math.random() - 0.5) * 6;
      dst.y += Math.random() * 2.5;
      dst.z += (Math.random() - 0.5) * 6;

      const dir = dst.clone().sub(src).normalize();
      const tracerGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.6, 5);
      tracerGeo.rotateX(Math.PI / 2);
      const tracer = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: fromA ? 0xffa94d : 0xfef08a }));
      tracer.position.copy(src);
      tracer.lookAt(dst);
      this.scene.add(tracer);
      this.tracers.push({ mesh: tracer, vel: dir.multiplyScalar(110), life: 0.5 });
      this.warzoneFlash.intensity = 4.2;
    }

    if (this.grenadeTimer > 2.3) {
      this.grenadeTimer = 0;
      const ex = -105 + (Math.random() - 0.5) * 34;
      const ez = -18 + (Math.random() - 0.5) * 26;

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.92 })
      );
      ball.position.set(ex, 1.4, ez);
      this.scene.add(ball);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.4, 24),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ex, 0.4, ez);
      this.scene.add(ring);

      this.explosions.push({ ball, ring, age: 0, maxAge: 1.1 });
      this.warzoneFlash.intensity = 9.0;
    }

    this.warzoneFlash.intensity = THREE.MathUtils.lerp(this.warzoneFlash.intensity, 1.8, dt * 6);

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.mesh.position.addScaledVector(t.vel, dt);
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.age += dt;
      const p = e.age / e.maxAge;
      e.ball.scale.setScalar(1 + p * 8.5);
      e.ball.position.y = 1.4 + p * 5.2;
      e.ball.material.opacity = Math.max(0, 1 - p);
      e.ring.scale.setScalar(1 + p * 14);
      e.ring.material.opacity = Math.max(0, 1 - p * 1.2);
      if (e.age >= e.maxAge) {
        this.scene.remove(e.ball, e.ring);
        e.ball.geometry.dispose();
        e.ring.geometry.dispose();
        this.explosions.splice(i, 1);
      }
    }
  }

  _updateWaterPolo() {
    const pos = this.waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.45 + this.time * 3.1) * 0.16 + Math.cos(z * 0.55 + this.time * 2.4) * 0.14);
    }
    pos.needsUpdate = true;

    this.poloPlayers.forEach((p) => {
      p.position.y = 1.62 + Math.sin(this.time * 3.4 + p.userData.phase) * 0.22;
      p.position.x = p.userData.baseX + Math.sin(this.time * 0.8 + p.userData.phase) * 1.4;
    });
    if (this.poloBall) {
      const arc = (this.time * 0.9) % (Math.PI * 2);
      this.poloBall.position.x = Math.sin(arc) * 13;
      this.poloBall.position.y = 2.2 + Math.abs(Math.cos(arc * 2)) * 3.8;
      this.poloBall.position.z = Math.cos(arc) * 5;
    }
  }

  _updateFlight(dt) {
    const f = this.flight;

    this.runwayStrobes.forEach((s, idx) => {
      const wave = ((this.time * 4.5 - idx * 0.6) % 2 + 2) % 2;
      s.material.color.setHex(wave < 0.35 ? 0xffffff : 0xff4d00);
    });

    if (f.grounded) {
      f.speed = THREE.MathUtils.lerp(f.speed, 0, dt * 3);
      f.pitch = THREE.MathUtils.lerp(f.pitch, 0, dt * 4);
      f.roll = THREE.MathUtils.lerp(f.roll, 0, dt * 4);
      f.gearDeploy = THREE.MathUtils.lerp(f.gearDeploy, 1, dt * 4);
      this.flameOuter.scale.set(0.4, 0.4, 0.2);
      this.flameInner.scale.set(0.3, 0.3, 0.2);
      this.burnerLight.intensity = 0.4;
      this._syncFuryMesh();
      this._updateCamera(dt);
      this._updateHUD();
      return;
    }

    const boost = this.keys.ShiftLeft || this.keys.ShiftRight || this.boostHeld;
    const targetSpeed = this.autoLanding ? 30 : boost ? 96 : 58;
    f.speed = THREE.MathUtils.lerp(f.speed, targetSpeed, dt * 1.8);
    f.throttle = boost ? 1.0 : 0.65;

    let pitchInput = 0, rollInput = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) pitchInput += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) pitchInput -= 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) rollInput -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) rollInput += 1;
    if (Math.abs(this.stick.x) > 0.08 || Math.abs(this.stick.y) > 0.08) {
      rollInput = this.stick.x;
      pitchInput = -this.stick.y;
    }

    if (this.autoLanding) {
      const target = new THREE.Vector3(0, 1.42, 148);
      const toTarget = target.clone().sub(f.pos);
      const dist = toTarget.length();
      const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
      let dyaw = desiredYaw - f.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      f.yaw += THREE.MathUtils.clamp(dyaw, -1.8 * dt, 1.8 * dt);
      f.roll = THREE.MathUtils.lerp(f.roll, THREE.MathUtils.clamp(-dyaw * 0.9, -0.5, 0.5), dt * 4);
      const desiredPitch = THREE.MathUtils.clamp((target.y - f.pos.y) / Math.max(15, dist), -0.35, 0.2);
      f.pitch = THREE.MathUtils.lerp(f.pitch, desiredPitch, dt * 3);
      f.gearDeploy = THREE.MathUtils.lerp(f.gearDeploy, 1.0, dt * 2.5);

      if (dist < 6.5) {
        f.pos.set(0, 1.42, 148);
        f.yaw = Math.PI;
        f.pitch = 0;
        f.roll = 0;
        f.speed = 0;
        f.grounded = true;
        this.autoLanding = false;
        this.isFlying = false;
        if (this.heroEl) this.heroEl.classList.remove('is-flying');
        const lbl = document.getElementById('btn-takeoff-label');
        if (lbl) lbl.textContent = 'INITIATE TAKEOFF';
        const tl = document.getElementById('touch-takeoff-land');
        if (tl) tl.textContent = 'TAKEOFF';
      }
    } else if (this.manualOverrideTimer > 0) {
      this.manualOverrideTimer -= dt;
      f.pitch = THREE.MathUtils.clamp(f.pitch + pitchInput * 1.15 * dt, -0.68, 0.68);
      f.roll = THREE.MathUtils.clamp(f.roll + rollInput * 2.1 * dt, -1.15, 1.15);
      if (Math.abs(rollInput) < 0.05) f.roll = THREE.MathUtils.lerp(f.roll, 0, dt * 1.6);
      if (Math.abs(pitchInput) < 0.05) f.pitch = THREE.MathUtils.lerp(f.pitch, 0, dt * 1.1);
      f.yaw -= f.roll * 1.25 * dt;
      f.gearDeploy = THREE.MathUtils.lerp(f.gearDeploy, f.pos.y < 7 ? 1 : 0, dt * 2.5);
    } else {
      const angle = this.time * 0.32;
      let cx = 0, cz = -28, rad = 68, alt = 26;
      if (this.waypoint === 'warzone') { cx = -105; cz = -18; rad = 52; alt = 22; }
      else if (this.waypoint === 'waterpolo') { cx = 105; cz = -18; rad = 50; alt = 22; }
      else if (this.waypoint === 'orbit') { cx = 0; cz = -12; rad = 148; alt = 38; }

      const tx = cx + Math.cos(angle) * rad;
      const tz = cz + Math.sin(angle) * rad;
      const desiredYaw = Math.atan2(tx - f.pos.x, tz - f.pos.z);
      let dyaw = desiredYaw - f.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      f.yaw += THREE.MathUtils.clamp(dyaw, -1.4 * dt, 1.4 * dt);
      f.roll = THREE.MathUtils.lerp(f.roll, THREE.MathUtils.clamp(-dyaw * 1.1, -0.78, 0.78), dt * 3.5);
      const desiredPitch = THREE.MathUtils.clamp((alt - f.pos.y) * 0.025, -0.35, 0.35);
      f.pitch = THREE.MathUtils.lerp(f.pitch, desiredPitch, dt * 2.5);
      f.gearDeploy = THREE.MathUtils.lerp(f.gearDeploy, 0, dt * 2.5);
    }

    const fwd = new THREE.Vector3(Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), Math.cos(f.yaw) * Math.cos(f.pitch));
    f.pos.addScaledVector(fwd, f.speed * dt);
    f.pos.y = Math.max(3.5, Math.min(130, f.pos.y));
    const r = Math.hypot(f.pos.x, f.pos.z);
    if (r > 320) { f.pos.x *= 320 / r; f.pos.z *= 320 / r; }

    this.aileronR.rotation.x = f.roll * 0.45;
    this.aileronL.rotation.x = -f.roll * 0.45;
    const flicker = 0.9 + Math.sin(this.time * 48) * 0.14;
    const flameLen = (boost ? 1.65 : 0.95) * flicker;
    this.flameOuter.scale.set(1, 1, flameLen);
    this.flameInner.scale.set(1, 1, flameLen * 0.85);
    this.burnerLight.intensity = boost ? 5.5 : 2.6;

    if (this.audioOn && this.jetGain && this.audioCtx) {
      this.jetFilter.frequency.setTargetAtTime(180 + f.speed * 4.5, this.audioCtx.currentTime, 0.08);
      this.jetGain.gain.setTargetAtTime(0.055 + (boost ? 0.04 : 0), this.audioCtx.currentTime, 0.1);
    }

    this._syncFuryMesh();
    this._updateContrails();
    this._updateCamera(dt);
    this._updateHUD();
  }

  _syncFuryMesh() {
    const f = this.flight;
    this.fury.position.copy(f.pos);
    this.fury.rotation.order = 'YXZ';
    this.fury.rotation.y = f.yaw + Math.PI;
    this.fury.rotation.x = f.pitch;
    this.fury.rotation.z = -f.roll;
    this.gearGroup.scale.y = Math.max(0.001, f.gearDeploy);
    this.gearGroup.visible = f.gearDeploy > 0.04;
  }

  _updateContrails() {
    const pushTip = (ribbon, localX) => {
      const tip = new THREE.Vector3(localX, 0, 1.45).applyMatrix4(this.fury.matrixWorld);
      ribbon.pts.push(tip);
      if (ribbon.pts.length > ribbon.maxPts) ribbon.pts.shift();
      const attr = ribbon.line.geometry.attributes.position;
      for (let i = 0; i < ribbon.maxPts; i++) {
        const pt = ribbon.pts[Math.min(i, ribbon.pts.length - 1)] || tip;
        attr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      attr.needsUpdate = true;
    };
    pushTip(this.ribbonL, -4.35);
    pushTip(this.ribbonR, 4.35);
  }

  _updateCamera(dt) {
    const f = this.flight;
    if (f.grounded) {
      const a = this.time * 0.22;
      const targetPos = new THREE.Vector3(Math.sin(a) * 14 + 6, 6.2 + Math.sin(a * 0.7) * 1.1, f.pos.z + 17);
      this.camera.position.lerp(targetPos, dt * 2.2);
      this.camera.lookAt(f.pos.x, f.pos.y + 1.8, f.pos.z - 22);
      return;
    }
    if (this.camMode === 'cinematic') {
      const a = this.time * 0.4;
      const desired = new THREE.Vector3(f.pos.x + Math.cos(a) * 26, f.pos.y + 9, f.pos.z + Math.sin(a) * 26);
      this.camera.position.lerp(desired, dt * 3.5);
      this.camera.lookAt(f.pos);
    } else {
      const back = new THREE.Vector3(-Math.sin(f.yaw), 0.24 - Math.sin(f.pitch) * 0.35, -Math.cos(f.yaw)).normalize();
      const desired = f.pos.clone().addScaledVector(back, 19.5);
      desired.y = Math.max(3.0, desired.y + 3.2);
      this.camera.position.lerp(desired, dt * 5.2);
      const lookAhead = f.pos.clone().add(new THREE.Vector3(Math.sin(f.yaw) * 18, Math.sin(f.pitch) * 10, Math.cos(f.yaw) * 18));
      this.camera.lookAt(lookAhead);
    }
  }

  _updateHUD() {
    const f = this.flight;
    const altFt = Math.max(0, Math.round((f.pos.y - 1.42) * 42));
    const kts = Math.round(f.speed * 6.4);
    const altStr = `${String(altFt).padStart(4, '0')} FT`;

    const elAlt = document.getElementById('fury-alt');
    const elHAlt = document.getElementById('header-alt');
    const elSpd = document.getElementById('fury-spd');
    const elStatus = document.getElementById('fury-status');
    const elGear = document.getElementById('fury-gear');
    const elSec = document.getElementById('fury-sector');

    if (elAlt) elAlt.textContent = altStr;
    if (elHAlt) elHAlt.textContent = altStr;
    if (elSpd) elSpd.textContent = `${String(kts).padStart(3, '0')} KTS`;
    if (elGear) elGear.textContent = f.gearDeploy > 0.5 ? 'DEPLOYED' : 'RETRACTED';
    if (elStatus) {
      elStatus.textContent = f.grounded ? 'RUNWAY READY' : this.autoLanding ? 'FINAL APPROACH' : this.manualOverrideTimer > 0 ? 'MANUAL FLIGHT' : 'AUTOPILOT ACTIVE';
    }
    if (elSec) {
      if (f.pos.distanceTo(this.warzoneCenter) < 75) elSec.textContent = 'WARZONE COMBAT';
      else if (f.pos.distanceTo(this.waterPoloCenter) < 75) elSec.textContent = 'NCAA WATER POLO';
      else if (f.pos.z > 50) elSec.textContent = 'EDWARDS RWY 22';
      else elSec.textContent = 'MONUMENT PLAZA';
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (!this.isVisible) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    this._updateWarzoneCombat(dt);
    this._updateWaterPolo();
    this._updateFlight(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
