/**
 * SINGLE-ACTIVE-VIDEO CINEMA CONTROLLER
 * Guarantees strictly ONE official HD video stream is mounted & playing at a time
 * across the entire page, backed by official HD poster stills for zero-latency framing.
 */

export class VideoController {
  constructor() {
    this.decks = Array.from(document.querySelectorAll('[data-video-card]')).map((viewport) => {
      const groupEl = viewport.closest('[data-cinema-group]');
      const reels = JSON.parse(viewport.dataset.reels || '[]');
      const deck = {
        groupEl,
        viewport,
        reels,
        activeIndex: 0,
        muted: true,
        isActiveInViewport: false,
        posterEl: viewport.querySelector('.cinema-poster'),
        slotEl: viewport.querySelector('.cinema-iframe-slot'),
        titleEl: viewport.querySelector('.cinema-title'),
        subEl: viewport.querySelector('.cinema-sub'),
        muteBtn: viewport.querySelector('[data-toggle-mute]'),
        ytLink: viewport.querySelector('[data-yt-link]'),
        tabs: groupEl ? Array.from(groupEl.querySelectorAll('[data-reel-select]')) : [],
        currentIframeId: null,
      };
      this._renderReelMeta(deck);
      this._bindDeckEvents(deck);
      return deck;
    });

    this.activeDeck = null;
    this._observeScroll();
  }

  _renderReelMeta(deck) {
    const reel = deck.reels[deck.activeIndex];
    if (!reel) return;
    if (deck.posterEl && reel.yt) {
      deck.posterEl.onerror = () => {
        deck.posterEl.onerror = null;
        deck.posterEl.src = `https://i.ytimg.com/vi/${reel.yt}/hqdefault.jpg`;
      };
      deck.posterEl.src = `https://i.ytimg.com/vi/${reel.yt}/maxresdefault.jpg`;
    }
    if (deck.titleEl) deck.titleEl.textContent = reel.title;
    if (deck.subEl) deck.subEl.textContent = reel.caption;
    if (deck.ytLink) deck.ytLink.href = `https://www.youtube.com/watch?v=${reel.yt}`;
    if (deck.muteBtn) deck.muteBtn.textContent = deck.muted ? 'UNMUTE' : 'MUTE';

    deck.tabs.forEach((tab, idx) => {
      const isSelected = idx === deck.activeIndex;
      tab.classList.toggle('is-active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
    });
  }

  _bindDeckEvents(deck) {
    deck.tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        if (deck.activeIndex === idx) return;
        deck.activeIndex = idx;
        this._renderReelMeta(deck);
        this._activateDeck(deck, true);
      });
    });

    if (deck.muteBtn) {
      deck.muteBtn.addEventListener('click', () => {
        deck.muted = !deck.muted;
        deck.muteBtn.textContent = deck.muted ? 'UNMUTE' : 'MUTE';
        this._activateDeck(deck, true);
      });
    }
  }

  _buildEmbedUrl(videoId, muted) {
    const muteFlag = muted ? '1' : '0';
    return (
      `https://www.youtube-nocookie.com/embed/${videoId}` +
      `?autoplay=1&mute=${muteFlag}&loop=1&playlist=${videoId}` +
      `&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&disablekb=1&fs=0`
    );
  }

  _mountStream(deck) {
    const reel = deck.reels[deck.activeIndex];
    if (!reel || !deck.slotEl) return;
    const key = `${reel.yt}-${deck.muted ? 'm' : 'u'}`;
    if (deck.currentIframeId === key) return;

    deck.currentIframeId = key;
    deck.viewport.classList.remove('is-playing');
    deck.slotEl.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = this._buildEmbedUrl(reel.yt, deck.muted);
    iframe.title = reel.title;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.addEventListener('load', () => {
      setTimeout(() => {
        if (deck.isActiveInViewport && deck.currentIframeId === key) {
          deck.viewport.classList.add('is-playing');
        }
      }, 450);
    });
    deck.slotEl.appendChild(iframe);
  }

  _unmountStream(deck) {
    if (!deck) return;
    deck.isActiveInViewport = false;
    deck.currentIframeId = null;
    deck.viewport.classList.remove('is-active', 'is-playing');
    if (deck.slotEl) deck.slotEl.innerHTML = '';
  }

  _activateDeck(targetDeck, forceReload = false) {
    if (this.activeDeck && this.activeDeck !== targetDeck) {
      this._unmountStream(this.activeDeck);
    }
    this.activeDeck = targetDeck;
    if (!targetDeck) return;

    targetDeck.isActiveInViewport = true;
    targetDeck.viewport.classList.add('is-active');
    if (forceReload) targetDeck.currentIframeId = null;
    this._mountStream(targetDeck);
  }

  _observeScroll() {
    let rafPending = false;

    const evaluate = () => {
      rafPending = false;
      const vh = window.innerHeight;
      const vpCenter = vh * 0.5;
      let bestDeck = null;
      let bestDist = Infinity;

      for (const deck of this.decks) {
        const rect = deck.viewport.getBoundingClientRect();
        if (rect.bottom < vh * 0.08 || rect.top > vh * 0.92) continue;
        const center = (rect.top + rect.bottom) * 0.5;
        const dist = Math.abs(center - vpCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestDeck = deck;
        }
      }

      if (bestDeck !== this.activeDeck) {
        this._activateDeck(bestDeck);
      }
    };

    const schedule = () => {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(evaluate);
      }
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    evaluate();
  }
}
