export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
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
    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint) {
      return new Response(JSON.stringify({ error: '缺少参数' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    // 1. 一人一次
    const existRes = await fetch(
      url + '/rest/v1/records?fingerprint=eq.' + encodeURIComponent(fingerprint) + '&limit=1',
      { headers }
    );
    const exist = await existRes.json();
    if (exist.length > 0) {
      return new Response(JSON.stringify({ ok: false, msg: '您已参与过', prize: exist[0].prize }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    // 2. 读配置
    const cfgRes = await fetch(url + '/rest/v1/config?id=eq.main&select=data', { headers });
    const cfgRows = await cfgRes.json();
    if (!cfgRows.length) {
      return new Response(JSON.stringify({ error: '配置未初始化' }), {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      });
    }

    const cfg = cfgRows[0].data;
    const totalUsers = Number(cfg.totalUsers) || 1000;
    const prizes = Array.isArray(cfg.prizes) ? cfg.prizes : [];

    // 3. 统计已中奖数量
    const recRes = await fetch(url + '/rest/v1/records?select=prize', { headers });
    const allRecords = await recRes.json();

    const wonCount = {};
    for (const r of allRecords) {
      wonCount[r.prize] = (wonCount[r.prize] || 0) + 1;
    }

    // 4. 按剩余数量算概率
    const pool = [];
    for (const p of prizes) {
      const total = Number(p.count) || 0;
      const used = wonCount[p.name] || 0;
      const remain = total - used;
      if (remain > 0) {
        pool.push({ ...p, probability: remain / totalUsers });
      }
    }

    // 5. 抽奖
    const totalProb = pool.reduce((s, p) => s + p.probability, 0);
    let prize;
    if (totalProb <= 0 || Math.random() > totalProb) {
      prize = { name: '谢谢参与', emoji: '😢', desc: '很遗憾，这次没中奖，再接再厉！' };
    } else {
      let r = Math.random() * totalProb;
      for (const p of pool) {
        r -= p.probability;
        if (r <= 0) { prize = p; break; }
      }
      if (!prize) prize = pool[pool.length - 1];
    }

    // 6. 写记录（中奖和谢谢参与都记录）
    await fetch(url + '/rest/v1/records', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fingerprint: fingerprint,
        time: new Date().toLocaleString('zh-CN'),
        prize: prize.name,
        emoji: prize.emoji || '🎁',
        image: prize.image || '',
        verified: false,
        verified_time: null
      })
    });

    return new Response(JSON.stringify({ ok: true, prize }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
}
