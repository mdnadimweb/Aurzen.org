import { timingSafeEqual, createHash } from 'node:crypto';
import { database } from './database';
import { normalizePhone } from '@aurzen/shared/phone';
import { assert } from './http';
import type { Order } from '@aurzen/shared/catalog';
export function publicOrder(order:Order){
  return {id:order.id,date:order.date,status:order.status,items:order.items.map(({name,qty,size,color})=>({name,qty,size,...(color?{color}:{})})),
    history:order.history?.filter(event=>Number.isFinite(Date.parse(event.date))).map(({status,date})=>({status,date})),
    ...(order.courier&&order.trackingReference?{courier:order.courier,trackingReference:order.trackingReference}:{})};
}
export async function trackOrder(reference:unknown,phone:unknown){
  const message='We could not find an order matching those details.';
  assert(typeof reference==='string'&&reference.length<=100&&typeof phone==='string'&&phone.length<=20,message,404);
  const normalized=normalizePhone(phone);
  // Accept short references however the customer types them: "AZ-482193", "az482193", "MO-482193" or just "482193".
  const typed=reference.trim(),short=/^(az|mo)?-?(\d{6})$/i.exec(typed);
  const ids=short?(short[1]?[short[1].toUpperCase()+'-'+short[2]]:['AZ-'+short[2],'MO-'+short[2]]):[typed];
  const db=await database();
  let row=null;
  for(const id of ids){row=await db.prepare('SELECT payload FROM orders WHERE id=?').get(id);if(row)break;}
  const order=row?JSON.parse(String(row.payload)) as Order:null;
  const hash=(value:string)=>createHash('sha256').update(value).digest();
  const matches=timingSafeEqual(hash(normalized),hash(order?normalizePhone(order.phone):'unmatched'));
  assert(order&&/^01[3-9]\d{8}$/.test(normalized)&&matches,message,404);
  return publicOrder(order);
}
