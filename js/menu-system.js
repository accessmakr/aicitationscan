// menu-system.js

document.addEventListener('DOMContentLoaded', () => {
    initDynamicMenu();
});

function initDynamicMenu() {
    // 1. Find the target container in the header
    const navDock = document.getElementById('master-nav-dock');
    if (!navDock) {
        console.error("Menu System Error: #master-nav-dock not found in the DOM.");
        return;
    }

    // 2. Fetch the data from registry.js (fallback to empty array if missing)
    const registryData = window.siteRegistry || [];

    // 3. Create the Hamburger Trigger Button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'p-2 ml-4 text-slate-300 hover:text-emerald-400 transition-colors focus:outline-none rounded-lg hover:bg-slate-800';
    menuBtn.innerHTML = `
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
    `;
    navDock.appendChild(menuBtn);

    // 4. Create the Overlay (darkens the background when menu is open)
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] opacity-0 pointer-events-none transition-opacity duration-300';
    
    // 5. Create the Sliding Drawer
    const drawer = document.createElement('div');
    drawer.className = 'fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-[70] transform translate-x-full transition-transform duration-300 flex flex-col overflow-hidden';
    
    // Drawer Header
    const drawerHeader = `
        <div class="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
            <span class="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span class="text-xl">🗂️</span> Navigation Directory
            </span>
            <button id="close-drawer-btn" class="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-md transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;

    // 6. Build the Drawer Content (Home Button + Accordions)
    const contentArea = document.createElement('div');
    contentArea.className = 'flex-grow overflow-y-auto p-5 custom-scrollbar pb-20'; // Add padding bottom so last item isn't cut off

    // Home Button
    let contentHTML = `
        <a href="/" class="block w-full text-left px-4 py-3 mb-6 rounded-xl bg-slate-800/50 hover:bg-emerald-500/10 text-emerald-400 border border-slate-700/50 hover:border-emerald-500/50 transition-all font-semibold flex items-center gap-3 shadow-sm">
            <span class="text-xl">🏠</span> Back to Home
        </a>
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Tool Categories</h4>
        <div class="space-y-3">
    `;

    // Sort registry by priority (highest first) if desired
    registryData.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Generate Accordions for each folder
    registryData.forEach((folder, index) => {
        const folderIcon = folder.icon || "📁";
        
        // Generate list items for pages
        let pagesHTML = '';
        folder.pages.forEach(page => {
            // Check if the current page matches this link to highlight it
            const isActive = window.location.pathname.includes(page.url);
            const activeClass = isActive ? 'text-emerald-400 bg-slate-800/50 font-medium border-l-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-l-2 hover:border-slate-500 border-l-2 border-transparent';
            
            pagesHTML += `
                <li>
                    <a href="${page.url}" class="block px-4 py-2 text-sm transition-all ${activeClass}">
                        ${page.name}
                    </a>
                </li>
            `;
        });

        // Add accordion markup
        contentHTML += `
            <div class="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <button class="folder-toggle-btn w-full px-4 py-3 text-left flex justify-between items-center hover:bg-slate-800/50 transition-colors focus:outline-none" aria-expanded="false" data-target="folder-content-${index}">
                    <span class="font-medium text-slate-200 flex items-center gap-2">
                        <span>${folderIcon}</span> ${folder.folderName}
                    </span>
                    <svg class="folder-chevron w-4 h-4 text-slate-500 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div id="folder-content-${index}" class="folder-content transition-all duration-300 ease-in-out max-h-0 opacity-0 overflow-hidden bg-slate-900/50">
                    <ul class="py-2 space-y-1">
                        ${pagesHTML}
                    </ul>
                    <a href="${folder.folderPath}" class="block mx-4 mt-2 mb-3 py-1.5 text-center text-xs font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded border border-violet-500/20 transition-colors">
                        View all in ${folder.folderName} &rarr;
                    </a>
                </div>
            </div>
        `;
    });

    contentHTML += `</div>`; // Close space-y-3
    contentArea.innerHTML = contentHTML;

    // Assemble the drawer
    drawer.innerHTML = drawerHeader;
    drawer.appendChild(contentArea);

    // Add elements to the DOM
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // 7. Event Listeners for Interaction

    // Open Menu
    const openMenu = () => {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        drawer.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    // Close Menu
    const closeMenu = () => {
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        drawer.classList.add('translate-x-full');
        document.body.style.overflow = ''; // Restore background scrolling
    };

    menuBtn.addEventListener('click', openMenu);
    document.getElementById('close-drawer-btn').addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // 8. Accordion Logic for Folders
    const folderButtons = document.querySelectorAll('.folder-toggle-btn');
    
    folderButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const chevron = this.querySelector('.folder-chevron');

            // Optional: Close all other accordions first (uncomment to enable exclusive open)
            /*
            folderButtons.forEach(otherBtn => {
                if (otherBtn !== this && otherBtn.getAttribute('aria-expanded') === 'true') {
                    otherBtn.setAttribute('aria-expanded', 'false');
                    otherBtn.querySelector('.folder-chevron').style.transform = 'rotate(0deg)';
                    const otherContent = document.getElementById(otherBtn.getAttribute('data-target'));
                    otherContent.style.maxHeight = '0px';
                    otherContent.style.opacity = '0';
                }
            });
            */

            if (!isExpanded) {
                // Open this accordion
                this.setAttribute('aria-expanded', 'true');
                chevron.style.transform = 'rotate(180deg)';
                // Set max-height dynamically based on content scroll height for smooth animation
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.opacity = '1';
            } else {
                // Close this accordion
                this.setAttribute('aria-expanded', 'false');
                chevron.style.transform = 'rotate(0deg)';
                content.style.maxHeight = '0px';
                content.style.opacity = '0';
            }
        });
    });
    
    // 9. Auto-expand the folder of the current active page (Optional UX Enhancement)
    setTimeout(() => {
        const activeLink = contentArea.querySelector('.text-emerald-400');
        if(activeLink) {
            const parentAccordion = activeLink.closest('.folder-content');
            if(parentAccordion) {
                const triggerBtn = document.querySelector(`[data-target="${parentAccordion.id}"]`);
                if(triggerBtn) {
                    triggerBtn.click(); // Programmatically open the active folder
                }
            }
        }
    }, 100);
}
