// Studio overview metrics: Dhaka calendar days, 7-day trends, status/stock/delivery splits.
const test=require('node:test'),assert=require('node:assert/strict');
const {overviewMetrics,dailySeries,trend,relativeTime,initials,dayKey}=require('../apps/web/app/components/admin/metrics.ts');

const DAY=86400000;
// 12 Nov 2026, 12:00 in Dhaka (06:00 UTC).
const now=Date.parse('2026-11-12T06:00:00.000Z');
const order=(daysAgo,total,extra={})=>({id:'AZ-'+daysAgo+'-'+total,name:'Test Customer',phone:'01712345678',address:'Dhaka',area:'dhaka',items:[{id:1,name:'Item',price:total,qty:1,size:'M'}],total,delivery:80,status:'New',date:new Date(now-daysAgo*DAY).toISOString(),...extra});
const product=(id,stock)=>({id,name:'Product '+id,category:'Clothing',price:1000,stock,image:'box',tag:''});

test('orders are grouped by Asia/Dhaka calendar day, ending today',()=>{
  // 19:30 UTC on 11 Nov is already 01:30 on 12 Nov in Dhaka.
  const lateUtc={...order(0,500),date:'2026-11-11T19:30:00.000Z'};
  const series=dailySeries([lateUtc,order(1,300),order(20,999)],14,now);
  assert.equal(series.length,14);
  assert.equal(series[13].key,'2026-11-12');assert.equal(series[13].today,true);
  assert.equal(series[13].value,500,'late-evening UTC order counts on the Dhaka day');
  assert.equal(series[12].value,300);
  assert.equal(series.reduce((n,d)=>n+d.value,0),800,'orders older than 14 days are excluded');
  assert.equal(dayKey(Date.parse('2026-11-11T17:59:59.000Z')),'2026-11-11');
  assert.equal(dayKey(Date.parse('2026-11-11T18:00:00.000Z')),'2026-11-12');
});

test('trend compares the last 7 days with the previous 7 days',()=>{
  assert.deepEqual(trend(0,0),{direction:'none',percent:null});
  assert.deepEqual(trend(5,0),{direction:'up',percent:null});
  assert.deepEqual(trend(150,100),{direction:'up',percent:50});
  assert.deepEqual(trend(50,100),{direction:'down',percent:-50});
  assert.deepEqual(trend(100,100),{direction:'flat',percent:0});
  const m=overviewMetrics([order(1,1000),order(2,1000),order(9,1000)],[],now);
  assert.equal(m.kpis.orders.trend.percent,100,'2 orders this week vs 1 the week before');
  assert.equal(m.kpis.value.trend.direction,'up');
  assert.equal(m.kpis.average.trend.direction,'flat');
});

test('KPIs, statuses, stock health, delivery split and recent orders',()=>{
  const orders=[order(0,1200,{status:'Delivered'}),order(1,800,{status:'Cancelled',area:'outside'}),order(3,1000)];
  const m=overviewMetrics(orders,[product(1,0),product(2,3),product(3,5),product(4,6)],now);
  assert.equal(m.kpis.value.total,3000);assert.equal(m.kpis.orders.total,3);assert.equal(m.kpis.average.total,1000);
  assert.equal(m.kpis.units.total,14);assert.equal(m.kpis.units.trend.direction,'none','no stock history is available');
  assert.deepEqual(m.statuses.filter(s=>s.count).map(s=>s.status+':'+s.count),['New:1','Delivered:1','Cancelled:1']);
  assert.equal(m.statuses.length,7);
  assert.deepEqual(m.stock,{in:1,low:2,out:1});
  assert.deepEqual(m.attention.map(p=>p.id),[1,2,3],'out of stock first, then lowest stock');
  assert.deepEqual(m.delivery,{dhaka:2,outside:1});
  assert.equal(m.recent[0].total,1200,'newest order first');
});

test('empty store produces zero indicators instead of errors',()=>{
  const m=overviewMetrics([],[],now);
  assert.equal(m.kpis.value.total,0);assert.equal(m.kpis.average.total,0);
  assert.equal(m.kpis.orders.trend.direction,'none');
  assert.equal(m.series.length,14);assert(m.series.every(d=>d.value===0));
  assert.deepEqual(m.stock,{in:0,low:0,out:0});assert.deepEqual(m.recent,[]);
});

test('relative times and initials',()=>{
  assert.equal(relativeTime(new Date(now-30*1000).toISOString(),now),'Just now');
  assert.equal(relativeTime(new Date(now-5*60000).toISOString(),now),'5m ago');
  assert.equal(relativeTime(new Date(now-2*3600000).toISOString(),now),'2h ago');
  assert.equal(relativeTime(new Date(now-3*DAY).toISOString(),now),'3d ago');
  assert.equal(relativeTime(new Date(now-30*DAY).toISOString(),now),'13 Oct');
  assert.equal(relativeTime('not a date',now),'');
  assert.equal(initials('Ayesha Rahman'),'AR');assert.equal(initials('  nusrat  '),'N');assert.equal(initials(''),'?');
});
