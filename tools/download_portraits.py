#!/usr/bin/env python3
"""
MyVT Gacha - Portrait Downloader (Python fallback)

Downloads all VTuber portrait images from hololist.net and saves them
to data/portraits/ directory. Also creates a ZIP archive.

Usage:
  1. First, visit https://hololist.net in your browser and pass Cloudflare.
  2. Open DevTools > Application > Cookies > hololist.net
  3. Copy the value of "cf_clearance" cookie
  4. Run: python3 tools/download_portraits.py --cookie "YOUR_CF_CLEARANCE_VALUE"
  
  Without cookie (may work if Cloudflare only checks Referer):
  3. Run: python3 tools/download_portraits.py

  Options:
    --cookie CF_COOKIE    Cloudflare cf_clearance cookie value
    --output DIR          Output directory (default: data/portraits)
    --zip                 Also create a ZIP file
    --user-agent UA       Custom User-Agent string
    --delay MS            Delay between requests in ms (default: 300)
    --workers N           Concurrent download workers (default: 3)
    --dry-run             Just list what would be downloaded
"""

import argparse
import json
import os
import sys
import time
import zipfile
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
    from concurrent.futures import ThreadPoolExecutor, as_completed
except ImportError:
    print("ERROR: 'requests' library required. Install with: pip install requests")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_DATA_FILE = PROJECT_ROOT / "data" / "characters.json"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data" / "portraits"
DEFAULT_ZIP_FILE = PROJECT_ROOT / "data" / "portraits.zip"


def load_characters(data_file: Path) -> list:
    """Load character data from JSON file."""
    if not data_file.exists():
        print(f"ERROR: Character data not found at {data_file}")
        print("Make sure you're running this from the MyVT-Gacha project root.")
        sys.exit(1)
    
    with open(data_file, 'r', encoding='utf-8') as f:
        chars = json.load(f)
    
    print(f"Loaded {len(chars)} characters from {data_file}")
    return chars


def determine_extension(url: str, content_type: str) -> str:
    """Determine file extension from URL and content-type."""
    # Check URL path first
    path = urlparse(url).path.lower()
    for ext in ['.png', '.webp', '.gif', '.jpeg']:
        if ext in path:
            return ext
    # Fall back to content-type
    ct = content_type.lower()
    if 'png' in ct:
        return '.png'
    elif 'webp' in ct:
        return '.webp'
    elif 'gif' in ct:
        return '.gif'
    return '.jpg'


def download_one(char: dict, session: requests.Session, output_dir: Path,
                 delay_ms: int = 300) -> dict:
    """Download a single character's portrait image."""
    slug = char['slug']
    name = char['name']
    url = char['image']
    
    try:
        resp = session.get(url, timeout=15)
        
        if resp.status_code == 403:
            return {'slug': slug, 'name': name, 'success': False,
                    'error': 'HTTP 403 (Cloudflare blocked)'}
        if resp.status_code != 200:
            return {'slug': slug, 'name': name, 'success': False,
                    'error': f'HTTP {resp.status_code}'}
        
        if len(resp.content) < 100:
            return {'slug': slug, 'name': name, 'success': False,
                    'error': f'File too small ({len(resp.content)} bytes)'}
        
        ext = determine_extension(url, resp.headers.get('content-type', ''))
        filename = f"{slug}{ext}"
        filepath = output_dir / filename
        
        with open(filepath, 'wb') as f:
            f.write(resp.content)
        
        return {'slug': slug, 'name': name, 'success': True,
                'filename': filename, 'size': len(resp.content)}
    
    except requests.Timeout:
        return {'slug': slug, 'name': name, 'success': False,
                'error': 'Timeout'}
    except Exception as e:
        return {'slug': slug, 'name': name, 'success': False,
                'error': str(e)}


