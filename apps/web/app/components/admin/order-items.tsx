'use client';
// Orders table → Items. OrderItemsSummary is the compact cell (first item + "+N more items");
// OrderItemsDetail is the full-width row shown under the order when it is opened.
import {useState} from 'react';
import {money,optionLabel,lineKey,type Category,type Order,type Product} from '@aurzen/shared/catalog';
import {isMystery} from '@aurzen/shared/site';
import Icon from '../admin-icons';

type Line=Order['items'][number];
const productOf=(products:Product[],x:Line)=>products.find(p=>p.id===x.id);

/** 40×40 product photo; a neutral placeholder when there is no photo or it fails to load. */
function Thumb({product}:{product?:Product}){
  const [failed,setFailed]=useState(false);
  const src=product?.image&&product.image!=='box'?product.image:'';
  return <span className="oi-thumb" aria-hidden="true">{src&&!failed?<img src={src} alt="" width={40} height={40} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<Icon name="products"/>}</span>;
}

export function OrderItemsSummary({order,products,open,onToggle}:{order:Order;products:Product[];open:boolean;onToggle:()=>void}){
  const [first]=order.items,count=order.items.length;
  if(!first)return null;
  return <div className="oi">
    <div className="oi__first">
      <Thumb product={productOf(products,first)}/>
      <span className="oi__text">
        <span className="oi__name" title={first.name}>{first.name}</span>
        <span className="oi__meta"><span className="oi__nowrap">{optionLabel(first)}</span> · <span className="oi__nowrap">Qty {first.qty}</span></span>
      </span>
    </div>
    <button type="button" className={'oi__toggle'+(open?' is-open':'')} aria-expanded={open} aria-controls={'order-items-'+order.id} onClick={onToggle}>
      {count>1?<>{open?'Hide items':'+'+(count-1)+' more '+(count===2?'item':'items')}<span className="oi__count">{count} items</span></>:open?'Hide details':'Details'}
      <Icon name="chevron"/>
    </button>
  </div>;
}

export function OrderItemsDetail({order,products,categories}:{order:Order;products:Product[];categories:Category[]}){
  const subtotal=order.items.reduce((n,x)=>n+x.price*x.qty,0);
  const mystery=order.items.filter(x=>{const p=productOf(products,x);return p?isMystery(categories,p.category):false;});
  return <div className="oi-detail" id={'order-items-'+order.id}>
    <table className="oi-table">
      <caption className="sr-only">Items in order {order.id}</caption>
      <thead><tr><th scope="col"><span className="sr-only">Photo</span></th><th scope="col">Product</th><th scope="col">Size / variant</th><th scope="col" className="oi-num">Qty</th><th scope="col" className="oi-num">Unit price</th><th scope="col" className="oi-num">Line total</th></tr></thead>
      <tbody>{order.items.map(x=><tr key={lineKey(x)}>
        <td><Thumb product={productOf(products,x)}/></td>
        <td className="oi-table__name" title={x.name}>{x.name}</td>
        <td className="oi-nowrap" data-label="Size">{optionLabel(x)}</td>
        <td className="oi-num" data-label="Qty">{x.qty}</td>
        <td className="oi-num" data-label="Unit">{money(x.price)}</td>
        <td className="oi-num oi-table__total">{money(x.price*x.qty)}</td>
      </tr>)}</tbody>
    </table>
    <div className="oi-detail__foot">
      <div className="oi-detail__notes">
        {order.gift?.wrap&&<p><strong>Gift wrap</strong> Yes{order.gift.price?' ('+money(order.gift.price)+')':''}</p>}
        {order.gift?.message&&<p><strong>Gift message</strong> “{order.gift.message}”</p>}
        {mystery.map(x=><p key={lineKey(x)}><strong>Mystery Box preference</strong> {x.name}: {optionLabel(x)}</p>)}
      </div>
      <dl className="oi-totals">
        <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
        {!!order.discount&&<div><dt>Discount{order.coupon?' ('+order.coupon+')':''}</dt><dd>−{money(order.discount)}</dd></div>}
        {!!order.gift?.price&&order.gift.wrap&&<div><dt>Gift wrap</dt><dd>{money(order.gift.price)}</dd></div>}
        <div><dt>Delivery ({order.area==='dhaka'?'Dhaka city':'Outside Dhaka'})</dt><dd>{money(order.delivery)}</dd></div>
        <div className="oi-totals__grand"><dt>Total</dt><dd>{money(order.total)}</dd></div>
      </dl>
    </div>
  </div>;
}
