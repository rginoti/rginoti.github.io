/**
 * ALIVE, JUMPING CHRONOLOGICAL TIMELINE ENGINE (v4.1)
 * Exact Y-coordinate piecewise parameterization so the Nano Banana Pro orthographic
 * bird's-eye YFQ-44A Fury jet stays locked inside the live viewport at EVERY scroll
 * position, banking gracefully from anchor to anchor across the page.
 */

import { FURY_BIRDSEYE_URI } from './media/fury_birdseye.js';

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
    this.targetChainPos = 0;
    this.smoothChainPos = 0;

    this.furyImg = new Image();
    this.furyLoaded = false;
    this.furyImg.onload = () => {
      this.furyLoaded = true;
    };
    this.furyImg.src = FURY_BIRDSEYE_URI;

    this.packets = Array.from({ length: 9 }, (_, i) => ({
      pos: i / 9,
      speed: 0.024 + (i % 3) * 0.01,
      size: 2.2 + (i % 2) * 1.0,
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

    const margin = w < 720 ? 24 : Math.min(96, w * 0.068);
    const nodes = Array.from(this.stageEl.querySelectorAll('[data-tl-anchor]'));
    this.anchors = nodes
      .map((el) => {
        const r = el.getBoundingClientRect();
        const y = r.top - stageRect.top + 80;
        const side = el.dataset.tlSide || 'right';
        let x = w - margin;
        if (side === 'left') x = margin;
        else if (side === 'center') x = w * 0.5;
        return {
          x,
          y,
          side,
          year: el.dataset.tlYear || '',
          label: el.dataset.tlLabel || '',
        };
      })
      .sort((a, b) => a.y - b.y);
  }

  _bindEvents() {
    const ro = new ResizeObserver(() => this._measure());
    ro.observe(this.stageEl);
    window.addEventListener('resize', () => this._measure(), { passive: true });
    window.addEventListener('load', () => this._measure());
  }

  _yToChainParam(probeY) {
    const pts = this.anchors;
    if (pts.length < 2) return 0;
    if (probeY <= pts[0].y) return 0;
    const n = pts.length - 1;
    if (probeY >= pts[n].y) return 1;

    for (let i = 0; i < n; i++) {
      if (probeY >= pts[i].y && probeY <= pts[i + 1].y) {
        const span = Math.max(1, pts[i + 1].y - pts[i].y);
        const u = (probeY - pts[i].y) / span;
        return (i + u) / n;
      }
    }
    return 1;
  }

  _sampleChain(t) {
    const pts = this.anchors;
    if (pts.length < 2) return { x: this.width * 0.5, y: 0, angle: Math.PI / 2 };
    const segCount = pts.length - 1;
    const clamped = Math.max(0, Math.min(0.9999, t));
    const scaled = clamped * segCount;
    const idx = Math.floor(scaled);
    const u = scaled - idx;

    const p0 = pts[idx];
    const p3 = pts[idx + 1];
    const dy = p3.y - p0.y;
    const sway = Math.sin(this.time * 1.15 + idx * 1.9) * (12 + Math.abs(this.springVel) * 0.35);
    const cp1x = p0.x + (p3.x - p0.x) * 0.16 + sway;
    const cp1y = p0.y + dy * 0.44;
    const cp2x = p3.x - (p3.x - p0.x) * 0.16 - sway;
    const cp2y = p3.y - dy * 0.44;

    const inv = 1 - u;
    const x = inv * inv * inv * p0.x + 3 * inv * inv * u * cp1x + 3 * inv * u * u * cp2x + u * u * u * p3.x;
    const y = inv * inv * inv * p0.y + 3 * inv * inv * u * cp1y + 3 * inv * u * u * cp2y + u * u * u * p3.y;
    const dx = 3 * inv * inv * (cp1x - p0.x) + 6 * inv * u * (cp2x - cp1x) + 3 * u * u * (p3.x - cp2x);
    const ddy = 3 * inv * inv * (cp1y - p0.y) + 6 * inv * u * (cp2y - cp1y) + 3 * u * u * (p3.y - cp2y);

    return { x, y, angle: Math.atan2(ddy, dx) };
  }

  _drawPath(ctx, strokeStyle, lineWidth, dash = [], maxT = 1) {
    const steps = 260;
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

  _drawBirdsEyeFury(ctx, head) {
    const isMobile = this.width < 720;
    const jetH = isMobile ? 68 : 104;
    const aspect = this.furyLoaded && this.furyImg.naturalHeight
      ? this.furyImg.naturalWidth / this.furyImg.naturalHeight
      : 221 / 360;
    const jetW = jetH * aspect;

    const trailSteps = 22;
    const wingHalfSpan = jetW * 0.44;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k <= trailSteps; k++) {
        const backT = Math.max(0, this.smoothChainPos - k * 0.0028);
        const pt = this._sampleChain(backT);
        const perp = pt.angle + Math.PI / 2;
        const wx = pt.x + Math.cos(perp) * wingHalfSpan * side;
        const wy = pt.y + Math.sin(perp) * wingHalfSpan * side;
        if (k === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = 'rgba(245, 245, 247, 0.22)';
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(head.angle + Math.PI / 2);

    const tailY = jetH * 0.39;
    const plumeLen = jetH * (0.30 + Math.min(0.24, Math.abs(this.springVel) * 0.015));
    const grad = ctx.createLinearGradient(0, tailY - 2, 0, tailY + plumeLen);
    grad.addColorStop(0, 'rgba(255, 212, 130, 0.92)');
    grad.addColorStop(0.45, 'rgba(255, 118, 36, 0.45)');
    grad.addColorStop(1, 'rgba(255, 118, 36, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-jetW * 0.075, tailY);
    ctx.lineTo(0, tailY + plumeLen);
    ctx.lineTo(jetW * 0.075, tailY);
    ctx.closePath();
    ctx.fill();

    if (this.furyLoaded) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(this.furyImg, -jetW / 2, -jetH / 2, jetW, jetH);
    }
    ctx.restore();
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.anchors.length < 2) return;

    const stageRect = this.stageEl.getBoundingClientRect();
    const viewProbeY = window.innerHeight * 0.46 - stageRect.top;
    this.targetChainPos = this._yToChainParam(viewProbeY);
    this.smoothChainPos += (this.targetChainPos - this.smoothChainPos) * 0.14;

    if (this.mode === 'flight') {
      this._drawPath(ctx, 'rgba(255, 255, 255, 0.12)', 1, [4, 7], 1);
      this._drawPath(ctx, 'rgba(223, 241, 64, 0.48)', 1.6, [], this.smoothChainPos);
      const head = this._sampleChain(this.smoothChainPos);
      this._drawBirdsEyeFury(ctx, head);
    } else if (this.mode === 'packet') {
      this._drawPath(ctx, 'rgba(255, 255, 255, 0.12)', 1, [2, 6], 1);
      this._drawPath(ctx, 'rgba(245, 245, 247, 0.48)', 1.6, [], this.smoothChainPos);
      for (const pkt of this.packets) {
        pkt.pos = (pkt.pos + pkt.speed * 0.016) % 1;
        const p = this._sampleChain(pkt.pos);
        ctx.save();
        ctx.fillStyle = '#DFF140';
        ctx.beginPath();
        ctx.arc(p.x, p.y, pkt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const head = this._sampleChain(this.smoothChainPos);
      const pulse = (this.time * 22) % 24;
      ctx.save();
      ctx.strokeStyle = `rgba(223, 241, 64, ${1 - pulse / 24})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 5 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      this._drawPath(ctx, 'rgba(255, 255, 255, 0.10)', 1, [], 1);
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245, 245, 247, 0.68)';
      ctx.lineWidth = 1.5;
      const steps = 240;
      const maxStep = Math.floor(steps * this.smoothChainPos);
      for (let i = 0; i <= maxStep; i++) {
        const t = i / steps;
        const p = this._sampleChain(t);
        const wave = Math.sin(t * 30 + this.time * 2.0) * (4 + Math.min(14, Math.abs(this.springVel) * 0.3));
        const nx = p.x + Math.cos(p.angle + Math.PI / 2) * wave;
        const ny = p.y + Math.sin(p.angle + Math.PI / 2) * wave;
        if (i === 0) ctx.moveTo(nx, ny);
        else ctx.lineTo(nx, ny);
      }
      ctx.stroke();
      ctx.restore();
    }

    this.anchors.forEach((a, i) => {
      const anchorT = i / (this.anchors.length - 1);
      const reached = this.smoothChainPos >= anchorT - 0.02;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.strokeStyle = reached ? '#DFF140' : 'rgba(255, 255, 255, 0.24)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-4, -4, 8, 8);
      if (reached) {
        ctx.fillStyle = '#DFF140';
        ctx.fillRect(-1.5, -1.5, 3, 3);
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
