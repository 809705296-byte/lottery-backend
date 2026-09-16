export default async function onRequest() {
  return new Response('OK from edge-functions', {
    headers: { 'Content-Type': 'text/plain' }
  });
}
