* js/internal-links.js
 * ─────────────────────────────────────────────────────────────────────────
 * Reads window.siteRegistry (set by registry.js) to discover every real
 * page on the site, then injects contextually-relevant link cards into
 * <div id="dynamic-internal-links"> on whichever page loads this script.
 *
 * Zero hardcoded pages. Zero hardcoded URLs.
 * Everything is derived from the live registry at runtime.
 *
 * Noise filtering
 * ───────────────
 * Folders and pages that match NOISE_FOLDER_RE or NOISE_URL_RE are silently
 * excluded — legal docs, contact pages, social redirects, admin routes, etc.
 * Users have no reason to navigate to those from a tool page.
 *
 * Relevance scoring (per candidate vs current page)
 * ──────────────────────────────────────────────────
 *  +8   same folder in the registry
 *  +4   identical URL directory prefix (e.g. both under /programmatic/)
 *  +3   per shared keyword in page name (after stop-word removal)
 * Candidates scoring ≤ 0 are discarded.
 * Top MAX_LINKS by score are rendered.
 *
 * SEO
 * ───
 * • Descriptive anchor text taken directly from registry page names
 * • Folder name used as visible badge — signals content type to crawlers
 * • <section> + <h2> + <nav> landmark structure
 * • <a title> carries full page name for assistive tech
 * • Max 4 links — avoids PageRank dilution
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────── */
  var MAX_LINKS = 4;
  var MIN_LINKS = 2;

  /* ── NOISE FILTERS ───────────────────────────────────────────────────
   * Match against folderName OR page url.
   * Anything that hits either regex is excluded from suggestions.        */
  var NOISE_FOLDER_RE = /legal|polic|social|company|corporate|admin|contact|support|terms|privacy|cookie|press|media|career|job|about/i;
  var NOISE_URL_RE    = /\/privacy|\/terms|\/cookie|\/legal\/|\/contact|\/social|\/admin|\/policy|\/404|\/sitemap|\/about\b/i;

  /* ── STOP WORDS ──────────────────────────────────────────────────────
   * Ignored during keyword extraction so common words don't inflate score */
  var STOP = 'the a an and or of for to in on at is are how what does your our any all new get use with from this that into web site page free check run scan test'.split(' ');

  /* ════════════════════════════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════════════════════════════ */

  function normPath(p) {
    // Remove query string, trailing slash, lowercase
    return (p || '').split('?')[0].replace(/\/+$/, '').toLowerCase() || '/';
  }

  function isNoise(url, folderName) {
    if (NOISE_FOLDER_RE.test(folderName || '')) return true;
    if (NOISE_URL_RE.test(url || ''))            return true;
    return false;
  }

  function keywords(str) {
    // Extract meaningful words from a page name
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length > 2 && STOP.indexOf(w) === -1; });
  }

  function countShared(a, b) {
    var n = 0;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) !== -1) n++;
    }
    return n;
  }

  function escHtml(s) {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ════════════════════════════════════════════════════════════════════
     REGISTRY PROCESSING
     ════════════════════════════════════════════════════════════════════ */

  /**
   * Flatten window.siteRegistry into a plain array of page objects,
   * each enriched with its parent folder meta.
   * Noise entries are silently dropped.
   */
  function flattenRegistry(registry) {
    var pages = [];
    (registry || []).forEach(function (folder) {
      var fn   = folder.folderName || '';
      var icon = folder.icon       || '📄';
      (folder.pages || []).forEach(function (page) {
        var url  = page.url  || '#';
        var name = page.name || '';
        if (!name || isNoise(url, fn)) return;
        pages.push({
          name:       name,
          url:        url,
          folderName: fn,
          folderIcon: icon,
          // Pre-compute keywords so scoring doesn't repeat work
          kw: keywords(name)
        });
      });
    });
    return pages;
  }

  /**
   * Find which page in the flat list best matches the current URL.
   * Prefers exact match; falls back to longest-prefix substring match
   * so pages on sub-paths (/programmatic/foo) still resolve correctly.
   */
  function detectCurrent(pages) {
    var path    = normPath(window.location.pathname);
    var best    = null;
    var bestLen = 0;
    pages.forEach(function (p) {
      var ep = normPath(p.url);
      if (ep === path) {
        if (ep.length > bestLen) { best = p; bestLen = ep.length; }
        return;
      }
      // sub-path: current URL contains the registered URL
      if (ep !== '/' && path.indexOf(ep) !== -1 && ep.length > bestLen) {
        best = p; bestLen = ep.length;
      }
    });
    return best;
  }

  /* ════════════════════════════════════════════════════════════════════
     RELEVANCE SCORING
     ════════════════════════════════════════════════════════════════════ */

  function score(current, candidate) {
    if (normPath(candidate.url) === normPath(current.url)) return -1; // never self

    var s = 0;

    // Same folder in the registry → tightest grouping
    if (candidate.folderName && candidate.folderName === current.folderName) s += 8;

    // Shared URL directory prefix (e.g. both /programmatic/*)
    var cDir = normPath(current.url).split('/').slice(0, -1).join('/');
    var eDir = normPath(candidate.url).split('/').slice(0, -1).join('/');
    if (cDir && eDir && cDir === eDir) s += 4;

    // Keyword overlap in page names
    s += countShared(current.kw, candidate.kw) * 3;

    return s;
  }

  function getLinks(current, allPages) {
    var scored = [];
    allPages.forEach(function (p) {
      var s = score(current, p);
      if (s > 0) scored.push({ page: p, score: s });
    });

    scored.sort(function (a, b) { return b.score - a.score; });

    var results = scored.slice(0, MAX_LINKS).map(function (x) { return x.page; });

    // Backfill if below minimum (rare — only on sites with very few pages)
    if (results.length < MIN_LINKS) {
      allPages.forEach(function (p) {
        if (results.length >= MIN_LINKS) return;
        if (normPath(p.url) !== normPath(current.url) && results.indexOf(p) === -1) {
          results.push(p);
        }
      });
    }

    return results;
  }

  /* ════════════════════════════════════════════════════════════════════
     STYLES  (injected once; reuse existing site CSS vars + card classes)
     ════════════════════════════════════════════════════════════════════ */

  function injectStyles() {
    if (document.getElementById('il-styles')) return;
    var s = document.createElement('style');
    s.id  = 'il-styles';
    s.textContent = [
      /* Section shell */
      '.il-section{padding:28px 0 4px;}',
      '.il-head{margin-bottom:18px;}',
      '.il-h2{',
        'font-family:\'Syne\',sans-serif;font-weight:700;font-size:18px;',
        'color:var(--text-primary,#1A2540);margin:0 0 5px;line-height:1.2;}',
      '.il-sub{',
        'font-family:\'DM Sans\',sans-serif;font-size:13px;',
        'color:var(--text-muted,#7A90AA);margin:0;}',
      /* Card grid — overrides the inline-flex + max-width on .internal-link-card */
      '.il-grid{',
        'display:grid;',
        'grid-template-columns:repeat(auto-fill,minmax(200px,1fr));',
        'gap:14px;}',
      '.il-grid .internal-link-card{',
        'max-width:none !important;width:100%;display:flex;flex-direction:column;}',
      /* Folder badge inside each card */
      '.il-badge{',
        'display:inline-flex;align-items:center;gap:5px;margin-bottom:6px;}',
      '.il-icon{font-size:11px;line-height:1;}',
      '.il-folder{',
        'font-family:\'JetBrains Mono\',monospace;font-size:9px;',
        'color:var(--text-muted,#7A90AA);text-transform:uppercase;',
        'letter-spacing:.1em;}',
      /* Mobile: single column */
      '@media(max-width:560px){.il-grid{grid-template-columns:1fr;}}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════════════════════
     DOM BUILDING
     ════════════════════════════════════════════════════════════════════ */

  function buildCard(page) {
    var a = document.createElement('a');
    a.href      = page.url;
    a.className = 'internal-link-card';
    a.title     = page.name;
    a.setAttribute('aria-label', page.name);

    // Folder badge — only if the page has a folder name
    if (page.folderName) {
      var badge = document.createElement('span');
      badge.className = 'il-badge';
      badge.innerHTML =
        '<span class="il-icon" aria-hidden="true">' + escHtml(page.folderIcon) + '</span>' +
        '<span class="il-folder il-label">' + escHtml(page.folderName) + '</span>';
      a.appendChild(badge);
    }

    var title = document.createElement('span');
    title.className   = 'il-title';
    title.textContent = page.name;
    a.appendChild(title);

    return a;
  }

  function render(container, currentFolderName, links) {
    var section = document.createElement('section');
    section.className = 'il-section';
    section.setAttribute('aria-labelledby', 'il-section-heading');

    /* Heading */
    var head = document.createElement('header');
    head.className = 'il-head';

    var h2 = document.createElement('h2');
    h2.id          = 'il-section-heading';
    h2.className   = 'il-h2';
    h2.textContent = 'Related Tools & Resources';

    var sub = document.createElement('p');
    sub.className   = 'il-sub';
    sub.textContent = currentFolderName
      ? 'More from the ' + currentFolderName + ' collection'
      : 'Explore more on AI Citation Scan';

    head.appendChild(h2);
    head.appendChild(sub);

    /* Nav grid */
    var grid = document.createElement('nav');
    grid.className = 'il-grid';
    grid.setAttribute('aria-label', 'Related pages on this site');
    links.forEach(function (p) { grid.appendChild(buildCard(p)); });

    section.appendChild(head);
    section.appendChild(grid);

    container.innerHTML = '';
    container.appendChild(section);

    /* Staggered fade-in — matches site .fade-in-dN pattern */
    var cards = grid.querySelectorAll('.internal-link-card');
    cards.forEach(function (card, i) {
      card.style.opacity    = '0';
      card.style.transform  = 'translateY(8px)';
      card.style.transition =
        'opacity .3s ease ' + (i * .07) + 's,' +
        'transform .3s ease ' + (i * .07) + 's';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          card.style.opacity   = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     ENTRY POINT
     ════════════════════════════════════════════════════════════════════ */

  function init() {
    var container = document.getElementById('dynamic-internal-links');
    if (!container) return; // page opted out — nothing to do

    var registry = window.siteRegistry;

    /* registry.js loads before this file (both defer'd, in source order).
       If it hasn't run yet (edge case: very slow parser), retry once.   */
    if (!registry || !registry.length) {
      if (!window._ilBootRetried) {
        window._ilBootRetried = true;
        setTimeout(init, 300);
      }
      return;
    }

    var allPages = flattenRegistry(registry);
    if (!allPages.length) return; // every page was noise — bail

    var current = detectCurrent(allPages);

    /* Current page not found in registry (e.g. unlisted, 404 path).
       Show first MAX_LINKS content pages as a neutral fallback.         */
    if (!current) {
      var fallback = allPages.slice(0, MAX_LINKS);
      if (!fallback.length) return;
      injectStyles();
      render(container, '', fallback);
      return;
    }

    var links = getLinks(current, allPages);
    if (!links.length) return;

    injectStyles();
    render(container, current.folderName, links);
  }

  /* Fire after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
