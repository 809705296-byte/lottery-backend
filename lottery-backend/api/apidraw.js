import { neon } from '@neondatabase/serverless';

const sql = neon(postgresql://postgres.cdninpnoxkxwbckrnufu:[cnG9hjc36d2Y2XQQ]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres);

export default async function handler(req, res) {
  // 允许跨域（前端在不同域名调用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fingerprint, boxIndex } = req.body;
  if (!fingerprint || boxIndex === undefined) {
    return res.status(400).json({ error: '缺少参数' });
  }

  try {
    // 1. 一人一次
    const existing = await sql`
      SELECT * FROM records WHERE fingerprint = ${fingerprint} LIMIT 1
    `;
    if (existing.length > 0) {
      return res.json({ ok: false, msg: '您已参与过', prize: existing[0].prize });
    }

    // 2. 读配置
    const cfgRows = await sql`
      SELECT data FROM config WHERE id = 'main'
    `;
    if (!cfgRows.length) {
      return res.status(500).json({ error: '配置未初始化' });
    }
    const cfg = cfgRows[0].data;
    const box = cfg.boxes[boxIndex];
    if (!box) {
      return res.status(400).json({ ok: false, msg: '盲盒不存在' });
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

    await sql`
      UPDATE config SET data = ${JSON.stringify({ boxes: newBoxes })} WHERE id = 'main'
    `;

    // 5. 写记录
    await sql`
      INSERT INTO records (fingerprint, time, box, prize, emoji, desc_text)
      VALUES (
        ${fingerprint},
        ${new Date().toLocaleString('zh-CN')},
        ${box.name},
        ${prize.name},
        ${prize.emoji || '🎁'},
        ${prize.desc || ''}
      )
    `;

    return res.json({ ok: true, prize });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '服务器错误', detail: String(err) });
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
