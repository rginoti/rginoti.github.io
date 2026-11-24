/**
 * ALIVE TIMELINE ENGINE — ALL 3 MODES
 *   - 'flight'     (Option A — Default): Live Flight-Path Telemetry Spline
 *   - 'traceroute' (Option B): Network Traceroute / Packet-Hop Graph
 *   - 'morph'      (Option C): Morphing Chapter Spine (HUD -> Minimap -> Oscilloscope -> Water)
 *
 * Switchable via URL query (?timeline=flight | traceroute | morph | a | b | c)
 * or DevTools Console: rg.timeline('flight' | 'traceroute' | 'morph')
 */

const MODE_ALIASES = {
  a: 'flight',
  flight: 'flight',
  b: 'traceroute',
  traceroute: 'traceroute',
  c: 'morph',
  morph: 'morph',
};

const MODE_LABELS = {
  flight: 'FLIGHT-PATH',
  traceroute: 'TRACEROUTE',
  morph: 'MORPH-SPINE',
};

export class TimelineEngine {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext('2d');
    this.mode = this._resolveInitialMode();
    this.nodes = [];
    this.scrollProgress = 0;
    this.scrollVelocity = 0;
    this.lastScrollY = window.scrollY;
    this.smoothHeadY = 0;
    this.pauseTimer = 0;
    this.pointer = { x: -999, y: -999 };
    this.packets = Array.from({ length: 7 }, (_, i) => ({
      t: i / 7,
      speed: 0.065 + (i % 3) * 0.02,
      color: i % 2 === 0 ? '#38bdf8' : '#f59e0b',
    }));
    this.rafId = null;
    this.time = 0;

