const WORKER_URL = 'https://fornos-api.nnuxx.workers.dev';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = WORKER_URL + targetPath + url.search;
  const isWrite = ['POST', 'PUT', 'DELETE'].includes(request.method);

  // Writes require valid CF Access JWT cookie
  if (isWrite) {
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion')
      || getCookie(request.headers.get('cookie') || '', 'CF_Authorization');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Login necessário', login_url: '/api/_login' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
  }

  // Forward to Worker
  const headers = new Headers();
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  headers.set('CF-Access-Client-Id', env.SVC_ID);
  headers.set('CF-Access-Client-Secret', env.SVC_SECRET);

  const body = isWrite ? await request.arrayBuffer() : undefined;
  const resp = await fetch(targetUrl, { method: request.method, headers, body });

  const out = new Headers(resp.headers);
  Object.entries(CORS).forEach(([k, v]) => out.set(k, v));
  return new Response(resp.body, { status: resp.status, headers: out });
}

function getCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
