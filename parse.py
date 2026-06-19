import re

with open('data/khieu_nai.txt', 'r', encoding='utf-8') as f:
    content = f.read()

parts = re.split(r'\n=== NGUỒN: (.*?) ===\n', '\n' + content)

print("Part 0:")
print(parts[0][:200])
print("-" * 20)

for i in range(1, len(parts), 2):
    print(f"Source: {parts[i]}")
    print(parts[i+1][:200])
    print("-" * 20)

