import { timingSafeEqual, createHash } from 'node:crypto';
import { database } from './database';
import { normalizePhone } from '@aurzen/shared/phone';
import { assert } from './http';
import type { Order } from '@aurzen/shared/catalog';
export function publicOrder(order:Order){
  return {id:order.id,date:order.date,status:order.status,items:order.items.map(({name,qty,size})=>({name,qty,size})),
    history:order.history?.filter(event=>Number.isFinite(Date.parse(event.date))).map(({status,date})=>({status,date})),
    ...(order.courier&&order.trackingReference?{courier:order.courier,trackingReference:order.trackingReference}:{})};
}
export async function trackOrder(reference:unknown,phone:unknown){
  const message='We could not find an order matching those details.';
  assert(typeof reference==='string'&&reference.length<=100&&typeof phone==='string'&&phone.length<=20,message,404);
  const normalized=normalizePhone(phone);
  const row=await (await database()).prepare('SELECT payload FROM orders WHERE id=?').get(reference.trim());
  const order=row?JSON.parse(String(row.payload)) as Order:null;
  const hash=(value:string)=>createHash('sha256').update(value).digest();
  const matches=timingSafeEqual(hash(normalized),hash(order?normalizePhone(order.phone):'unmatched'));
  assert(order&&/^01[3-9]\d{8}$/.test(normalized)&&matches,message,404);
  return publicOrder(order);
}
