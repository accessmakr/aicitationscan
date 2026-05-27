// js/menu-system.js
// Non-obstructive dropdown panel — no full-page overlay, no scroll lock.
// Opens a compact panel anchored 8px below the sticky header.

document.addEventListener('DOMContentLoaded', () => {
    initSimpleMenu();
});

function initSimpleMenu() {

    // ── 1. Find the dock ──────────────────────────────────────────────
    const navDock = document.getElementById('master-nav-dock');
    if (!navDock) {
        console.error('Menu System: #master-nav-dock not found.');
        return;
    }

    const registry = window.siteRegistry || [];

    // ── 2. Hamburger / trigger button ────────────────────────────────
    const menuBtn = document.createElement('button');
    menuBtn.id   = 'site-menu-btn';
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label',    'Toggle site navigation');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-controls', 'site-menu-panel');
    menuBtn.style.cssText = `
        display: flex; align-items: center; gap: 6px;
        font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 12px;
        color: var(--text-secondary, #435470);
        padding: 6px 10px;
        border-radius: 5px;
        border: 1px solid var(--border-default, #C8D6E8);
        background: var(--bg-surface, #fff);
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        flex-shrink: 0;
        outline: none;
    `;
    menuBtn.innerHTML = `
        <svg id="menu-icon-open" width="14" height="14" viewBox="0 0 14 14"
             fill="none" stroke="currentColor" stroke-width="1.6">
            <line x1="1" y1="3.5" x2="13" y2="3.5"/>
            <line x1="1" y1="7"   x2="13" y2="7"/>
            <line x1="1" y1="10.5" x2="13" y2="10.5"/>
        </svg>
        <svg id="menu-icon-close" width="14" height="14" viewBox="0 0 14 14"
             fill="none" stroke="currentColor" stroke-width="1.6"
             style="display:none;">
            <line x1="2" y1="2" x2="12" y2="12"/>
            <line x1="12" y1="2" x2="2" y2="12"/>
        </svg>
        <span id="menu-btn-label">Menu</span>
    `;
    navDock.appendChild(menuBtn);

    // ── 3. Inject shared animation keyframes once ─────────────────────
    if (!document.getElementById('site-menu-styles')) {
        const style = document.createElement('style');
        style.id = 'site-menu-styles';
        style.textContent = `
            @keyframes menuSlideIn {
                from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                to   { opacity: 1; transform: translateY(0)  scale(1);    }
            }
            #site-menu-btn:hover {
                background: var(--bg-elevated, #F4F7FD) !important;
                color: var(--text-primary, #1A2540) !important;
                border-color: var(--border-strong, #AABDD4) !important;
            }
            #site-menu-panel::-webkit-scrollbar { width: 4px; }
            #site-menu-panel::-webkit-scrollbar-track { background: transparent; }
            #site-menu-panel::-webkit-scrollbar-thumb {
                background: var(--border-default, #C8D6E8); border-radius: 99px;
            }
            .smenu-folder-toggle:hover { background: var(--bg-hover, #E8EEF8) !important; }
            .smenu-page-link:hover     { background: var(--bg-elevated, #F4F7FD) !important; color: var(--text-primary, #1A2540) !important; }
            .smenu-home-link:hover     { border-color: var(--blue, #3D8EF5) !important; }
            #site-menu-close-btn:hover { color: var(--text-primary, #1A2540) !important; }
        `;
        document.head.appendChild(style);
    }

    // ── 4. Build the dropdown panel ───────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'site-menu-panel';
    panel.setAttribute('role', 'navigation');
    panel.setAttribute('aria-label', 'Site navigation');
    panel.style.cssText = `
        position: fixed;
        top: 72px;
        right: 16px;
        width: 300px;
        max-height: calc(100vh - 90px);
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--bg-surface, #fff);
        border: 1px solid var(--border-default, #C8D6E8);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(26,37,64,0.13), 0 2px 8px rgba(26,37,64,0.06);
        z-index: 9500;
        display: none;
    `;

    // ── 4a. Panel header row ──────────────────────────────────────────
    const panelHead = document.createElement('div');
    panelHead.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px 12px;
        border-bottom: 1px solid var(--border-subtle, #DCE4F0);
        position: sticky; top: 0;
        background: var(--bg-surface, #fff);
        z-index: 1;
    `;
    panelHead.innerHTML = `
        <span style="
            font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
            color: var(--text-primary, #1A2540);
            display: flex; align-items: center; gap: 7px;
        ">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                 stroke="currentColor" stroke-width="1.5">
                <rect x="0.5" y="0.5" width="5" height="5" rx="1"/>
                <rect x="7.5" y="0.5" width="5" height="5" rx="1"/>
                <rect x="0.5" y="7.5" width="5" height="5" rx="1"/>
                <rect x="7.5" y="7.5" width="5" height="5" rx="1"/>
            </svg>
            Tool Directory
        </span>
        <button id="site-menu-close-btn" type="button" aria-label="Close menu"
            style="
                background: none; border: none; cursor: pointer;
                padding: 4px 6px; border-radius: 4px; line-height: 1;
                font-size: 18px; color: var(--text-muted, #7A90AA);
                transition: color 0.15s;
            ">×</button>
    `;
    panel.appendChild(panelHead);

    // ── 4b. Scrollable body ───────────────────────────────────────────
    const panelBody = document.createElement('div');
    panelBody.style.cssText = 'padding: 10px 10px 12px;';

    // Home link
    const homeLink = document.createElement('a');
    homeLink.href = '/';
    homeLink.className = 'smenu-home-link';
    homeLink.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 12px;
        color: var(--text-primary, #1A2540); text-decoration: none;
        padding: 9px 12px; border-radius: 8px;
        background: var(--bg-elevated, #F4F7FD);
        border: 1px solid var(--border-subtle, #DCE4F0);
        margin-bottom: 8px; transition: border-color 0.15s;
    `;
    homeLink.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
             stroke="currentColor" stroke-width="1.5">
            <path d="M1 6.5L6.5 1L12 6.5"/>
            <path d="M2 5.5V12h3V8.5h3V12h3V5.5"/>
        </svg>
        Home
    `;
    panelBody.appendChild(homeLink);

    // Folder accordion items
    if (registry.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = `
            font-family: 'JetBrains Mono', monospace; font-size: 10px;
            color: var(--text-muted, #7A90AA); padding: 10px 12px;
        `;
        empty.textContent = 'No tools in registry yet.';
        panelBody.appendChild(empty);
    } else {
        registry.forEach((folder, idx) => {
            const folderName = folder.folderName || 'General';
            const icon       = folder.icon  || '📁';
            const pages      = folder.pages || [];
            const uid        = 'smf-' + idx;

            // Folder wrapper
            const wrap = document.createElement('div');
            wrap.style.cssText = `
                margin-bottom: 5px;
                border: 1px solid var(--border-subtle, #DCE4F0);
                border-radius: 8px; overflow: hidden;
            `;

            // Toggle button
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'smenu-folder-toggle';
            toggle.style.cssText = `
                width: 100%; display: flex; justify-content: space-between;
                align-items: center; padding: 9px 12px;
                background: var(--bg-elevated, #F4F7FD);
                border: none; cursor: pointer;
                font-family: 'DM Sans', sans-serif; font-weight: 600;
                font-size: 12px; color: var(--text-primary, #1A2540);
                transition: background 0.15s; text-align: left;
            `;
            toggle.innerHTML = `
                <span style="display:flex;align-items:center;gap:7px;">
                    <span>${icon}</span>
                    <span>${folderName}</span>
                </span>
                <span style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    <span style="
                        font-family:'JetBrains Mono',monospace; font-size:9px;
                        color:var(--text-muted,#7A90AA);
                        background:var(--bg-surface,#fff);
                        padding:1px 6px; border-radius:99px;
                        border:1px solid var(--border-default,#C8D6E8);
                    ">${pages.length}</span>
                    <svg class="smf-chevron" width="10" height="10"
                         viewBox="0 0 10 10" fill="none" stroke="currentColor"
                         stroke-width="1.8"
                         style="transition:transform 0.2s;flex-shrink:0;">
                        <path d="M2 3.5L5 6.5L8 3.5"/>
                    </svg>
                </span>
            `;

            // Pages list (hidden by default)
            const list = document.createElement('ul');
            list.id = uid;
            list.style.cssText = `
                display: none; margin: 0; padding: 4px 0; list-style: none;
                background: var(--bg-surface, #fff);
                border-top: 1px solid var(--border-subtle, #DCE4F0);
            `;

            pages.forEach((page) => {
                const pageName = page.name || 'Untitled';
                const pageUrl  = page.url  || '#';
                const isActive = window.location.pathname.includes(pageUrl) && pageUrl !== '/';

                const li = document.createElement('li');
                const a  = document.createElement('a');
                a.href = pageUrl;
                a.className = 'smenu-page-link';
                a.style.cssText = `
                    display: block; padding: 7px 14px 7px 28px;
                    font-family: 'DM Sans', sans-serif; font-size: 12px;
                    text-decoration: none; transition: background 0.12s, color 0.12s;
                    color: ${isActive ? 'var(--blue,#3D8EF5)' : 'var(--text-secondary,#435470)'};
                    font-weight: ${isActive ? '600' : '400'};
                `;
                a.innerHTML = `<span style="opacity:0.45;margin-right:4px;">↳</span> ${pageName}`;
                li.appendChild(a);
                list.appendChild(li);
            });

            // Toggle accordion
            toggle.addEventListener('click', () => {
                const open    = list.style.display !== 'none';
                const chevron = toggle.querySelector('.smf-chevron');
                list.style.display   = open ? 'none' : 'block';
                chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
            });

            wrap.appendChild(toggle);
            wrap.appendChild(list);
            panelBody.appendChild(wrap);
        });
    }

    panel.appendChild(panelBody);
    document.body.appendChild(panel);

    // ── 5. Open / close logic ─────────────────────────────────────────
    let isOpen = false;

    const getHeaderBottom = () => {
        const header = document.getElementById('site-header');
        if (!header) return 72;
        return header.getBoundingClientRect().bottom + 8;
    };

    const openPanel = () => {
        isOpen = true;
        panel.style.top     = getHeaderBottom() + 'px';
        panel.style.display = 'block';
        // Re-trigger animation
        panel.style.animation = 'none';
        void panel.offsetHeight;
        panel.style.animation = 'menuSlideIn 0.18s ease both';
        menuBtn.setAttribute('aria-expanded', 'true');
        // Swap icons
        document.getElementById('menu-icon-open').style.display  = 'none';
        document.getElementById('menu-icon-close').style.display = 'block';
        document.getElementById('menu-btn-label').textContent    = 'Close';
    };

    const closePanel = () => {
        isOpen = false;
        panel.style.display = 'none';
        menuBtn.setAttribute('aria-expanded', 'false');
        document.getElementById('menu-icon-open').style.display  = 'block';
        document.getElementById('menu-icon-close').style.display = 'none';
        document.getElementById('menu-btn-label').textContent    = 'Menu';
    };

    // Button click
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isOpen ? closePanel() : openPanel();
    });

    // Close X inside panel
    document.getElementById('site-menu-close-btn')
        ?.addEventListener('click', closePanel);

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (isOpen && !panel.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
            closePanel();
        }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closePanel();
    });

    // Keep panel flush under sticky header as user scrolls
    window.addEventListener('scroll', () => {
        if (isOpen) panel.style.top = getHeaderBottom() + 'px';
    }, { passive: true });

    // Keep panel flush on resize
    window.addEventListener('resize', () => {
        if (isOpen) {
            panel.style.top = getHeaderBottom() + 'px';
            // On narrow screens move to fill width
            if (window.innerWidth < 360) {
                panel.style.right = '8px';
                panel.style.width = (window.innerWidth - 16) + 'px';
            } else {
                panel.style.right = '16px';
                panel.style.width = '300px';
            }
        }
    }, { passive: true });
}
