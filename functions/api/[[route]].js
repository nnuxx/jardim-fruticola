const WORKER_URL = 'https://fornos-api.nnuxx.workers.dev';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Build target URL — strip /api prefix
  const targetPath = url.pathname.replace('/api', '');
  const targetUrl = WORKER_URL + targetPath + url.search;

  const isWrite = ['POST','PUT','DELETE'].includes(request.method);

  // Writes require valid session token
  if (isWrite) {
    const token = request.headers.get('X-Fornos-Token');
    if (token !== env.WRITE_TOKEN) {
      return new Response(JSON.stringify({error:'Unauthorized'}), {
        status: 401,
        headers: {'Content-Type':'application/json'}
      });
    }
  }

  // Forward to Worker with service credentials
  const headers = new Headers(request.headers);
  headers.set('CF-Access-Client-Id', env.SVC_ID);
  headers.set('CF-Access-Client-Secret', env.SVC_SECRET);
  headers.delete('X-Fornos-Token');

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.arrayBuffer()
    : undefined;

  const resp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const respHeaders = new Headers(resp.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(resp.body, {
    status: resp.status,
    headers: respHeaders,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Fornos-Token',
    }
  });
}