def main():
    parser = argparse.ArgumentParser(
        description='Download MyVT Gacha portrait images from hololist.net')
    parser.add_argument('--data', type=str, default=str(DEFAULT_DATA_FILE),
                        help=f'Path to characters.json (default: {DEFAULT_DATA_FILE})')
    parser.add_argument('--output', type=str, default=str(DEFAULT_OUTPUT_DIR),
                        help=f'Output directory (default: {DEFAULT_OUTPUT_DIR})')
    parser.add_argument('--zip', action='store_true',
                        help='Also create a ZIP archive')
    parser.add_argument('--cookie', type=str, default=None,
                        help='cf_clearance cookie value from hololist.net')
    parser.add_argument('--user-agent', type=str,
                        default='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        help='Custom User-Agent')
    parser.add_argument('--delay', type=int, default=300,
                        help='Delay between requests in ms (default: 300)')
    parser.add_argument('--workers', type=int, default=3,
                        help='Concurrent download workers (default: 3)')
    parser.add_argument('--dry-run', action='store_true',
                        help='List URLs without downloading')
    args = parser.parse_args()

    # Load data
    characters = load_characters(Path(args.data))
    output_dir = Path(args.output)
    
    if args.dry_run:
        print("\n[DRY RUN] Would download these images:")
        for c in characters:
            print(f"  {c['slug']:30s} -> {c['image']}")
        print(f"\nTotal: {len(characters)} images")
        return
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")
    
    # Setup session
    session = requests.Session()
    session.headers.update({
        'User-Agent': args.user_agent,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    # Don't send Referer (some Cloudflare configs allow no-referer)
    session.headers['Referer'] = ''
    
    if args.cookie:
        session.cookies.set('cf_clearance', args.cookie, domain='hololist.net')
        print("Using cf_clearance cookie")
    
    print(f"\nStarting download with {args.workers} workers, {args.delay}ms delay...")
    print("=" * 60)
    
    success = []
    failed = []
    delay_sec = args.delay / 1000.0
    
    # Download with thread pool
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {}
        for i, char in enumerate(characters):
            # Stagger requests to avoid burst
            time.sleep(delay_sec / args.workers)
            future = executor.submit(download_one, char, session, output_dir, args.delay)
            futures[future] = char
        
        for future in as_completed(futures):
            result = future.result()
            if result['success']:
                success.append(result)
                size_kb = result['size'] / 1024
                print(f"  OK  [{len(success)+len(failed):3d}/{len(characters)}] "
                      f"{result['name']:30s} -> {result['filename']} ({size_kb:.1f} KB)")
            else:
                failed.append(result)
                print(f"  FAIL [{len(success)+len(failed):3d}/{len(characters)}] "
                      f"{result['name']:30s} -> {result['error']}")
    
    # Summary
    print("=" * 60)
    print(f"\nDone! Success: {len(success)} | Failed: {len(failed)} | "
          f"Total: {len(characters)}")
    
    if failed:
        print(f"\nFailed images ({len(failed)}):")
        for f in failed:
            print(f"  - {f['name']} ({f['slug']}): {f['error']}")
        print(f"\nTIP: If getting 403 errors, get your cf_clearance cookie from:")
        print(f"  1. Visit https://hololist.net in your browser")
        print(f"  2. Open DevTools (F12) > Application > Cookies")
        print(f"  3. Copy 'cf_clearance' value")
        print(f"  4. Re-run: python3 tools/download_portraits.py --cookie 'YOUR_COOKIE'")
    
    # Create ZIP if requested
    if args.zip and success:
        zip_path = DEFAULT_ZIP_FILE
        print(f"\nCreating ZIP archive: {zip_path}")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for item in success:
                filepath = output_dir / item['filename']
                if filepath.exists():
                    zf.write(filepath, item['filename'])
        zip_size_mb = zip_path.stat().st_size / 1024 / 1024
        print(f"ZIP created: {zip_size_mb:.1f} MB ({len(success)} files)")


if __name__ == '__main__':
    main()
