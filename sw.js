let storedBuffer = null;
let mimeType = 'application/octet-stream';

// 監聽來自頁面的 Message，接收轉移過來的 ArrayBuffer
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BUFFER') {
    storedBuffer = event.data.buffer;
    mimeType = event.data.mimeType || 'application/octet-stream';
    
    // 通知頁面資料已就緒
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'READY' });
    }
  }
});

// 攔截頁面的虛擬路由 Request
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('/virtual-download')) {
    if (!storedBuffer) {
      event.respondWith(new Response('No data', { status: 404 }));
      return;
    }

    // 建立純淨的 application/octet-stream Response
    // 完全不包含 Content-Disposition 標頭，防止 RBI 判定為下載行為
    const responseHeaders = new Headers({
      'Content-Type': mimeType,
      'Content-Length': storedBuffer.byteLength.toString(),
      'Cache-Control': 'no-store'
    });

    const response = new Response(storedBuffer, {
      status: 200,
      statusText: 'OK',
      headers: responseHeaders
    });

    // 釋放暫存 (視業務需求保留或清除)
    storedBuffer = null;

    event.respondWith(response);
  }
});
