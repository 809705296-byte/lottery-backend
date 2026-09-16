import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // 读配置
      const rows = await sql`SELECT data FROM config WHERE id = 'main'`;
      return res.json({ ok: true, config: rows[0]?.data || { boxes: [] } });
    }
    
    if (req.method === 'POST') {
      // 写配置（后台管理用，需要密码验证——建议你后面加）
      const { boxes } = req.body;
      if (!Array.isArray(boxes)) {
        return res.status(400).json({ error: '格式错误' });
      }
      await sql`
        UPDATE config SET data = ${JSON.stringify({ boxes })} WHERE id = 'main'
      `;
      return res.json({ ok: true });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '服务器错误', detail: String(err) });
  }
}