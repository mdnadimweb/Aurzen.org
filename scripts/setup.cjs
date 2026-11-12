const {existsSync,writeFileSync}=require('node:fs');
const {randomBytes}=require('node:crypto');
if(existsSync('.env')){
  console.log('.env already exists. No settings were changed.');
}else{
  writeFileSync('.env',`# Local development only. Never commit or share this file.\nADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nINTERNAL_API_TOKEN=${randomBytes(32).toString('base64url')}\nINTERNAL_API_URL=http://127.0.0.1:4000\nDATABASE_PATH=data/aurzen.sqlite\nPOSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nCHECKOUT_ENABLED=false\nCOOKIE_SECURE=false\nSEED_DEMO=true\n`,{flag:'wx',mode:0o600});
  console.log('Created .env with local credentials. Open it privately for the admin password. Ordering remains disabled. Production must use COOKIE_SECURE=true and SEED_DEMO=false.');
}
