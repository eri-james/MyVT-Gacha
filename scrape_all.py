import json, re

all_vtubers = []

for page_num in [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]:
    fname = f'hololist_my_p{page_num}.json' if page_num > 0 else 'hololist_my.json'
    try:
        with open(fname, 'r') as f:
            data = json.load(f)
        html = data['data']['html']
    except Exception as e:
        print(f"WARNING: Could not read {fname}: {e}")
        continue
    
    # Extract the VTuber listing section
    start_marker = '<h1 class="fs-4 m-0">Malaysia'
    if start_marker not in html:
        start_marker = '<div class="row">'
    
    start_idx = html.find(start_marker)
    if start_idx == -1:
        start_idx = 0
    
    # Find pagination nav or end of content
    end_markers = ['<nav class="pagination', '<div class="d-flex align-items-center justify-content-between"']
    end_idx = len(html)
    for em in end_markers:
        idx = html.find(em, start_idx + 500)  # skip first occurrence which might be the header
        if idx != -1:
            end_idx = min(end_idx, idx)
    
    section = html[start_idx:end_idx]
    
    # Now find all name + image + agency triplets
    # Pattern: find each <a href with hololist URL, then find name and agency after it
    
    # Find all URLs first  
    urls = re.findall(r'<a href="(https://hololist\.net/([^/"]+)/)" title="([^"]+)"', section)
    
    for url, slug, title_name in urls:
        # Find the name from span.fw-medium that follows this URL
        # Build a search pattern from the URL
        url_escaped = re.escape(url)
        block_match = re.search(
            url_escaped + r'.*?<span class="fw-medium">([^<]+)</span>.*?<div class="small">([^<]+)</div>',
            section, re.DOTALL
        )
        
        if block_match:
            name = block_match.group(1).strip()
            agency = block_match.group(2).strip()
        else:
            name = title_name.strip()
            agency = "Unknown"
        
        # Find image
        img_match = re.search(
            url_escaped + r'.*?<img[^>]+src="([^"]+)"',
            section[:section.find(url) + 2000], re.DOTALL
        )
        image = img_match.group(1).strip() if img_match else ""
        
        # Skip non-portrait images and non-hololist images
        if 'hololist.net/wp-content/uploads' not in image or 'portrait' not in image:
            image = ""
        
        # Skip duplicates
        if any(v['slug'] == slug for v in all_vtubers):
            continue
        
        all_vtubers.append({
            'name': name,
            'slug': slug,
            'url': url,
            'image': image,
            'agency': agency
        })
    
    display_page = page_num if page_num > 0 else 1
    print(f"Page {display_page}: running total: {len(all_vtubers)}")

print(f"\n=== TOTAL UNIQUE VTUBERS: {len(all_vtubers)} ===")

# Count agencies
agencies = {}
for v in all_vtubers:
    a = v['agency']
    agencies[a] = agencies.get(a, 0) + 1

print("\n=== AGENCIES ===")
for a, c in sorted(agencies.items(), key=lambda x: -x[1]):
    print(f"  {a}: {c}")

# Print first 10 for verification
print("\n=== FIRST 10 VTUBERS ===")
for v in all_vtubers[:10]:
    print(f"  {v['name']} | {v['agency']} | {v['image'][:60]}...")

# Save to JSON
with open('malaysian_vtubers.json', 'w') as f:
    json.dump(all_vtubers, f, indent=2, ensure_ascii=False)

print("\nSaved to malaysian_vtubers.json")
