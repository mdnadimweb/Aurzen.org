import {AsyncLocalStorage} from 'node:async_hooks';
type Options={httpOnly?:boolean;sameSite?:string;secure?:boolean;path?:string;maxAge?:number};
export const requestContext=new AsyncLocalStorage<{request:Request;setCookies:string[]}>();
export async function cookies(){
  const context=requestContext.getStore();
  if(!context)throw new Error('Cookies require an active request.');
  return {
    get(name:string){const value=context.request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);return value?{value}:undefined;},
    set(name:string,value:string,options:Options={}){
      context.setCookies.push(`${name}=${encodeURIComponent(value)}; Path=${options.path||'/'}${options.httpOnly?'; HttpOnly':''}${options.secure?'; Secure':''}${options.sameSite?'; SameSite='+options.sameSite:''}${options.maxAge!==undefined?'; Max-Age='+options.maxAge:''}`);
    },
    delete(name:string){this.set(name,'',{path:'/',httpOnly:true,secure:process.env.COOKIE_SECURE!=='false',sameSite:'Strict',maxAge:0});},
  };
}
