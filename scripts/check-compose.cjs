const {spawnSync}=require('node:child_process'),{randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const token=randomBytes(32).toString('hex'),dbPassword=randomBytes(24).toString('hex');
function config(local){
  const binary=process.env.COMPOSE_BIN||'docker',prefix=process.env.COMPOSE_BIN?[]:['compose'];
  const result=spawnSync(binary,[...prefix,'--env-file','.env.example','-f','compose.yaml',...(local?['-f','compose.local.yaml']:[]),'config','--format','json'],{
    encoding:'utf8',windowsHide:true,env:{...process.env,ADMIN_PASSWORD:randomBytes(24).toString('hex'),INTERNAL_API_TOKEN:token,POSTGRES_PASSWORD:dbPassword,CHECKOUT_ENABLED:'false',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:''},
  });
  if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}
const production=config(false),local=config(true);
assert.deepEqual(Object.keys(production.services).sort(),['api','postgres','web']);
for(const service of [production.services.api,production.services.web]){
  assert.equal(service.read_only,true);assert(service.cap_drop.includes('ALL'));assert(service.security_opt.includes('no-new-privileges:true'));
  assert(!service.ports?.length);assert.equal(service.environment.INTERNAL_API_TOKEN,token);
}
assert.equal(production.services.api.environment.COOKIE_SECURE,'true');
assert.equal(production.services.api.environment.SEED_DEMO,'false');
assert.equal(production.services.web.environment.INTERNAL_API_URL,'http://api:4000');
assert.equal(production.services.api.volumes[0].target,'/data');
assert.equal(production.services.web.depends_on.api.condition,'service_healthy');
const postgres=production.services.postgres;
assert.equal(production.services.api.environment.DATABASE_URL,`postgres://aurzen:${dbPassword}@postgres:5432/aurzen`);
assert.equal(production.services.api.depends_on.postgres.condition,'service_healthy');
assert.equal(postgres.environment.POSTGRES_PASSWORD,dbPassword);
assert.match(postgres.image,/^postgres:[\d.]+-alpine@sha256:[a-f0-9]{64}$/);
assert.equal(postgres.volumes[0].target,'/var/lib/postgresql');
assert(!postgres.ports?.length&&!local.services.postgres.ports?.length,'PostgreSQL is never published to the host');
assert(postgres.healthcheck.test.join(' ').includes('pg_isready'));
assert(!local.services.api.ports?.length);
assert.equal(local.services.api.environment.COOKIE_SECURE,'false');
assert.equal(local.services.web.ports[0].host_ip,'127.0.0.1');
assert.equal(String(local.services.web.ports[0].target),'3000');
console.log('PASS official Compose parser: production/local configuration, private API, TLS cookie settings, private PostgreSQL with persistent volume, dependency health and container hardening.');
