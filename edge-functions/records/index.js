export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_KEY;
  const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };

  try {
    if (request.method === 'GET') {
      const res = await fetch(url + '/rest/v1/records?select=*&order=id.desc', { headers });
      const rows = await res.json();
      return new Response(JSON.stringify({ ok: true, records: rows }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (request.method === 'PATCH') {
      const body = await request.json();
      const { id, verified, verified_time } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: '缺少 id' }), {
          status: 400,
          headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      await fetch(url + '/rest/v1/records?id=eq.' + id, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ verified: verified, verified_time: verified_time })
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (request.method === 'DELETE') {
      // 删除所有记录：用 id 大于 0 的条件匹配所有行
      await fetch(url + '/rest/v1/records?id=gt.0', {
        method: 'DELETE',
        headers
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
