// Optional maintainer helper: verify Compose configuration without a running daemon.
const fs=require('node:fs'),{createHash}=require('node:crypto');
(async()=>{
  const response=await fetch('https://api.github.com/repos/docker/compose/releases/latest');
  if(!response.ok)throw new Error('Unable to read official Compose release');
  const release=await response.json(),name='docker-compose-windows-x86_64.exe';
  const asset=release.assets.find(asset=>asset.name===name),checksum=release.assets.find(asset=>asset.name===name+'.sha256');
  if(!asset||!checksum)throw new Error('Official executable/checksum assets missing');
  const expected=(await(await fetch(checksum.browser_download_url)).text()).trim().split(/\s+/)[0];
  const bytes=Buffer.from(await(await fetch(asset.browser_download_url)).arrayBuffer());
  if(!/^[a-f0-9]{64}$/.test(expected)||createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('Compose checksum mismatch');
  fs.mkdirSync('data/tools',{recursive:true});fs.writeFileSync('data/tools/docker-compose.exe',bytes);
  console.log('Verified official Docker Compose '+release.tag_name+' SHA-256 '+expected);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
