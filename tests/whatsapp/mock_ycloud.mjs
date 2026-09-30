// Servidor de prueba dentro del contenedor del proyecto. No tiene salida a YCloud.
import http from 'node:http';
const calls=[];
const server=http.createServer(async(req,res)=>{
 if(req.method==='GET'&&req.url==='/calls'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(calls));return;}
 let raw='';for await(const chunk of req)raw+=chunk;
 let body;try{body=raw?JSON.parse(raw):null;}catch{res.writeHead(400);res.end();return;}
 calls.push({method:req.method,path:req.url,body,time:Date.now()});
 res.setHeader('Content-Type','application/json');
 if(req.method!=='POST'){res.writeHead(405);res.end('{}');return;}
 if(req.url==='/v2/whatsapp/messages'){
  if(!body?.from||!body?.to||(!body.text?.body&&!body.template?.name)){res.writeHead(400);res.end('{"error":"cuerpo inválido"}');return;}
  res.end(JSON.stringify({id:'mock-'+Date.now(),status:'accepted'}));
 }else if(/\/inboundMessages\/[^/]+\/(typingIndicator|markAsRead)$/.test(req.url)){res.end('{}');}
 else{res.writeHead(404);res.end('{}');}
});
server.listen(18085,'127.0.0.1',()=>console.log('Mock local escuchando en 127.0.0.1:18085'));
