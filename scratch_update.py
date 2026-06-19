import re
import os

file_path = '/home/chatbot/Projects/ChatbotAI/data/can_cuoc.txt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

blocks = []
current_block_name = "MANUAL"
current_block_lines = []

for line in content.split('\n'):
    if line.startswith('=== NGUỒN:'):
        blocks.append({'name': current_block_name, 'text': '\n'.join(current_block_lines).strip()})
        current_block_name = line.strip()
        current_block_lines = [line]
    else:
        current_block_lines.append(line)

blocks.append({'name': current_block_name, 'text': '\n'.join(current_block_lines).strip()})

# Determine year for each block
for block in blocks:
    if block['name'] == 'MANUAL':
        # Search for year in text
        match = re.search(r'Nghị định số \d+/(20\d\d)', block['text'])
        if match:
            block['year'] = int(match.group(1))
        else:
            block['year'] = 2026 # Fallback based on text we saw
    else:
        match = re.search(r'(20\d\d)', block['name'])
        if match:
            block['year'] = int(match.group(1))
        else:
            block['year'] = 1900

# Sort blocks by year descending
blocks.sort(key=lambda x: x['year'], reverse=True)

new_content = []
for block in blocks:
    year = block['year']
    title = f"[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI {year}]" if year >= 2024 else f"[VĂN BẢN CŨ {year}]"
    if block['name'] == 'MANUAL':
        # Add the title at the top
        new_content.append(f"{title}\n{block['text']}")
    else:
        # Check if the title should be added after the source or before
        # The prompt says: Thêm rõ các tiêu đề như [ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI 202X] vào các đoạn
        new_content.append(f"{title}\n{block['text']}")

# Ensure 2 empty lines between blocks
final_text = "\n\n\n".join(new_content) + "\n"

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_text)

print("File updated successfully.")
