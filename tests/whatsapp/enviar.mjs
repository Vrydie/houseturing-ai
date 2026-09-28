import fs from 'fs';
import crypto from 'crypto';

const fixturePath = process.argv[2];
const badSignature = process.argv[3] === '--firma-mala';

if (!fixturePath) {
  console.error("Uso: node enviar.mjs <fixture.json> [--firma-mala]");
  process.exit(1);
}

const rawObj = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
// Stringify exactly as n8n will inside the workflow
const payload = JSON.stringify(rawObj);

const secret = "secret_local_test_12345";
let signature;

if (badSignature) {
  signature = "sha256=firma_invalida_123";
} else {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  signature = "sha256=" + hmac.digest('hex');
}

console.log(`Enviando ${fixturePath} a http://127.0.0.1:5690/webhook/whatsapp`);

fetch("http://127.0.0.1:5690/webhook/whatsapp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": signature
  },
  body: payload
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(({ status, text }) => {
  console.log(`Respuesta HTTP ${status}: ${text}`);
})
.catch(err => {
  console.error("Error en la petición:", err.message);
});
