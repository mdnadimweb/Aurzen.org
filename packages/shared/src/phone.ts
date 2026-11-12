export function normalizePhone(value:string){
  return value.trim().replace(/[ ()-]/g,'').replace(/^\+?880/,'0');
}
