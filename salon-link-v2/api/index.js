module.exports = async function handler(req, res) {
  const url = 'https://cpmmqqznrqeodlesyfgg.supabase.co/functions/v1/salon-link-v2-public';

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const body = await response.text();

    res.statusCode = response.status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.end(body);
  } catch (error) {
    console.error('SALON LINK v2 proxy failed', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end('<!doctype html><meta charset="utf-8"><title>SALON LINK</title><h1>SALON LINK</h1><p>読み込みに失敗しました。</p>');
  }
};
