import re

with open('data/khieu_nai.txt', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\n=== NGUỒN: luat_khieu_nai_2011\.pdf ===\n'
parts = re.split(pattern, content)
part0 = parts[0].strip()
rest = parts[1]

pattern2 = r'\n=== NGUỒN: luat_to_cao_2018\.pdf ===\n'
parts2 = re.split(pattern2, rest)
part1 = parts2[0].strip()
rest2 = parts2[1]

pattern3 = r'\n=== NGHIỆP VỤ KHIẾU NẠI / TỐ CÁO ===\n'
parts3 = re.split(pattern3, rest2)
part2 = parts3[0].strip()
part3 = parts3[1].strip()

new_content = ""

# Part 0 (2026)
new_content += "[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI 202X]\n\n\n"
new_content += part0 + "\n\n\n"

# Part 3 (2021)
new_content += "[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI 202X]\n\n\n"
new_content += "=== NGHIỆP VỤ KHIẾU NẠI / TỐ CÁO ===\n"
new_content += part3 + "\n\n\n"

# Part 2 (2018)
new_content += "=== NGUỒN: luat_to_cao_2018.pdf ===\n"
new_content += part2 + "\n\n\n"

# Part 1 (2011)
new_content += "=== NGUỒN: luat_khieu_nai_2011.pdf ===\n"
new_content += part1 + "\n"

with open('data/khieu_nai.txt', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done")

