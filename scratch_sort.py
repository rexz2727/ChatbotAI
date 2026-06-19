import re
import os

file_path = '/home/chatbot/Projects/ChatbotAI/data/can_cuoc.txt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Split the content into blocks.
# A block starts with the manual or `=== NGUỒN: ... ===`
blocks = []
current_block_name = "MANUAL_2026"
current_block_lines = []

for line in content.split('\n'):
    if line.startswith('=== NGUỒN:'):
        blocks.append((current_block_name, '\n'.join(current_block_lines).strip()))
        current_block_name = line.strip()
        current_block_lines = [line]
    else:
        current_block_lines.append(line)

blocks.append((current_block_name, '\n'.join(current_block_lines).strip()))

print("Found blocks:")
for name, text in blocks:
    print(name, len(text))
