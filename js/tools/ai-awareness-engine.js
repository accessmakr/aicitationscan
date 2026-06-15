// AI Citation Scan — Shared AI Awareness Scan Engine
// Powers the 'Run the Scan' tool on every /ai-tools/ai-citation-tracking-*
// style variant page. Calls the same public eige-api.onrender.com endpoint
// the homepage uses. Simplified: 3 free engines only (Meta AI, Google AI,
// Mistral) — no API-key settings panel, no telemetry ticker, no waitlist.
// Depends on: window.__showToast (defined in each page's inline script)
// and the .ai-awareness-tool markup block (scan card + results panel).
(function () {
  'use strict';

  // Local shim: this engine calls showToast(msg, type, duration).
  // window.__showToast supports both that and the 2-arg (msg, duration) form.
  function showToast(msg, type, duration) {
    window.__showToast(msg, type, duration);
  }

  // Stub: variant pages don't offer the API-key settings panel,
  // so extended engines (ChatGPT/Claude) are never active and
  // there are no user-supplied keys to send.
  const Storage = { getKeys: () => ({}) };

  let _scanAbortController = null;

function validateUrlInput() {
  const val = document.getElementById('url-input').value.trim();
  const validationEl = document.getElementById('url-validation-msg');
  if (!validationEl) return;
  if (!val) {
    validationEl.textContent = '';
    validationEl.className = 'url-validation';
    return;
  }
  try {
    let testUrl = val;
    if (!testUrl.startsWith('http')) testUrl = 'https://' + testUrl;
    new URL(testUrl);
    validationEl.textContent = '✓ Valid';
    validationEl.className = 'url-validation valid';
    document.getElementById('url-input').classList.remove('error');
  } catch {
    validationEl.textContent = '✕ Invalid';
    validationEl.className = 'url-validation invalid';
  }
}

// ─── 22S. ENGINE STATUS DOTS ─────────────────────────────────
function updateEngineStatus(engine, status) {
  const dot = document.getElementById('dot-' + engine);
  const val = document.getElementById('val-' + engine);
  if (!dot || !val) return;
  dot.className = 'status-dot-small';
  if (status === 'ready') {
    dot.style.background = 'var(--green)';
    val.textContent = 'Ready';
    val.style.color = 'var(--green)';
  } else if (status === 'scanning') {
    dot.classList.add('scanning');
    dot.style.background = '';
    val.textContent = 'Scanning...';
    val.style.color = 'var(--amber)';
  } else if (status === 'complete') {
    dot.style.background = 'var(--green)';
    val.textContent = 'Complete';
    val.style.color = 'var(--green)';
  } else if (status === 'error') {
    dot.classList.add('error');
    dot.style.background = '';
    val.textContent = 'Error';
    val.style.color = 'var(--red)';
  }
}

function showScanningState() {
  ['meta', 'google', 'mistral'].forEach(e => updateEngineStatus(e, 'scanning'));
}

function resetEngineStatusDots() {
  ['meta', 'google', 'mistral'].forEach(e => updateEngineStatus(e, 'ready'));
}

// ─── 22L. ENGINE TOGGLE BADGES ───────────────────────────────
function toggleEngine(badge) {
  const isActive = badge.classList.contains('active');
  badge.classList.toggle('active', !isActive);
  badge.setAttribute('aria-pressed', !isActive);
}


async function startScan() {
  const rawUrl = document.getElementById('url-input').value.trim();
  if (!rawUrl) {
    showToast('Enter a domain to scan', 'warn');
    return;
  }

  let url = rawUrl;
  if (!url.startsWith('http')) url = 'https://' + url;
  try { new URL(url); } catch {
    showToast('Invalid URL — please check your input', 'error');
    document.getElementById('url-input').classList.add('error');
    return;
  }

  const btn = document.getElementById('analyze-btn');
  const btnText = document.getElementById('analyze-btn-text');

  if (btn.dataset.scanning === 'true') {
    cancelScan();
    return;
  }

  btn.dataset.scanning = 'true';
  btnText.textContent = 'Cancel';
  btn.style.background = 'var(--red)';
  btn.setAttribute('aria-label', 'Cancel scan');

  showScanningState();
  document.getElementById('scan-results').style.display = 'none';

  const activeEngines = [...document.querySelectorAll('.engine-badge.active')].map(b => b.dataset.engine);
  const keys = Storage.getKeys();

  _scanAbortController = new AbortController();
  let fetchSignal = _scanAbortController.signal;
  // AbortSignal.timeout not available in all Android WebViews
  // Use manual timeout via setTimeout + abort instead
  const timeoutId = setTimeout(() => {
    if (_scanAbortController) _scanAbortController.abort();
  }, 120000);

  try {
    const response = await fetch('https://eige-api.onrender.com/api/ai-awareness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, engines: activeEngines, keys }),
      signal: fetchSignal
    });

    if (!response.ok) throw new Error('API error ' + response.status);
    const data = await response.json();

    // Display the scanned domain
    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();
    const domainEl = document.getElementById('results-domain-display');
    if (domainEl) domainEl.textContent = domain;

    // Timestamp
    const tsEl = document.getElementById('results-ts');
    if (tsEl) tsEl.textContent = 'Scanned just now';

    renderResults(data);
    updateEngineStatus('meta', 'complete');
    updateEngineStatus('google', 'complete');
    updateEngineStatus('mistral', 'complete');

  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      showToast('Scan cancelled', 'info');
    } else {
      showToast('API unavailable — check connection or try again', 'error');
      showApiError();
      ['meta', 'google', 'mistral'].forEach(e => updateEngineStatus(e, 'error'));
    }
  } finally {
    clearTimeout(timeoutId);
    btn.dataset.scanning = 'false';
    btnText.textContent = btn.dataset.ctaText || 'Analyze';
    btn.style.background = '';
    btn.setAttribute('aria-label', 'Run AI awareness scan');
    resetEngineStatusDots();
    _scanAbortController = null;
  }
}

