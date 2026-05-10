import { SiteRegistry } from './registry.js';

class MenuSystem {
    constructor() {
        this.navDock = document.getElementById('master-nav-dock');
        this.registry = SiteRegistry;
        this.isOpen = false;
        this.init();
    }

    init() {
        if (!this.navDock) return;
        
        // 1. Create the Desktop & Mobile structure dynamically
        this.setupStructure();
        // 2. Render the actual links from Registry
        this.render();
        // 3. Attach toggle events
        this.attachEvents();
    }

    setupStructure() {
        // Clear current dock and prepare for dual-mode
        this.navDock.className = "flex items-center justify-between w-full";
        
        this.navDock.innerHTML = `
            <div id="nav-desktop" class="hidden md:flex items-center gap-6"></div>

            <button id="nav-hamburger" class="md:hidden text-slate-400 hover:text-white p-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path id="ham-icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div id="nav-mobile-drawer" class="fixed inset-0 top-16 bg-slate-950/fb backdrop-blur-xl translate-x-full transition-transform duration-300 md:hidden z-[60] p-6 border-t border-slate-800">
                <div id="nav-mobile-content" class="flex flex-col gap-6"></div>
            </div>
        `;
    }

    render() {
        const desktopContainer = document.getElementById('nav-desktop');
        const mobileContainer = document.getElementById('nav-mobile-content');
        
        const folderMap = this.getFolderMap();

        Object.keys(folderMap).forEach(folder => {
            const folderLabel = folder.toUpperCase();
            const pages = folderMap[folder];

            // Append to Desktop (Dropdowns)
            desktopContainer.innerHTML += this.createDesktopDropdown(folderLabel, pages);

            // Append to Mobile (Accordions/Lists)
            mobileContainer.innerHTML += this.createMobileSection(folderLabel, pages);
        });
    }

    getFolderMap() {
        const folders = {};
        Object.entries(this.registry).forEach(([file, data]) => {
            const folder = file.includes('/') ? file.split('/')[0] : 'core';
            if (!folders[folder]) folders[folder] = [];
            folders[folder].push(data);
        });
        return folders;
    }

    createDesktopDropdown(label, pages) {
        return `
            <div class="relative group py-4">
                <button class="text-slate-400 group-hover:text-white text-sm font-bold flex items-center gap-1">
                    ${label} <span>▾</span>
                </button>
                <div class="absolute top-full left-0 hidden group-hover:block w-48 bg-slate-900 border border-slate-800 rounded-lg p-2 shadow-2xl">
                    ${pages.map(p => `<a href="${p.url}" class="block p-2 text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded">${p.title}</a>`).join('')}
                </div>
            </div>`;
    }

    createMobileSection(label, pages) {
        return `
            <div>
                <div class="text-[10px] font-black text-slate-600 tracking-widest mb-2">${label}</div>
                <div class="flex flex-col gap-3">
                    ${pages.map(p => `<a href="${p.url}" class="text-lg font-bold text-white hover:text-emerald-400">${p.title}</a>`).join('')}
                </div>
            </div>`;
    }

    attachEvents() {
        const btn = document.getElementById('nav-hamburger');
        const drawer = document.getElementById('nav-mobile-drawer');
        const icon = document.getElementById('ham-icon');

        btn.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            drawer.classList.toggle('translate-x-full', !this.isOpen);
            drawer.classList.toggle('translate-x-0', this.isOpen);
            // Switch icon to 'X'
            icon.setAttribute('d', this.isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16');
        });
    }
}

new MenuSystem();
