import Store from '../store';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  if(query.buy===undefined)return <Store initial="cart"/>;
  const id=typeof query.buy==='string'&&/^\d+$/.test(query.buy)?Number(query.buy):NaN;
  const attempt=typeof query.attempt==='string'&&/^[a-f0-9-]{36}$/.test(query.attempt)?query.attempt:'';
  const item=Number.isSafeInteger(id)&&id>0&&typeof query.option==='string'&&query.option.length<=100&&attempt?{id,size:query.option,qty:1}:null;
  return <Store key={attempt+JSON.stringify(item)} initial="cart" directCheckout={{item,attempt}}/>;
}