function cancelScan() {
  if (_scanAbortController) {
    _scanAbortController.abort();
    showToast('Scan cancelled', 'info');
  }
}

// ─── 22R. API ERROR DISPLAY ──────────────────────────────────
function showApiError() {
  const panel = document.getElementById('scan-results');
  panel.style.display = 'block';
  const errContainer = document.getElementById('api-error-container');
  if (errContainer) errContainer.style.display = 'block';
  const errTop = panel.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top: Math.max(0, errTop), behavior: 'smooth' });
}

function hideApiError() {
  const errContainer = document.getElementById('api-error-container');
  if (errContainer) errContainer.style.display = 'none';
}

// ─── 22O. RENDER RESULTS ─────────────────────────────────────

function renderResults(data) {
  const panel = document.getElementById('scan-results');

  hideApiError();
  panel.style.display = 'block';
  panel.style.animation = 'none';
  void panel.offsetHeight;
  panel.style.animation = 'fadeIn 0.4s ease';

  // Overall score
  const scoreEl = document.getElementById('overall-score');
  const tierEl = document.getElementById('tier-badge');
  const score = data.overallScore || 0;
  if (scoreEl) {
    scoreEl.style.color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
    scoreEl.textContent = '0';
    animateCounter('overall-score', 0, score, 800);
  }
  if (tierEl) {
    const tier = score >= 91 ? 'WELL KNOWN' :
                 score >= 76 ? 'KNOWN' :
                 score >= 26 ? 'PARTIALLY KNOWN' : 'NOT KNOWN';
    const tierClass = score >= 76 ? 'tier-well-known' :
                      score >= 26 ? 'tier-partial' : 'tier-unknown';
    tierEl.textContent = tier;
    tierEl.className = tierClass;
  }

  // Engine cards
  const engineContainer = document.getElementById('engine-cards-container');
  if (engineContainer) {
    engineContainer.innerHTML = '';
    const engines = [
      { key: 'metaAI', name: 'Meta AI', model: 'Llama 3.1 70B', data: data.metaAI },
      { key: 'googleAI', name: 'Google AI', model: 'Gemini 1.5 Flash', data: data.googleAI },
      { key: 'mistral', name: 'Mistral', model: 'Mixtral 8x7B', data: data.mistral }
    ];
    engines.forEach(eng => {
      if (!eng.data) return;
      engineContainer.appendChild(buildEngineCard(eng.name, eng.model, eng.data));
    });
  }

  // Narrative cards
  const narrativeContainer = document.getElementById('narrative-cards-container');
  if (narrativeContainer) {
    narrativeContainer.innerHTML = '';
    const narEngines = [
      { name: 'Meta AI', data: data.metaAI },
      { name: 'Google AI', data: data.googleAI },
      { name: 'Mistral', data: data.mistral }
    ];
    narEngines.forEach(eng => {
      if (!eng.data || !eng.data.narrative) return;
      narrativeContainer.appendChild(buildNarrativeCard(eng.name, eng.data));
    });
  }

  // Consistency
  renderConsistency(data.consistency || {});

  // Gaps
  renderNarrativeGaps(data.narrativeGaps || []);

  // Recommendations
  renderRecommendations(data.recommendations || []);

  // Animate bars after a tick
  setTimeout(() => {
    document.querySelectorAll('.score-bar-fill').forEach(bar => {
      bar.style.width = (bar.dataset.target || 0) + '%';
    });
  }, 150);

  const panelTop = panel.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top: Math.max(0, panelTop), behavior: 'smooth' });
}

