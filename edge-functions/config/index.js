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

  // 环境变量缺失时直接报错，不掩盖问题
  if (!url || !key) {
    return new Response(JSON.stringify({
      error: '环境变量未配置',
      hasUrl: !!url,
      hasKey: !!key
    }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }

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

      if (!rows.length) {
        return new Response(JSON.stringify({
          error: '数据库里没有 main 记录',
          raw: rows
        }), {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        config: rows[0].data
      }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    // POST：保存配置
    if (request.method === 'POST') {
      const body = await request.json();
      await fetch(url + '/rest/v1/config?id=eq.main', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          data: {
            totalUsers: body.totalUsers,
            prizes: body.prizes,
            boxes: body.boxes || []
          },
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
