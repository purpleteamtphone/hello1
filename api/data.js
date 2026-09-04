import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'a.one');
    //const filePath = path.join(process.cwd(), 'public', '7z2602-x64');
    const fileBuffer = fs.readFileSync(filePath);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.removeHeader('Content-Disposition');

    // 關鍵修正：必須使用 res.end(fileBuffer) 避免 Vercel 亂碼化
    res.status(200).end(fileBuffer);
  } catch (error) {
    res.status(500).send('Error reading binary file');
  }
}