function buildEngineCard(name, model, d) {
  const s = d.score || 0;
  const color = s >= 75 ? 'var(--green)' : s >= 50 ? 'var(--amber)' : 'var(--red)';
  const dims = [
    { label: 'Recognition', val: d.recognition || 0 },
    { label: 'Depth', val: d.depth || 0 },
    { label: 'Accuracy', val: d.accuracy || 0 },
    { label: 'Confidence', val: d.confidence || 0 }
  ];
  const card = document.createElement('div');
  card.className = 'engine-card';
  card.innerHTML = `
    <div class="engine-card-name">${name}</div>
    <div class="engine-card-sub">Powered by ${model}</div>
    <div class="engine-card-score" style="color:${color}">${s}</div>
    ${dims.map(dim => `
      <div class="score-bar-row">
        <div class="score-bar-header">
          <span class="score-bar-label">${dim.label}</span>
          <span class="score-bar-val">${dim.val}%</span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill" data-target="${dim.val}" style="width:0%;"></div>
        </div>
      </div>`).join('')}
  `;
  // Animate score counter
  const scoreDiv = card.querySelector('.engine-card-score');
  let start = null;
  const duration = 800;
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    scoreDiv.textContent = Math.round(s * progress);
    if (progress < 1) requestAnimationFrame(step);
    else scoreDiv.textContent = s;
  }
  requestAnimationFrame(step);
  return card;
}

function buildNarrativeCard(name, d) {
  const accuracy = d.accuracy || 0;
  let hlClass = accuracy > 80 ? 'highlight-green' : accuracy >= 50 ? 'highlight-amber' : 'highlight-red';
  const narrative = d.narrative || 'No narrative data returned.';
  // Simple inline highlight: wrap first sentence in highlight class
  const sentences = narrative.split('. ');
  const highlighted = sentences.map((s, i) => {
    const cls = i === 0 ? hlClass : (i % 3 === 0 ? 'highlight-amber' : '');
    return cls ? `<span class="${cls}">${s}</span>` : s;
  }).join('. ');

  const card = document.createElement('div');
  card.className = 'narrative-card';
  card.innerHTML = `
    <div class="narrative-header">
      <span class="narrative-engine-name">${name}</span>
      <span class="accuracy-chip">${accuracy}% accurate</span>
    </div>
    <div class="narrative-text">${highlighted}</div>
    <div class="narrative-stats">
      <div class="narrative-stat">
        <span class="stat-dot" style="background:var(--green);" aria-hidden="true"></span>
        ${d.accurateClaims || 0} accurate
      </div>
      <div class="narrative-stat">
        <span class="stat-dot" style="background:var(--red);" aria-hidden="true"></span>
        ${d.conflictingClaims || 0} conflicting
      </div>
      <div class="narrative-stat">
        <span class="stat-dot" style="background:var(--text-muted);" aria-hidden="true"></span>
        ${d.unverifiableClaims || 0} unverifiable
      </div>
    </div>
  `;
  return card;
}


