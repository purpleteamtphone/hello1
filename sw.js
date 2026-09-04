let storedBuffer = null;
let mimeType = 'application/octet-stream';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BUFFER') {
    storedBuffer = event.data.buffer;
    mimeType = event.data.mimeType || 'application/octet-stream';
    
    // 回應 MessagePort
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'READY' });
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 攔截虛擬路由
  if (url.pathname.endsWith('/virtual-download')) {
    if (!storedBuffer) {
      event.respondWith(new Response('No data', { status: 404 }));
      return;
    }

    // 建立只包含 application/octet-stream 的 Response
    // 嚴禁包含 Content-Disposition: attachment 標頭
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

    // 清除暫存 (選擇性)
    storedBuffer = null;

    event.respondWith(response);
  }
});
