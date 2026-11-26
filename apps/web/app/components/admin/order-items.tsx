'use client';
// Orders table → Items cell: one tidy line per product (quantity, name, size/colour),
// the first three shown and the rest behind "+N more" so long orders don't stretch the row.
import {useState} from 'react';
import {lineKey,optionLabel,type Order} from '@aurzen/shared/catalog';

const visible=3;
export default function OrderItems({items}:{items:Order['items']}){
  const [open,setOpen]=useState(false);
  const pieces=items.reduce((n,x)=>n+x.qty,0);
  const shown=open||items.length<=visible+1?items:items.slice(0,visible),hidden=items.length-shown.length;
  return <div className="order-items">
    {items.length>1&&<p className="order-items__count">{items.length} products · {pieces} {pieces===1?'piece':'pieces'}</p>}
    <ul>{shown.map(x=><li key={lineKey(x)}>
      <span className="order-items__qty" aria-label={'Quantity '+x.qty}>{x.qty}×</span>
      <span className="order-items__text"><span className="order-items__name" title={x.name}>{x.name}</span><span className="order-items__option">{optionLabel(x)}</span></span>
    </li>)}</ul>
    {(hidden>0||open)&&items.length>visible+1&&<button type="button" className="order-items__more" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Show less':'+'+hidden+' more '+(hidden===1?'item':'items')}</button>}
  </div>;
}
