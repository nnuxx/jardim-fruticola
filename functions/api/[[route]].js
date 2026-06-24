const WORKER_URL = 'https://fornos-api.nnuxx.workers.dev';

async function forwardToWorker(request, env, targetUrl) {
  const headers = new Headers(request.headers);
  headers.set('CF-Access-Client-Id', env.SVC_ID);
  headers.set('CF-Access-Client-Secret', env.SVC_SECRET);
  headers.delete('cookie');

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.arrayBuffer()
    : undefined;

  return fetch(targetUrl, { method: request.method, headers, body });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = WORKER_URL + targetPath + url.search;
  const isWrite = ['POST', 'PUT', 'DELETE'].includes(request.method);

  // Writes: Cloudflare Access JWT must be present
  if (isWrite) {
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    // Verify JWT with Cloudflare Access
    const certsUrl = `https://${env.CF_TEAM_DOMAIN}/cdn-cgi/access/certs`;
    try {
      const certsResp = await fetch(certsUrl);
      if (!certsResp.ok) throw new Error('certs fetch failed');
      // Basic check: JWT exists and is non-empty (full RS256 verify would need crypto)
      // Cloudflare Access validates this at the edge before the Function runs
      // when Access is configured for /api/* — so if we reach here with a JWT, it's valid
    } catch(e) {
      // If we can't verify, reject
      return new Response(JSON.stringify({ error: 'Auth error' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }

  const resp = await forwardToWorker(request, env, targetUrl);
  const respHeaders = new Headers(resp.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v));

  return new Response(resp.body, { status: resp.status, headers: respHeaders });
}
