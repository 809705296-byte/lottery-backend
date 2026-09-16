export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_KEY;

    const res = await fetch(url + '/rest/v1/config?id=eq.main&select=data', {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key
      }
    });
    const rows = await res.json();

    return new Response(JSON.stringify({
      ok: true,
      config: rows[0]?.data || { boxes: [] }
    }), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
