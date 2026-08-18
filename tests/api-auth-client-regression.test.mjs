import assert from 'node:assert/strict';
import { createApiAuthClient } from '../js/api/auth-client.js';

const calls=[];
const fakeFetch=async(url,options={})=>{
  calls.push({url,options});
  if(String(url).endsWith('/auth/token')) return {ok:true,status:200,json:async()=>({access_token:'access-1',refresh_token:'refresh-1',token_type:'bearer'})};
  if(String(url).endsWith('/auth/register')) return {ok:true,status:201,json:async()=>({access_token:'access-2',refresh_token:'refresh-2',token_type:'bearer'})};
  if(String(url).endsWith('/auth/refresh')) return {ok:true,status:200,json:async()=>({access_token:'access-3',refresh_token:'refresh-3',token_type:'bearer'})};
  throw new Error(`unexpected request: ${url}`);
};

const client=createApiAuthClient({baseUrl:'https://api.medper.test',fetchImpl:fakeFetch});
assert.equal(client.enabled,true);

const signed=await client.signIn('medica@example.com','senha-segura');
assert.equal(signed.access_token,'access-1');
assert.match(String(calls[0].options.body),/username=medica%40example.com/);

const registered=await client.register({organizationName:'Clínica MedPer',organizationSlug:'clinica-medper',email:'medica@example.com',password:'senha-segura-123'});
assert.equal(registered.refresh_token,'refresh-2');
assert.deepEqual(JSON.parse(calls[1].options.body),{
  organization_name:'Clínica MedPer',
  organization_slug:'clinica-medper',
  email:'medica@example.com',
  password:'senha-segura-123'
});

const refreshed=await client.refresh('refresh-2');
assert.equal(refreshed.access_token,'access-3');

assert.equal(createApiAuthClient({baseUrl:'',fetchImpl:fakeFetch}).enabled,false);
console.log('API auth client regression suite completed successfully.');
