const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://aicitationscan.com';
const ROOT_DIR = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT_DIR, 'js');

// Configuration
const USE_CLEAN_URLS = true;
// Directories to ignore when scanning for folders
const IGNORE_DIRS = ['.git', '.github', 'node_modules', 'js', 'css', 'assets', 'scripts'];

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

function formatName(filename) {
    // Converts "meta-description-generator" to "Meta Description Generator"
    return filename
        .replace('.html', '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function generate() {
    if (!fs.existsSync(JS_DIR)) fs.mkdirSync(JS_DIR, { recursive: true });

    const registry = []; // For the Menu System
    const seoRegistry = {}; // For your original registry logic
    const pagesJson = [];
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Identify all folders in the root
    const folders = fs.readdirSync(ROOT_DIR).filter(file => {
        const fullPath = path.join(ROOT_DIR, file);
        return fs.lstatSync(fullPath).isDirectory() && !IGNORE_DIRS.includes(file);
    });

    // Add "Root" as a virtual folder for home/index
    const allCategories = [''].concat(folders);

    allCategories.forEach(folder => {
        const folderPath = folder === '' ? ROOT_DIR : path.join(ROOT_DIR, folder);
        const folderFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.html') && f !== 'index.html');

        if (folderFiles.length === 0 && folder !== '') return;

        const folderData = {
            folderName: folder === '' ? "General" : formatName(folder),
            folderPath: `/${folder}/`,
            pages: []
        };

        folderFiles.forEach(file => {
            const fullPath = path.join(folderPath, file);
            const meta = getMetadata(fullPath);
            
            let webPath = folder === '' ? file : `${folder}/${file}`;
            if (USE_CLEAN_URLS) webPath = webPath.replace('.html', '');
            
            const url = `/${webPath}`;
            const cleanTitle = meta.h1 || meta.title;

            // Add to Folder Data for Menu
            folderData.pages.push({
                name: formatName(file),
                url: url
            });

            // Add to Original Registry Object (Compatibility)
            seoRegistry[file] = { url, title: cleanTitle, desc: meta.description };

            // Add to pages.json
            pagesJson.push({ t: meta.title, d: meta.description, u: url, k: folder || 'page' });

            // Add to Sitemap
            sitemap += `  <url>\n    <loc>${DOMAIN}${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });

        if (folderData.pages.length > 0) {
            registry.push(folderData);
        }
    });

    // Write Files
    sitemap += `</urlset>`;
    fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemap);
    
    // EXPORT FOR MENU SYSTEM (window global)
    const registryContent = `// AUTO-GENERATED\nwindow.siteRegistry = ${JSON.stringify(registry, null, 4)};\n\nexport const SiteRegistry = ${JSON.stringify(seoRegistry, null, 4)};`;
    fs.writeFileSync(path.join(JS_DIR, 'registry.js'), registryContent);
    
    fs.writeFileSync(path.join(JS_DIR, 'pages.json'), JSON.stringify(pagesJson, null, 2));

    console.log('✅ SEO Assets & Menu Registry Generated.');
}

generate();
