export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { fingerprint, boxIndex } = body;

    if (!fingerprint || boxIndex === undefined) {
      return new Response(JSON.stringify({ error: '缺少参数' }), {
        status: 400,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_KEY;
    const headers = {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    };

    // 1. 一人一次
    const existRes = await fetch(
      url + '/rest/v1/records?fingerprint=eq.' + encodeURIComponent(fingerprint) + '&limit=1',
      { headers }
    );
    const exist = await existRes.json();
    if (exist.length > 0) {
      return new Response(JSON.stringify({ ok: false, msg: '您已参与过', prize: exist[0].prize }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. 读配置
    const cfgRes = await fetch(url + '/rest/v1/config?id=eq.main&select=data', { headers });
    const cfgRows = await cfgRes.json();
    if (!cfgRows.length) {
      return new Response(JSON.stringify({ error: '配置未初始化' }), {
        status: 500,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    const cfg = cfgRows[0].data;
    const box = cfg.boxes[boxIndex];
    if (!box) {
      return new Response(JSON.stringify({ ok: false, msg: '盲盒不存在' }), {
        status: 400,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 3. 抽奖
    const prize = pickPrize(box.prizes);

    // 4. 扣库存
    const newBoxes = cfg.boxes.map((b, i) => {
      if (i === boxIndex) {
        return {
          ...b,
          prizes: b.prizes.map(p =>
            p.name === prize.name ? { ...p, stock: (p.stock || 1) - 1 } : p
          )
        };
      }
      return b;
    });

    await fetch(url + '/rest/v1/config?id=eq.main', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ data: { boxes: newBoxes } })
    });

    // 5. 写记录
    await fetch(url + '/rest/v1/records', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fingerprint: fingerprint,
        time: new Date().toLocaleString('zh-CN'),
        box: box.name,
        prize: prize.name,
        emoji: prize.emoji || '🎁',
        desc_text: prize.desc || ''
      })
    });

    return new Response(JSON.stringify({ ok: true, prize }), {
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

function pickPrize(prizes) {
  const pool = prizes.filter(p => (p.stock || 0) > 0);
  const list = pool.length ? pool : prizes;
  const total = list.reduce((s, p) => s + (p.weight || 0), 0);
  let r = Math.random() * total;
  for (const p of list) {
    r -= (p.weight || 0);
    if (r <= 0) return p;
  }
  return list[list.length - 1];
}
