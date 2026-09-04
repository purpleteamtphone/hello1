// 儲存從主頁面傳遞過來的二進位資料
let fileData = null;

// 監聽來自主頁面的 postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BUFFER') {
    fileData = {
      buffer: event.data.buffer,
      filename: event.data.filename || 'downloaded_file.bin',
      mimeType: event.data.mimeType || 'application/octet-stream'
    };
    // 通知頁面資料已準備完畢
    event.ports[0].postMessage({ status: 'READY' });
  }
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 檢查是否為虛擬下載路由
  if (url.pathname.endsWith('/virtual-download')) {
    if (!fileData || !fileData.buffer) {
      event.respondWith(new Response('No data available in Service Worker', { status: 404 }));
      return;
    }

    // 建立二進位 Response，並加入檔頭指示瀏覽器觸發下載
    const responseHeaders = new Headers({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.filename}"`,
      'Content-Length': fileData.buffer.byteLength.toString()
    });

    const response = new Response(fileData.buffer, {
      status: 200,
      headers: responseHeaders
    });

    event.respondWith(response);
  }
});

// 確保 Service Worker 註冊後立即啟用
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
