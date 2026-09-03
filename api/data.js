import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // 讀取 public 目錄下的二進位檔案
  const filePath = path.join(process.cwd(), 'public', 'payload.bin');

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // 1. 開放全域跨域 (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // 2. 設定為通用二進位串流
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 3. 強制移除下載指示標頭 (避開 RBI/SWG 下載攔截)
    res.removeHeader('Content-Disposition');

    res.status(200).send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'File read failed' });
  }
}
