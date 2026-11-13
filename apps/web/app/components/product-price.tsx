'use client';
import {money,productPricing,type Product} from '@aurzen/shared/catalog';
import {useStore} from '../providers';
import '../offer.css';

export default function ProductPrice({product,quantity=1,compact=false,chargedUnitPrice}:{product:Product;quantity?:number;compact?:boolean;chargedUnitPrice?:number}){
  const {now}=useStore(),current=productPricing(product,now);
  // Until a changed catalog arrives, show the authoritative charged unit alone
  // rather than crossing out a potentially stale regular price.
  const price=chargedUnitPrice===undefined?current:{...current,unitPrice:chargedUnitPrice,savings:current.unitPrice===chargedUnitPrice?current.savings:0,active:current.unitPrice===chargedUnitPrice&&current.active};
  return <span className={'product-price'+(price.active?' product-price--sale':'')+(compact?' product-price--compact':'')}>
    {price.active&&<del><span className="sr-only">Regular price </span>{money(price.regular*quantity)}</del>}
    <b><span className="sr-only">{price.active?'Sale price ':''}</span>{money(price.unitPrice*quantity)}</b>
    {price.active&&!compact&&<span className="block basis-full text-caption leading-normal text-muted">{money(price.savings*quantity)} saved</span>}
  </span>;
}

export function OfferBadge({product}:{product:Product}){
  const {now}=useStore(),price=productPricing(product,now);
  // offer-badge stays as a hook for the browser checks; Tailwind supplies the styling.
  return price.active?<span className="offer-badge pointer-events-none absolute top-[var(--sale-inset,10px)] left-[var(--sale-inset,10px)] z-2 inline-block rounded-full bg-[linear-gradient(90deg,var(--plum),var(--plum-soft))] px-2.5 py-[7px] text-caption leading-tight font-bold tracking-[.04em] whitespace-nowrap text-ivory shadow-[0_4px_12px_#432b3b2e]" aria-label={`${price.percent}% off`}>{price.percent}% OFF</span>:null;
}
