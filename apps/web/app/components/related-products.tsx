'use client';
// "You may also like" under the product: the related products picked in the studio first, then
// the same subcategory, then the rest of its main category, then other products. Only products in stock;
// never the product itself.
import {categoryFamily,type Category,type Product} from '@aurzen/shared/catalog';
import FadeIn from '../FadeIn';
import Card from './product-card';
import {useStore} from '../providers';

export function relatedFor(product:Product,products:Product[],categories:Category[],limit=4){
  const usable=(p:Product|undefined):p is Product=>!!p&&p.id!==product.id&&p.stock>0;
  const picked=(product.extra?.related||[]).map(id=>products.find(p=>p.id===id)).filter(usable);
  const parent=categories.find(c=>c.name===product.category)?.parent||product.category;
  const family=categoryFamily(categories,parent);
  const sameCategory=products.filter(p=>usable(p)&&p.category===product.category);
  const sameFamily=products.filter(p=>usable(p)&&p.category!==product.category&&family.includes(p.category));
  // A small catalogue still fills the row: newest other products in stock come last.
  const others=products.filter(p=>usable(p)&&!family.includes(p.category)).sort((a,b)=>b.id-a.id);
  const out:Product[]=[];
  for(const p of [...picked,...sameCategory,...sameFamily,...others])if(!out.some(x=>x.id===p.id)){out.push(p);if(out.length>=limit)break;}
  return out;
}

export default function RelatedProducts({product}:{product:Product}){
  const {products,categoryTree}=useStore();
  const items=relatedFor(product,products,categoryTree);
  if(!items.length)return null;
  return <FadeIn as="section" className="related-products" aria-labelledby="related-title">
    <div className="section-heading"><div className="eyebrow">Complete the look</div><h2 id="related-title">You may also like</h2></div>
    <div className="product-grid">{items.map((p,i)=><Card key={p.id} p={p} delay={i*40}/>)}</div>
  </FadeIn>;
}
