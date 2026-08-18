import assert from 'node:assert/strict';
import { createApiAuthClient } from '../js/api/auth-client.js';

const calls=[];
const fakeFetch=async(url,options={})=>{
  calls.push({url,options});
  if(String(url).endsWith('/auth/token')) return {ok:true,status:200,json:async()=>({access_token:'access-1',refresh_token:'refresh-1',token_type:'bearer'})};
  if(String(url).endsWith('/auth/register')) return {ok:true,status:201,json:async()=>({access_token:'access-2',refresh_token:'refresh-2',token_type:'bearer',full_name:'Dra Joyce Radis'})};
  if(String(url).endsWith('/auth/refresh')) return {ok:true,status:200,json:async()=>({access_token:'access-3',refresh_token:'refresh-3',token_type:'bearer'})};
  if(String(url).endsWith('/auth/google/exchange')) return {ok:true,status:200,json:async()=>({access_token:'access-google',refresh_token:'refresh-google',token_type:'bearer',email:'medica@example.com',full_name:'Joyce Radis'})};
  throw new Error(`unexpected request: ${url}`);
};

const client=createApiAuthClient({baseUrl:'https://api.medper.test',fetchImpl:fakeFetch});
assert.equal(client.enabled,true);
assert.equal(client.googleLoginUrl(),'https://api.medper.test/auth/google/login');

const signed=await client.signIn('medica@example.com','senha-segura');
assert.equal(signed.access_token,'access-1');
assert.match(String(calls[0].options.body),/username=medica%40example.com/);

const registered=await client.register({fullName:'Dra Joyce Radis',organizationName:'Espaço pessoal',organizationSlug:'pessoal-abc',email:'medica@example.com',password:'senha-segura-123'});
assert.equal(registered.refresh_token,'refresh-2');
assert.deepEqual(JSON.parse(calls[1].options.body),{
  full_name:'Dra Joyce Radis',
  organization_name:'Espaço pessoal',
  organization_slug:'pessoal-abc',
  email:'medica@example.com',
  password:'senha-segura-123'
});

const refreshed=await client.refresh('refresh-2');
assert.equal(refreshed.access_token,'access-3');

const google=await client.exchangeGoogleCode('one-time-code');
assert.equal(google.access_token,'access-google');
assert.deepEqual(JSON.parse(calls[3].options.body),{code:'one-time-code'});

assert.equal(createApiAuthClient({baseUrl:'',fetchImpl:fakeFetch}).enabled,false);
console.log('API auth client regression suite completed successfully.');
