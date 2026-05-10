const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://aicitationscan.com';
const ROOT_DIR = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT_DIR, 'js');

const USE_CLEAN_URLS = true;
const IGNORE_DIRS = ['.git', '.github', 'node_modules', 'js', 'css', 'assets', 'scripts'];

// Mapping icons and priority from your blueprint
const clusterConfig = {
    "seo-tools": { icon: "🔍", priority: 10, name: "SEO Tools" },
    "text-tools": { icon: "📝", priority: 10, name: "Text Tools" },
    "developer-tools": { icon: "💻", priority: 9, name: "Developer Tools" },
    "calculators": { icon: "🧮", priority: 8, name: "Calculators" },
    "image-tools": { icon: "🖼️", priority: 7, name: "Image Tools" },
    "pdf-tools": { icon: "📄", priority: 7, name: "PDF Tools" },
    "design-tools": { icon: "🎨", priority: 6, name: "Design Tools" },
    "fun-tools": { icon: "🎲", priority: 5, name: "Viral & Fun Tools" }
};

function getMetadata(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const descMatch = content.match(/<meta name="description" content="(.*?)"/i);
    const h1Match = content.match(/<h1.*?>(.*?)<\/h1>/);

    return {
        title: titleMatch ? titleMatch[1] : 'AI Citation Scan',
        description: descMatch ? descMatch[1] : '',
        h1: h1Match ? h1Match[1].replace(/<[^>]*>?/gm, '').trim() : ''
    };
}

function formatName(name) {
    return name.replace('.html', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generate() {
    if (!fs.existsSync(JS_DIR)) fs.mkdirSync(JS_DIR, { recursive: true });

    const menuRegistry = [];
    const seoRegistry = {};
    const pagesJson = [];
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const folders = fs.readdirSync(ROOT_DIR).filter(file => {
        const fullPath = path.join(ROOT_DIR, file);
        return fs.lstatSync(fullPath).isDirectory() && !IGNORE_DIRS.includes(file);
    });

    const allCategories = [''].concat(folders);

    allCategories.forEach(folder => {
        const folderPath = folder === '' ? ROOT_DIR : path.join(ROOT_DIR, folder);
        const folderFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.html') && f !== 'index.html');

        if (folderFiles.length === 0 && folder !== '') return;

        // Get config or defaults
        const config = clusterConfig[folder] || { icon: "📁", priority: 0, name: folder === '' ? "General" : formatName(folder) };

        const folderData = {
            folderName: config.name,
            folderPath: folder === '' ? "/" : `/${folder}/`, // FIXED: No more double slash //
            icon: config.icon,
            priority: config.priority,
            pages: []
        };

        folderFiles.forEach(file => {
            const fullPath = path.join(folderPath, file);
            const meta = getMetadata(fullPath);
            
            let webPath = folder === '' ? file : `${folder}/${file}`;
            if (USE_CLEAN_URLS) webPath = webPath.replace('.html', '');
            
            const url = `/${webPath}`;
            const cleanTitle = meta.h1 || meta.title;

            folderData.pages.push({ name: formatName(file), url: url });
            seoRegistry[file] = { url, title: cleanTitle, desc: meta.description };
            pagesJson.push({ t: meta.title, d: meta.description, u: url, k: folder || 'page' });
            sitemap += `  <url>\n    <loc>${DOMAIN}${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        if (folderData.pages.length > 0) menuRegistry.push(folderData);
    });

    // Sort folders by priority (High to Low)
    menuRegistry.sort((a, b) => b.priority - a.priority);

    sitemap += `</urlset>`;
    fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemap);
    
    // Final Export
    const registryContent = `// AUTO-GENERATED\nwindow.siteRegistry = ${JSON.stringify(menuRegistry, null, 4)};\n\nexport const SiteRegistry = ${JSON.stringify(seoRegistry, null, 4)};`;
    fs.writeFileSync(path.join(JS_DIR, 'registry.js'), registryContent);
    fs.writeFileSync(path.join(JS_DIR, 'pages.json'), JSON.stringify(pagesJson, null, 2));

    console.log('✅ Registry Updated with Icons and Fixed Paths.');
}

generate();