    this._bindEvents();
    this.resize();
    this.setMode(this.mode, false);
    this._installConsoleAPI();
    this._loop();
  }

  _resolveInitialMode() {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('timeline') || '').toLowerCase();
    return MODE_ALIASES[q] || 'flight';
  }

  _installConsoleAPI() {
    const self = this;
    window.rg = {
      timeline(modeName) {
        const key = String(modeName || '').toLowerCase();
        const resolved = MODE_ALIASES[key];
        if (!resolved) {
          console.warn(
            '%c[RG // TIMELINE]%c Unknown mode. Use: rg.timeline("flight"), rg.timeline("traceroute"), or rg.timeline("morph") (or "a", "b", "c").',
            'color:#38bdf8;font-weight:bold',
            'color:inherit'
          );
          return;
        }
        self.setMode(resolved, true);
        return `Timeline switched to: ${resolved.toUpperCase()}`;
      },
      modes() {
        console.table([
          { key: 'flight (a)', name: 'Live Flight-Path Telemetry Spline', url: '?timeline=flight' },
          { key: 'traceroute (b)', name: 'Network Traceroute / Packet-Hop Graph', url: '?timeline=traceroute' },
          { key: 'morph (c)', name: 'Morphing Chapter Spine (HUD → Minimap → Wave)', url: '?timeline=morph' },
        ]);
      },
      help() {
        console.log(
          '%cRONALD GINOTI // TELEMETRY CONSOLE\n' +
            '%c───────────────────────────────────────────────\n' +
            'rg.timeline("flight")     → Option A: Flight-Path Spline (Default)\n' +
            'rg.timeline("traceroute") → Option B: GCP/MTU Packet-Hop Graph\n' +
            'rg.timeline("morph")      → Option C: Morphing Chapter Spine\n' +
            'rg.modes()                → List modes & direct test URLs\n' +
            '───────────────────────────────────────────────',
          'color:#38bdf8;font-weight:bold;font-size:12px',
          'color:#cbd5e1;font-family:monospace'
        );
      },
    };

    console.log(
      '%c[RG // SYSTEMS]%c Portfolio online. Type %crg.help()%c in console to test all 3 alive timeline engines.',
      'color:#38bdf8;font-weight:bold',
      'color:#98a2b3',
      'color:#f59e0b;font-weight:bold',
      'color:#98a2b3'
    );
  }

  setMode(mode, logChange = true) {
    this.mode = mode;
    document.body.dataset.timeline = mode;
    const pill = document.getElementById('hud-timeline-mode');
    if (pill) pill.textContent = MODE_LABELS[mode] || mode.toUpperCase();
    if (logChange) {
      console.log(`%c[RG // TIMELINE]%c Active engine → ${MODE_LABELS[mode]}`, 'color:#38bdf8;font-weight:bold', 'color:#e2e8f0');
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener(
      'mousemove',
      (e) => {
        const rect = this.container.getBoundingClientRect();
        this.pointer.x = e.clientX - rect.left;
        this.pointer.y = e.clientY - rect.top;
      },
      { passive: true }
    );
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = this.container.scrollHeight;
    this.canvas.width = Math.max(1, Math.floor(this.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(this.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._measureNodes();
  }

  _measureNodes() {
    const containerTop = this.container.getBoundingClientRect().top + window.scrollY;
    const els = Array.from(this.container.querySelectorAll('[data-node]'));
    const margin = Math.min(90, this.width * 0.08);
    this.nodes = els.map((el, idx) => {
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY - containerTop + 34;
      // Weave left and right across the screen dynamically
      const side = idx % 2 === 0 ? 0.06 : 0.94;
      const x = Math.max(margin, Math.min(this.width - margin, this.width * side));
      return {
        x,
        y,
        date: el.dataset.nodeDate || '',
        label: el.dataset.nodeLabel || '',
        chapter: el.closest('[data-chapter]')?.dataset.chapter || 'anduril',
      };
    });
  }

  _sampleSpline(t) {
    if (this.nodes.length < 2) return { x: this.width * 0.5, y: 0, angle: Math.PI / 2 };
    const totalSegs = this.nodes.length - 1;
    const clamped = Math.max(0, Math.min(1, t));
    const scaled = clamped * totalSegs;
    const i = Math.min(totalSegs - 1, Math.floor(scaled));
    const localT = scaled - i;
    const p0 = this.nodes[i];
    const p1 = this.nodes[i + 1];

    // Smooth S-curve cubic Bezier between weaving waypoints
    const midY = (p0.y + p1.y) * 0.5;
    const c1x = p0.x;
    const c1y = midY;
    const c2x = p1.x;
    const c2y = midY;

    const u = 1 - localT;
    const x =
      u * u * u * p0.x +
      3 * u * u * localT * c1x +
      3 * u * localT * localT * c2x +
      localT * localT * localT * p1.x;
    const y =
      u * u * u * p0.y +
      3 * u * u * localT * c1y +
      3 * u * localT * localT * c2y +
      localT * localT * localT * p1.y;

    const dx =
      3 * u * u * (c1x - p0.x) +
      6 * u * localT * (c2x - c1x) +
      3 * localT * localT * (p1.x - c2x);
    const dy =
      3 * u * u * (c1y - p0.y) +
      6 * u * localT * (c2y - c1y) +
      3 * localT * localT * (p1.y - c2y);

    return { x, y, angle: Math.atan2(dy, dx) };
  }

  _loop() {
    this.time += 0.016;
    const dy = window.scrollY - this.lastScrollY;
    this.lastScrollY = window.scrollY;
    this.scrollVelocity += (dy - this.scrollVelocity) * 0.14;

    if (Math.abs(this.scrollVelocity) < 0.6) {
      this.pauseTimer = Math.min(3, this.pauseTimer + 0.016);
    } else {
      this.pauseTimer = 0;
    }

    const containerTop = this.container.getBoundingClientRect().top + window.scrollY;
    const viewMid = window.scrollY + window.innerHeight * 0.42 - containerTop;
    const firstY = this.nodes[0]?.y || 0;
    const lastY = this.nodes[this.nodes.length - 1]?.y || this.height;
    const targetProgress = Math.max(0, Math.min(1, (viewMid - firstY) / Math.max(1, lastY - firstY)));
    this.scrollProgress += (targetProgress - this.scrollProgress) * 0.12;

    this._render();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.nodes.length < 2) return;

    if (this.mode === 'flight') {
      this._renderFlightPath(ctx);
    } else if (this.mode === 'traceroute') {
      this._renderTraceroute(ctx);
    } else {
      this._renderMorphSpine(ctx);
    }
  }

  /* =========================================================
     OPTION A: LIVE FLIGHT-PATH TELEMETRY SPLINE
     ========================================================= */
  _renderFlightPath(ctx) {
    const steps = 160;
    const activeIndex = Math.floor(this.scrollProgress * steps);

    // Subtle full guide track
    ctx.save();
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const pt = this._sampleSpline(s / steps);
      if (s === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.restore();

    // Glowing active flight trail
    ctx.save();
    ctx.beginPath();
    for (let s = 0; s <= activeIndex; s++) {
      const t = s / steps;
      const pt = this._sampleSpline(t);
      const springOffset = Math.sin(t * 28 + this.time * 4) * Math.min(12, Math.abs(this.scrollVelocity) * 0.35);
      if (s === 0) ctx.moveTo(pt.x + springOffset, pt.y);
      else ctx.lineTo(pt.x + springOffset, pt.y);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    // Waypoints
    this.nodes.forEach((n, idx) => {
      const nodeT = idx / (this.nodes.length - 1);
      const reached = this.scrollProgress >= nodeT - 0.02;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, reached ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = reached ? '#38bdf8' : 'rgba(148, 163, 184, 0.35)';
      ctx.fill();
      if (reached) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 11 + Math.sin(this.time * 3 + idx) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = reached ? 'rgba(226, 232, 240, 0.72)' : 'rgba(148, 163, 184, 0.35)';
      const alignRight = n.x > this.width * 0.5;
      ctx.textAlign = alignRight ? 'right' : 'left';
      ctx.fillText(`${n.date} // ${n.label}`, alignRight ? n.x - 16 : n.x + 16, n.y + 3);
      ctx.restore();
    });

    // Leading-Edge Miniature Fury Vector + Radar Sweep on Pause
    const head = this._sampleSpline(this.scrollProgress);
    ctx.save();
    ctx.translate(head.x, head.y);

    if (this.pauseTimer > 0.35) {
      const sweepR = 16 + ((this.time * 28) % 34);
      const alpha = Math.max(0, 1 - (sweepR - 16) / 34) * 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, sweepR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.rotate(head.angle);
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     OPTION B: NETWORK TRACEROUTE / PACKET-HOP GRAPH
     ========================================================= */
  _renderTraceroute(ctx) {
    ctx.save();
    // Orthogonal routed links between career hops
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const midY = (a.y + b.y) * 0.5;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x, midY);
      ctx.lineTo(b.x, midY);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Simulated hop telemetry tag at midpoint
      const hopMs = 11 + ((i * 17) % 38);
      ctx.font = '400 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.48)';
      ctx.textAlign = 'center';
      ctx.fillText(`HOP 0${i + 1} · MTU 1500 · ${hopMs}ms`, (a.x + b.x) * 0.5, midY - 6);
    }

    // Animated Data Packets hopping across the topology
    this.packets.forEach((p) => {
      p.t = (p.t + p.speed * 0.016) % 1;
      const segs = this.nodes.length - 1;
      const sIdx = Math.min(segs - 1, Math.floor(p.t * segs));
      const lt = p.t * segs - sIdx;
      const a = this.nodes[sIdx];
      const b = this.nodes[sIdx + 1];
      const midY = (a.y + b.y) * 0.5;

      let px, py;
      if (lt < 0.33) {
        const k = lt / 0.33;
        px = a.x;
        py = a.y + (midY - a.y) * k;
      } else if (lt < 0.66) {
        const k = (lt - 0.33) / 0.33;
        px = a.x + (b.x - a.x) * k;
        py = midY;
      } else {
        const k = (lt - 0.66) / 0.34;
        px = b.x;
        py = midY + (b.y - midY) * k;
      }

      ctx.beginPath();
      ctx.arc(px, py, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fill();
    });

    // Router Nodes with Jitter Micro-Bars
    this.nodes.forEach((n, idx) => {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#060709';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(n.x - 6, n.y - 6, 12, 12);
      ctx.fillRect(n.x - 5, n.y - 5, 10, 10);

      // Tiny jitter waveform next to node
      const dir = n.x > this.width * 0.5 ? -1 : 1;
      ctx.beginPath();
      for (let j = 0; j < 18; j++) {
        const jx = n.x + dir * (16 + j * 3);
        const jy = n.y + Math.sin(this.time * 6 + j * 0.9 + idx) * 4;
        if (j === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      }
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.restore();
  }

  /* =========================================================
     OPTION C: MORPHING CHAPTER SPINE
     Anduril (HUD Pitch) -> Activision (Minimap) -> Self-Taught (Oscilloscope) -> UCSD/Crespi (Water Ripple)
     ========================================================= */
  _renderMorphSpine(ctx) {
    const steps = 220;
    const tilt = Math.max(-18, Math.min(18, this.scrollVelocity * 0.5));

    ctx.save();
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const p0 = this._sampleSpline(t0);
      const p1 = this._sampleSpline(t1);

      // Determine era by normalized vertical progress
      if (t0 < 0.28) {
        // ANDURIL: Crisp aerospace HUD pitch-ladder
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        if (s % 6 === 0) {
          ctx.beginPath();
          ctx.moveTo(p0.x - 14, p0.y - tilt * 0.3);
          ctx.lineTo(p0.x + 14, p0.y + tilt * 0.3);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (t0 < 0.58) {
        // ACTIVISION: Tactical minimap route
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = s % 2 === 0 ? 'rgba(245, 158, 11, 0.65)' : 'rgba(245, 158, 11, 0.15)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      } else if (t0 < 0.78) {
        // SELF-TAUGHT: Live oscilloscope trace
        const osc0 = Math.sin(s * 0.75 + this.time * 6) * 10;
        const osc1 = Math.sin((s + 1) * 0.75 + this.time * 6) * 10;
        ctx.beginPath();
        ctx.moveTo(p0.x + osc0, p0.y);
        ctx.lineTo(p1.x + osc1, p1.y);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        // UCSD & CRESPI: Reactive water-polo ripple sine wave
        const distToPointer = Math.hypot(p0.x - this.pointer.x, p0.y - this.pointer.y);
        const rippleBoost = distToPointer < 180 ? (1 - distToPointer / 180) * 18 : 0;
        const w0 = Math.sin(s * 0.35 - this.time * 3.2) * (9 + rippleBoost);
        const w1 = Math.sin((s + 1) * 0.35 - this.time * 3.2) * (9 + rippleBoost);
        ctx.beginPath();
        ctx.moveTo(p0.x + w0, p0.y);
        ctx.lineTo(p1.x + w1, p1.y);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.72)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
