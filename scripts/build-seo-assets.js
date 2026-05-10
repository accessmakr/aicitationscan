const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://aicitationscan.com';
const ROOT_DIR = path.join(__dirname, '..');
const SEO_TOOLS_DIR = path.join(ROOT_DIR, 'seo-tools');

// Configuration for Clean URLs (removes .html from sitemap/registry)
const USE_CLEAN_URLS = true;

function getMetadata(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const descMatch = content.match(/<meta name="description" content="(.*?)"/);
    const h1Match = content.match(/<h1.*?>(.*?)<\/h1>/);

    return {
        title: titleMatch ? titleMatch[1] : 'AI Citation Scan',
        description: descMatch ? descMatch[1] : '',
        h1: h1Match ? h1Match[1].replace(/<[^>]*>?/gm, '') : ''
    };
}

function generate() {
    const files = [];
    
    // Scan Root
    fs.readdirSync(ROOT_DIR).forEach(file => {
        if (file.endsWith('.html')) files.push({ name: file, path: '' });
    });

    // Scan SEO Tools
    if (fs.existsSync(SEO_TOOLS_DIR)) {
        fs.readdirSync(SEO_TOOLS_DIR).forEach(file => {
            if (file.endsWith('.html')) files.push({ name: file, path: 'seo-tools/' });
        });
    }

    const registry = {};
    const pagesJson = [];
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    files.forEach(file => {
        const fullPath = path.join(ROOT_DIR, file.path, file.name);
        const meta = getMetadata(fullPath);
        
        // Handle Clean URL Logic
        let urlPath = file.path + file.name;
        if (USE_CLEAN_URLS) {
            urlPath = urlPath.replace('.html', '');
            if (urlPath === 'index') urlPath = '';
        }

        const fullUrl = `${DOMAIN}/${urlPath}`;

        // 1. Build Registry (for Internal Linking Engine)
        registry[file.name] = {
            url: `/${urlPath}`,
            title: meta.h1 || meta.title,
            desc: meta.description
        };

        // 2. Build Pages JSON (for Search System)
        pagesJson.push({
            t: meta.title,
            d: meta.description,
            u: `/${urlPath}`,
            k: file.path.includes('seo-tools') ? 'tool' : 'page'
        });

        // 3. Build Sitemap
        sitemap += `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${file.name === 'index.html' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });

    sitemap += `</urlset>`;

    // Write Files
    fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemap);
    fs.writeFileSync(path.join(ROOT_DIR, 'js', 'registry.js'), `export const SiteRegistry = ${JSON.stringify(registry, null, 4)};`);
    fs.writeFileSync(path.join(ROOT_DIR, 'js', 'pages.json'), JSON.stringify(pagesJson, null, 2));

    console.log('✅ SEO Assets Generated: sitemap.xml, registry.js, pages.json');
}

generate();
