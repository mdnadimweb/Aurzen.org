'use client';
import {money,type Order} from '@aurzen/shared/catalog';
import Icon from '../admin-icons';
import StatusPill from './status-pill';
import {initials,relativeTime} from './metrics';

export default function RecentOrders({orders,now,onViewAll}:{orders:Order[];now:number;onViewAll:()=>void}){
  return <>
    <ul className="ov-orders">{orders.map(o=><li key={o.id}>
      <span className="ov-avatar" aria-hidden="true">{initials(o.name)}</span>
      <div className="ov-orders__who"><strong>{o.name}</strong><span>{o.items.reduce((n,i)=>n+i.qty,0)} item{o.items.reduce((n,i)=>n+i.qty,0)===1?'':'s'} · {o.area==='dhaka'?'Dhaka city':'Outside Dhaka'}</span></div>
      <div className="ov-orders__money"><strong>{money(o.total)}</strong><time dateTime={o.date}>{relativeTime(o.date,now)}</time></div>
      <StatusPill status={o.status}/>
    </li>)}</ul>
    <div className="ov-card__foot"><button type="button" className="a-btn a-btn--secondary a-btn--sm" onClick={onViewAll}>View all orders<Icon name="chevron"/></button></div>
  </>;
}
