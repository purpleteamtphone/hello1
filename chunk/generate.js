const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// ============================================================
// 🔧 關鍵優化參數
// ============================================================
const CONFIG = {
    CHUNK_SIZE: 8192,        // 改為 8KB (比原來大 2 倍)
    // CHUNK_SIZE: 16384,    // 如果還是不夠，改為 16KB
    MAX_NODES: 300,          // 限制最大節點數
    ENABLE_GZIP: true,       // ⚠️ 務必啟用！
    NOISE_INTERVAL: 8,       // 每 8 個字元一個空格
};

// ============================================================
// 自動調整 Chunk Size
// ============================================================
function calculateOptimalChunkSize(fileSize) {
    // 目標：節點數控制在 200-300 之間
    const targetNodes = 250;
    const hexLength = fileSize * 2; // 壓縮後檔案大小 × 2
    
    if (hexLength / targetNodes < 1000) {
        return 4096; // 小檔案用 4KB
    } else if (hexLength / targetNodes < 5000) {
        return 8192; // 中等檔案用 8KB
    } else {
        return 16384; // 大檔案用 16KB
    }
}

// ============================================================
// 核心生成函數
// ============================================================
function generateStealthHTML(filePath) {
    console.log('='.repeat(60));
    console.log('🚀 開始生成隱寫 HTML (優化版)');
    console.log('='.repeat(60));
    
    // 1. 讀取檔案
    const originalBuffer = fs.readFileSync(filePath);
    console.log(`📦 原始檔案: ${(originalBuffer.length / 1024).toFixed(2)} KB`);
    
    // 2. Gzip 壓縮 (必須啟用!)
    let bufferToEncode;
    let isCompressed = false;
    
    if (CONFIG.ENABLE_GZIP) {
        bufferToEncode = zlib.gzipSync(originalBuffer, { level: 9 });
        isCompressed = true;
        console.log(`🗜️ 壓縮後: ${(bufferToEncode.length / 1024).toFixed(2)} KB (減少 ${((1 - bufferToEncode.length / originalBuffer.length) * 100).toFixed(1)}%)`);
    } else {
        bufferToEncode = originalBuffer;
        console.log(`⚠️ Gzip 壓縮已停用 (不建議)`);
    }
    
    // 3. 動態計算最佳 Chunk Size
    const optimalChunkSize = calculateOptimalChunkSize(bufferToEncode.length);
    console.log(`📐 使用 Chunk Size: ${optimalChunkSize} bytes`);
    
    // 4. 轉為 Hex
    const hexString = bufferToEncode.toString('hex');
    console.log(`📝 Hex 總長度: ${hexString.length.toLocaleString()} 字元`);
    
    // 5. 碎片化
    const chunks = [];
    for (let i = 0; i < hexString.length; i += optimalChunkSize) {
        const chunk = hexString.substring(i, Math.min(i + optimalChunkSize, hexString.length));
        
        // 加入雜訊 (每 N 個字元插入空格)
        let noisyChunk = '';
        for (let j = 0; j < chunk.length; j += CONFIG.NOISE_INTERVAL) {
            const part = chunk.substring(j, Math.min(j + CONFIG.NOISE_INTERVAL, chunk.length));
            noisyChunk += part + ' ';
        }
        
        chunks.push({
            index: Math.floor(i / optimalChunkSize),
            data: noisyChunk.trim(),
            total: Math.ceil(hexString.length / optimalChunkSize),
        });
    }
    
    console.log(`🧩 碎片數量: ${chunks.length}`);
    
    // 6. 檢查是否超過節點限制
    if (chunks.length > CONFIG.MAX_NODES) {
        console.warn(`⚠️ 碎片數 (${chunks.length}) 超過建議上限 (${CONFIG.MAX_NODES})`);
        console.warn(`   建議增大 CHUNK_SIZE 或使用更高壓縮等級`);
    }
    
    // 7. 打亂順序 (保留索引)
    const shuffled = [...chunks].sort(() => Math.random() - 0.5);
    
    // 8. 生成 HTML (使用更精簡的結構)
    const classes = ['stego-chunk', 'data-piece', 'config-part', 'hex-block'];
    const now = new Date().toLocaleString();
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>System Configuration</title>
    <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
        .stego-chunk, .data-piece, .config-part, .hex-block { display: none !important; }
        .card { background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .label { font-weight: bold; color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <h1>System Configuration</h1>
        <p>Last updated: ${now}</p>
        <div class="card"><span class="label">Status:</span> Operational</div>
        <div class="card"><span class="label">Version:</span> v2.3.1</div>
        <div id="chunk-container">`;

    // 加入碎片 (精簡格式)
    shuffled.forEach(chunk => {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        html += `<span class="${randomClass}" data-idx="${chunk.index}" data-hex="${chunk.data}"></span>`;
    });

    html += `</div>
        <div class="card"><span class="label">Security:</span> Enforced</div>
    </div>
    <script>console.log('Loaded');</script>
</body>
</html>`;

    // 9. 寫入檔案
    const outputPath = path.join(__dirname, 'index.html');
    fs.writeFileSync(outputPath, html);
    
    const htmlSize = html.length;
    console.log(`📄 HTML 大小: ${(htmlSize / 1024).toFixed(2)} KB`);
    console.log(`📊 總碎片數: ${chunks.length}`);
    console.log(`✅ 輸出檔案: ${outputPath}`);
    console.log('='.repeat(60));
    
    // 10. 生成狀態報告
    const report = {
        originalSize: originalBuffer.length,
        compressedSize: bufferToEncode.length,
        isCompressed,
        chunks: chunks.length,
        htmlSize,
        outputPath,
        chunkSize: optimalChunkSize,
    };
    
    console.log('\n📋 狀態報告:');
    console.log(`   壓縮: ${isCompressed ? '✅ 已啟用' : '❌ 未啟用 (建議啟用)'}`);
    console.log(`   Chunk Size: ${optimalChunkSize}`);
    console.log(`   節點數: ${chunks.length} (${chunks.length > 300 ? '⚠️ 可能過多' : '✅ 安全'})`);
    
    return report;
}

// ============================================================
// 執行
// ============================================================
if (require.main === module) {
    const filePath = process.argv[2] || './7z2602-x64.exe';
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 檔案不存在: ${filePath}`);
        process.exit(1);
    }
    generateStealthHTML(filePath);
}