function renderConsistency(c) {
  const container = document.getElementById('consistency-container');
  if (!container) return;
  const score = c.score || 0;
  const label = c.label || (score >= 75 ? 'HIGH CONSISTENCY' : score >= 50 ? 'MODERATE CONSISTENCY' : 'LOW CONSISTENCY');
  const agreed = c.agreed || [];
  const conflicted = c.conflicted || [];
  const exclusive = c.exclusive || [];

  container.innerHTML = `
    <div class="consistency-score-display">${score}</div>
    <div class="consistency-label">${label}</div>
    <div class="consistency-cols">
      <div>
        <div class="consistency-col-title">✅ AGREED</div>
        ${agreed.length ? agreed.map(t => `<div class="consistency-item">${t}</div>`).join('') : '<div class="consistency-item" style="color:var(--text-muted);">—</div>'}
      </div>
      <div>
        <div class="consistency-col-title">⚠ CONFLICTED</div>
        ${conflicted.length ? conflicted.map(t => `<div class="consistency-item">${t}</div>`).join('') : '<div class="consistency-item" style="color:var(--text-muted);">—</div>'}
      </div>
      <div>
        <div class="consistency-col-title">🔴 ENGINE-EXCLUSIVE</div>
        ${exclusive.length ? exclusive.map(t => `<div class="consistency-item">${t.engine ? t.engine + ': ' : ''}${t.topic || t}</div>`).join('') : '<div class="consistency-item" style="color:var(--text-muted);">—</div>'}
      </div>
    </div>
    ${agreed.length === 0 && conflicted.length === 0 ? `
      <div style="margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);">
        Analysis based on available engines. Add API keys to extend coverage.
      </div>` : ''}
  `;
}

function renderNarrativeGaps(gaps) {
  const container = document.getElementById('gaps-container');
  if (!container) return;
  if (!gaps.length) {
    container.innerHTML = '<p style="font-family:\'DM Sans\',sans-serif;font-size:13px;color:var(--text-muted);">No significant gaps detected.</p>';
    return;
  }
  container.innerHTML = gaps.map(gap => `
    <div class="gap-item">
      <span class="gap-severity sev-${gap.severity.toLowerCase()}">${gap.severity}</span>
      <div class="gap-row">
        <span class="gap-row-label">Brand communicates:</span>
        <span class="gap-row-val">${gap.brandCommunicates || '—'}</span>
      </div>
      <div class="gap-row">
        <span class="gap-row-label">AI produces instead:</span>
        <span class="gap-row-val">${gap.aiProduces || '—'}</span>
      </div>
      <div class="gap-row">
        <span class="gap-row-label">Gap type:</span>
        <span class="gap-row-val">${gap.gapType || '—'}</span>
      </div>
    </div>`).join('');
}

function renderRecommendations(recs) {
  const container = document.getElementById('recs-container');
  if (!container) return;
  if (!recs.length) {
    container.innerHTML = '<p style="font-family:\'DM Sans\',sans-serif;font-size:13px;color:var(--text-muted);">No recommendations generated.</p>';
    return;
  }
  container.innerHTML = recs.slice(0, 3).map(rec => `
    <div class="rec-card">
      <div class="rec-header">
        <span class="gap-severity sev-${(rec.severity || 'medium').toLowerCase()}">${rec.severity || 'MEDIUM'}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--green);">+${rec.impact || 0} pts potential</span>
        <span class="rec-meta">Effort: ${rec.effort || 'Medium'}</span>
      </div>
      <div class="rec-rows">
        <div class="rec-row">
          <span class="rec-row-label">Problem:</span>
          <span class="rec-row-val">${rec.problem || '—'}</span>
        </div>
        <div class="rec-row">
          <span class="rec-row-label">Action:</span>
          <span class="rec-row-val">${rec.action || '—'}</span>
        </div>
        <div class="rec-row">
          <span class="rec-row-label">Result:</span>
          <span class="rec-row-val">${rec.result || '—'}</span>
        </div>
      </div>
    </div>`).join('');
}

