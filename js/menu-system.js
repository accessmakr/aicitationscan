/**
 * MENU-SYSTEM.JS
 * Automatically generates a multi-level navigation dock based on the SiteRegistry.
 * Features: Automatic Folder Grouping, Dynamic Page Discovery, and Active State Tracking.
 */

import { SiteRegistry } from './registry.js';

class MenuSystem {
    constructor() {
        this.navDock = document.getElementById('master-nav-dock');
        this.registry = SiteRegistry;
        this.init();
    }

    init() {
        if (!this.navDock) {
            console.warn('Navigation Dock target (#master-nav-dock) not found.');
            return;
        }
        this.render();
    }

    // Grouping logic: identifies folder structure from registry keys
    getFolderMap() {
        const folders = {
            "Home": [{ name: "index.html", data: this.registry["index.html"] }]
        };

        Object.entries(this.registry).forEach(([fileName, details]) => {
            if (fileName === "index.html") return;

            // Determine folder name (e.g., "seo-tools/tool.html" -> "seo-tools")
            // Pages in root are grouped under "Pages"
            const parts = fileName.split('/');
            const folderName = parts.length > 1 ? parts[0] : "Pages";

            if (!folders[folderName]) folders[folderName] = [];
            folders[folderName].push({ name: fileName, data: details });
        });

        return folders;
    }

    render() {
        const folderMap = this.getFolderMap();
        const navContainer = document.createElement('ul');
        navContainer.className = "flex items-center gap-6 text-sm font-medium";

        // Generate Menu Items
        Object.keys(folderMap).forEach(folder => {
            const isHome = folder === "Home";
            const li = document.createElement('li');
            li.className = "relative group";

            if (isHome) {
                // Specialized Home Button
                li.innerHTML = `
                    <a href="/" class="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Home
                    </a>`;
            } else {
                // Folder Dropdowns
                const folderLabel = folder.replace('-', ' ').toUpperCase();
                li.innerHTML = `
                    <button class="text-slate-400 group-hover:text-white transition-colors flex items-center gap-1 py-4">
                        ${folderLabel}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 opacity-50 group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div class="absolute left-0 top-full hidden group-hover:block w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-[100]">
                        <div class="grid gap-1">
                            ${folderMap[folder].map(page => `
                                <a href="${page.data.url}" class="block p-3 rounded-lg hover:bg-slate-800 transition-all group/item">
                                    <div class="text-white text-xs font-bold group-hover/item:text-emerald-400">${page.data.title}</div>
                                    <div class="text-[10px] text-slate-500 line-clamp-1">${page.data.desc}</div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            navContainer.appendChild(li);
        });

        this.navDock.innerHTML = '';
        this.navDock.appendChild(navContainer);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => new MenuSystem());
