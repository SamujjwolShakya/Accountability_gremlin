const fetch = globalThis.fetch;

async function test() {
  const res = await fetch('https://jsonblob.com/api/jsonBlob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ test: 'hello' })
  });
  const loc = res.headers.get('Location');
  console.log('Location:', loc);
  
  const id = loc.split('/').pop();
  console.log('ID:', id);
  
  const getRes = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`);
  console.log('Get:', await getRes.json());
}
test();
