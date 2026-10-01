import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const w={id:'ot05-test-cobertura',name:'OT-05 prueba local DS-T1',active:false,settings:{saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false},nodes:[
 {id:'start',name:'Inicio',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0],parameters:{}},
 {id:'cases',name:'Casos',type:'n8n-nodes-base.code',typeVersion:2,position:[200,0],parameters:{jsCode:"return ['bogota','San José','Ciudad inexistente OT05','Leticia'].map(ciudad=>({json:{ciudad}}));"}},
 {id:'call',name:'Cobertura',type:'n8n-nodes-base.executeWorkflow',typeVersion:1,position:[400,0],parameters:{workflowId:'c6918d23-a831-42b2-b67a-493b9b1c07cf',mode:'each',options:{waitForSubWorkflow:true}}}
],connections:{Inicio:{main:[[{node:'Casos',type:'main',index:0}]]},Casos:{main:[[{node:'Cobertura',type:'main',index:0}]]}}};
const imp=spawnSync('docker',['exec','-i','houseturing_n8n','n8n','import:workflow','--input=/dev/stdin'],{input:JSON.stringify([w]),encoding:'utf8'});console.log(imp.stdout);
const run=spawnSync('docker',['exec','-e','N8N_RUNNERS_BROKER_PORT=5681','houseturing_n8n','n8n','execute','--id='+w.id,'--rawOutput'],{encoding:'utf8',maxBuffer:20e6});
const start=run.stdout.indexOf('{\n');
let result;try{result=JSON.parse(run.stdout.slice(start,run.stdout.lastIndexOf('\n}')+2));}catch{console.log('No se pudo extraer resultado CLI; salida completa omitida.');process.exit(1);}
const data=result.data.resultData;
const rows=data.runData?.Cobertura?.flatMap(r=>r.data?.main?.flat().map(i=>i.json)??[])??[];
const output={comando:'node tests/whatsapp/cobertura_n8n.mjs',status:result.status,error:data.error?.message,resultados:rows};
fs.writeFileSync(new URL('../../planes/evidencia/OT-05/cobertura-n8n.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
if(rows.length!==4 || !rows.some(r=>r.cubierto===false))process.exitCode=1;
