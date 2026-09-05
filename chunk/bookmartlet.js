javascript:(async function(){
    // ============================================================
    // RBI 碎片化資料提取器 v3.1
    // 支援: Hex / Base64 / Gzip 自動解壓 / 多種資料來源
    // ============================================================
    
    'use strict';
    
    const VERSION = '3.1';
    const MIN_DATA_LENGTH = 100;
    
    // ============================================================
    // 1. 日誌函數
    // ============================================================
    function log(msg, type = 'info') {
        const prefix = {
            'info': '📘',
            'success': '✅',
            'error': '❌',
            'warn': '⚠️',
            'debug': '🔍'
        }[type] || '📌';
        console.log(`${prefix} [RBI Extractor v${VERSION}] ${msg}`);
    }
    
    // ============================================================
    // 2. 掃描所有可能的資料來源
    // ============================================================
    function scanAllSources() {
        log('開始掃描頁面資料來源...', 'info');
        const results = [];
        
        // 方法 1: 掃描 [data-hex] 屬性
        const hexElements = document.querySelectorAll('[data-hex]');
        if (hexElements.length > 0) {
            log(`找到 ${hexElements.length} 個 [data-hex] 元素`, 'debug');
            const data = extractFromAttributes(hexElements, 'data-hex');
            if (data) results.push({ source: 'data-hex', data });
        }
        
        // 方法 2: 掃描 [data-value] 屬性
        const valueElements = document.querySelectorAll('[data-value]');
        if (valueElements.length > 0) {
            log(`找到 ${valueElements.length} 個 [data-value] 元素`, 'debug');
            const data = extractFromAttributes(valueElements, 'data-value');
            if (data) results.push({ source: 'data-value', data });
        }
        
        // 方法 3: 掃描 [data-chunk] 屬性
        const chunkElements = document.querySelectorAll('[data-chunk]');
        if (chunkElements.length > 0) {
            log(`找到 ${chunkElements.length} 個 [data-chunk] 元素`, 'debug');
            const data = extractFromAttributes(chunkElements, 'data-chunk');
            if (data) results.push({ source: 'data-chunk', data });
        }
        
        // 方法 4: 掃描特定 class 的元素
        const classSelectors = [
            '.stego-chunk', '.data-piece', '.config-part', 
            '.hex-block', '.token-slice', '.meta-data'
        ];
        for (const selector of classSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                log(`找到 ${elements.length} 個 ${selector} 元素`, 'debug');
                const data = extractFromTextContent(elements);
                if (data) results.push({ source: selector, data });
                break; // 找到一組就跳出
            }
        }
        
        // 方法 5: 掃描所有 textarea
        const textareas = document.querySelectorAll('textarea');
        for (const el of textareas) {
            const text = el.value || el.textContent || '';
            const cleaned = cleanData(text);
            if (cleaned.length > MIN_DATA_LENGTH) {
                results.push({ source: 'textarea', data: cleaned });
                log(`從 textarea 讀取到 ${cleaned.length} 字元`, 'debug');
                break;
            }
        }
        
        // 方法 6: 掃描所有 display:none 的 div
        const hiddenDivs = document.querySelectorAll('div[style*="display:none"], div[style*="display: none"]');
        for (const el of hiddenDivs) {
            const text = el.textContent || '';
            const cleaned = cleanData(text);
            if (cleaned.length > MIN_DATA_LENGTH) {
                results.push({ source: 'hidden div', data: cleaned });
                log(`從隱藏 div 讀取到 ${cleaned.length} 字元`, 'debug');
                break;
            }
        }
        
        return results;
    }
    
    // ============================================================
    // 3. 從屬性提取資料（支援索引排序）
    // ============================================================
    function extractFromAttributes(elements, attrName) {
        const chunkMap = new Map();
        let hasIndex = false;
        
        for (const el of elements) {
            let data = el.getAttribute(attrName) || '';
            let index = -1;
            
            // 嘗試讀取索引
            if (el.dataset.idx !== undefined) {
                index = parseInt(el.dataset.idx);
                hasIndex = true;
            } else if (el.dataset.index !== undefined) {
                index = parseInt(el.dataset.index);
                hasIndex = true;
            } else if (el.dataset.chunk !== undefined) {
                index = parseInt(el.dataset.chunk);
                hasIndex = true;
            }
            
            data = cleanData(data);
            if (data.length > 0) {
                if (index === -1) index = chunkMap.size;
                chunkMap.set(index, data);
            }
        }
        
        if (chunkMap.size === 0) return null;
        
        // 按索引排序組合
        const sortedKeys = Array.from(chunkMap.keys()).sort((a, b) => a - b);
        let combined = '';
        for (const key of sortedKeys) {
            combined += chunkMap.get(key);
        }
        
        return combined;
    }
    
    // ============================================================
    // 4. 從文字內容提取
    // ============================================================
    function extractFromTextContent(elements) {
        const chunks = [];
        
        for (const el of elements) {
            let text = el.textContent || '';
            // 如果有 data-idx 就用來排序
            if (el.dataset.idx !== undefined) {
                const idx = parseInt(el.dataset.idx);
                chunks[idx] = cleanData(text);
            } else {
                chunks.push(cleanData(text));
            }
        }
        
        // 移除 undefined 並組合
        const validChunks = chunks.filter(c => c !== undefined && c.length > 0);
        if (validChunks.length === 0) return null;
        
        return validChunks.join('');
    }
    
    // ============================================================
    // 5. 清理資料
    // ============================================================
    function cleanData(text) {
        return text
            .replace(/\s+/g, '')           // 移除所有空白
            .replace(/[^0-9A-Fa-f]/g, '')  // 只保留 Hex 字元
            .toUpperCase();
    }
    
    // ============================================================
    // 6. 偵測資料格式 (Hex / Base64)
    // ============================================================
    function detectFormat(data) {
        // 檢查是否為有效的 Hex (只含 0-9A-F，長度為偶數)
        if (/^[0-9A-F]+$/.test(data) && data.length % 2 === 0) {
            return 'hex';
        }
        
        // 檢查是否為 Base64
        if (/^[A-Za-z0-9+/]+=*$/.test(data)) {
            try {
                atob(data.substring(0, 100));
                return 'base64';
            } catch (e) {}
        }
        
        return 'unknown';
    }
    
    // ============================================================
    // 7. Hex 轉 Bytes
    // ============================================================
    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0, j = 0; i < hex.length; i += 2, j++) {
            bytes[j] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
    }
    
    // ============================================================
    // 8. Base64 轉 Bytes
    // ============================================================
    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    
    // ============================================================
    // 9. Gzip 解壓縮
    // ============================================================
    async function decompressGzip(bytes) {
        try {
            // 檢查 Gzip magic number
            if (bytes[0] !== 0x1F || bytes[1] !== 0x8B) {
                return bytes;
            }
            
            log('偵測到 Gzip 壓縮，開始解壓縮...', 'info');
            
            const stream = new Response(bytes).body;
            const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
            const decompressedArrayBuffer = await new Response(decompressedStream).arrayBuffer();
            const decompressedBytes = new Uint8Array(decompressedArrayBuffer);
            
            log(`✅ 解壓縮成功: ${(bytes.length / 1024).toFixed(2)} KB → ${(decompressedBytes.length / 1024).toFixed(2)} KB`, 'success');
            return decompressedBytes;
            
        } catch (e) {
            log(`⚠️ 解壓縮失敗: ${e.message}，使用原始資料`, 'warn');
            return bytes;
        }
    }
    
    // ============================================================
    // 10. 偵測檔案類型
    // ============================================================
    function detectFileType(bytes) {
        const signatures = {
            '4D5A': { ext: 'exe', name: 'Windows Executable' },
            '504B': { ext: 'zip', name: 'ZIP Archive' },
            '504B0304': { ext: 'zip', name: 'ZIP Archive' },
            '2550': { ext: 'pdf', name: 'PDF Document' },
            '8950': { ext: 'png', name: 'PNG Image' },
            'FFD8': { ext: 'jpg', name: 'JPEG Image' },
            '474946': { ext: 'gif', name: 'GIF Image' },
            '1F8B': { ext: 'gz', name: 'GZIP Archive' },
            '7F45': { ext: 'elf', name: 'ELF Executable' },
        };
        
        const hex = bytes.slice(0, 8).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
        
        for (const [magic, info] of Object.entries(signatures)) {
            if (hex.startsWith(magic.toLowerCase())) {
                return info;
            }
        }
        
        return { ext: 'bin', name: 'Binary File' };
    }
    
    // ============================================================
    // 11. 觸發下載
    // ============================================================
    function triggerDownload(bytes, filename) {
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        log(`✅ 下載已觸發: ${filename}`, 'success');
    }
    
    // ============================================================
    // 12. 主程式
    // ============================================================
    try {
        log('🚀 啟動 RBI 資料提取器', 'info');
        log(`📋 版本: ${VERSION}`, 'debug');
        log(`🌐 頁面: ${document.title || '未知'}`, 'debug');
        
        // 步驟 1: 掃描所有資料來源
        const results = scanAllSources();
        
        if (results.length === 0) {
            alert('❌ 找不到任何資料！\n\n請確認：\n1. 頁面已完整載入\n2. 資料確實存在於頁面中\n3. 嘗試手動選取資料後再執行');
            
            // 嘗試從使用者選取範圍讀取
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                const text = selection.toString().replace(/\s/g, '');
                if (text.length > MIN_DATA_LENGTH) {
                    if (confirm(`📊 從選取範圍讀取到 ${text.length} 個字元，是否使用？`)) {
                        results.push({ source: '手動選取', data: text });
                    }
                }
            }
            
            if (results.length === 0) return;
        }
        
        // 步驟 2: 選擇最佳資料來源（優先選擇最長的）
        let bestResult = results.reduce((a, b) => a.data.length > b.data.length ? a : b);
        log(`📊 選擇資料來源: ${bestResult.source} (${bestResult.data.length} 字元)`, 'info');
        
        // 步驟 3: 偵測格式
        const format = detectFormat(bestResult.data);
        log(`📋 偵測格式: ${format}`, 'debug');
        
        // 步驟 4: 轉換為 Bytes
        let bytes;
        try {
            if (format === 'hex') {
                bytes = hexToBytes(bestResult.data);
                log(`✅ Hex 轉換成功: ${bytes.length} bytes`, 'success');
            } else if (format === 'base64') {
                bytes = base64ToBytes(bestResult.data);
                log(`✅ Base64 轉換成功: ${bytes.length} bytes`, 'success');
            } else {
                // 嘗試自動偵測：先當 Hex 試試
                const cleaned = cleanData(bestResult.data);
                if (cleaned.length % 2 === 0 && /^[0-9A-F]+$/.test(cleaned)) {
                    bytes = hexToBytes(cleaned);
                    log('✅ 自動偵測為 Hex 格式', 'success');
                } else {
                    throw new Error('無法識別資料格式');
                }
            }
        } catch (e) {
            alert(`❌ 資料轉換失敗: ${e.message}\n\n請確認資料是有效的 Hex 或 Base64 格式`);
            return;
        }
        
        if (!bytes || bytes.length === 0) {
            alert('❌ 轉換後資料為空');
            return;
        }
        
        // 步驟 5: 嘗試 Gzip 解壓縮
        let finalBytes = await decompressGzip(bytes);
        let isCompressed = bytes.length !== finalBytes.length;
        
        // 步驟 6: 偵測檔案類型
        const fileInfo = detectFileType(finalBytes);
        const finalExt = fileInfo.ext;
        
        // 步驟 7: 顯示資訊並確認
        const sizeKB = (finalBytes.length / 1024).toFixed(2);
        const sizeMB = (finalBytes.length / 1024 / 1024).toFixed(2);
        const compressionInfo = isCompressed ? 
            `🗜️ 已解壓縮 (壓縮前: ${(bytes.length / 1024).toFixed(2)} KB)` : 
            '📄 未壓縮';
        
        const infoMsg = 
`📊 資料還原完成！

📁 檔案類型: ${fileInfo.name} (.${finalExt})
📦 檔案大小: ${sizeKB} KB (${sizeMB} MB)
📋 資料來源: ${bestResult.source}
📐 資料格式: ${format}
${compressionInfo}
🔢 原始長度: ${bestResult.data.length} 字元

確認下載？`;

        if (!confirm(infoMsg)) {
            log('使用者取消下載', 'info');
            return;
        }
        
        // 步驟 8: 觸發下載
        const filename = `restored_file.${finalExt}`;
        triggerDownload(finalBytes, filename);
        
        // 步驟 9: 成功訊息
        setTimeout(() => {
            alert(`✅ 下載已觸發！\n📁 ${filename}\n📦 ${sizeKB} KB`);
        }, 500);
        
    } catch (e) {
        log(`嚴重錯誤: ${e.message}`, 'error');
        console.error(e);
        alert(`❌ 發生錯誤: ${e.message}\n\n請查看開發者控制台 (F12) 獲取詳細資訊。`);
    }
})();