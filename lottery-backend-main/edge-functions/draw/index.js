export function onRequest(context) {
  return new Response(JSON.stringify({
    ok: true,
    prize: { name: '测试奖品', emoji: '🎁', desc: '接口已通' }
  }), {
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}