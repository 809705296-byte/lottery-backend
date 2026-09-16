export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_KEY;
  const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };

  try {
    // GET：读配置
    if (request.method === 'GET') {
      const res = await fetch(url + '/rest/v1/config?id=eq.main&select=data', { headers });
      const rows = await res.json();
      return new Response(JSON.stringify({
        ok: true,
        config: rows[0]?.data || { totalUsers: 1000, prizes: [] }
      }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
    }

    // POST：保存配置（后台用）
    if (request.method === 'POST') {
      const body = await request.json();
      if (!body.totalUsers || !Array.isArray(body.prizes)) {
        return new Response(JSON.stringify({ error: '格式错误' }), {
          status: 400,
          headers: { ...corsHeaders, 'content-type': 'application/json' }
        });
      }

      await fetch(url + '/rest/v1/config?id=eq.main', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          data: { totalUsers: body.totalUsers, prizes: body.prizes },
          updated_at: new Date().toISOString()
        })
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
}
