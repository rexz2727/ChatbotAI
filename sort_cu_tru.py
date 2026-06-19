import re

with open('data/cu_tru.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into chunks
# The first chunk starts at the beginning
# Other chunks start with '=== NGUỒN: '
chunks_raw = re.split(r'(?==== NGUỒN: )', content)

chunks = []
for chunk in chunks_raw:
    chunk = chunk.strip()
    if not chunk:
        continue
        
    # Determine the year
    year = 0
    if 'TÀI LIỆU HƯỚNG DẪN' in chunk or '2026' in chunk[:500]:
        year = 2026
    elif '2020' in chunk.split('\n')[0]:
        year = 2020
    elif '2023' in chunk.split('\n')[0]:
        year = 2023
    elif '2024' in chunk.split('\n')[0]:
        year = 2024
    elif '2025' in chunk.split('\n')[0]:
        year = 2025
    else:
        # Fallback regex to find first 4 digit year
        m = re.search(r'20\d{2}', chunk[:500])
        if m:
            year = int(m.group(0))
            
    chunks.append({
        'year': year,
        'text': chunk
    })

# Sort chunks descending by year
chunks.sort(key=lambda x: x['year'], reverse=True)

# Format the final text
final_text_parts = []
for c in chunks:
    header = f"[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI {c['year']}]\n"
    # Make sure text doesn't already start with such header
    text = c['text']
    text = re.sub(r'^\[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI \d{4}\]\n+', '', text)
    final_text_parts.append(header + text)

final_text = "\n\n\n".join(final_text_parts) + "\n"

with open('data/cu_tru.txt', 'w', encoding='utf-8') as f:
    f.write(final_text)

print("Done sorting")
