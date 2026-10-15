const url = 'https://naturals-counties-revealed-drawings.trycloudflare.com/webhook/whatsapp';

async function testGet() {
  console.log('Testing GET Handshake...');
  const res = await fetch(`${url}?hub.mode=subscribe&hub.challenge=987654321&hub.verify_token=whatsapp_n8n_verify_2026`);
  console.log('GET Status:', res.status);
  const text = await res.text();
  console.log('GET Body:', text);
}

async function testPost() {
  console.log('\nTesting POST Message...');
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1029252860157649',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551533875',
                phone_number_id: '1419311231255449'
              },
              contacts: [
                {
                  profile: { name: 'Samuel Prueba' },
                  wa_id: '573154899983'
                }
              ],
              messages: [
                {
                  from: '573154899983',
                  id: 'wamid.HBgM' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: 'Hola, tienen envíos a Pereira?' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log('POST Status:', res.status);
  const text = await res.text();
  console.log('POST Body:', text);
}

async function run() {
  await testGet();
  await testPost();
}

run().catch(console.error);
