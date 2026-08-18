import assert from 'node:assert/strict';
import { createCaseStateClient } from '../js/api/case-state-client.js';

const calls=[];
const fakeFetch=async(url,options={})=>{
  calls.push({url,options});
  if(String(url).endsWith('/cases')&&options.method==='POST'){
    return {ok:true,status:201,json:async()=>({id:'remote-1'})};
  }
  if(String(url).endsWith('/cases/remote-1/state')&&(!options.method||options.method==='GET')){
    return {ok:true,status:200,json:async()=>({revision:4,payload:{id:'case-local',title:'Caso'}})};
  }
  if(String(url).endsWith('/cases/remote-1/state')&&options.method==='PUT'){
    return {ok:true,status:200,json:async()=>({revision:5,payload:JSON.parse(options.body).payload})};
  }
  throw new Error(`unexpected request: ${url}`);
};

const client=createCaseStateClient({
  baseUrl:'https://api.medper.test',
  getAccessToken:()=> 'token-123',
  fetchImpl:fakeFetch
});

const created=await client.createCase({title:'Caso',reference:'0001',objectType:'Dano corporal',status:'Em andamento',scope:'Objeto'});
assert.equal(created.id,'remote-1');
assert.equal(calls[0].options.method,'POST');

const loaded=await client.load('remote-1');
assert.equal(loaded.revision,4);
assert.equal(calls[1].options.headers.Authorization,'Bearer token-123');

const saved=await client.save('remote-1',{revision:4,payload:{id:'case-local',title:'Atualizado'}});
assert.equal(saved.revision,5);
assert.equal(calls[2].options.method,'PUT');
assert.deepEqual(JSON.parse(calls[2].options.body),{revision:4,payload:{id:'case-local',title:'Atualizado'}});

const disabled=createCaseStateClient({baseUrl:'',getAccessToken:()=>'',fetchImpl:fakeFetch});
assert.equal(disabled.enabled,false);

console.log('Case state sync client regression suite completed successfully.');
