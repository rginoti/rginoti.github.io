/**
 * ALIVE, JUMPING CHRONOLOGICAL TIMELINE ENGINE
 * Spring-physics spline that physically leaps across left / right / center anchors
 * throughout the career dossier, reacting dynamically to scroll velocity.
 */

export class TimelineEngine {
  constructor(stageEl, canvas) {
    this.stageEl = stageEl;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'flight';

    this.anchors = [];
    this.time = 0;
    this.lastScrollY = window.scrollY;
    this.scrollVel = 0;
    this.springVel = 0;
    this.progress = 0;
    this.smoothProgress = 0;

    this.packets = Array.from({ length: 7 }, (_, i) => ({
      t: i / 7,
      speed: 0.032 + (i % 3) * 0.012,
      size: 2.6 + (i % 2) * 1.1,
    }));

    this._measure();
    this._bindEvents();
    this._loop();
  }

  setMode(mode) {
    this.mode = mode;
    document.body.dataset.timeline = mode;
  }

  _measure() {
    const stageRect = this.stageEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, this.stageEl.clientWidth);
    const h = Math.max(600, this.stageEl.scrollHeight);

    if (this.canvas.width !== Math.floor(w * dpr) || this.canvas.height !== Math.floor(h * dpr)) {
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.width = w;
    this.height = h;

    const margin = w < 720 ? 22 : Math.min(110, w * 0.085);
    const nodes = Array.from(this.stageEl.querySelectorAll('[data-tl-anchor]'));
    this.anchors = nodes.map((el) => {
      const r = el.getBoundingClientRect();
      const y = r.top - stageRect.top;
      const side = el.dataset.tlSide || 'left';
      let x = margin;
      if (side === 'right') x = w - margin;
      else if (side === 'center') x = w * 0.5;
      return { x, y, side, year: el.dataset.tlYear || '', label: el.dataset.tlLabel || '' };
    });
  }

  _bindEvents() {
    const ro = new ResizeObserver(() => this._measure());
    ro.observe(this.stageEl);
    window.addEventListener('resize', () => this._measure(), { passive: true });
    window.addEventListener('load', () => this._measure());
  }

  _sampleChain(t) {
    const pts = this.anchors;
    if (pts.length < 2) return { x: this.width * 0.5, y: 0, angle: Math.PI / 2 };
    const segCount = pts.length - 1;
    const scaled = Math.max(0, Math.min(0.9999, t)) * segCount;
    const idx = Math.floor(scaled);
    const u = scaled - idx;

    const p0 = pts[idx];
    const p3 = pts[idx + 1];
    const dy = p3.y - p0.y;
    const sway = Math.sin(this.time * 1.4 + idx * 1.7) * (12 + Math.abs(this.springVel) * 0.45);
    const cp1x = p0.x + (p3.x - p0.x) * 0.12 + sway;
    const cp1y = p0.y + dy * 0.45;
    const cp2x = p3.x - (p3.x - p0.x) * 0.12 - sway;
    const cp2y = p3.y - dy * 0.45;

    const inv = 1 - u;
    const x = inv * inv * inv * p0.x + 3 * inv * inv * u * cp1x + 3 * inv * u * u * cp2x + u * u * u * p3.x;
    const y = inv * inv * inv * p0.y + 3 * inv * inv * u * cp1y + 3 * inv * u * u * cp2y + u * u * u * p3.y;
    const dx = 3 * inv * inv * (cp1x - p0.x) + 6 * inv * u * (cp2x - cp1x) + 3 * u * u * (p3.x - cp2x);
    const ddy = 3 * inv * inv * (cp1y - p0.y) + 6 * inv * u * (cp2y - cp1y) + 3 * u * u * (p3.y - cp2y);
    return { x, y, angle: Math.atan2(ddy, dx) };
  }

