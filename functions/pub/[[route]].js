const WORKER_URL = 'https://fornos-api.nnuxx.workers.dev';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/pub/, '');
  const targetUrl = WORKER_URL + targetPath + url.search;
  const headers = new Headers();
  headers.set('CF-Access-Client-Id', env.SVC_ID);
  headers.set('CF-Access-Client-Secret', env.SVC_SECRET);
  const resp = await fetch(targetUrl, { method: 'GET', headers });
  const out = new Headers(resp.headers);
  Object.entries(CORS).forEach(([k, v]) => out.set(k, v));
  return new Response(resp.body, { status: resp.status, headers: out });
}
