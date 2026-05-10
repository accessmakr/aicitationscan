/**
 * AI Citation Scan - Dynamic Menu System
 * Version: 1.0.0
 * Description: Dynamically renders a sliding drawer menu based on window.siteRegistry.
 */

(function() {
    'use strict';

    // 1. Configuration & Selectors
    const CONFIG = {
        navDockId: 'master-nav-dock',
        drawerId: 'site-drawer-menu',
        overlayId: 'site-drawer-overlay',
        activeClass: 'text-emerald-400 bg-emerald-500/5 border-l-2 border-emerald-500',
        inactiveClass: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-l-2 border-transparent'
    };

    // 2. Initialization
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.siteRegistry === 'undefined') {
            console.error('Menu System: window.siteRegistry not found. Ensure registry.js is loaded.');
            return;
        }
        renderMenuSystem();
    });

    function renderMenuSystem() {
        const navDock = document.getElementById(CONFIG.navDockId);
        if (!navDock) return;

        // Create the Trigger Button (Hamburger)
        const menuTrigger = document.createElement('button');
        menuTrigger.id = 'menu-trigger-btn';
        menuTrigger.className = 'p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all focus:outline-none flex items-center justify-center';
        menuTrigger.setAttribute('aria-label', 'Open Navigation Menu');
        menuTrigger.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
        `;

        // Create the Overlay
        const overlay = document.createElement('div');
        overlay.id = CONFIG.overlayId;
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[998] opacity-0 pointer-events-none transition-opacity duration-300';

        // Create the Drawer
        const drawer = document.createElement('div');
        drawer.id = CONFIG.drawerId;
        drawer.className = 'fixed top-0 right-0 h-screen w-[320px] sm:w-[400px] bg-slate-900 border-l border-slate-800 z-[999] transform translate-x-full transition-transform duration-300 ease-in-out flex flex-col shadow-2xl';

        // 3. Construct Drawer Interior
        drawer.innerHTML = `
            <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-emerald-500/10 rounded flex items-center justify-center">
                        <span class="text-emerald-500 font-bold">AI</span>
                    </div>
                    <span class="font-bold text-slate-100 tracking-tight">Navigation</span>
                </div>
                <button id="close-drawer-btn" class="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div id="drawer-scroll-area" class="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <a href="/" class="flex items-center gap-3 px-4 py-3 mb-6 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl border border-slate-700 transition-all group">
                    <span class="text-xl group-hover:scale-110 transition-transform">🏠</span>
                    <span class="font-semibold text-sm uppercase tracking-wider">Dashboard Home</span>
                </a>
                
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Tool Directory</div>
                <div id="accordion-container" class="space-y-2"></div>
            </div>
        `;

        // 4. Generate Folder Accordions
        const accordionContainer = drawer.querySelector('#accordion-container');
        const currentPath = window.location.pathname.replace('.html', '');

        window.siteRegistry.forEach((folder, index) => {
            const folderId = `folder-${index}`;
            const folderSection = document.createElement('div');
            folderSection.className = 'border border-slate-800/50 rounded-xl bg-slate-950/30 overflow-hidden';

            // Generate Page Links
            const pagesHtml = folder.pages.map(page => {
                const isActive = currentPath === page.url;
                return `
                    <li>
                        <a href="${page.url}" class="block px-4 py-2.5 text-sm transition-all ${isActive ? CONFIG.activeClass : CONFIG.inactiveClass}">
                            ${page.name}
                        </a>
                    </li>
                `;
            }).join('');

            folderSection.innerHTML = `
                <button class="folder-toggle w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors focus:outline-none" data-target="${folderId}">
                    <div class="flex items-center gap-3">
                        <span class="text-lg">${folder.icon || '📁'}</span>
                        <span class="font-medium text-slate-200 text-sm">${folder.folderName}</span>
                    </div>
                    <svg class="chevron w-4 h-4 text-slate-600 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div id="${folderId}" class="max-h-0 overflow-hidden transition-all duration-300 ease-in-out bg-slate-900/50">
                    <ul class="py-2 border-t border-slate-800/50">
                        ${pagesHtml}
                    </ul>
                </div>
            `;
            accordionContainer.appendChild(folderSection);
        });

        // 5. Append to DOM
        navDock.appendChild(menuTrigger);
        document.body.appendChild(overlay);
        document.body.appendChild(drawer);

        // 6. Logic: Toggle Drawer
        const toggleDrawer = (isOpen) => {
            if (isOpen) {
                drawer.classList.remove('translate-x-full');
                overlay.classList.replace('opacity-0', 'opacity-100');
                overlay.classList.remove('pointer-events-none');
                document.body.style.overflow = 'hidden';
            } else {
                drawer.classList.add('translate-x-full');
                overlay.classList.replace('opacity-100', 'opacity-0');
                overlay.classList.add('pointer-events-none');
                document.body.style.overflow = '';
            }
        };

        menuTrigger.addEventListener('click', () => toggleDrawer(true));
        overlay.addEventListener('click', () => toggleDrawer(false));
        document.getElementById('close-drawer-btn').addEventListener('click', () => toggleDrawer(false));

        // 7. Logic: Toggling Accordions
        const folderToggles = drawer.querySelectorAll('.folder-toggle');
        folderToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const content = document.getElementById(targetId);
                const chevron = this.querySelector('.chevron');
                const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';

                // Close other accordions (Optional, but cleaner)
                folderToggles.forEach(t => {
                    const otherContent = document.getElementById(t.getAttribute('data-target'));
                    otherContent.style.maxHeight = '0px';
                    t.querySelector('.chevron').style.transform = 'rotate(0deg)';
                });

                if (!isOpen) {
                    content.style.maxHeight = content.scrollHeight + "px";
                    chevron.style.transform = 'rotate(180deg)';
                }
            });
        });

        // 8. Auto-Open Active Folder on Load
        const activeLink = drawer.querySelector(`.${CONFIG.activeClass.split(' ')[0]}`);
        if (activeLink) {
            const parentContent = activeLink.closest('[id^="folder-"]');
            if (parentContent) {
