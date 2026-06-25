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

  // Special login redirect endpoint
  if (url.pathname === '/api/_login') {
    const back = url.searchParams.get('back') || '/';
    return Response.redirect(back, 302);
  }

  // Forward to Worker with service credentials
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = WORKER_URL + targetPath + url.search;

  const headers = new Headers();
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  headers.set('CF-Access-Client-Id', env.SVC_ID);
  headers.set('CF-Access-Client-Secret', env.SVC_SECRET);

  let body;
  if (!['GET','HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  const resp = await fetch(targetUrl, { method: request.method, headers, body });
  const out = new Headers(resp.headers);
  Object.entries(CORS).forEach(([k, v]) => out.set(k, v));
  return new Response(resp.body, { status: resp.status, headers: out });
}
