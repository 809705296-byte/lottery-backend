export async function onRequest(context) {
  const { env } = context;
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
}
