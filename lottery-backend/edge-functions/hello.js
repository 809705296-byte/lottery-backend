export default async function onRequest(context) {
  return new Response('hello world', {
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
  });
}
