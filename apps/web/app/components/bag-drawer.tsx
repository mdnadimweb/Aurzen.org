'use client';
import Link from 'next/link';
import {useStore} from '../providers';
import {money,validOption,productPricing} from '@aurzen/shared/catalog';
import Box from './box-art';
import ProductImage from './product-image';
import Modal from './modal';
import ProductPrice from './product-price';
export default function BagDrawer(){
  const {bagOpen,setBagOpen,cart,setCart,products,ready,now}=useStore();
  const invalid=cart.some(c=>{const p=products.find(p=>p.id===c.id);return !p||!validOption(p,c.size)||cart.filter(x=>x.id===c.id).reduce((n,x)=>n+x.qty,0)>p.stock;});
  const subtotal=cart.reduce((n,c)=>{const p=products.find(p=>p.id===c.id);return n+(p?productPricing(p,now).unitPrice:0)*c.qty;},0);
  return <Modal open={bagOpen} onClose={()=>setBagOpen(false)} label="Your shopping bag" className="bag-drawer">
    <div className="drawer-heading"><div><div className="eyebrow">YOUR LITTLE FINDS</div><h2>Your shopping bag</h2></div><button autoFocus aria-label="Close shopping bag" onClick={()=>setBagOpen(false)}>×</button></div>
    {!ready?<p role="status">Loading your bag…</p>:!cart.length?<div className="empty"><Box/><h2>A little room for something lovely.</h2><p>Find a new everyday favourite.</p><Link href="/shop/" className="primary" onClick={()=>setBagOpen(false)}>Explore the collection ↗</Link></div>:<>
      <div className="drawer-items">{cart.map((c,i)=>{const p=products.find(p=>p.id===c.id),other=cart.filter((x,j)=>x.id===c.id&&j!==i).reduce((n,x)=>n+x.qty,0),max=Math.min(100,Math.max(0,(p?.stock||0)-other));
        const update=(qty:number)=>setCart(items=>items.map((item,j)=>j===i?{...item,qty}:item));
        return <article className="drawer-item" key={c.id+'-'+c.size}>
          <ProductImage className="bag-photo" src={p?.image} alt={p?.name||'Removed product'} category={p?.category}/>
          <div><h3>{p?<Link href={'/products/'+p.id+'/'} onClick={()=>setBagOpen(false)}>{p.name}</Link>:'Unavailable product'}</h3><p>{c.size}</p>{p&&<><ProductPrice product={p}/><p>{money(productPricing(p,now).unitPrice)} each · <strong>{money(productPricing(p,now).unitPrice*c.qty)}</strong></p></>}
          {(!p||!validOption(p,c.size)||c.qty>max)&&<p className="form-error">{!p?'This product was removed.':!validOption(p,c.size)?'This option is no longer available.':max===0?'Currently unavailable.':`Only ${max} available for this option.`} Update your bag to continue.</p>}
          <div className="quantity-controls"><button aria-label={'Decrease quantity for '+(p?.name||'item')+', '+c.size} disabled={c.qty<=1} onClick={()=>update(c.qty-1)}>−</button><span aria-live="polite">{c.qty}</span><button aria-label={'Increase quantity for '+(p?.name||'item')+', '+c.size} disabled={!p||c.qty>=max} onClick={()=>update(c.qty+1)}>+</button><button className="text-link" onClick={()=>setCart(items=>items.filter((_,j)=>j!==i))}>Remove<span className="sr-only"> {p?.name||'unavailable item'}, {c.size}</span></button></div>
          </div></article>;
      })}</div>
      <div className="drawer-summary"><div className="summary"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Delivery is calculated at checkout.</p>{invalid?<p role="status">Update unavailable items or quantities before checkout.</p>:<Link className="primary" href="/cart/" onClick={()=>setBagOpen(false)}>Proceed to checkout ↗</Link>}<Link className="text-link" href="/cart/" onClick={()=>setBagOpen(false)}>View full shopping bag</Link><button className="text-link" onClick={()=>setBagOpen(false)}>Continue shopping</button></div>
    </>}
  </Modal>;
}
