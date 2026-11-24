/**
 * SINGLE-ACTIVE VIDEO ENGINE (Local MP4s + Procedural Tactical Fallbacks)
 * Guarantees strictly ONE video/reel plays at a time across the entire page.
 */

export class VideoController {
  constructor() {
    this.cards = Array.from(document.querySelectorAll('[data-video-card]')).map((el) => ({
      el,
      video: el.querySelector('video'),
      canvas: el.querySelector('.video-fallback-canvas'),
      src: el.dataset.videoSrc,
      fallbackType: el.dataset.fallback || 'fury',
      hasMp4: false,
      active: false,
      t: Math.random() * 100,
    }));

    this.activeCard = null;
    this._probeLocalMp4s();
    this._observeVisibility();
    this._loop();
  }

  _probeLocalMp4s() {
    this.cards.forEach((card) => {
      if (!card.video || !card.src) return;
      card.video.src = card.src;
      card.video.addEventListener('loadeddata', () => {
        card.hasMp4 = true;
        card.el.classList.add('has-mp4');
        if (card.active) {
          card.video.play().catch(() => {});
        }
      });
      card.video.addEventListener('error', () => {
        card.hasMp4 = false;
        card.el.classList.remove('has-mp4');
      });
    });
  }

  _observeVisibility() {
    const updateActive = () => {
      const vpCenter = window.innerHeight * 0.5;
      let bestCard = null;
      let bestDist = Infinity;

      for (const card of this.cards) {
        const rect = card.el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const cardCenter = (rect.top + rect.bottom) * 0.5;
        const dist = Math.abs(cardCenter - vpCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestCard = card;
        }
      }

      if (bestCard !== this.activeCard) {
        if (this.activeCard) {
          this.activeCard.active = false;
          this.activeCard.el.classList.remove('is-active');
          if (this.activeCard.hasMp4) this.activeCard.video.pause();
        }
        this.activeCard = bestCard;
        if (this.activeCard) {
          this.activeCard.active = true;
          this.activeCard.el.classList.add('is-active');
          if (this.activeCard.hasMp4) {
            this.activeCard.video.play().catch(() => {});
          }
        }
      }
    };

    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive, { passive: true });
    updateActive();
  }

  _loop() {
    if (this.activeCard && !this.activeCard.hasMp4 && this.activeCard.canvas) {
      this._drawFallback(this.activeCard);
    }
    requestAnimationFrame(() => this._loop());
  }

  _drawFallback(card) {
    const canvas = card.canvas;
    const rect = card.el.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(180, Math.floor(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    card.t += 0.025;
    const t = card.t;

    // Base tactical backdrop
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (card.fallbackType === 'fury') {
      // Swept-wing aerodynamic airflow lines + radar sweep
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const y = h * 0.5 + (i - 3.5) * 18 + Math.sin(x * 0.015 - t * 3 + i) * 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(42, 0);
      ctx.lineTo(-26, -24);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-26, 24);
      ctx.closePath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else if (card.fallbackType === 'rockets') {
      // Solid rocket motor trajectory arc + telemetry plume
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.85);
      ctx.quadraticCurveTo(w * 0.48, h * 0.12, w * 0.88, h * 0.22);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const p = (t * 0.25) % 1;
      const rx = (1 - p) * (1 - p) * (w * 0.12) + 2 * (1 - p) * p * (w * 0.48) + p * p * (w * 0.88);
      const ry = (1 - p) * (1 - p) * (h * 0.85) + 2 * (1 - p) * p * (h * 0.12) + p * p * (h * 0.22);
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fde68a';
      ctx.fill();
    } else if (card.fallbackType === 'submarines') {
      // Autonomous underwater sonar rings
      for (let r = 0; r < 4; r++) {
        const rad = ((t * 32 + r * 42) % 170) + 12;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${Math.max(0, 1 - rad / 180) * 0.55})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else {
      // MW 2019 / Warzone 2020 tactical night-vision / drop-zone feed
      const color = card.fallbackType === 'mw2019' ? '52, 211, 153' : '245, 158, 11';
      ctx.strokeStyle = `rgba(${color}, 0.45)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 48 + Math.sin(t * 2) * 8, 0, Math.PI * 2);
      ctx.stroke();

      // Scanning line
      const scanY = (t * 60) % h;
      ctx.fillStyle = `rgba(${color}, 0.12)`;
      ctx.fillRect(0, scanY, w, 3);
    }

    // Drop-in MP4 hint tag in top-right corner
    ctx.font = '400 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(`DROP LOCAL MP4 → ${card.src}`, w - 14, 22);
  }
}
