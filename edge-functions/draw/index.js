export async function onRequest(context) {
  const { request, env } = context;
  
  // 只允许 POST
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

    const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.9.0');
    const sql = neon(env.DATABASE_URL);

    // 1. 一人一次
    const existing = await sql`SELECT * FROM records WHERE fingerprint = ${fingerprint} LIMIT 1`;
    if (existing.length > 0) {
      return new Response(JSON.stringify({ ok: false, msg: '您已参与过', prize: existing[0].prize }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. 读配置
    const cfgRows = await sql`SELECT data FROM config WHERE id = 'main'`;
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

    await sql`UPDATE config SET data = ${JSON.stringify({ boxes: newBoxes })} WHERE id = 'main'`;

    // 5. 写记录
    await sql`
      INSERT INTO records (fingerprint, time, box, prize, emoji, desc_text)
      VALUES (${fingerprint}, ${new Date().toLocaleString('zh-CN')}, ${box.name}, ${prize.name}, ${prize.emoji || '🎁'}, ${prize.desc || ''})
    `;

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