function animateCounter(id, from, to, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * progress);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = to;
  }
  requestAnimationFrame(update);
}


function buildSharePills() {
  const container = document.getElementById('share-pills-container');
  if (!container) return;

  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const rawUrl = window.location.href;
  const rawTitle = document.title;

  const platforms = [
    {
      label: 'WhatsApp',
      action: () => window.open(`https://wa.me/?text=${title}%20${url}`, '_blank', 'noopener')
    },
    {
      label: 'Facebook',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener')
    },
    {
      label: 'Twitter/X',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${title}&url=${url}`, '_blank', 'noopener')
    },
    {
      label: 'LinkedIn',
      action: () => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`, '_blank', 'noopener')
    },
    {
      label: 'Reddit',
      action: () => window.open(`https://reddit.com/submit?url=${url}&title=${title}`, '_blank', 'noopener')
    },
    {
      label: 'Quora',
      action: () => window.open(`https://www.quora.com/share?url=${url}`, '_blank', 'noopener')
    },
    {
      label: 'Medium',
      action: () => window.open(`https://medium.com/new-story?url=${url}`, '_blank', 'noopener')
    },
    {
      label: 'Instagram',
      action: (btn) => {
        navigator.clipboard.writeText(rawUrl).then(() => {
          showToast('Link copied — paste in your Instagram bio or story', 'info');
          flashCopied(btn);
        });
      }
    },
    {
      label: 'TikTok',
      action: (btn) => {
        navigator.clipboard.writeText(rawUrl).then(() => {
          showToast('Link copied — share in your TikTok bio', 'info');
          flashCopied(btn);
        });
      }
    },
    {
      label: 'Telegram',
      action: () => window.open(`https://t.me/share/url?url=${url}&text=${title}`, '_blank', 'noopener')
    },
    {
      label: 'Pinterest',
      action: () => window.open(`https://pinterest.com/pin/create/button/?url=${url}&description=${title}`, '_blank', 'noopener')
    },
    {
      label: 'Discord',
      action: (btn) => {
        navigator.clipboard.writeText(rawUrl).then(() => {
          showToast('Link copied — paste in your Discord server', 'info');
          flashCopied(btn);
        });
      }
    },
    {
      label: 'Vimeo',
      action: (btn) => {
        navigator.clipboard.writeText(rawUrl).then(() => {
          showToast('Link copied — add to your Vimeo profile', 'info');
          flashCopied(btn);
        });
      }
    },
    {
      label: 'Snapchat',
      action: () => window.open(`https://www.snapchat.com/scan?attachmentUrl=${url}`, '_blank', 'noopener')
    },
    {
      label: 'Email',
      action: () => {
        window.location.href = `mailto:?subject=${title}&body=Check%20this%20out%3A%20${url}`;
      }
    },
    {
      label: 'Copy Link',
      action: (btn) => {
        navigator.clipboard.writeText(rawUrl).then(() => {
          showToast('Link copied to clipboard', 'success');
          flashCopied(btn);
        });
      }
    }
  ];

  platforms.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'share-pill';
    btn.textContent = p.label;
    btn.dataset.label = p.label;
    btn.setAttribute('aria-label', 'Share on ' + p.label);
    btn.setAttribute('role', 'listitem');
    btn.addEventListener('click', () => p.action(btn));
    container.appendChild(btn);
  });
}

function flashCopied(btn) {
  btn.classList.add('copied');
  btn.textContent = '✓ Copied';
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.textContent = btn.dataset.label || btn.textContent.replace('✓ Copied', '').trim() || 'Copy Link';
  }, 2000);
}

