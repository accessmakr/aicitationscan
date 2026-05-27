/*!
 * js/internal-links.js
 * ─────────────────────────────────────────────────────────────────────────
 * Reads window.siteRegistry (set by registry.js) and injects up to 4
 * contextually-relevant link cards into <div id="dynamic-internal-links">.
 *
 * Zero hardcoded pages. Zero hardcoded URLs.
 * Everything is derived from the live registry at runtime.
 *
 * Noise filtering
 * ───────────────
 * Folders and pages matching NOISE_FOLDER_RE or NOISE_URL_RE are excluded —
 * legal docs, admin routes, contact pages, social redirects, etc.
 *
 * Relevance scoring  (candidate vs current page)
 * ───────────────────────────────────────────────
 *  +10  same folder in registry              (tightest topical grouping)
 *  +6   same URL directory prefix            (e.g. both /programmatic/*)
 *  +3   per shared keyword in page name      (meaningful words only)
 *  +2   per shared tag                       (if registry supplies page.tags)
 *
 * Candidates with score > 0 are ranked and the top MAX_LINKS shown.
 * If fewer than MAX_LINKS score above 0, the gap is filled from the
 * remaining pages in registry order — self always excluded.
 *
 * SEO
 * ───
 * • Anchor text = page name from registry (descriptive, no "click here")
 * • Folder badge signals content type to crawlers
 * • <section> / <h2> / <nav> landmark structure
 * • <a title> + aria-label for assistive tech
 * • Max 4 links — preserves crawl equity / avoids PageRank dilution
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var MAX_LINKS = 4;

  /* ── NOISE FILTERS ──────────────────────────────────────────────────────
   * Matched against folderName OR page URL — either hit = excluded.       */
  var NOISE_FOLDER_RE = /legal|polic|social|company|corporate|admin|contact|support|terms|privacy|cookie|press|media|career|job|about/i;
  var NOISE_URL_RE    = /\/privacy|\/terms|\/cookie|\/legal\/|\/contact|\/social|\/admin|\/policy|\/404|\/sitemap|\/about\b/i;

  /* ── STOP WORDS ─────────────────────────────────────────────────────────
   * True grammatical filler only.
   * Domain words like "scan", "check", "ai", "tool" are intentionally kept —
   * they are meaningful on a tool site and drive keyword-overlap scoring.  */
  var STOP_SET = (function () {
    var words = 'a an the and or but of for to in on at by is are was were be been have has had it its this that these those i you he she we they me him her us them do did will would could should may might shall';
    var set = {};
    words.split(' ').forEach(function (w) { set[w] = true; });
    return set;
  }());

  /* ══════════════════════════════════════════════════════════════════════
     UTILITIES
     ══════════════════════════════════════════════════════════════════════ */

  /* Normalise a URL or pathname: strip query string, trailing slash, lowercase */
  function normPath(p) {
    return (p || '').split('?')[0].replace(/\/+$/, '').toLowerCase() || '/';
  }

  /* Return the directory portion of a normalised path.
     Root page (/) returns '/' so it can earn the +6 directory bonus.
     e.g. /programmatic/foo → /programmatic
          /                 → /                                           */
  function dirOf(normedPath) {
    var parts = normedPath.split('/');          // ['','programmatic','foo']
    var dir   = parts.slice(0, -1).join('/');   // '/programmatic'
    return dir || '/';                          // guard: root case
  }

  /* True if folder name or URL matches a noise pattern */
  function isNoise(url, folderName) {
    return NOISE_FOLDER_RE.test(folderName || '') || NOISE_URL_RE.test(url || '');
  }

  /* Extract meaningful words from a string (page name, description, etc.) */
  function extractKeywords(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length > 1 && !STOP_SET[w]; });
  }

  /* Count how many words in array a also appear in array b */
  function sharedCount(a, b) {
    if (!a.length || !b.length) return 0;
    var bSet = {};
    b.forEach(function (w) { bSet[w] = true; });
    var n = 0;
    a.forEach(function (w) { if (bSet[w]) n++; });
    return n;
  }

  /* HTML-escape a string */
  function esc(s) {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ══════════════════════════════════════════════════════════════════════
     REGISTRY  →  FLAT PAGE LIST
     ══════════════════════════════════════════════════════════════════════ */

  /*
   * Flatten window.siteRegistry into enriched page objects.
   * Each page gets its parent folder's metadata and pre-computed keywords.
   * Noise pages are silently dropped.
   */
  function flattenRegistry(registry) {
    var pages = [];
    (registry || []).forEach(function (folder) {
      var folderName = folder.folderName || '';
      var icon       = folder.icon       || '📄';
      (folder.pages || []).forEach(function (page) {
        var url  = page.url  || '';
        var name = page.name || '';
        if (!name || !url || isNoise(url, folderName)) return;
        var normed = normPath(url);
        pages.push({
          name:       name,
          url:        url,
          normUrl:    normed,
          dirUrl:     dirOf(normed),
          folderName: folderName,
          folderIcon: icon,
          tags:       Array.isArray(page.tags) ? page.tags : [],
          kw:         extractKeywords(name)
        });
      });
    });
    return pages;
  }

  /*
   * Identify which registry page best matches the current browser URL.
   * Exact path match preferred; falls back to longest registered prefix
   * so /programmatic/foo/bar still resolves to /programmatic/foo.
   */
  function detectCurrent(pages) {
    var path    = normPath(window.location.pathname);
    var best    = null;
    var bestLen = 0;
    pages.forEach(function (p) {
      var ep = p.normUrl;
      if (ep === path) {
        if (ep.length >= bestLen) { best = p; bestLen = ep.length; }
        return;
      }
      // Prefix match: registered URL must be at the start of the current path
      if (ep !== '/' && path.indexOf(ep) === 0 && ep.length > bestLen) {
        best = p; bestLen = ep.length;
      }
    });
    return best;
  }

  /* ══════════════════════════════════════════════════════════════════════
     RELEVANCE SCORING
     ══════════════════════════════════════════════════════════════════════ */

  /*
   * Score one candidate against the current page.
   * Returns -999 for self (excluded unconditionally).
   * Returns 0 for pages with no detectable relationship.
   */
  function scoreCandidate(current, candidate) {
    if (candidate.normUrl === current.normUrl) return -999;

    var s = 0;

    // Same registry folder — strongest signal of topical grouping
    if (current.folderName && current.folderName === candidate.folderName) {
      s += 10;
    }

    // Same URL directory — structural proximity
    // dirOf('/') === '/' so root-level pages can still match each other
    if (current.dirUrl === candidate.dirUrl) {
      s += 6;
    }

    // Keyword overlap in page names
    s += sharedCount(current.kw, candidate.kw) * 3;

    // Tag overlap — if registry.js supplies page.tags arrays
    if (current.tags.length && candidate.tags.length) {
      s += sharedCount(current.tags, candidate.tags) * 2;
    }

    return s;
  }

  /*
   * Return up to MAX_LINKS pages, ranked by relevance.
   *
   * Primary pool  — pages with score > 0, sorted high → low.
   *                 Ties broken alphabetically for stable output.
   * Backfill pool — remaining pages in registry order, only used if
   *                 primary pool has fewer than MAX_LINKS entries.
   *
   * Self is excluded in every branch.
   */
  function selectLinks(current, allPages) {
    var primary  = [];
    var backfill = [];

    allPages.forEach(function (p) {
      if (p.normUrl === current.normUrl) return; // never self
      var s = scoreCandidate(current, p);
      if (s > 0) {
        primary.push({ page: p, score: s });
      } else {
        backfill.push(p);
      }
    });

    primary.sort(function (a, b) {
      return b.score - a.score || a.page.name.localeCompare(b.page.name);
    });

    var results = primary.slice(0, MAX_LINKS).map(function (x) { return x.page; });

    // Fill remaining slots from backfill (registry order = editorial order)
    var i = 0;
    while (results.length < MAX_LINKS && i < backfill.length) {
      results.push(backfill[i]);
      i++;
    }

    return results;
  }

  /* ══════════════════════════════════════════════════════════════════════
     STYLES  (injected once into <head>; reuses site CSS custom properties)
     ══════════════════════════════════════════════════════════════════════ */

  function injectStyles() {
    if (document.getElementById('il-styles')) return;
    var el = document.createElement('style');
    el.id  = 'il-styles';
    el.textContent = [
      '.il-section{padding:28px 0 4px;}',
      '.il-head{margin-bottom:18px;}',
      '.il-h2{font-family:"Syne",sans-serif;font-weight:700;font-size:18px;',
        'color:var(--text-primary,#1A2540);margin:0 0 5px;line-height:1.2;}',
      '.il-sub{font-family:"DM Sans",sans-serif;font-size:13px;',
        'color:var(--text-muted,#7A90AA);margin:0;}',
      /* Grid — overrides inline-flex + max-width from .internal-link-card */
      '.il-grid{display:grid;',
        'grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;}',
      '.il-grid .internal-link-card{',
        'max-width:none!important;width:100%;display:flex;flex-direction:column;}',
      /* Folder badge */
      '.il-badge{display:inline-flex;align-items:center;gap:5px;margin-bottom:6px;}',
      '.il-icon{font-size:11px;line-height:1;}',
      '.il-folder{font-family:"JetBrains Mono",monospace;font-size:9px;',
        'color:var(--text-muted,#7A90AA);text-transform:uppercase;letter-spacing:.1em;}',
      /* Mobile */
      '@media(max-width:560px){.il-grid{grid-template-columns:1fr;}}'
    ].join('');
    document.head.appendChild(el);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DOM  BUILDING
     ══════════════════════════════════════════════════════════════════════ */

  function buildCard(page) {
    var a = document.createElement('a');
    a.href      = page.url;
    a.className = 'internal-link-card';
    a.title     = page.name;
    a.setAttribute('aria-label', page.name);

    if (page.folderName) {
      var badge = document.createElement('span');
      badge.className = 'il-badge';
      badge.innerHTML =
        '<span class="il-icon" aria-hidden="true">' + esc(page.folderIcon) + '</span>' +
        '<span class="il-folder">' + esc(page.folderName) + '</span>';
      a.appendChild(badge);
    }

    var title = document.createElement('span');
    title.className   = 'il-title';
    title.textContent = page.name;
    a.appendChild(title);

    return a;
  }

  function render(container, subtitle, links) {
    var section = document.createElement('section');
    section.className = 'il-section';
    section.setAttribute('aria-labelledby', 'il-heading');

    var head = document.createElement('header');
    head.className = 'il-head';

    var h2 = document.createElement('h2');
    h2.id          = 'il-heading';
    h2.className   = 'il-h2';
    h2.textContent = 'Related Tools & Resources';

    var sub = document.createElement('p');
    sub.className   = 'il-sub';
    sub.textContent = subtitle;

    head.appendChild(h2);
    head.appendChild(sub);

    var grid = document.createElement('nav');
    grid.className = 'il-grid';
    grid.setAttribute('aria-label', 'Related pages on this site');
    links.forEach(function (p) { grid.appendChild(buildCard(p)); });

    section.appendChild(head);
    section.appendChild(grid);

    container.innerHTML = '';
    container.appendChild(section);

    // Staggered fade-in — matches site animation pattern
    var cards = grid.querySelectorAll('.internal-link-card');
    cards.forEach(function (card, i) {
      card.style.opacity   = '0';
      card.style.transform = 'translateY(8px)';
      card.style.transition =
        'opacity .3s ease ' + (i * 0.07) + 's,' +
        'transform .3s ease ' + (i * 0.07) + 's';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          card.style.opacity   = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     ENTRY POINT
     ══════════════════════════════════════════════════════════════════════ */

  function init() {
    var container = document.getElementById('dynamic-internal-links');
    if (!container) return; // page opted out

    var registry = window.siteRegistry;

    // registry.js is defer'd before this file — should always be ready.
    // Retry once in the rare edge case of a very slow parser.
    if (!registry || !registry.length) {
      if (!window._ilRetried) {
        window._ilRetried = true;
        setTimeout(init, 350);
      }
      return;
    }

    var allPages = flattenRegistry(registry);
    if (!allPages.length) return; // everything was noise

    var selfPath = normPath(window.location.pathname);
    var current  = detectCurrent(allPages);
    var links, subtitle;

    if (!current) {
      // Current page not listed in registry (unlisted path, 404, etc.)
      // Show first MAX_LINKS content pages, excluding self by URL.
      links = allPages
        .filter(function (p) { return p.normUrl !== selfPath; })
        .slice(0, MAX_LINKS);
      subtitle = 'Explore more tools and resources';
    } else {
      links    = selectLinks(current, allPages);
      subtitle = current.folderName
        ? 'More from ' + current.folderName
        : 'Explore more tools and resources';
    }

    if (!links.length) return;

    injectStyles();
    render(container, subtitle, links);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
