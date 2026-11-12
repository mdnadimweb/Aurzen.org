// Dependency-free ZIP32 writer with an explicit source allowlist.
const fs=require('node:fs'),path=require('node:path'),{deflateRawSync}=require('node:zlib'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const allowed=['apps','packages','scripts','tests','docs','.github','README.md','AGENTS.md','package.json','package-lock.json','tsconfig.base.json','compose.yaml','compose.local.yaml','.dockerignore','.gitignore','.npmrc','.nvmrc','.node-version','.env.example'];
const excluded=new Set(['node_modules','.next','dist','data','artifacts','coverage','.git','.vercel','.codex','.agents','.aws']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=[];
function walk(relative){
  const full=path.resolve(root,relative);if(!full.startsWith(root+path.sep))throw new Error('Unsafe package path');
  const stat=fs.lstatSync(full);if(stat.isSymbolicLink())throw new Error('Source archive cannot contain symlinks: '+relative);
  if(stat.isDirectory()){
    if(excluded.has(path.basename(full)))return;
    for(const name of fs.readdirSync(full).sort())walk(path.posix.join(relative,name));
  }else{
    const name=path.basename(relative);
    if((name.startsWith('.env')&&name!=='.env.example')||/\.(?:sqlite(?:-(?:wal|shm))?|db|pem|key|p12|pfx|log|tsbuildinfo)$/.test(name))return;
    files.push({name:'aurzen/'+relative,bytes:fs.readFileSync(full)});
  }
}
for(const item of allowed)if(fs.existsSync(path.join(root,item)))walk(item);
const manifests=['package.json','apps/web/package.json','apps/api/package.json','packages/shared/package.json'];
const release={format:1,project:'AURZÉN',sourceOnly:true,toolchain:{node:'26.13.0',npm:'11.20.0'},
  dependencies:Object.fromEntries(manifests.map(file=>[file,JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))])),
  files:files.map(file=>({path:file.name,bytes:file.bytes.length,sha256:hash(file.bytes)}))};
files.push({name:'aurzen/RELEASE-MANIFEST.json',bytes:Buffer.from(JSON.stringify(release,null,2)+'\n')});
const crcTable=Array.from({length:256},(_,value)=>{for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
const crc32=bytes=>{let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return(value^0xffffffff)>>>0;};
const local=[],central=[];let offset=0;
for(const file of files){
  const name=Buffer.from(file.name),compressed=deflateRawSync(file.bytes),crc=crc32(file.bytes);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(file.bytes.length,22);header.writeUInt16LE(name.length,26);
  const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(8,10);entry.writeUInt16LE(0x21,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(compressed.length,20);entry.writeUInt32LE(file.bytes.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);
  local.push(header,name,compressed);central.push(entry,name);offset+=header.length+name.length+compressed.length;
}
const centralBytes=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,centralBytes,end]);
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/aurzen-coolify.zip'),zip);
fs.writeFileSync(path.join(root,'artifacts/aurzen-coolify.zip.sha256'),hash(zip)+'  aurzen-coolify.zip\n');
console.log(`Packaged ${files.length} files (${zip.length} bytes): artifacts/aurzen-coolify.zip`);
console.log('SHA-256: '+hash(zip));
