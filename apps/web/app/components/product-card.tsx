'use client';
import Link from 'next/link';
import {productPricing,type Product} from '@aurzen/shared/catalog';
import ProductImage from './product-image';
import FadeIn,{FadeInMedia} from '../FadeIn';
import ProductPrice,{OfferBadge} from './product-price';
import {useStore} from '../providers';
export default function ProductCard({p,delay=0}:{p:Product;delay?:number}){
  const {now}=useStore(),onOffer=productPricing(p,now).active;
  const secondary=p.images?.find(src=>src&&src!=='box'&&src!==p.image);
  return <FadeIn as="article" className={'product'+(p.stock===0?' product--sold-out':'')+(onOffer?' product--on-offer':'')} delay={delay}>
    <Link className="product-image" href={`/products/${p.id}/`} aria-label={`View ${p.name}`}>
      <FadeInMedia className="product-reveal"><ProductImage src={p.image} alt={p.name} category={p.category} secondarySrc={secondary}/></FadeInMedia>
      <OfferBadge product={p}/>
      {(p.stock===0||p.tag)&&<span className="tag">{p.stock===0?'SOLD OUT':p.tag}</span>}
      <span className="quick">View details <span aria-hidden="true">↗</span></span>
    </Link>
    <div className="product-info"><div><small>{p.category}</small><h3><Link href={`/products/${p.id}/`}>{p.name}</Link></h3></div><ProductPrice product={p}/><span className="product-card-status">{p.stock===0?'Currently unavailable':p.category==='Clothing'?'Choose your size':p.category==='Mystery Boxes'?'Choose your style':'Available'}</span></div>
  </FadeIn>;
}
