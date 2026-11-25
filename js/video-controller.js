/**
 * FULL-BLEED HD BACKGROUND VIDEO CROSSFADE ENGINE (v4.2)
 * Plays strictly ONE active native HTML5 <video> stream at a time in the background,
 * crossfading smoothly over 1.15s with multi-stop atmospheric gradients as you scroll:
 *  - Anduril Chapter: 1280x720 H.264 MP4s (YFQ-44A Fury, Roadrunner vertical launch, Dive-XL undersea)
 *    with ffmpeg-verified frame-accurate action windows (skipping static hangar doors & title slates).
 *  - Activision Chapter: Mid-trailer pure-action 1280x720 H.264 fMP4 segments (MWIII, MWII, MW2)
 *    assembled into native Blob MP4 URLs (2.39:1 letterbox bars cropped to full 16:9 widescreen).
 *  - Local ffmpeg MP4 support: Automatically uses ./assets/video/*.mp4 on local clones or fallback.
 */

const VIDEO_MANIFEST = {
  'anduril-fury': {
    type: 'mp4',
    local: './assets/video/anduril-fury.mp4',
    url: 'https://cdn.sanity.io/files/61nocsj5/production/cbe0a8c3b171bd9c88d906cb8487df3d0d1997c8.mp4',
    start: 7.8,
    end: 15.6,
    cropLetterbox: false,
  },
  'anduril-rockets': {
    type: 'mp4',
    local: './assets/video/anduril-rockets.mp4',
    url: 'https://cdn.sanity.io/files/61nocsj5/production/d11b29a904877c1389928d71a28758d72ec91534.mp4',
    start: 4.6,
    end: 13.8,
    cropLetterbox: false,
  },
  'anduril-submarines': {
    type: 'mp4',
    local: './assets/video/anduril-submarines.mp4',
    url: 'https://cdn.sanity.io/files/61nocsj5/production/b0162df177635cc8b1d676098da557d8ce1fbbbc.mp4',
    start: 1.2,
    end: 14.0,
    cropLetterbox: false,
  },
  'cod-mwiii': {
    type: 'fmp4',
    local: './assets/video/cod-mwiii.mp4',
    base: 'https://video.akamai.steamstatic.com/store_trailers/3595270/656523119/da35c402738245f8a59efaa090334526e7e33ee7/1753143511/dash_h264',
    segments: ['init-stream1.m4s', 'chunk-stream1-00007.m4s', 'chunk-stream1-00008.m4s', 'chunk-stream1-00009.m4s'],
    cropLetterbox: true,
  },
  'cod-mwii': {
    type: 'fmp4',
    local: './assets/video/cod-mwii.mp4',
    base: 'https://video.akamai.steamstatic.com/store_trailers/3595230/1718098932/fb4dbc1389f1c684b067c3f34ce4056137d04eb0/1753381199/dash_h264',
    segments: ['init-stream1.m4s', 'chunk-stream1-00006.m4s', 'chunk-stream1-00007.m4s', 'chunk-stream1-00008.m4s'],
    cropLetterbox: true,
  },
  'cod-mw2': {
    type: 'fmp4',
    local: './assets/video/cod-mw2.mp4',
    base: 'https://video.akamai.steamstatic.com/store_trailers/10180/2579/2c2be80514d527f81ae0b2de1a410795d26d26b0/1750484357/dash_h264',
    segments: ['init-stream0.m4s', 'chunk-stream0-00008.m4s', 'chunk-stream0-00009.m4s', 'chunk-stream0-00010.m4s'],
    cropLetterbox: false,
  },
};

export class VideoController {
  constructor() {
    this.stage = document.getElementById('bg-video-stage');
    this.reelHud = document.getElementById('reel-hud');
    this.reelCodeEl = document.getElementById('reel-code');
    this.reelNameEl = document.getElementById('reel-name');

    this.layers = new Map();
    document.querySelectorAll('.bg-video-layer').forEach((video) => {
      const id = video.dataset.vidId;
      const spec = VIDEO_MANIFEST[id];
      if (!spec) return;
      video.muted = true;
      video.playsInline = true;
      if (spec.cropLetterbox) {
        video.classList.add('crop-cinema');
      }
      const entry = { id, video, spec, loaded: false, loading: false, pauseTimer: null };
      this._attachLoopWindow(entry);
      this.layers.set(id, entry);
    });

    this.zones = Array.from(document.querySelectorAll('[data-bg-zone]'));
    this.activeZoneId = 'none';
    this._bindScroll();
    this._ensureLoaded('anduril-fury');
    setTimeout(() => {
      this._ensureLoaded('anduril-rockets');
      this._ensureLoaded('cod-mwiii');
    }, 1000);
  }

