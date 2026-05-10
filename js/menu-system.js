// js/menu-system.js

document.addEventListener('DOMContentLoaded', () => {
    initSimpleMenu();
});

function initSimpleMenu() {
    // 1. Find the target container in the header
    const navDock = document.getElementById('master-nav-dock');
    if (!navDock) {
        console.error("Menu System: #master-nav-dock not found.");
        return;
    }

    // 2. Fetch the data safely
    const registry = window.siteRegistry || [];

    // 3. Create the Hamburger Button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'p-2 ml-4 text-slate-300 hover:text-emerald-400 transition-colors focus:outline-none rounded-lg hover:bg-slate-800';
    menuBtn.innerHTML = `
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
    `;
    navDock.appendChild(menuBtn);

    // 4. Create the Overlay and Drawer Containers
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] hidden opacity-0 transition-opacity duration-300';

    const drawer = document.createElement('div');
    drawer.className = 'fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-[70] transform translate-x-full transition-transform duration-300 flex flex-col overflow-hidden';

    // 5. Build the Drawer HTML
    let drawerHTML = `
        <div class="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
            <span class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span class="text-xl">🗂️</span> Tool Directory
            </span>
            <button id="close-menu-btn" class="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-md transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <div class="flex-grow overflow-y-auto p-5 pb-24">
            <a href="/" class="block w-full text-left px-4 py-3 mb-6 rounded-xl bg-slate-800/50 hover:bg-emerald-500/10 text-emerald-400 border border-slate-700/50 hover:border-emerald-500/50 transition-all font-semibold flex items-center gap-3">
                <span class="text-xl">🏠</span> Back to Home
            </a>
            <div class="space-y-3">
    `;

    // 6. Loop through folders and pages
    if (registry.length === 0) {
        drawerHTML += `<p class="text-slate-500 text-sm px-4">No tools loaded yet.</p>`;
    } else {
        registry.forEach((folder) => {
            const folderName = folder.folderName || 'General';
            const icon = folder.icon || '📁';
            const pages = folder.pages || [];

            // Add Folder Header (Clickable to open/close)
            drawerHTML += `
                <div class="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <button class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-slate-800/50 transition-colors focus:outline-none" onclick="this.nextElementSibling.classList.toggle('hidden')">
                        <span class="font-medium text-slate-200 flex items-center gap-2">
                            <span>${icon}</span> ${folderName}
                        </span>
                        <span class="text-slate-500 text-xs bg-slate-800 px-2 py-1 rounded-md">${pages.length}</span>
                    </button>
                    <ul class="hidden py-2 bg-slate-900/50 border-t border-slate-800/50">
            `;

            // Add Pages inside the folder
            pages.forEach((page) => {
                const pageName = page.name || 'Untitled Page';
                const pageUrl = page.url || '#';
                
                // Highlight the link if we are currently on that page
                const isActive = window.location.pathname.includes(pageUrl) && pageUrl !== '/';
                const textClass = isActive ? 'text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200';

                drawerHTML += `
                        <li>
                            <a href="${pageUrl}" class="block px-8 py-2 text-sm transition-colors ${textClass}">
                                ↳ ${pageName}
                            </a>
                        </li>
                `;
            });

            drawerHTML += `
                    </ul>
                </div>
            `;
        });
    }

    drawerHTML += `
            </div>
        </div>
    `;

    // 7. Inject HTML into the DOM
    drawer.innerHTML = drawerHTML;
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // 8. Open / Close Interactions
    const toggleMenu = (show) => {
        if (show) {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.remove('opacity-0'), 10); // Small delay for CSS transition
            drawer.classList.remove('translate-x-full');
            document.body.style.overflow = 'hidden'; // Stop background scrolling
        } else {
            overlay.classList.add('opacity-0');
            drawer.classList.add('translate-x-full');
            document.body.style.overflow = ''; // Restore background scrolling
            setTimeout(() => overlay.classList.add('hidden'), 300); // Wait for transition to finish
        }
    };

    menuBtn.addEventListener('click', () => toggleMenu(true));
    document.getElementById('close-menu-btn').addEventListener('click', () => toggleMenu(false));
    overlay.addEventListener('click', () => toggleMenu(false));
}
