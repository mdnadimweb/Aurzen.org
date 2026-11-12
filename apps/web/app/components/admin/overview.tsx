'use client';
import {useMemo,useState,type ReactNode} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {money,type Order,type Product} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';
import KpiCard from './kpi-card';
import StatusDonut from './status-donut';
import SalesChart from './sales-chart';
import SplitBar from './split-bar';
import RecentOrders from './recent-orders';
import {overviewMetrics,LOW_STOCK} from './metrics';
import {riseIn,staggerContainer} from './motion';

type Props={orders:Order[];products:Product[];onEditProduct:(product:Product)=>void;onViewOrders:()=>void;onAddProduct:()=>void;onAddCategory:()=>void;onStorefront:()=>void};

function Card({title,id,className='',action,children}:{title:string;id:string;className?:string;action?:ReactNode;children:ReactNode}){
  const reduced=useReducedMotion();
  return <motion.section className={'a-card ov-card '+className} data-fade="" variants={riseIn(reduced)} aria-labelledby={id}>
    <div className="ov-card__head"><h2 id={id}>{title}</h2>{action}</div>
    {children}
  </motion.section>;
}

export default function Overview({orders,products,onEditProduct,onViewOrders,onAddProduct,onAddCategory,onStorefront}:Props){
  const reduced=useReducedMotion();
  const [now]=useState(()=>Date.now());
  const m=useMemo(()=>overviewMetrics(orders,products,now),[orders,products,now]);
  const hasOrders=orders.length>0;
  const units=(n:number)=>n.toLocaleString('en-BD');
  const quickActions=<div className="ov-actions">
    <button type="button" className="admin-action" onClick={onAddProduct}><Icon name="plus"/>Add a new product<Icon name="chevron" className="a-icon admin-action__chevron"/></button>
    <button type="button" className="admin-action" onClick={onAddCategory}><Icon name="categories"/>Create a category<Icon name="chevron" className="a-icon admin-action__chevron"/></button>
    <button type="button" className="admin-action" onClick={onStorefront}><Icon name="storefront"/>Explore the storefront<Icon name="chevron" className="a-icon admin-action__chevron"/></button>
  </div>;
  return <motion.div className={'ov'+(hasOrders?'':' ov--empty')} variants={staggerContainer(reduced)} initial="hidden" animate="visible">
    <section className="ov-kpis" aria-label="Key figures">
      <KpiCard index={0} tone="plum" icon="wallet" label="Total order value" value={m.kpis.value.total} format={money} trend={m.kpis.value.trend} spark={m.kpis.value.spark} sparkLabel="Sparkline: order value per day, last 14 days." note="All time · vs previous 7 days"/>
      <KpiCard index={1} tone="gold" icon="orders" label="Orders" value={m.kpis.orders.total} trend={m.kpis.orders.trend} spark={m.kpis.orders.spark} sparkLabel="Sparkline: orders per day, last 14 days." note="All time · vs previous 7 days"/>
      <KpiCard index={2} tone="teal" icon="sparkle" label="Average order value" value={m.kpis.average.total} format={money} trend={m.kpis.average.trend} spark={m.kpis.average.spark} sparkLabel="Sparkline: average order value per day, last 14 days."/>
      <KpiCard index={3} tone="green" icon="box" label="Units in stock" value={m.kpis.units.total} format={units} trend={m.kpis.units.trend} spark={m.kpis.units.spark} sparkLabel="Sparkline: units ordered per day, last 14 days." note={`${products.length} product${products.length===1?'':'s'} · no stock history`}/>
    </section>
    <div className="ov-grid">
      <div className="ov-main">{hasOrders?<>
        <Card id="ov-sales" title="Sales, last 14 days" className="ov-card--sales" action={<span className="ov-card__note">{money(m.series.reduce((n,d)=>n+d.value,0))}</span>}><SalesChart days={m.series}/></Card>
        <Card id="ov-recent" title="Recent orders" className="ov-card--recent"><RecentOrders orders={m.recent} now={now} onViewAll={onViewOrders}/></Card>
      </>:<Card id="ov-welcome" title="Your first order will light this up" className="ov-card--welcome">
        <div className="ov-welcome"><span className="admin-empty__icon"><Icon name="orders"/></span><p>No orders yet. Sales, order status and delivery charts appear here as soon as your first cash-on-delivery order arrives. Until then, finish setting up your collection.</p></div>
        {quickActions}
      </Card>}</div>
      <div className="ov-side">
        {hasOrders&&<Card id="ov-status" title="Order status" className="ov-card--status"><StatusDonut data={m.statuses}/></Card>}
        <Card id="ov-stock" title="Inventory health">
          <SplitBar label="Inventory health" unit={['product','products']} parts={[{key:'in',label:'In stock',count:m.stock.in,tone:'green'},{key:'low',label:`Low (≤${LOW_STOCK})`,count:m.stock.low,tone:'amber'},{key:'out',label:'Out of stock',count:m.stock.out,tone:'rose'}]}/>
          {m.attention.length?<ul className="ov-attention">{m.attention.slice(0,5).map(p=><li key={p.id} data-level={p.stock===0?'out':'low'}>
            <span className="a-stock__dot" aria-hidden="true"/>
            <span className="ov-attention__name">{p.name}<small>{p.stock===0?'Out of stock':`${p.stock} left`}</small></span>
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" aria-label={'Edit '+p.name} onClick={()=>onEditProduct(p)}><Icon name="edit"/>Edit</button>
          </li>)}</ul>:<p className="ov-muted">Every product has more than {LOW_STOCK} units.</p>}
        </Card>
        <Card id="ov-delivery" title="Delivery split">
          <SplitBar label="Delivery split" unit={['order','orders']} delay={450} parts={[{key:'dhaka',label:'Dhaka city',count:m.delivery.dhaka,tone:'plum'},{key:'outside',label:'Outside Dhaka',count:m.delivery.outside,tone:'gold'}]}/>
          {!hasOrders&&<p className="ov-muted">Delivery areas appear with your first order.</p>}
        </Card>
        {hasOrders&&<Card id="ov-actions" title="Make it yours">{quickActions}</Card>}
      </div>
    </div>
  </motion.div>;
}