  _drawPath(ctx, strokeStyle, lineWidth, dash = [], maxT = 1) {
    const steps = 180;
    const endStep = Math.max(2, Math.floor(steps * maxT));
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    for (let i = 0; i <= endStep; i++) {
      const p = this._sampleChain(i / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.anchors.length < 2) return;

    const stageRect = this.stageEl.getBoundingClientRect();
    const viewProbeY = window.innerHeight * 0.45 - stageRect.top;
    const firstY = this.anchors[0].y;
    const lastY = this.anchors[this.anchors.length - 1].y;
    this.progress = Math.max(0, Math.min(1, (viewProbeY - firstY) / Math.max(1, lastY - firstY)));
    this.smoothProgress += (this.progress - this.smoothProgress) * 0.12;

    if (this.mode === 'flight') {
      this._drawPath(ctx, 'rgba(255, 77, 0, 0.14)', 1.5, [6, 8], 1);
      this._drawPath(ctx, 'rgba(255, 77, 0, 0.35)', 7, [], this.smoothProgress);
      this._drawPath(ctx, '#FF4D00', 2, [], this.smoothProgress);

      const head = this._sampleChain(this.smoothProgress);
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(head.angle);
      const grad = ctx.createRadialGradient(-12, 0, 1, -12, 0, 18);
      grad.addColorStop(0, 'rgba(255, 180, 60, 0.95)');
      grad.addColorStop(1, 'rgba(255, 77, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(-12, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F4F2EC';
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-4, -9);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-5, -2.5);
      ctx.lineTo(-11, -5);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-11, 5);
      ctx.lineTo(-5, 2.5);
      ctx.lineTo(-8, 7);
      ctx.lineTo(-4, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (this.mode === 'packet') {
      this._drawPath(ctx, 'rgba(56, 189, 248, 0.16)', 1.5, [2, 6], 1);
      this._drawPath(ctx, 'rgba(56, 189, 248, 0.55)', 2, [], this.smoothProgress);

      for (const pkt of this.packets) {
        pkt.t = (pkt.t + pkt.speed * 0.016) % 1;
        const p = this._sampleChain(pkt.t);
        ctx.save();
        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pkt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const head = this._sampleChain(this.smoothProgress);
      const pulse = (this.time * 24) % 28;
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - pulse / 28})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      this._drawPath(ctx, 'rgba(255, 77, 0, 0.22)', 1, [], 1);
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 77, 0, 0.78)';
      ctx.lineWidth = 2.2;
      const steps = 180;
      const maxStep = Math.floor(steps * this.smoothProgress);
      for (let i = 0; i <= maxStep; i++) {
        const t = i / steps;
        const p = this._sampleChain(t);
        const wave = Math.sin(t * 28 + this.time * 2.2) * (5 + Math.min(18, Math.abs(this.springVel) * 0.35));
        const nx = p.x + Math.cos(p.angle + Math.PI / 2) * wave;
        const ny = p.y + Math.sin(p.angle + Math.PI / 2) * wave;
        if (i === 0) ctx.moveTo(nx, ny);
        else ctx.lineTo(nx, ny);
      }
      ctx.stroke();
      ctx.restore();
    }

    const accent = this.mode === 'packet' ? '#38BDF8' : '#FF4D00';
    this.anchors.forEach((a, i) => {
      const anchorT = i / (this.anchors.length - 1);
      const reached = this.smoothProgress >= anchorT - 0.02;
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.x, a.y, reached ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = reached ? accent : 'rgba(148, 163, 184, 0.35)';
      ctx.fill();
      if (reached) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 12 + Math.sin(this.time * 3 + i) * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  _loop() {
    this.time += 0.016;
    const dy = window.scrollY - this.lastScrollY;
    this.lastScrollY = window.scrollY;
    this.scrollVel += (dy - this.scrollVel) * 0.18;
    this.springVel += (this.scrollVel - this.springVel) * 0.08;
    this.springVel *= 0.92;
    this._draw();
    requestAnimationFrame(() => this._loop());
  }
}
