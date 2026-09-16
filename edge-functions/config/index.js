export async function onRequest(context) {
  const { env } = context;
  const dbUrl = env.DATABASE_URL;
  
  // 从数据库读配置
  const { neon } = await import('https://esm.sh/@neondatabase/serverless@0.9.0');
  const sql = neon(dbUrl);
  const rows = await sql`SELECT data FROM config WHERE id = 'main'`;
  
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
