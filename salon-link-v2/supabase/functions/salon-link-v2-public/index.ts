const BASE_URL = 'https://cpmmqqznrqeodlesyfgg.supabase.co/functions/v1/';

// Formal MVP v2 standalone HTML is stored as a gzip/Base64 bundle split across
// these validated static chunks. Their concatenated Base64 length is 44,672.
const PARTS = [
  'sl-v2-c0',
  'sl-v2-c1',
  'sl-v2-c2',
  'sl-v2-c3',
  'sl-v2-c4',
  'sl-v2-b0',
  'sl-v2-b1',
  'sl-v2-b2',
  'sl-v2-b3',
];

async function fetchPart(name: string) {
  const response = await fetch(BASE_URL + name, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${name}:${response.status}`);
  return (await response.text()).trim();
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'content-type,authorization',
      },
    });
  }

  try {
    const parts = await Promise.all(PARTS.map(fetchPart));
    const bundle = parts.join('');
    if (bundle.length !== 44672) throw new Error(`bundle ${bundle.length}`);

    const htmlBuffer = await new Response(
      new Blob([base64ToBytes(bundle)]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).arrayBuffer();
    const html = new TextDecoder().decode(htmlBuffer);

    if (!html.includes('SALON LINK')) throw new Error('invalid app');

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  } catch (error) {
    console.error('SALON LINK v2 public reconstruction failed', error);
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>SALON LINK</title><h1>SALON LINK</h1><p>アプリの読み込みに失敗しました。</p>',
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
});
