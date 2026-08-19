import assert from 'node:assert/strict';
import { createApiSessionStore } from '../js/auth/api-session.js';

const values=new Map();
const storage={
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,String(value)),
  removeItem:key=>values.delete(key)
};

const sessions=createApiSessionStore(storage);
assert.equal(sessions.get(),null);
sessions.set({access_token:'access-1',refresh_token:'refresh-1',token_type:'bearer'});
assert.equal(sessions.get().access_token,'access-1');
assert.equal(sessions.getAccessToken(),'access-1');
sessions.clear();
assert.equal(sessions.get(),null);

console.log('API session regression suite completed successfully.');
