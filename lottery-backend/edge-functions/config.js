export default async function onRequest(context) {
  const { request, env } = context;
  
  return new Response(JSON.stringify({ 
    ok: true, 
    config: { boxes: [] } 
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
