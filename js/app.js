/**
 * APPLICATION ORCHESTRATOR — RONALD GINOTI PORTFOLIO
 */

import { FuryWorld } from './fury-world.js';
import { ZombiesGame } from './zombies-game.js';
import { TimelineEngine } from './timeline-engine.js';
import { VideoController } from './video-controller.js';

function initPrecisionCursor() {
  const cursor = document.getElementById('precision-cursor');
  if (!cursor || window.matchMedia('(pointer: coarse)').matches) return;

  let tx = -100, ty = -100, cx = -100, cy = -100;
  window.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    cursor.classList.add('is-visible');
  }, { passive: true });

  document.addEventListener('mouseover', (e) => {
    const interactive = e.target.closest('a, button, input');
    cursor.classList.toggle('is-hover', Boolean(interactive));
  });

  const tick = () => {
    cx += (tx - cx) * 0.24;
    cy += (ty - cy) * 0.24;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(tick);
  };
  tick();
}

function initDossierMenu() {
  const trigger = document.getElementById('menu-trigger');
  const overlay = document.getElementById('dossier-overlay');
  const label = document.getElementById('lockon-label');
  const footerArchiveBtn = document.getElementById('footer-archive-btn');
  if (!trigger || !overlay) return;

  const setOpen = (open) => {
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    trigger.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'CLOSE' : 'DOSSIER';
    document.body.style.overflow = open ? 'hidden' : '';
  };

  trigger.addEventListener('click', () => setOpen(!overlay.classList.contains('is-open')));
  footerArchiveBtn?.addEventListener('click', () => setOpen(true));
  overlay.querySelectorAll('[data-close-menu]').forEach((el) => el.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) setOpen(false);
  });
}

function initScrollTelemetry() {
  const bar = document.getElementById('scroll-progress-bar');
  const pctEl = document.getElementById('hud-scroll-pct');
  const eraEl = document.getElementById('hud-era-label');
  const sections = Array.from(document.querySelectorAll('[data-era-section]'));

  const update = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.max(0, Math.min(100, Math.round((window.scrollY / maxScroll) * 100)));
    if (bar) bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${String(pct).padStart(2, '0')}%`;

    const probe = window.innerHeight * 0.38;
    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) {
        document.body.dataset.era = sec.dataset.eraSection || 'hero';
        if (eraEl && sec.dataset.eraLabel) eraEl.textContent = sec.dataset.eraLabel;
        break;
      }
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initCarrierGatewayLab() {
  const slider = document.getElementById('carrier-slider');
  const car = document.getElementById('carrier-car');
  const vzwPath = document.getElementById('vzw-path');
  const attPath = document.getElementById('att-path');
  const mileReadout = document.getElementById('carrier-mile-readout');
  const vzwGw = document.getElementById('vzw-gw');
  const vzwRtt = document.getElementById('vzw-rtt');
  const attGw = document.getElementById('att-gw');
  const attRtt = document.getElementById('att-rtt');
  if (!slider || !car) return;

  const update = () => {
    const miles = Number(slider.value);
    const t = miles / 380;
    const inv = 1 - t;
    const x = inv * inv * 40 + 2 * inv * t * 210 + t * t * 380;
    const y = inv * inv * 148 + 2 * inv * t * 120 + t * t * 42;
    car.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);

    const switched = miles >= 185;
    if (vzwPath) {
      vzwPath.setAttribute(
        'd',
        switched
          ? `M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + 380) / 2).toFixed(1)} ${(y - 24).toFixed(1)} 380 42`
          : `M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + 40) / 2).toFixed(1)} ${(y + 18).toFixed(1)} 40 148`
      );
    }
    if (attPath) {
      attPath.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + 40) / 2).toFixed(1)} ${(y + 34).toFixed(1)} 40 148`);
    }

    const region = miles < 65 ? 'LOS ANGELES BASIN' : miles < 185 ? 'GRAPEVINE / BAKERSFIELD' : miles < 305 ? 'CENTRAL VALLEY' : 'BAY AREA';
    if (mileReadout) mileReadout.textContent = `MILE ${miles} · ${region}`;

    const vzwLatency = switched ? Math.round(16 + (1 - t) * 20) : Math.round(18 + t * 34);
    const attLatency = Math.round(20 + t * 62);
    if (vzwGw) vzwGw.textContent = switched ? 'BAY AREA GW (SWITCHED)' : 'LOS ANGELES GW (LOCAL)';
    if (vzwRtt) vzwRtt.textContent = `${vzwLatency} ms · Jitter ${(2.4 + Math.abs(0.5 - t) * 2.1).toFixed(1)} ms · MTU 1428`;
    if (attGw) attGw.textContent = switched ? 'LOS ANGELES GW (STUCK)' : 'LOS ANGELES GW (LOCAL)';
    if (attRtt) attRtt.textContent = `${attLatency} ms · Jitter ${(4.2 + t * 9.8).toFixed(1)} ms · MTU 1400`;
  };

  slider.addEventListener('input', update);
  update();
}

function boot() {
  initPrecisionCursor();
  initDossierMenu();
  initScrollTelemetry();
  initCarrierGatewayLab();

  const furyCanvas = document.getElementById('fury-canvas');
  if (furyCanvas) new FuryWorld(furyCanvas);

  const zombiesCanvas = document.getElementById('zombies-canvas');
  const zombiesStage = document.getElementById('zombies-stage');
  if (zombiesCanvas && zombiesStage) new ZombiesGame(zombiesCanvas, zombiesStage);

  const tlStage = document.getElementById('timeline-stage');
  const tlCanvas = document.getElementById('timeline-canvas');
  if (tlStage && tlCanvas) {
    const timeline = new TimelineEngine(tlStage, tlCanvas);
    document.querySelectorAll('[data-tl-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tl-mode]').forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        timeline.setMode(btn.dataset.tlMode);
      });
    });
  }

  new VideoController();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
