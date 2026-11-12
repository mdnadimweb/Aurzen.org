// Maintainer verification helper; downloads only the official, checksum-verified Node executable.
const fs=require('node:fs');
const {createHash}=require('node:crypto');
(async()=>{
  const version='v26.13.0',base='https://nodejs.org/dist/'+version;
  const sums=await(await fetch(base+'/SHASUMS256.txt')).text();
  const expected=sums.split('\n').find(line=>line.endsWith('win-x64/node.exe'))?.split(/\s+/)[0];
  if(!expected)throw new Error('Official checksum missing');
  const bytes=Buffer.from(await(await fetch(base+'/win-x64/node.exe')).arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('Checksum mismatch');
  fs.mkdirSync('data/tools',{recursive:true});fs.writeFileSync('data/tools/node.exe',bytes);
  const auth=await(await fetch('https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull')).json();
  const response=await fetch('https://registry-1.docker.io/v2/library/node/manifests/26.13.0-bookworm-slim',{headers:{Authorization:'Bearer '+auth.token,Accept:'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'}});
  if(!response.ok)throw new Error('Docker image verification failed: '+response.status);
  const digest=response.headers.get('docker-content-digest');
  if(!/^sha256:[a-f0-9]{64}$/.test(digest||''))throw new Error('Invalid Docker image digest');
  fs.writeFileSync('data/tools/image.txt','node:26.13.0-bookworm-slim@'+digest+'\n');
  console.log('Verified Node executable SHA-256:',expected);console.log('Verified multi-platform image:',digest);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
