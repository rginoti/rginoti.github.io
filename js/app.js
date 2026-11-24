/**
 * MAIN APP ORCHESTRATOR — RONALD GINOTI
 * Connects:
 *  - Concept 1 Tactical HUD Lock-On [ + ] Drawer
 *  - Scroll Era & Progress Telemetry
 *  - Alive Timeline Engine (all 3 modes)
 *  - Single-Active Video Controller
 *  - 3D Fury World + FPS Zombies Arena
 *  - Interactive LA -> SF Cellular Gateway Scrubber
 */

import { TimelineEngine } from './timeline-engine.js';
import { VideoController } from './video-controller.js';
import { FuryWorld } from './fury-world.js';
import { ZombiesGame } from './zombies-game.js';

document.addEventListener('DOMContentLoaded', () => {
  /* ---------------------------------------------------------
     1. CONCEPT 1: TACTICAL HUD LOCK-ON MENU [ + ]
     --------------------------------------------------------- */
  const menuTrigger = document.getElementById('menu-trigger');
  const indexOverlay = document.getElementById('editorial-index');
  const lockonLabel = document.getElementById('lockon-label');
  const openArchiveFooterBtn = document.getElementById('btn-open-archive');

  const setMenuOpen = (open) => {
    menuTrigger.setAttribute('aria-expanded', String(open));
    indexOverlay.setAttribute('aria-hidden', String(!open));
    indexOverlay.classList.toggle('is-open', open);
    if (lockonLabel) lockonLabel.textContent = open ? 'CLOSE // X' : 'INDEX // 00';
    document.body.style.overflow = open ? 'hidden' : '';
  };

  menuTrigger?.addEventListener('click', () => {
    const isOpen = menuTrigger.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!isOpen);
  });

  openArchiveFooterBtn?.addEventListener('click', () => setMenuOpen(true));

  indexOverlay?.querySelectorAll('[data-close-menu]').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && indexOverlay?.classList.contains('is-open')) {
      setMenuOpen(false);
    }
  });

  /* ---------------------------------------------------------
     2. CORE ENGINES (TIMELINE, VIDEOS, 3D FURY, FPS ZOMBIES)
     --------------------------------------------------------- */
  const timelineCanvas = document.getElementById('timeline-canvas');
  const timelineWorld = document.getElementById('timeline-world');
  if (timelineCanvas && timelineWorld) {
    new TimelineEngine(timelineCanvas, timelineWorld);
  }

  new VideoController();

  const furyCanvas = document.getElementById('fury-canvas');
  const furyWorld = furyCanvas ? new FuryWorld(furyCanvas) : null;

  const zombiesCanvas = document.getElementById('zombies-canvas');
  const zombiesModule = document.getElementById('zombies-stage');
  if (zombiesCanvas && zombiesModule) {
    new ZombiesGame(zombiesCanvas, zombiesModule);
  }

  /* ---------------------------------------------------------
     3. FURY FLIGHT CONTROLS & LANDMARK CHIPS
     --------------------------------------------------------- */
  document.getElementById('btn-fly-fury')?.addEventListener('click', () => {
    furyWorld?.setFlying(true);
  });

  document.getElementById('btn-exit-flight')?.addEventListener('click', () => {
    furyWorld?.setFlying(false);
  });

  document.getElementById('btn-jump-fury')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => furyWorld?.setFlying(true), 650);
  });

  document.querySelectorAll('[data-fly-target]').forEach((chip) => {
    chip.addEventListener('click', () => {
      furyWorld?.focusLandmark(chip.dataset.flyTarget);
    });
  });

  /* ---------------------------------------------------------
     4. SCROLL TELEMETRY & ERA INDICATOR
     --------------------------------------------------------- */
  const eraLabel = document.getElementById('hud-era-label');
  const scrollPct = document.getElementById('hud-scroll-pct');
  const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
  const eraTitles = {
    hero: '00 · 3D WORLD',
    anduril: '01 · ANDURIL',
    activision: '02 · ACTIVISION',
    selftaught: '03 · SELF-TAUGHT',
    ucsd: '04 · UCSD',
    crespi: '05 · CRESPI',
  };

  const onScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.round((window.scrollY / maxScroll) * 100);
    if (scrollPct) scrollPct.textContent = `${String(pct).padStart(2, '0')}%`;

    const mid = window.innerHeight * 0.4;
    for (const ch of chapters) {
      const r = ch.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        const key = ch.dataset.chapter;
        document.body.dataset.era = key;
        if (eraLabel) eraLabel.textContent = eraTitles[key] || key.toUpperCase();
        break;
      }
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     5. INTERACTIVE LA -> SF CELLULAR GATEWAY SCRUBBER
     --------------------------------------------------------- */
  const slider = document.getElementById('roadtrip-slider');
  const milesEl = document.getElementById('roadtrip-miles');
  const vzwRtt = document.getElementById('vzw-rtt');
  const attRtt = document.getElementById('att-rtt');
  const vzwDot = document.getElementById('vzw-dot');
  const attDot = document.getElementById('att-dot');

  const updateRoadtrip = () => {
    if (!slider) return;
    const pct = Number(slider.value) / 100;
    const miles = Math.round(pct * 382);
    if (milesEl) milesEl.textContent = String(miles);

    const x = 40 + pct * 340;
    // Verizon hands off cleanly at midpoint (50%) to Bay Area gateway
    const vzwY = pct < 0.5 ? 55 : pct < 0.56 ? 55 - ((pct - 0.5) / 0.06) * 20 : 35;
    vzwDot?.setAttribute('cx', String(x));
    vzwDot?.setAttribute('cy', String(vzwY));

    // AT&T stays stuck on LA gateway, increasing hairpin latency as you drive north
    attDot?.setAttribute('cx', String(x));
    attDot?.setAttribute('cy', '150');

    const vzwMs = pct < 0.5 ? Math.round(22 + pct * 28) : Math.round(28 - (pct - 0.5) * 12);
    const attMs = Math.round(24 + pct * 82);
    if (vzwRtt) vzwRtt.textContent = `${vzwMs} ms`;
    if (attRtt) attRtt.textContent = `${attMs} ms`;
  };

  slider?.addEventListener('input', updateRoadtrip);
  updateRoadtrip();
});
