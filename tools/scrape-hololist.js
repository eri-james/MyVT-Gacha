/**
 * ============================================================
 *  HoloList Malaysia VTuber Scraper — Chrome DevTools Snippet
 * ============================================================
 *
 *  HOW TO USE:
 *  1. Open Chrome → go to https://hololist.net/category/my/
 *  2. Wait for the page to fully load (pass Cloudflare check)
 *  3. Press F12 → Console tab
 *  4. Paste this entire script and press Enter
 *  5. It will auto-detect the page structure, scrape all pages,
 *     and download a fresh characters.json
 *
 *  TIP: If you see a "dry run" preview first, check that the
 *  entries look correct, then the full scrape continues automatically.
 */

(async function HoloListScraper() {
  'use strict';

  // ── Config ──────────────────────────────────────────────
  const BASE_URL = 'https://hololist.net/category/my/';
  const DELAY_MS = 1500;          // delay between page fetches
  const FILENAME = 'characters_new.json';
  const DRY_RUN_COUNT = 5;        // how many entries to preview

  // ── UI helpers ──────────────────────────────────────────
  const banner = document.createElement('div');
  Object.assign(banner.style, {
    position: 'fixed', top: '10px', right: '10px', zIndex: '999999',
    background: '#1a1a2e', color: '#0f0', fontFamily: 'monospace',
    padding: '16px 20px', borderRadius: '8px', maxWidth: '420px',
    fontSize: '13px', lineHeight: '1.6', boxShadow: '0 4px 24px rgba(0,0,0,.5)',
    overflow: 'auto', maxHeight: '90vh'
  });
  document.body.appendChild(banner);

  function log(msg, color) {
    console.log(`%c[Scraper] ${msg}`, color ? `color:${color}` : '');
    banner.innerHTML += `<div style="color:${color || '#0f0'}">${msg}</div>`;
  }
  function err(msg) { log(msg, '#f44'); }
  function warn(msg) { log(msg, '#ff0'); }
  function ok(msg) { log(msg, '#0f0'); }

  // ── Step 1: Detect page structure ───────────────────────
  ok('🔍 Detecting page structure...');

  const candidates = [];

  // Strategy A: Look for article/post elements with links
  const articles = document.querySelectorAll(
    'article, .post, .entry, .vtuber-card, .card, .item, ' +
    '[class*="entry-"], [class*="post-"], [class*="card-"], ' +
    '[class*="item-"], [class*="vtuber"], [class*="profile"], ' +
    '.type-post, .status-publish'
  );
  articles.forEach(el => {
    const link = el.querySelector('a[href]');
    const img = el.querySelector('img[src]');
    if (link && img) {
      candidates.push({ el, link, img, strategy: 'A (article/post element)' });
    }
  });

  // Strategy B: Look for grid/list containers with linked images
  if (candidates.length === 0) {
    const containers = document.querySelectorAll(
      '.grid, .list, .archive, .content, main, #content, .site-content, ' +
      '[class*="grid"], [class*="list"], [class*="archive"], ' +
      '[class*="wrapper"], [class*="container"]'
    );
    containers.forEach(container => {
      const items = container.querySelectorAll(':scope > *');
      items.forEach(item => {
        const link = item.querySelector('a[href]');
        const img = item.querySelector('img[src]');
        if (link && img) {
          candidates.push({ el: item, link, img, strategy: 'B (container child)' });
        }
      });
    });
  }

  // Strategy C: Find all links that point to hololist.net/{slug}/
  if (candidates.length === 0) {
    const allLinks = document.querySelectorAll('a[href]');
    allLinks.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\/hololist\.net\/[^\/]+\/?$/.test(href) &&
          !href.includes('category') && !href.includes('language') &&
          !href.includes('page') && !href.includes('tag')) {
        const img = a.querySelector('img[src]');
        if (img) {
          candidates.push({ el: a, link: a, img, strategy: 'C (hololist link match)' });
        }
      }
    });
  }

  // Strategy D: Brute force — every img with a portrait-like URL
  if (candidates.length === 0) {
    const imgs = document.querySelectorAll('img[src*="portrait"], img[src*="300x300"], img[src*="hololist"]');
    imgs.forEach(img => {
      let link = img.closest('a[href]');
      if (!link) link = img.parentElement?.querySelector('a[href]');
      if (link) {
        candidates.push({ el: link, link, img, strategy: 'D (portrait image match)' });
      }
    });
  }

  if (candidates.length === 0) {
    err('❌ Could not detect any VTuber entries on this page!');
    err('Make sure you are on: https://hololist.net/category/my/');
    err('Please wait for the page to fully load, then try again.');
    banner.innerHTML += `
      <div style="margin-top:12px; color:#88f">
        <b>Debug info:</b><br>
        URL: ${location.href}<br>
        Articles: ${articles.length}<br>
        Links: ${document.querySelectorAll('a[href]').length}<br>
        Images: ${document.querySelectorAll('img').length}<br>
        Portrait imgs: ${document.querySelectorAll('img[src*="portrait"]').length}
      </div>`;
    return;
  }

  ok(`✅ Found ${candidates.length} entries using ${candidates[0].strategy}`);

  // ── Step 2: Deduplicate by URL ─────────────────────────
  const seen = new Set();
  const unique = [];
  candidates.forEach(c => {
    const href = c.link.getAttribute('href') || '';
    if (!seen.has(href)) {
      seen.add(href);
      unique.push(c);
    }
  });

  // ── Step 3: Extract data helper ─────────────────────────
  function extractEntry(candidate) {
    const href = candidate.link.getAttribute('href') || '';
    const slug = href.replace(/^https?:\/\/hololist\.net\/|\/$/g, '').split('/')[0] || '';
    const imgSrc = candidate.img.getAttribute('src') || candidate.img.getAttribute('data-src') || '';

    // Get the highest-res image URL
    let image = imgSrc;
    if (imgSrc.includes('300x300')) {
      // Try to get a larger version by removing the size suffix
      image = imgSrc.replace(/-\d+x\d+\./, '.');
    }

    // Get name from the link text, title attr, or img alt
    let name = candidate.link.textContent?.trim() ||
               candidate.link.getAttribute('title') ||
               candidate.img.getAttribute('alt') ||
               slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Clean up name
    name = name.replace(/\s*VTuber.*$/i, '').replace(/\s*Malaysia.*$/i, '').replace(/\s*my\s*$/i, '').trim();

    // Get agency from nearby text
    const parent = candidate.el.closest('article') || candidate.el.parentElement?.parentElement || candidate.el;
    const parentText = parent?.textContent || '';
    let agency = 'Independent';

    // Look for agency/group keywords in parent text
    const agencyPatterns = [
      /(?:Agency|Group|Affiliation|Org)[:\s]*([^\n,]+)/i,
    ];
    for (const pat of agencyPatterns) {
      const m = parentText.match(pat);
      if (m) { agency = m[1].trim(); break; }
    }

    // Also look for category/tag links
    const catLinks = parent?.querySelectorAll('a[href*="/category/"], a[href*="/tag/"], a[rel="category tag"]');
    if (catLinks?.length) {
      const cats = [...catLinks].map(a => a.textContent.trim()).filter(t =>
        t !== 'VTuber' && t !== 'my' && t !== 'Malaysia' && t !== 'MY' && t.length > 1
      );
      if (cats.length > 0) agency = cats[0];
    }

    return { name, slug, url: href, image, agency };
  }

  // ── Step 4: Dry run — show preview ─────────────────────
  ok('\n📋 DRY RUN — First ' + Math.min(DRY_RUN_COUNT, unique.length) + ' entries:');
  const previewEntries = [];
  for (let i = 0; i < Math.min(DRY_RUN_COUNT, unique.length); i++) {
    const entry = extractEntry(unique[i]);
    previewEntries.push(entry);
    const shortImg = entry.image.length > 60 ? entry.image.slice(0, 60) + '...' : entry.image;
    console.log(`  ${entry.name} | ${entry.slug} | ${entry.agency} | ${shortImg}`);
    banner.innerHTML += `<div style="color:#8cf; font-size:11px">
      ${i + 1}. <b>${entry.name}</b> (${entry.agency}) → ${entry.slug}
    </div>`;
  }

  ok(`\n🔄 Starting full scrape of all pages...`);
  ok(`Base URL: ${BASE_URL}`);

  // ── Step 5: Detect total pages ──────────────────────────
  function detectMaxPage() {
    // Look for pagination links
    const pageLinks = document.querySelectorAll('a[href*="/page/"]');
    let maxPage = 1;
    pageLinks.forEach(a => {
      const m = a.href.match(/\/page\/(\d+)/);
      if (m) maxPage = Math.max(maxPage, parseInt(m[1]));
    });

    // Also look for "Page X of Y" text
    const pageText = document.body.innerText;
    const totalMatch = pageText.match(/Page\s+\d+\s+of\s+(\d+)/i);
    if (totalMatch) maxPage = Math.max(maxPage, parseInt(totalMatch[1]));

    return maxPage;
  }

  const totalPages = detectMaxPage();
  ok(`Pages detected: ${totalPages} (current = page 1)`);

  // ── Step 6: Scrape all pages ────────────────────────────
  const allEntries = [];

  async function scrapePage(pageNum) {
    const url = pageNum === 1
      ? BASE_URL
      : BASE_URL.replace(/\/$/, '') + `/page/${pageNum}/`;

    ok(`📄 Fetching page ${pageNum}/${totalPages}: ${url}`);

    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Try the same detection strategies on the fetched page
      let pageCandidates = [];

      // Strategy A
      const arts = doc.querySelectorAll(
        'article, .post, .entry, .vtuber-card, .card, .item, ' +
        '[class*="entry-"], [class*="post-"], [class*="card-"], ' +
        '[class*="item-"], [class*="vtuber"], [class*="profile"], ' +
        '.type-post, .status-publish'
      );
      arts.forEach(el => {
        const link = el.querySelector('a[href]');
        const img = el.querySelector('img[src], img[data-src]');
        if (link && img) pageCandidates.push({ el, link, img });
      });

      // Strategy C fallback
      if (pageCandidates.length === 0) {
        const allLinks = doc.querySelectorAll('a[href]');
        allLinks.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (/^https?:\/\/hololist\.net\/[^\/]+\/?$/.test(href) &&
              !href.includes('category') && !href.includes('language') &&
              !href.includes('page') && !href.includes('tag')) {
            const img = a.querySelector('img[src], img[data-src]');
            if (img) pageCandidates.push({ el: a, link: a, img });
          }
        });
      }

      // Strategy D fallback
      if (pageCandidates.length === 0) {
        const imgs = doc.querySelectorAll('img[src*="portrait"], img[src*="300x300"], img[src*="hololist"]');
        imgs.forEach(img => {
          let link = img.closest('a[href]');
          if (!link) link = img.parentElement?.querySelector('a[href]');
          if (link) pageCandidates.push({ el: link, link, img });
        });
      }

      // Deduplicate
      const seenUrls = new Set();
      let count = 0;
      pageCandidates.forEach(c => {
        const href = c.link.getAttribute('href') || '';
        if (!seenUrls.has(href)) {
          seenUrls.add(href);
          const entry = extractEntry(c);
          allEntries.push(entry);
          count++;
        }
      });

      ok(`   ✅ Extracted ${count} entries from page ${pageNum}`);
      return count;

    } catch (e) {
      err(`   ❌ Failed to fetch page ${pageNum}: ${e.message}`);
      return 0;
    }
  }

  // Scrape page 1 (current page — use DOM directly)
  {
    const seenUrls = new Set(allEntries.map(e => e.url));
    let count = 0;
    unique.forEach(c => {
      const href = c.link.getAttribute('href') || '';
      if (!seenUrls.has(href)) {
        seenUrls.add(href);
        const entry = extractEntry(c);
        allEntries.push(entry);
        count++;
      }
    });
    ok(`   ✅ Extracted ${count} entries from page 1 (current page)`);
  }

  // Scrape remaining pages
  for (let p = 2; p <= totalPages; p++) {
    await scrapePage(p);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // ── Step 7: Deduplicate & validate ──────────────────────
  const finalMap = new Map();
  allEntries.forEach(e => {
    if (e.slug && e.name) {
      finalMap.set(e.slug, e);
    }
  });

  // Remove any non-Malaysia entries (filter out generic links)
  const entries = [...finalMap.values()].filter(e =>
    e.url.includes('hololist.net/') &&
    !e.slug.includes('category') &&
    !e.slug.includes('language') &&
    !e.slug.includes('page') &&
    e.slug.length > 1
  );

  // ── Step 8: Compare with old data ──────────────────────
  ok(`\n📊 Results:`);
  ok(`Total entries scraped: ${entries.length}`);
  ok(`Unique slugs: ${new Set(entries.map(e => e.slug)).size}`);

  const agencies = new Set(entries.map(e => e.agency));
  ok(`Agencies found: ${agencies.size}`);
  agencies.forEach(a => {
    const count = entries.filter(e => e.agency === a).length;
    banner.innerHTML += `<div style="color:#adf; font-size:11px">  &bull; ${a}: ${count}</div>`;
  });

  // ── Step 9: Download JSON ───────────────────────────────
  const json = JSON.stringify(entries, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  ok(`\n✅ DONE! Downloaded ${FILENAME}`);
  ok(`   ${entries.length} VTubers saved.`);
  ok(`\n📋 Next steps:`);
  ok('   1. Open the downloaded file and verify the data');
  ok('   2. Replace data/characters.json with the new file');
  ok('   3. Commit and push to GitHub');

  // Also log to console for easy copy-paste
  console.log('\n========== SCRAPED DATA ==========');
  console.log(json);
  console.log('=================================\n');
})();
