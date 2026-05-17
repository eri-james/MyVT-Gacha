/**
 * ============================================================
 *  HoloList Malaysia VTuber Scraper + Image Downloader
 *  Chrome DevTools Snippet v2
 * ============================================================
 *
 *  HOW TO USE:
 *  1. Open Chrome → go to https://hololist.net/category/my/
 *  2. Wait for the page to fully load (pass Cloudflare check)
 *  3. Press F12 → Console tab
 *  4. Paste this entire script and press Enter
 *  5. It scrapes all pages, downloads characters_new.json,
 *     then asks if you want to download portrait images
 *
 *  IMAGE DOWNLOAD:
 *  - Prompts a directory picker (Chrome 86+)
 *  - Falls back to ZIP download if directory picker unavailable
 *  - Each image saved as {slug}.jpg
 */

(async function HoloListScraper() {
  'use strict';

  // ── Config ──────────────────────────────────────────────
  const BASE_URL   = 'https://hololist.net/category/my/';
  const DELAY_MS   = 1500;       // delay between page fetches
  const IMG_DELAY  = 300;        // delay between image fetches
  const FILENAME   = 'characters_new.json';
  const DRY_RUN_CT = 5;          // how many entries to preview

  // ── UI helpers ──────────────────────────────────────────
  const banner = document.createElement('div');
  Object.assign(banner.style, {
    position: 'fixed', top: '10px', right: '10px', zIndex: '999999',
    background: '#1a1a2e', color: '#0f0', fontFamily: 'monospace',
    padding: '16px 20px', borderRadius: '8px', maxWidth: '440px',
    fontSize: '13px', lineHeight: '1.6', boxShadow: '0 4px 24px rgba(0,0,0,.5)',
    overflow: 'auto', maxHeight: '90vh'
  });
  document.body.appendChild(banner);

  function log(msg, color) {
    console.log(`%c[Scraper] ${msg}`, color ? `color:${color}` : '');
    banner.innerHTML += `<div style="color:${color || '#0f0'}">${msg}</div>`;
    banner.scrollTop = banner.scrollHeight;
  }
  function err(msg)  { log(msg, '#f44'); }
  function warn(msg) { log(msg, '#ff0'); }
  function ok(msg)   { log(msg, '#0f0'); }

  // ── Progress bar helper ─────────────────────────────────
  function progressBar(current, total, label) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const filled = Math.round(pct / 2.5);
    const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);
    log(`${label} [${bar}] ${current}/${total} (${pct}%)`, '#8cf');
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 1: SCRAPE
  // ══════════════════════════════════════════════════════════

  ok('🔍 Detecting page structure...');

  const candidates = [];

  // Strategy A: article/post elements with linked images
  const articles = document.querySelectorAll(
    'article, .post, .entry, .vtuber-card, .card, .item, ' +
    '[class*="entry-"], [class*="post-"], [class*="card-"], ' +
    '[class*="item-"], [class*="vtuber"], [class*="profile"], ' +
    '.type-post, .status-publish'
  );
  articles.forEach(el => {
    const link = el.querySelector('a[href]');
    const img  = el.querySelector('img[src], img[data-src]');
    if (link && img) candidates.push({ el, link, img, strategy: 'A' });
  });

  // Strategy B: container children with linked images
  if (!candidates.length) {
    document.querySelectorAll(
      '.grid, .list, .archive, .content, main, #content, ' +
      '[class*="grid"], [class*="list"], [class*="wrapper"]'
    ).forEach(c => c.querySelectorAll(':scope > *').forEach(item => {
      const link = item.querySelector('a[href]');
      const img  = item.querySelector('img[src], img[data-src]');
      if (link && img) candidates.push({ el: item, link, img, strategy: 'B' });
    }));
  }

  // Strategy C: links matching hololist.net/{slug}/
  if (!candidates.length) {
    document.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href') || '';
      if (/^https?:\/\/hololist\.net\/[^\/]+\/?$/.test(h) &&
          !h.includes('category') && !h.includes('language') &&
          !h.includes('page')    && !h.includes('tag')) {
        const img = a.querySelector('img[src], img[data-src]');
        if (img) candidates.push({ el: a, link: a, img, strategy: 'C' });
      }
    });
  }

  // Strategy D: any portrait-like images
  if (!candidates.length) {
    document.querySelectorAll('img[src*="portrait"], img[src*="300x300"], img[src*="hololist"]')
      .forEach(img => {
        let link = img.closest('a[href]') || img.parentElement?.querySelector('a[href]');
        if (link) candidates.push({ el: link, link, img, strategy: 'D' });
      });
  }

  if (!candidates.length) {
    err('❌ Could not detect any VTuber entries on this page!');
    err('Make sure you are on: https://hololist.net/category/my/');
    return;
  }
  ok(`✅ Found ${candidates.length} entries (strategy ${candidates[0].strategy})`);

  // Deduplicate
  const seen = new Set();
  const unique = candidates.filter(c => {
    const h = c.link.getAttribute('href');
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });

  // ── Extract data from one candidate ─────────────────────
  function extractEntry(c) {
    const href  = c.link.getAttribute('href') || '';
    const slug  = href.replace(/^https?:\/\/hololist\.net\/|\/$/g, '').split('/')[0] || '';
    const imgSrc = c.img.getAttribute('src') || c.img.getAttribute('data-src') || '';

    // Prefer higher-res image
    let image = imgSrc.replace(/-\d+x\d+\./, '.');

    // Name
    let name = c.link.textContent?.trim() ||
               c.link.getAttribute('title') ||
               c.img.getAttribute('alt') ||
               slug.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    name = name.replace(/\s*(VTuber|Malaysia|my)\s*$/gi, '').trim();

    // Agency
    const parent = c.el.closest('article') || c.el.parentElement?.parentElement || c.el;
    let agency = 'Independent';
    const catLinks = parent?.querySelectorAll('a[href*="/category/"], a[href*="/tag/"], a[rel="category tag"]');
    if (catLinks?.length) {
      const cats = [...catLinks].map(a => a.textContent.trim()).filter(t =>
        t !== 'VTuber' && t !== 'my' && t !== 'Malaysia' && t !== 'MY' && t.length > 1
      );
      if (cats.length) agency = cats[0];
    }

    return { name, slug, url: href, image, agency };
  }

  // ── Dry run ─────────────────────────────────────────────
  ok(`\n📋 DRY RUN — First ${Math.min(DRY_RUN_CT, unique.length)} entries:`);
  for (let i = 0; i < Math.min(DRY_RUN_CT, unique.length); i++) {
    const e = extractEntry(unique[i]);
    banner.innerHTML += `<div style="color:#8cf;font-size:11px">${i+1}. <b>${e.name}</b> (${e.agency})</div>`;
    console.log(`  ${e.name} | ${e.slug} | ${e.agency}`);
  }

  // ── Detect pagination ───────────────────────────────────
  let maxPage = 1;
  document.querySelectorAll('a[href*="/page/"]').forEach(a => {
    const m = a.href.match(/\/page\/(\d+)/);
    if (m) maxPage = Math.max(maxPage, +m[1]);
  });
  const totalMatch = document.body.innerText.match(/Page\s+\d+\s+of\s+(\d+)/i);
  if (totalMatch) maxPage = Math.max(maxPage, +totalMatch[1]);

  ok(`\n🔄 Scraping ${maxPage} page(s)...`);

  // ── Scrape all pages ────────────────────────────────────
  const allEntries = new Map();

  async function scrapePage(pageNum) {
    const url = pageNum === 1 ? BASE_URL : BASE_URL.replace(/\/$/, '') + `/page/${pageNum}/`;
    ok(`📄 Page ${pageNum}/${maxPage}...`);
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');

      let items = [];
      doc.querySelectorAll(
        'article, .post, .entry, .vtuber-card, .card, .item, ' +
        '[class*="entry-"], [class*="post-"], [class*="card-"], ' +
        '[class*="item-"], [class*="vtuber"], ' +
        '.type-post, .status-publish'
      ).forEach(el => {
        const link = el.querySelector('a[href]');
        const img  = el.querySelector('img[src], img[data-src]');
        if (link && img) items.push({ el, link, img });
      });

      if (!items.length) {
        doc.querySelectorAll('a[href]').forEach(a => {
          const h = a.getAttribute('href') || '';
          if (/^https?:\/\/hololist\.net\/[^\/]+\/?$/.test(h) &&
              !h.includes('category') && !h.includes('language') &&
              !h.includes('page')    && !h.includes('tag')) {
            const img = a.querySelector('img[src], img[data-src]');
            if (img) items.push({ el: a, link: a, img });
          }
        });
      }

      let count = 0;
      items.forEach(c => {
        const e = extractEntry(c);
        if (e.slug && e.name && !allEntries.has(e.slug)) {
          allEntries.set(e.slug, e);
          count++;
        }
      });
      ok(`   ✅ +${count} entries`);
      return count;
    } catch (e) {
      err(`   ❌ ${e.message}`);
      return 0;
    }
  }

  // Page 1 from current DOM
  unique.forEach(c => {
    const e = extractEntry(c);
    if (e.slug && e.name) allEntries.set(e.slug, e);
  });
  ok(`   ✅ Page 1 done (${allEntries.size} entries)`);

  // Remaining pages
  for (let p = 2; p <= maxPage; p++) {
    await scrapePage(p);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const entries = [...allEntries.values()].filter(e =>
    e.url.includes('hololist.net/') &&
    !['category','language','page'].some(k => e.slug.includes(k)) &&
    e.slug.length > 1
  );

  ok(`\n📊 Scraped ${entries.length} VTubers, ${new Set(entries.map(e=>e.agency)).size} agencies`);

  // ── Download JSON ───────────────────────────────────────
  const json = JSON.stringify(entries, null, 2);
  const blobUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const dl = document.createElement('a');
  dl.href = blobUrl; dl.download = FILENAME;
  document.body.appendChild(dl); dl.click(); document.body.removeChild(dl);
  URL.revokeObjectURL(blobUrl);
  ok(`✅ Downloaded ${FILENAME}`);

  // ══════════════════════════════════════════════════════════
  // PHASE 2: IMAGE DOWNLOAD
  // ══════════════════════════════════════════════════════════

  ok('\n' + '═'.repeat(40));
  ok('🖼️  IMAGE DOWNLOAD PHASE');
  ok('═'.repeat(40));

  // Check if File System Access API is available
  const hasDirPicker = typeof window.showDirectoryPicker === 'function';

  if (hasDirPicker) {
    ok('Your browser supports directory picker!');
    ok('Choose a folder to save images directly...');
    log('', '');

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      ok(`📁 Selected: ${dirHandle.name}`);
      ok(`   Will save ${entries.length} images as {slug}.jpg`);

      let success = 0, fail = 0;

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const imgUrl = e.image;

        progressBar(i, entries.length, `📥 ${e.slug}`);

        try {
          const resp = await fetch(imgUrl, { credentials: 'include' });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const imgBlob = await resp.blob();

          if (imgBlob.size < 500) {
            warn(`   ⚠ ${e.slug}: file too small (${imgBlob.size}B), likely broken — skipped`);
            fail++;
            continue;
          }

          const fileHandle = await dirHandle.getFileHandle(`${e.slug}.jpg`, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(imgBlob);
          await writable.close();
          success++;
        } catch (imgErr) {
          warn(`   ⚠ ${e.slug}: ${imgErr.message}`);
          fail++;
        }

        // Small delay to avoid hammering
        if (i % 10 === 9) await new Promise(r => setTimeout(r, IMG_DELAY));
      }

      progressBar(entries.length, entries.length, '📥');
      ok(`\n✅ Image download complete!`);
      ok(`   ✅ Success: ${success}`);
      if (fail) err(`   ❌ Failed:  ${fail}`);
      ok(`   📁 Folder:   ${dirHandle.name}`);
      ok(`\n📋 Done! You now have:`);
      ok(`   1. ${FILENAME} — VTuber data`);
      ok(`   2. ${dirHandle.name}/ — Portrait images`);
      ok(`\n   Next: replace data/characters.json, copy portraits to data/portraits/`);

    } catch (dirErr) {
      if (dirErr.name === 'AbortError') {
        warn('Directory picker cancelled. Falling back to ZIP...');
      } else {
        err(`Directory error: ${dirErr.message}. Falling back to ZIP...`);
      }
      await downloadAsZip(entries);
    }

  } else {
    warn('Directory picker not supported in this browser.');
    warn('Falling back to ZIP download...');
    await downloadAsZip(entries);
  }

  // ── ZIP fallback ────────────────────────────────────────
  async function downloadAsZip(entries) {
    ok('📦 Loading JSZip library...');

    // Load JSZip from CDN
    if (typeof JSZip === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(s);
      });
    }

    ok('📦 Downloading images and building ZIP...');
    const zip = new JSZip();
    let success = 0, fail = 0;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      progressBar(i, entries.length, `📥 ${e.slug}`);

      try {
        const resp = await fetch(e.image, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const imgBlob = await resp.blob();

        if (imgBlob.size < 500) {
          warn(`   ⚠ ${e.slug}: too small (${imgBlob.size}B), skipped`);
          fail++;
          continue;
        }

        zip.file(`${e.slug}.jpg`, imgBlob);
        success++;
      } catch (imgErr) {
        warn(`   ⚠ ${e.slug}: ${imgErr.message}`);
        fail++;
      }

      if (i % 10 === 9) await new Promise(r => setTimeout(r, IMG_DELAY));
    }

    progressBar(entries.length, entries.length, '📦 Compressing...');
    ok('📦 Compressing ZIP (this may take a moment)...');

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }, (meta) => {
      const pct = Math.round(meta.percent);
      if (pct % 10 === 0) log(`   Compressing... ${pct}%`, '#8cf');
    });

    const sizeMB = (zipBlob.size / 1024 / 1024).toFixed(1);
    ok(`📦 ZIP ready (${sizeMB} MB)`);

    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = 'hololist-my-portraits.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(zipUrl);

    ok(`\n✅ Downloaded hololist-my-portraits.zip`);
    ok(`   ✅ Images: ${success}`);
    if (fail) err(`   ❌ Failed: ${fail}`);
    ok(`   📦 Size:   ${sizeMB} MB`);
    ok(`\n📋 Done! You now have:`);
    ok(`   1. ${FILENAME} — VTuber data`);
    ok(`   2. hololist-my-portraits.zip — Portrait images`);
    ok(`\n   Extract the ZIP, then copy .jpg files to data/portraits/`);
  }

  // ── Console log full data ───────────────────────────────
  console.log('\n========== SCRAPED DATA ==========');
  console.log(JSON.stringify(entries, null, 2));
  console.log('=================================\n');
})();