  _attachLoopWindow(entry) {
    const { video, spec } = entry;
    if (spec.type === 'mp4' && spec.start != null) {
      video.addEventListener('loadedmetadata', () => {
        if (video.currentTime < spec.start && video.duration > spec.start + 1) {
          try { video.currentTime = spec.start; } catch (_) {}
        }
      });
      video.addEventListener('timeupdate', () => {
        if (spec.end && video.duration > spec.start + 1 && video.currentTime >= spec.end) {
          video.currentTime = spec.start || 0;
          video.play().catch(() => {});
        }
      });
    } else if (spec.type === 'fmp4') {
      video.loop = false;
      const seekToBufferedStart = () => {
        if (video.buffered.length > 0) {
          const bStart = video.buffered.start(0);
          if (video.currentTime < bStart - 0.1) {
            try { video.currentTime = bStart + 0.04; } catch (_) {}
          }
        }
      };
      video.addEventListener('loadeddata', seekToBufferedStart);
      video.addEventListener('timeupdate', () => {
        if (video.buffered.length > 0) {
          const bStart = video.buffered.start(0);
          const bEnd = video.buffered.end(video.buffered.length - 1);
          if (video.currentTime >= bEnd - 0.12) {
            video.currentTime = bStart + 0.04;
            video.play().catch(() => {});
          }
        }
      });
      video.addEventListener('ended', () => {
        if (video.buffered.length > 0) {
          video.currentTime = video.buffered.start(0) + 0.04;
        }
        video.play().catch(() => {});
      });
    }
  }

  async _ensureLoaded(id) {
    const entry = this.layers.get(id);
    if (!entry || entry.loaded || entry.loading) return;
    entry.loading = true;
    const { video, spec } = entry;

    try {
      if (spec.type === 'mp4') {
        video.addEventListener(
          'error',
          () => {
            if (video.src !== spec.local) {
              video.loop = true;
              video.src = spec.local;
              video.load();
              if (this.activeZoneId === id) video.play().catch(() => {});
            }
          },
          { once: true }
        );
        video.src = spec.url;
        video.load();
        entry.loaded = true;
      } else if (spec.type === 'fmp4') {
        const buffers = await Promise.all(
          spec.segments.map((seg) =>
            fetch(`${spec.base}/${seg}`).then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.arrayBuffer();
            })
          )
        );
        const blob = new Blob(buffers, { type: 'video/mp4' });
        video.src = URL.createObjectURL(blob);
        video.load();
        entry.loaded = true;
      }
    } catch (_) {
      video.classList.remove('crop-cinema');
      video.loop = true;
      video.src = spec.local;
      video.load();
      entry.loaded = true;
    } finally {
      entry.loading = false;
      if (this.activeZoneId === id) {
        video.play().catch(() => {});
      }
    }
  }

  _switchTo(zoneId, codeText = '', labelText = '') {
    if (zoneId === this.activeZoneId) return;
    const prevId = this.activeZoneId;
    this.activeZoneId = zoneId;

    if (prevId && prevId !== 'none' && this.layers.has(prevId)) {
      const prev = this.layers.get(prevId);
      prev.video.classList.remove('is-active');
      clearTimeout(prev.pauseTimer);
      prev.pauseTimer = setTimeout(() => {
        if (this.activeZoneId !== prev.id) {
          prev.video.pause();
        }
      }, 1250);
    }

    if (!zoneId || zoneId === 'none' || !this.layers.has(zoneId)) {
      this.stage?.classList.remove('is-visible');
      this.reelHud?.classList.remove('is-active');
      return;
    }

    const next = this.layers.get(zoneId);
    clearTimeout(next.pauseTimer);
    this._ensureLoaded(zoneId).then(() => {
      if (this.activeZoneId === zoneId) {
        next.video.play().catch(() => {});
      }
    });
    next.video.play().catch(() => {});
    next.video.classList.add('is-active');
    this.stage?.classList.add('is-visible');

    const ids = Array.from(this.layers.keys());
    const idx = ids.indexOf(zoneId);
    if (idx >= 0 && idx + 1 < ids.length) {
      this._ensureLoaded(ids[idx + 1]);
    }

    if (this.reelHud && codeText && labelText) {
      if (this.reelCodeEl) this.reelCodeEl.textContent = codeText;
      if (this.reelNameEl) this.reelNameEl.textContent = labelText;
      this.reelHud.classList.add('is-active');
    }
  }

  _bindScroll() {
    let ticking = false;

    const evaluate = () => {
      ticking = false;
      const probeY = window.innerHeight * 0.48;
      let matchedZone = null;

      for (const el of this.zones) {
        const r = el.getBoundingClientRect();
        if (r.top <= probeY && r.bottom >= probeY) {
          matchedZone = el;
        }
      }

      if (!matchedZone) {
        this._switchTo('none');
        return;
      }

      const zoneId = matchedZone.dataset.bgZone || 'none';
      this._switchTo(
        zoneId,
        matchedZone.dataset.reelCode || '',
        matchedZone.dataset.reelLabel || ''
      );
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(evaluate);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    evaluate();
  }
}
