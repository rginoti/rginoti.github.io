/**
 * 3D AEROSPACE WORLD & SCULPTED ANDURIL YFQ-44A FURY FLIGHT DECK (v4)
 * Modeled directly from official Anduril YFQ-44A Fury photography & studio renders:
 *  - Dedicated studio rim/key aircraft rig so every chine, swept wing edge, pitot boom,
 *    chin-mounted intake, yellow formation light strip, and single vertical stabilizer gleams clearly
 *  - Sculptural die-cut architectural "RONALD GINOTI" monument (zero highway billboard!)
 *  - Recessed precision LED runway lighting on dark slate tarmac
 *  - Live 3D Warzone Combat Sector (continuous tracer volleys & grenade shockwaves)
 *  - 3D NCAA Water Polo Arena (rippling dark-cyan pool, goals, swimmers & ball)
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
      pos: new THREE.Vector3(0, 1.42, 144),
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
    this._buildTerrainAndRunway();
    this._buildSculpturalName();
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
    this.scene.background = new THREE.Color(0x030406);
    this.scene.fog = new THREE.FogExp2(0x06080c, 0.00175);

    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.4, 1600);
    this.camera.position.set(11.5, 5.2, 159);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const hemi = new THREE.HemisphereLight(0xcbd5e1, 0x0f131a, 1.05);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf1f5f9, 2.2);
    keyLight.position.set(120, 110, 90);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(keyLight);

    const backRim = new THREE.DirectionalLight(0x94a3b8, 1.35);
    backRim.position.set(-110, 65, -140);
    this.scene.add(backRim);

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
        uHorizonDir: { value: new THREE.Vector3(0.25, 0.08, -0.96).normalize() },
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
        uniform vec3 uHorizonDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 zenith = vec3(0.008, 0.010, 0.016);
          vec3 mid = vec3(0.032, 0.042, 0.062);
          vec3 horizon = vec3(0.085, 0.102, 0.132);
          vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
          col = mix(col, zenith, smoothstep(0.18, 0.72, h));
          float glow = max(dot(dir, uHorizonDir), 0.0);
          col += vec3(0.16, 0.19, 0.24) * pow(glow, 9.0) * 0.65;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    const starVerts = [];
    for (let i = 0; i < 600; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.38;
      const r = 920;
      starVerts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 40, r * Math.sin(phi) * Math.sin(theta));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe2e8f0, size: 1.2, transparent: true, opacity: 0.45 })));
  }

  _buildTerrainAndRunway() {
    const size = 1200;
    const segs = 96;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = [];
    const cFlat = new THREE.Color(0x07090d);
    const cSlope = new THREE.Color(0x10141c);
    const cRidge = new THREE.Color(0x181e29);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z - 20);
      const flatMask = THREE.MathUtils.smoothstep(dist, 200, 360);
      const n1 = Math.sin(x * 0.011) * Math.cos(z * 0.011) * 30;
      const n2 = Math.abs(Math.sin(x * 0.022 + z * 0.016)) * 24;
      const h = Math.max(0, (n1 + n2 + 18) * flatMask);
      pos.setY(i, h);

      if (h < 1.5) tmp.copy(cFlat);
      else if (h < 22) tmp.copy(cFlat).lerp(cSlope, h / 22);
      else tmp.copy(cSlope).lerp(cRidge, Math.min(1, (h - 22) / 36));
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.08 })
    );
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    const grid = new THREE.GridHelper(420, 42, 0x161b24, 0x0d1017);
    grid.position.set(0, 0.03, 45);
    this.scene.add(grid);

    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.16, 152),
      new THREE.MeshStandardMaterial({ color: 0x0d1016, roughness: 0.78, metalness: 0.15 })
    );
    runway.position.set(0, 0.08, 100);
    runway.receiveShadow = true;
    this.scene.add(runway);

    const markMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55 });
    for (let z = 32; z <= 164; z += 11) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 5.2), markMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.17, z);
      this.scene.add(dash);
    }

    const edgeLedMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1 });
    const voltLedMat = new THREE.MeshBasicMaterial({ color: 0xdff140 });
    this.runwayStrobes = [];
    for (let z = 28; z <= 172; z += 12) {
      for (const side of [-8.8, 8.8]) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.36), edgeLedMat);
        led.position.set(side, 0.18, z);
        this.scene.add(led);
      }
    }
    for (let z = 178; z <= 210; z += 8) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), voltLedMat.clone());
      s.position.set(0, 0.18, z);
      this.scene.add(s);
      this.runwayStrobes.push(s);
    }
  }

  _buildSculpturalName() {
    const group = new THREE.Group();
    group.position.set(0, 0, -32);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(78, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.35, metalness: 0.7 })
    );
    plinth.position.y = 0.3;
    group.add(plinth);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(78, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xdff140 })
    );
    trim.position.set(0, 0.62, 4.02);
    group.add(trim);

    const texCanvas = document.createElement('canvas');
    texCanvas.width = 2048;
    texCanvas.height = 384;
    const tex = new THREE.CanvasTexture(texCanvas);
    tex.anisotropy = 8;

    const drawLetters = () => {
      const ctx = texCanvas.getContext('2d');
      ctx.clearRect(0, 0, 2048, 384);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F5F5F7';
      ctx.font = '700 210px -apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Arial, sans-serif';
      ctx.fillText('RONALD GINOTI', 1024, 210);
      tex.needsUpdate = true;
    };
    drawLetters();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLetters);

    for (let i = 0; i < 7; i++) {
      const isFront = i === 6;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.18,
        side: THREE.DoubleSide,
        color: isFront ? 0xffffff : 0x475569,
        emissive: isFront ? 0xf8fafc : 0x1e293b,
        emissiveMap: tex,
        emissiveIntensity: isFront ? 0.55 : 0.15,
        roughness: 0.25,
        metalness: 0.75,
      });
      const layer = new THREE.Mesh(new THREE.PlaneGeometry(76, 14.2), mat);
      layer.position.set(0, 8.2, (i - 3) * 0.26);
      group.add(layer);
    }

    const uplight = new THREE.PointLight(0xe2e8f0, 2.2, 55);
    uplight.position.set(0, 5, 12);
    group.add(uplight);

    this.scene.add(group);
  }

  _buildWarzoneSector() {
    const wz = new THREE.Group();
    wz.position.set(-108, 0, -20);
    this.warzoneCenter = new THREE.Vector3(-108, 6, -20);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(84, 0.3, 74),
      new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.9 })
    );
    pad.position.y = 0.15;
    wz.add(pad);

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.88 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.6, metalness: 0.45 });

    [
      { x: -22, z: -16, w: 15, h: 13, d: 14 },
      { x: 20, z: -18, w: 17, h: 10, d: 13 },
      { x: -18, z: 18, w: 14, h: 8.5, d: 14 },
      { x: 22, z: 16, w: 14, h: 15, d: 12 },
    ].forEach((b) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), concreteMat);
      m.position.set(b.x, b.h / 2, b.z);
      wz.add(m);
    });

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 4.2), darkSteelMat);
    c1.position.set(-3, 1.8, 2);
    c1.rotation.y = 0.25;
    wz.add(c1);

    this.squadA = [
      new THREE.Vector3(-126, 2.4, -28),
      new THREE.Vector3(-120, 2.4, -4),
      new THREE.Vector3(-128, 2.4, -16),
    ];
    this.squadB = [
      new THREE.Vector3(-88, 2.4, -30),
      new THREE.Vector3(-86, 2.4, -6),
      new THREE.Vector3(-91, 2.4, -18),
    ];

    const opMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    [...this.squadA, ...this.squadB].forEach((p) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 2.0, 8), opMat);
      body.position.set(p.x, 1.0, p.z);
      this.scene.add(body);
    });

    this.warzoneFlash = new THREE.PointLight(0xff7a28, 1.8, 75);
    this.warzoneFlash.position.set(-108, 8, -20);
    this.scene.add(this.warzoneFlash);
    this.scene.add(wz);
  }

  _buildWaterPoloArena() {
    const wp = new THREE.Group();
    wp.position.set(108, 0, -20);
    this.waterPoloCenter = new THREE.Vector3(108, 4, -20);

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(58, 0.9, 42),
      new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.75, metalness: 0.2 })
    );
    deck.position.y = 0.45;
    wp.add(deck);

    const waterGeo = new THREE.PlaneGeometry(46, 30, 32, 20);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterGeo = waterGeo;
    const water = new THREE.Mesh(
      waterGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.28,
        roughness: 0.16,
        metalness: 0.25,
      })
    );
    water.position.y = 0.96;
    wp.add(water);

    const goalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    for (const gx of [-21.5, 21.5]) {
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 7.2), goalMat);
      topBar.position.set(gx, 2.8, 0);
      wp.add(topBar);
      for (const gz of [-3.5, 3.5]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.9, 0.3), goalMat);
        post.position.set(gx, 1.85, gz);
        wp.add(post);
      }
    }

    this.poloPlayers = [];
    const capBlue = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const capWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), i < 5 ? capBlue : capWhite);
      const bx = (i < 5 ? -1 : 1) * (4 + (i % 5) * 3.1);
      const bz = ((i % 3) - 1) * 7.2;
      p.position.set(bx, 1.25, bz);
      p.userData = { baseX: bx, baseZ: bz, phase: i * 1.1 };
      wp.add(p);
      this.poloPlayers.push(p);
    }
    this.poloBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xdff140, emissive: 0xa3b818, emissiveIntensity: 0.35 })
    );
    this.poloBall.position.set(0, 2.0, 0);
    wp.add(this.poloBall);

    const poolGlow = new THREE.PointLight(0x38bdf8, 1.8, 60);
    poolGlow.position.set(0, 10, 0);
    wp.add(poolGlow);
    this.scene.add(wp);
  }

  _buildFuryYFQ44A() {
    const fury = new THREE.Group();
    this.fury = fury;

    const upperGunmetal = new THREE.MeshStandardMaterial({
      color: 0x4b5362,
      roughness: 0.32,
      metalness: 0.68,
    });
    const dorsalDark = new THREE.MeshStandardMaterial({
      color: 0x252932,
      roughness: 0.38,
      metalness: 0.58,
    });
    const slimeMat = new THREE.MeshBasicMaterial({ color: 0xdff140 });
    const missileMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.28, metalness: 0.3 });

    const jetKey = new THREE.PointLight(0xf8fafc, 3.6, 26);
    jetKey.position.set(4.5, 6.0, 2.5);
    fury.add(jetKey);

    const jetRim = new THREE.PointLight(0x93c5fd, 1.8, 18);
    jetRim.position.set(-4.5, 3.5, -3.5);
    fury.add(jetRim);

    const fuseGeo = new THREE.CylinderGeometry(0.42, 0.68, 6.2, 6);
    fuseGeo.rotateX(Math.PI / 2);
    fuseGeo.scale(1.48, 0.72, 1.0);
    const fuselage = new THREE.Mesh(fuseGeo, upperGunmetal);
    fuselage.position.set(0, 0, -0.1);
    fury.add(fuselage);

    const noseGeo = new THREE.ConeGeometry(0.62, 3.2, 6);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.scale(1.0, 0.62, 1.0);
    const nose = new THREE.Mesh(noseGeo, upperGunmetal);
    nose.position.set(0, -0.02, -4.8);
    fury.add(nose);

    const pitot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.032, 1.25, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.15 })
    );
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(0, -0.02, -6.85);
    fury.add(pitot);

    const spineGeo = new THREE.BoxGeometry(0.76, 0.14, 4.2);
    const spine = new THREE.Mesh(spineGeo, dorsalDark);
    spine.position.set(0, 0.25, -1.15);
    fury.add(spine);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.44, 2.45), dorsalDark);
    intake.position.set(0, -0.44, -1.9);
    fury.add(intake);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.6, -1.15);
    wingShape.lineTo(4.35, 0.95);
    wingShape.lineTo(4.35, 1.75);
    wingShape.lineTo(0.6, 1.85);
    wingShape.closePath();

    const wingExtrude = { depth: 0.10, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const rightWingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrude);
    rightWingGeo.rotateX(Math.PI / 2);
    const rightWing = new THREE.Mesh(rightWingGeo, upperGunmetal);
    rightWing.position.set(0, 0.02, 0);
    fury.add(rightWing);

    const leftWing = rightWing.clone();
    leftWing.scale.x = -1;
    fury.add(leftWing);

    for (const sx of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.05), slimeMat);
      strip.position.set(sx * 4.18, 0.08, 1.35);
      fury.add(strip);
      const noseStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.34), slimeMat);
      noseStrip.position.set(sx * 0.46, 0.06, -3.6);
      fury.add(noseStrip);
    }

    this.aileronR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.30), dorsalDark);
    this.aileronR.position.set(2.9, -0.02, 1.82);
    fury.add(this.aileronR);
    this.aileronL = this.aileronR.clone();
    this.aileronL.position.x = -2.9;
    fury.add(this.aileronL);

    for (const side of [-2.15, 2.15]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.30, 1.15), dorsalDark);
      pylon.position.set(side, -0.22, 0.55);
      fury.add(pylon);
      const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.15, 8), missileMat);
      missile.rotation.x = Math.PI / 2;
      missile.position.set(side, -0.40, 0.5);
      fury.add(missile);
    }

    const stabShape = new THREE.Shape();
    stabShape.moveTo(0.45, 2.65);
    stabShape.lineTo(2.15, 3.65);
    stabShape.lineTo(2.15, 4.2);
    stabShape.lineTo(0.45, 4.15);
    stabShape.closePath();
    const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    stabGeo.rotateX(Math.PI / 2);
    const stabR = new THREE.Mesh(stabGeo, upperGunmetal);
    fury.add(stabR);
    const stabL = stabR.clone();
    stabL.scale.x = -1;
    fury.add(stabL);

    const finShape = new THREE.Shape();
    finShape.moveTo(2.15, 0.25);
    finShape.lineTo(3.6, 2.5);
    finShape.lineTo(4.32, 2.5);
    finShape.lineTo(4.15, 0.25);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
    finGeo.rotateY(-Math.PI / 2);
    finGeo.translate(0.045, 0, 0);
    const tailFin = new THREE.Mesh(finGeo, upperGunmetal);
    fury.add(tailFin);

    const finCap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.72), dorsalDark);
    finCap.position.set(0, 2.46, 3.96);
    fury.add(finCap);

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.43, 0.85, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e222a, metalness: 0.8, roughness: 0.3 })
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0, 3.35);
    fury.add(nozzle);

    const flameOuterGeo = new THREE.ConeGeometry(0.32, 2.6, 12, 1, true);
    flameOuterGeo.rotateX(Math.PI / 2);
    flameOuterGeo.translate(0, 0, 1.3);
    this.flameOuter = new THREE.Mesh(
      flameOuterGeo,
      new THREE.MeshBasicMaterial({ color: 0xff7a28, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    this.flameOuter.position.set(0, 0, 3.7);
    fury.add(this.flameOuter);

    const flameInnerGeo = new THREE.ConeGeometry(0.16, 1.5, 10, 1, true);
    flameInnerGeo.rotateX(Math.PI / 2);
    flameInnerGeo.translate(0, 0, 0.75);
    this.flameInner = new THREE.Mesh(
      flameInnerGeo,
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
    );
    this.flameInner.position.set(0, 0, 3.7);
    fury.add(this.flameInner);

    this.burnerLight = new THREE.PointLight(0xff8533, 0.5, 18);
    this.burnerLight.position.set(0, 0, 4.5);
    fury.add(this.burnerLight);

    this.gearGroup = new THREE.Group();
    const strutMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.9 });
    [[0, -3.1], [-1.15, 0.85], [1.15, 0.85]].forEach(([gx, gz]) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 6), strutMat);
      strut.position.set(gx, -0.78, gz);
      this.gearGroup.add(strut);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.13, 12), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(gx, -1.22, gz);
      this.gearGroup.add(tire);
    });
    fury.add(this.gearGroup);

    const makeRibbon = () => {
      const maxPts = 42;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.30 }));
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
      const tracerGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.6, 5);
      tracerGeo.rotateX(Math.PI / 2);
      const tracer = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: fromA ? 0xffb366 : 0xfef08a }));
      tracer.position.copy(src);
      tracer.lookAt(dst);
      this.scene.add(tracer);
      this.tracers.push({ mesh: tracer, vel: dir.multiplyScalar(110), life: 0.5 });
      this.warzoneFlash.intensity = 3.2;
    }

    if (this.grenadeTimer > 2.3) {
      this.grenadeTimer = 0;
      const ex = -108 + (Math.random() - 0.5) * 34;
      const ez = -20 + (Math.random() - 0.5) * 26;

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff6b24, transparent: true, opacity: 0.9 })
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
      this.warzoneFlash.intensity = 7.5;
    }

    this.warzoneFlash.intensity = THREE.MathUtils.lerp(this.warzoneFlash.intensity, 1.4, dt * 6);

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
      e.ball.scale.setScalar(1 + p * 8.0);
      e.ball.position.y = 1.4 + p * 5.0;
      e.ball.material.opacity = Math.max(0, 1 - p);
      e.ring.scale.setScalar(1 + p * 13);
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
      pos.setY(i, Math.sin(x * 0.45 + this.time * 3.1) * 0.14 + Math.cos(z * 0.55 + this.time * 2.4) * 0.12);
    }
    pos.needsUpdate = true;

    this.poloPlayers.forEach((p) => {
      p.position.y = 1.22 + Math.sin(this.time * 3.4 + p.userData.phase) * 0.18;
      p.position.x = p.userData.baseX + Math.sin(this.time * 0.8 + p.userData.phase) * 1.3;
    });
    if (this.poloBall) {
      const arc = (this.time * 0.9) % (Math.PI * 2);
      this.poloBall.position.x = Math.sin(arc) * 13;
      this.poloBall.position.y = 1.8 + Math.abs(Math.cos(arc * 2)) * 3.5;
      this.poloBall.position.z = Math.cos(arc) * 5;
    }
  }

  _updateFlight(dt) {
    const f = this.flight;

    this.runwayStrobes.forEach((s, idx) => {
      const wave = ((this.time * 4.5 - idx * 0.6) % 2 + 2) % 2;
      s.material.color.setHex(wave < 0.35 ? 0xffffff : 0xdff140);
    });

    if (f.grounded) {
      f.speed = THREE.MathUtils.lerp(f.speed, 0, dt * 3);
      f.pitch = THREE.MathUtils.lerp(f.pitch, 0, dt * 4);
      f.roll = THREE.MathUtils.lerp(f.roll, 0, dt * 4);
      f.gearDeploy = THREE.MathUtils.lerp(f.gearDeploy, 1, dt * 4);
      this.flameOuter.scale.set(0.35, 0.35, 0.18);
      this.flameInner.scale.set(0.28, 0.28, 0.18);
      this.burnerLight.intensity = 0.35;
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
      const target = new THREE.Vector3(0, 1.42, 144);
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
        f.pos.set(0, 1.42, 144);
        f.yaw = Math.PI;
        f.pitch = 0;
        f.roll = 0;
        f.speed = 0;
        f.grounded = true;
        this.autoLanding = false;
        this.isFlying = false;
        if (this.heroEl) this.heroEl.classList.remove('is-flying');
        const lbl = document.getElementById('btn-takeoff-label');
        if (lbl) lbl.textContent = 'TAKE CONTROL · LAUNCH FURY';
        const tl = document.getElementById('touch-takeoff-land');
        if (tl) tl.textContent = 'LAUNCH';
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
      let cx = 0, cz = -32, rad = 68, alt = 24;
      if (this.waypoint === 'warzone') { cx = -108; cz = -20; rad = 52; alt = 22; }
      else if (this.waypoint === 'waterpolo') { cx = 108; cz = -20; rad = 50; alt = 22; }
      else if (this.waypoint === 'orbit') { cx = 0; cz = -14; rad = 148; alt = 36; }

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
    const flameLen = (boost ? 1.6 : 0.9) * flicker;
    this.flameOuter.scale.set(1, 1, flameLen);
    this.flameInner.scale.set(1, 1, flameLen * 0.85);
    this.burnerLight.intensity = boost ? 4.8 : 2.2;

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
      const sway = Math.sin(this.time * 0.25) * 2.2;
      const targetPos = new THREE.Vector3(6.8 + sway, 4.1, f.pos.z + 11.2);
      this.camera.position.lerp(targetPos, dt * 2.5);
      this.camera.lookAt(f.pos.x - 2.2, f.pos.y + 1.1, f.pos.z - 26);
      return;
    }
    if (this.camMode === 'cinematic') {
      const a = this.time * 0.4;
      const desired = new THREE.Vector3(f.pos.x + Math.cos(a) * 24, f.pos.y + 8, f.pos.z + Math.sin(a) * 24);
      this.camera.position.lerp(desired, dt * 3.5);
      this.camera.lookAt(f.pos);
    } else {
      const back = new THREE.Vector3(-Math.sin(f.yaw), 0.22 - Math.sin(f.pitch) * 0.35, -Math.cos(f.yaw)).normalize();
      const desired = f.pos.clone().addScaledVector(back, 17.5);
      desired.y = Math.max(3.0, desired.y + 2.8);
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
      if (f.pos.distanceTo(this.warzoneCenter) < 75) elSec.textContent = 'WARZONE OPS';
      else if (f.pos.distanceTo(this.waterPoloCenter) < 75) elSec.textContent = 'NCAA WATER POLO';
      else if (f.pos.z > 50) elSec.textContent = 'RUNWAY 22';
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
