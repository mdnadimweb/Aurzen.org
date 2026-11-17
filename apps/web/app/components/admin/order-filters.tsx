'use client';
// Orders search (ID, customer name or phone; debounced) and an inclusive date range in
// Asia/Dhaka time. Every order is already loaded in the studio, so filtering runs here.
import {useEffect,useMemo,useState} from 'react';
import type {Order} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';

const digits=(value:string)=>value.replace(/\D/g,'');
const dayStart=(day:string)=>Date.parse(day+'T00:00:00+06:00');
const dayEnd=(day:string)=>Date.parse(day+'T23:59:59.999+06:00');

export function matchesOrder(order:Order,query:string){
  const q=query.trim().toLowerCase();
  if(!q)return true;
  if((order.id+' '+order.name+' '+order.phone).toLowerCase().includes(q))return true;
  // Phone numbers match regardless of spaces, dashes or a +880 prefix.
  return /^[+\d\s-]+$/.test(q)&&digits(q).length>0&&digits(order.phone).includes(digits(q).replace(/^880/,''));
}

export function inDateRange(order:Order,from:string,to:string){
  const time=Date.parse(order.date);
  return (!from||time>=dayStart(from))&&(!to||time<=dayEnd(to));
}

export function useOrderFilters(orders:Order[]){
  const [input,setInput]=useState(''),[query,setQuery]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
  useEffect(()=>{const timer=window.setTimeout(()=>setQuery(input),300);return()=>window.clearTimeout(timer);},[input]);
  const filtered=useMemo(()=>orders.filter(o=>matchesOrder(o,query)&&inDateRange(o,from,to)),[orders,query,from,to]);
  const active=!!(input.trim()||from||to);
  const reset=()=>{setInput('');setQuery('');setFrom('');setTo('');};
  // A "from" later than "to" moves the other side along, so the range is never empty by mistake.
  const changeFrom=(value:string)=>{setFrom(value);if(value&&to&&value>to)setTo(value);};
  const changeTo=(value:string)=>{setTo(value);if(value&&from&&value<from)setFrom(value);};
  return {input,setInput,from,to,changeFrom,changeTo,filtered,active,reset,total:orders.length};
}

export default function OrderFilters({state}:{state:ReturnType<typeof useOrderFilters>}){
  const {input,setInput,from,to,changeFrom,changeTo,filtered,active,reset,total}=state;
  return <div className="admin-filters admin-order-filters" role="search">
    <label className="admin-order-filters__search">Search orders
      <span className="admin-search-field">
        <input type="search" value={input} placeholder="Order ID, customer name or phone" onChange={e=>setInput(e.target.value)} aria-describedby="order-filter-count"/>
        {input&&<button type="button" className="admin-search-field__clear" aria-label="Clear search" onClick={()=>setInput('')}><Icon name="close"/></button>}
      </span>
    </label>
    <label>From date<input type="date" value={from} max={to||undefined} onChange={e=>changeFrom(e.target.value)}/></label>
    <label>To date<input type="date" value={to} min={from||undefined} onChange={e=>changeTo(e.target.value)}/></label>
    <button type="button" className="a-btn a-btn--secondary a-btn--sm admin-order-filters__reset" disabled={!active} onClick={reset}>Reset filters</button>
    <p id="order-filter-count" className="admin-filters__count" aria-live="polite">{filtered.length} of {total} orders{from||to?' · dates in Asia/Dhaka time':''}</p>
  </div>;
}
