// 1. 安裝時立即跳過等待階段
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. 啟用時立即接管所有開啟中的 Client 頁面
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

let storedBuffer = null;
let mimeType = 'application/octet-stream';

// 接收 Message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BUFFER') {
    storedBuffer = event.data.buffer;
    mimeType = event.data.mimeType || 'application/octet-stream';
    
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'READY' });
    }
  }
});

// 攔截 Fetch Request
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('/virtual-download')) {
    if (!storedBuffer) {
      event.respondWith(new Response('No data', { status: 404 }));
      return;
    }

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

    storedBuffer = null;
    event.respondWith(response);
  }
});
