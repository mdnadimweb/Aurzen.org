// Pure helpers for the studio overview. Inputs are exactly what /api/admin returns.
import {statuses,type Order,type Product} from '@aurzen/shared/catalog';

const DAY=24*60*60*1000;
const DHAKA=6*60*60*1000; // The store runs on Asia/Dhaka time (UTC+06:00).
export const LOW_STOCK=5;
export const dayKey=(time:number)=>new Date(time+DHAKA).toISOString().slice(0,10);
const orderTime=(order:Order)=>{const t=Date.parse(order.date);return Number.isFinite(t)?t:NaN;};

export type Day={key:string;label:string;value:number;orders:number;units:number;today:boolean};
/** One entry per Dhaka calendar day, oldest first, ending today. */
export function dailySeries(orders:Order[],days=14,now=Date.now()):Day[]{
  const today=dayKey(now);
  const series:Day[]=Array.from({length:days},(_,i)=>{const time=now-(days-1-i)*DAY,key=dayKey(time);
    return {key,label:new Date(time).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Dhaka'}),value:0,orders:0,units:0,today:key===today};});
  const index=new Map(series.map((d,i)=>[d.key,i]));
  for(const order of orders){const t=orderTime(order);if(!Number.isFinite(t))continue;const i=index.get(dayKey(t));if(i===undefined)continue;
    series[i].value+=order.total;series[i].orders+=1;series[i].units+=order.items.reduce((n,item)=>n+item.qty,0);}
  return series;
}

export type Trend={direction:'up'|'down'|'flat'|'none';percent:number|null};
/** Compares the last 7 days with the 7 days before them. */
export function trend(current:number,previous:number):Trend{
  if(current===0&&previous===0)return {direction:'none',percent:null};
  if(previous===0)return {direction:'up',percent:null};
  const percent=Math.round((current-previous)/previous*100);
  return {direction:percent>0?'up':percent<0?'down':'flat',percent};
}
const sum=(list:number[])=>list.reduce((a,b)=>a+b,0);
const avg=(value:number,count:number)=>count?value/count:0;

export function overviewMetrics(orders:Order[],products:Product[],now=Date.now()){
  const series=dailySeries(orders,14,now),last=series.slice(7),prev=series.slice(0,7);
  const value=sum(orders.map(o=>o.total)),count=orders.length;
  const lastValue=sum(last.map(d=>d.value)),prevValue=sum(prev.map(d=>d.value));
  const lastOrders=sum(last.map(d=>d.orders)),prevOrders=sum(prev.map(d=>d.orders));
  const dailyAverage=series.map(d=>avg(d.value,d.orders));
  return {
    series,
    kpis:{
      value:{total:value,trend:trend(lastValue,prevValue),spark:series.map(d=>d.value)},
      orders:{total:count,trend:trend(lastOrders,prevOrders),spark:series.map(d=>d.orders)},
      average:{total:Math.round(avg(value,count)),trend:trend(avg(lastValue,lastOrders),avg(prevValue,prevOrders)),spark:dailyAverage},
      // Stock has no history in the API, so its trend is "no data"; the sparkline shows units ordered per day.
      units:{total:sum(products.map(p=>p.stock)),trend:{direction:'none',percent:null} as Trend,spark:series.map(d=>d.units)},
    },
    statuses:statuses.map(status=>({status,count:orders.filter(o=>o.status===status).length})),
    stock:{in:products.filter(p=>p.stock>LOW_STOCK).length,low:products.filter(p=>p.stock>0&&p.stock<=LOW_STOCK).length,out:products.filter(p=>p.stock===0).length},
    attention:products.filter(p=>p.stock<=LOW_STOCK).sort((a,b)=>a.stock-b.stock||a.name.localeCompare(b.name)),
    delivery:{dhaka:orders.filter(o=>o.area==='dhaka').length,outside:orders.filter(o=>o.area==='outside').length},
    recent:orders.slice().sort((a,b)=>(orderTime(b)||0)-(orderTime(a)||0)).slice(0,5),
  };
}

export function relativeTime(date:string,now=Date.now()){
  const t=Date.parse(date);if(!Number.isFinite(t))return '';
  // Whole units elapsed (rounded down), like "2h ago" for 2h59m.
  const minutes=Math.floor((now-t)/60000);
  if(minutes<1)return 'Just now';
  if(minutes<60)return minutes+'m ago';
  const hours=Math.floor(minutes/60);if(hours<24)return hours+'h ago';
  const days=Math.floor(hours/24);if(days<7)return days+'d ago';
  return new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Dhaka'});
}
export const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join('')||'?';
export const statusKey=(status:string)=>status.toLowerCase().replace(/[^a-z]/g,'');
export const percentOf=(part:number,total:number)=>total?Math.round(part/total*100):0;
