import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaseRecord } from '../js/v2/case-record.js';
import {
  configureRemoteSession, RemoteCaseRepository, isRemoteSessionActive,
  logoutRemoteSession
} from '../js/v2/remote-repository.js';

const origin = 'https://medper-api.example.test';
const oldFetch = globalThis.fetch;
const fakeCase = () => createCaseRecord({title:'Cenário fictício',object:'Somente QA'});

function configure() {
  configureRemoteSession({apiOrigin:origin,accessToken:'test-access',refreshToken:'test-refresh'});
}

function stub(handler) {
  globalThis.fetch = async (input,options={}) => {
    assert.ok(String(input).startsWith(origin+'/'), 'server origin cannot be changed');
    assert.equal(options.credentials,'omit');
    assert.equal(options.cache,'no-store');
    assert.equal(options.redirect,'error');
    return handler(new URL(String(input)), options);
  };
}

const json = (data,status=200) => new Response(JSON.stringify(data),{
  status, headers:{'Content-Type':'application/json'}
});

test.afterEach(async () => { globalThis.fetch = oldFetch; });

test('requires real session and refuses unsafe HTTP host or arbitrary paths', async () => {
  assert.throws(() => configureRemoteSession({
    apiOrigin:'http://medper-api.example.test',accessToken:'x',refreshToken:'y'
  }), /inválida/);
  configure();
  assert.equal(isRemoteSessionActive(),true);
  stub((_url, opts) => json({},opts.method==='POST'?204:200));
  await logoutRemoteSession();
  assert.equal(isRemoteSessionActive(),false);
  assert.throws(()=>new RemoteCaseRepository(),/autenticação real/);
});

test('new remote case uses atomic server transaction and never writes browser storage', async () => {
  configure();
  const record=fakeCase(), paths=[];
  stub((url,opts)=>{
    paths.push([url.pathname,opts.method]);
    if(url.pathname==='/cases/v2') {
      const submitted=JSON.parse(opts.body);
      assert.equal(submitted.payload.schemaVersion,2);
      return json({id:'server-uuid-1',revision:1},201);
    }
    if(url.pathname==='/cases/server-uuid-1/state' && opts.method==='PUT'){
      assert.equal(JSON.parse(opts.body).expectedRevision,1);
      return json({revision:2,updatedAt:'now'});
    }
    throw Error('unexpected '+url.pathname);
  });
  const repo=new RemoteCaseRepository();
  const created=await repo.create(record);
  assert.equal(created.id,'server-uuid-1');
  created.history.summary='Documentação inteiramente fictícia';
  await repo.save(created);
  assert.deepEqual(paths,[['/cases/v2','POST'],['/cases/server-uuid-1/state','PUT']]);
});

test('HTTP 409 retains local edits and does not overwrite stale remote data', async () => {
  configure();
  stub((url,opts)=>{
    if(url.pathname==='/cases/server-uuid-2/state' && opts.method==='GET'){
      return json({revision:3,payload:{...fakeCase(),id:'server-uuid-2'}});
    }
    if(url.pathname==='/cases/server-uuid-2/state' && opts.method==='PUT'){
      assert.equal(JSON.parse(opts.body).expectedRevision,3);
      return json({detail:'Revision conflict'},409);
    }
    throw Error('unexpected request');
  });
  const repo=new RemoteCaseRepository();
  const record=await repo.get('server-uuid-2');
  record.history.summary='UNSAVED SYNTHETIC TEXT';
  await assert.rejects(repo.save(record),/Conflito de revisão/);
  assert.equal(record.history.summary,'UNSAVED SYNTHETIC TEXT');
});

test('unknown legacy server payload is rejected rather than silently transformed', async () => {
  configure();
  stub((_url,opts)=>json({revision:1,payload:{id:'server-uuid-3',schemaVersion:4}},200));
  const repo=new RemoteCaseRepository();
  await assert.rejects(repo.get('server-uuid-3'),/contrato incompatível/);
});

test('tokens never enter persistent local storage or accidentally fall back on error', async () => {
  configure();
  const accesses=[];
  globalThis.localStorage={
    setItem(...args){accesses.push(args);throw Error('browser storage is forbidden');},
    getItem(){throw Error('browser storage is forbidden');}
  };
  stub((_url,opts)=>json({detail:'unauthorized'},403));
  try {
    const repo=new RemoteCaseRepository();
    await assert.rejects(repo.list(),/Acesso recusado/);
    assert.deepEqual(accesses,[]);
  } finally {
    delete globalThis.localStorage;
  }
});
