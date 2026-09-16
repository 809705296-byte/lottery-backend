export function onRequest(context) {
  const json = JSON.stringify({
    ok: true,
    config: { boxes: [] }
  });
  return new Response(json, {
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
