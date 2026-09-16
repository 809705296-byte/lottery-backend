export async function onRequest(context) {
  try {
    const { env } = context;
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_KEY;

    if (!url || !key) {
      return new Response(JSON.stringify({
        error: '环境变量未读取到',
        hasUrl: !!url,
        hasKey: !!key
      }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    const res = await fetch(url + '/rest/v1/config?id=eq.main&select=data', {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key
      }
    });

    const text = await res.text();

    return new Response(JSON.stringify({
      ok: true,
      status: res.status,
      raw: text
    }), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err),
      stack: err.stack || ''
    }), {
      headers: { 'content-type': 'application/json' }
    });
  }
}
