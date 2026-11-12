require('../scripts/test-environment.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {sameOrigin}=require('../apps/api/dist/lib/http.js');

test('origin validation supports configured proxy URLs and rejects forged origins',()=>{
  const keys=['SITE_URL','NETLIFY','URL','DEPLOY_PRIME_URL','DEPLOY_URL'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const request=(origin,extra={})=>new Request('http://internal:3000/api/admin/session/',{headers:{...(origin?{origin}:{}),...extra}});
  try{
    for(const key of keys)delete process.env[key];
    sameOrigin(request('http://internal:3000'));
    // Production uploads must work even without Netlify metadata at runtime.
    sameOrigin(new Request('http://internal:3000/api/admin/images/',{headers:{origin:'https://aurzen.netlify.app'}}));
    assert.throws(()=>sameOrigin(request('https://aurzen.netlify.app.attacker.example')),/origin/);
    assert.throws(()=>sameOrigin(request()),/origin/);
    assert.throws(()=>sameOrigin(request('null')),/origin/);
    assert.throws(()=>sameOrigin(request('https://attacker.example',{'x-forwarded-host':'attacker.example','x-forwarded-proto':'https'})),/origin/);
    process.env.URL='https://store.netlify.app';
    assert.throws(()=>sameOrigin(request(process.env.URL)),/origin/);
    process.env.NETLIFY='true';
    process.env.DEPLOY_PRIME_URL='https://preview.netlify.app';
    process.env.DEPLOY_URL='https://deploy.netlify.app';
    for(const key of ['URL','DEPLOY_PRIME_URL','DEPLOY_URL'])sameOrigin(request(process.env[key]));
    process.env.SITE_URL='https://aurzen.example/';
    sameOrigin(request('https://aurzen.example'));
    assert.throws(()=>sameOrigin(request('https://aurzen.example.attacker.example')),/origin/);
    process.env.SITE_URL='invalid';
    assert.throws(()=>sameOrigin(request('https://attacker.example')),/origin/);
  }finally{
    for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
  }
});
