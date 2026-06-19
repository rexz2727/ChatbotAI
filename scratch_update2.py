import re
import os

file_path = '/home/chatbot/Projects/ChatbotAI/data/can_cuoc.txt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Since we already prepended titles, we need to strip them out first to cleanly rebuild.
# The original file didn't have these titles, so we can split by blocks again.
# Actually, let's just parse the file carefully.

blocks = []
current_block = []

for line in content.split('\n'):
    if line.startswith('[ƯU TIÊN ÁP DỤNG') or line.startswith('[VĂN BẢN CŨ'):
        continue # Skip the titles we just added
    
    # Check if this line is the start of a block
    if '=== NGUỒN:' in line:
        if current_block:
            blocks.append('\n'.join(current_block).strip())
        current_block = [line]
    else:
        current_block.append(line)

if current_block:
    blocks.append('\n'.join(current_block).strip())

parsed_blocks = []
for idx, text in enumerate(blocks):
    # Determine max year mentioned in '=== NGUỒN: ...' or in the text if it's the manual
    if '=== NGUỒN:' in text[:100]:
        match = re.search(r'(20\d\d)', text.split('\n')[0])
        year = int(match.group(1)) if match else 1900
        name = text.split('\n')[0]
    else:
        name = 'MANUAL'
        years = re.findall(r'(20\d\d)', text)
        year = max([int(y) for y in years]) if years else 2026

    parsed_blocks.append({
        'name': name,
        'year': year,
        'text': text
    })

# Sort by year descending
parsed_blocks.sort(key=lambda x: x['year'], reverse=True)

new_content = []
for block in parsed_blocks:
    year = block['year']
    title = f"[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI {year}]" if year >= 2024 else f"[VĂN BẢN CŨ {year}]"
    new_content.append(f"{title}\n{block['text']}")

# Ensure 2 empty lines between blocks
final_text = "\n\n\n".join(new_content) + "\n"

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_text)

print("File updated successfully.")
