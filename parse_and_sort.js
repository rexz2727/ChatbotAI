const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function main() {
    const dataTxtPath = 'data/giao_thong.txt';
    const pdfsDir = 'docs/legal_pdfs/giao_thong';
    
    // Đọc file giao_thong.txt hiện tại
    const contentTxt = fs.readFileSync(dataTxtPath, 'utf8');
    
    // Tách 2 phần: 2026 và 2020
    const parts = contentTxt.split('=== NGUỒN: nghi_dinh_136_2020.pdf ===');
    const doc2026 = parts[0].trim();
    const doc2020 = parts[1] ? parts[1].trim() : '';
    
    // Parse các PDF
    const pdfFiles = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));
    let docs2024 = [];
    let docs2023 = [];
    
    for (let file of pdfFiles) {
        console.log("Parsing: " + file);
        const dataBuffer = fs.readFileSync(path.join(pdfsDir, file));
        const data = await pdf(dataBuffer);
        const text = data.text.trim();
        
        const docObj = {
            title: `=== NGUỒN: ${file} ===`,
            content: text
        };
        
        if (file.includes('2024')) {
            docs2024.push(docObj);
        } else if (file.includes('2023')) {
            docs2023.push(docObj);
        }
    }
    
    // Ghép nối file
    let finalContent = "";
    
    finalContent += "[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI 2026]\n";
    finalContent += doc2026 + "\n\n\n";
    
    finalContent += "[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI 2024]\n";
    for (let doc of docs2024) {
        finalContent += doc.title + "\n\n";
        finalContent += doc.content + "\n\n\n";
    }
    
    finalContent += "[ƯU TIÊN ÁP DỤNG - VĂN BẢN MỚI 2023]\n";
    for (let doc of docs2023) {
        finalContent += doc.title + "\n\n";
        finalContent += doc.content + "\n\n\n";
    }
    
    finalContent += "[ƯU TIÊN ÁP DỤNG - VĂN BẢN CŨ 2020]\n";
    finalContent += "=== NGUỒN: nghi_dinh_136_2020.pdf ===\n\n";
    finalContent += doc2020 + "\n";
    
    fs.writeFileSync(dataTxtPath, finalContent, 'utf8');
    console.log("Done overwriting data/giao_thong.txt");
}

main().catch(console.error);