// ─── REPORT ACTION FUNCTIONS ─────────────────────────────────
function getReportText() {
  const domain = (document.getElementById('results-domain-display') || {}).textContent || 'Unknown domain';
  const score = (document.getElementById('overall-score') || {}).textContent || '—';
  const tier = (document.getElementById('tier-badge') || {}).textContent || '—';
  const ts = (document.getElementById('results-ts') || {}).textContent || '';
  let text = 'AI AWARENESS SCAN REPORT\n';
  text += '========================\n';
  text += 'Domain: ' + domain + '\n';
  text += ts + '\n\n';
  text += 'OVERALL AWARENESS SCORE: ' + score + '/100\n';
  text += 'TIER: ' + tier + '\n\n';
  const engineCards = document.querySelectorAll('.engine-card');
  if (engineCards.length) {
    text += 'ENGINE BREAKDOWN\n----------------\n';
    engineCards.forEach(card => {
      const name = (card.querySelector('.engine-card-name') || {}).textContent || '';
      const model = (card.querySelector('.engine-card-sub') || {}).textContent || '';
      const s = (card.querySelector('.engine-card-score') || {}).textContent || '';
      text += name + ' (' + model + '): ' + s + '/100\n';
    });
    text += '\n';
  }
  text += 'Generated by AI Citation Scan — https://www.aicitationscan.com/\n';
  return text;
}

function copyReport() {
  const text = getReportText();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Report copied to clipboard', 'success');
    const btn = document.getElementById('btn-copy-report');
    if (btn) {
      btn.classList.add('copied');
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.classList.remove('copied'); btn.textContent = 'Copy Report'; }, 2200);
    }
  }).catch(() => showToast('Could not copy — try Download instead', 'warn'));
}

function emailReport() {
  const domain = (document.getElementById('results-domain-display') || {}).textContent || 'domain';
  const score = (document.getElementById('overall-score') || {}).textContent || '—';
  const tier = (document.getElementById('tier-badge') || {}).textContent || '—';
  const subject = encodeURIComponent('AI Awareness Report — ' + domain);
  const body = encodeURIComponent(
    'AI Awareness Scan Results for ' + domain + '\n\n' +
    'Overall Score: ' + score + '/100\nTier: ' + tier + '\n\n' +
    'Full report: ' + window.location.href + '\n\n' +
    'Generated by AI Citation Scan'
  );
  window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
}

function printReport() {
  window.print();
}

function downloadReport() {
  const domain = (document.getElementById('results-domain-display') || {}).textContent || 'scan';
  const text = getReportText();
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-awareness-report-' + domain.replace(/[^a-z0-9]/gi, '-') + '-' + new Date().toISOString().slice(0, 10) + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Report downloaded', 'success');
}

function whatsappReport() {
  const domain = (document.getElementById('results-domain-display') || {}).textContent || 'a domain';
  const score = (document.getElementById('overall-score') || {}).textContent || '—';
  const tier = (document.getElementById('tier-badge') || {}).textContent || '—';
  const msg = encodeURIComponent(
    '🤖 AI Awareness Scan for ' + domain + '\n' +
    'Score: ' + score + '/100 — ' + tier + '\n' +
    'Check yours free: ' + window.location.href
  );
  window.open('https://wa.me/?text=' + msg, '_blank', 'noopener');
}

// ─── 22Q. WAITLIST MODAL ─────────────────────────────────────

  // Expose entry points used by inline onclick handlers
  window.startScan = startScan;
  window.cancelScan = cancelScan;
  window.toggleEngine = toggleEngine;
  window.validateUrlInput = validateUrlInput;
  window.copyReport = copyReport;
  window.emailReport = emailReport;
  window.printReport = printReport;
  window.downloadReport = downloadReport;
  window.whatsappReport = whatsappReport;
  window.buildSharePills = buildSharePills;

  // Auto-build share pills + reset status dots on load
  document.addEventListener('DOMContentLoaded', () => {
    buildSharePills();
    resetEngineStatusDots();
  });

})();
