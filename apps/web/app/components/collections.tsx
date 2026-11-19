'use client';
// Category-driven storefront sections: featured tiles, per-category previews,
// the category directory, a collection page and the Sale page.
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {categoryCoverImage,categoryFamily,categoryPath,featuredCategories,mainCategories,saleProducts,subcategoriesOf,type Category,type Product} from '@aurzen/shared/catalog';
import {useStore} from '../providers';
import FadeIn from '../FadeIn';
import Card from './product-card';
import ProductImage from './product-image';
import BoxArt from './box-art';

const published=(products:Product[],family:string[])=>products.filter(p=>family.includes(p.category));
const sorters:Record<string,(a:Product,b:Product)=>number>={featured:(a,b)=>a.id-b.id,'price-asc':(a,b)=>a.price-b.price,'price-desc':(a,b)=>b.price-a.price,name:(a,b)=>a.name.localeCompare(b.name)};

/** A category tile: uploaded cover, then a product photo, then the branded placeholder. */
export function CategoryTile({category,eyebrow}:{category:Category;eyebrow?:string}){
  const {products,categoryTree,storefront}=useStore();
  const cover=categoryCoverImage(category,categoryTree,products,storefront?.covers);
  const family=categoryFamily(categoryTree,category.name),count=published(products,family).length;
  // Describe the actual photo: the product it comes from, or the category's own cover.
  const source=products.find(p=>family.includes(p.category)&&p.image===cover);
  // "Men's collection" must not become "Men's collection collection".
  const label=/collection$/i.test(category.name)?category.name:category.name+' collection';
  const alt=source?source.name+' – '+label:label;
  return <Link className="collection category-tile" href={categoryPath(categoryTree,category.name)}>
    {cover?<ProductImage src={cover} category={category.name} alt={alt}/>:<div className="category-tile__placeholder" aria-hidden="true"><BoxArt/></div>}
    <div className="collection-copy"><small>{eyebrow||(count?count+' piece'+(count===1?'':'s'):'COMING SOON')}</small><h3>{category.name} <span aria-hidden="true">↗</span></h3></div>
  </Link>;
}

export function FeaturedCategories(){
  const {categoryTree,storefront}=useStore();
  const featured=featuredCategories(categoryTree,storefront?.featured);
  if(!featured.length)return null;
  return <FadeIn as="section" className="section featured-categories" aria-labelledby="featured-categories-title">
    <div className="section-heading"><div className="eyebrow">FIND YOUR LITTLE SOMETHING</div><h2 id="featured-categories-title">Shop by collection.</h2><Link className="text-link" href="/collections/">View all categories ↗</Link></div>
    <div className="collections collections--featured" data-count={featured.length}>{featured.map(c=><CategoryTile key={c.slug} category={c}/>)}</div>
  </FadeIn>;
}

/** One small preview row per main category that has products; new categories appear automatically.
 *  Products already shown above (exclude) are skipped so the homepage never repeats a piece. */
export function CategoryPreviews({exclude=[]}:{exclude?:number[]}){
  const {products,categoryTree}=useStore();
  const rows=mainCategories(categoryTree).map(c=>({category:c,items:published(products,categoryFamily(categoryTree,c.name)).filter(p=>!exclude.includes(p.id))})).filter(r=>r.items.length);
  if(!rows.length)return null;
  return <>{rows.map(({category,items})=><FadeIn as="section" key={category.slug} className="section category-preview" aria-labelledby={'preview-'+category.slug}>
    <div className="section-heading"><div className="eyebrow">THE {category.name.toUpperCase()} EDIT</div><h2 id={'preview-'+category.slug}>{category.name}</h2><Link className="text-link" href={categoryPath(categoryTree,category.name)}>View collection ↗</Link></div>
    <div className="product-grid">{items.slice(0,4).map((p,i)=><Card key={p.id} p={p} delay={(i%4)*60}/>)}</div>
  </FadeIn>)}</>;
}

export function CollectionsDirectory(){
  const {categoryTree,products}=useStore();
  const mains=mainCategories(categoryTree);
  return <main className="section collections-page">
    <div className="eyebrow">THE AURZÉN COLLECTIONS</div><h1>All categories</h1>
    <p>Every collection in one place, including the ones still being filled.</p>
    {!mains.length?<div className="empty">Collections are coming soon.</div>:<div className="collections collections--directory">{mains.map(c=><div key={c.slug} className="directory-item">
      <CategoryTile category={c}/>
      {subcategoriesOf(categoryTree,c.name).length>0&&<ul className="subcategory-links" aria-label={c.name+' subcategories'}>{subcategoriesOf(categoryTree,c.name).map(s=><li key={s.slug}><Link href={categoryPath(categoryTree,s.name)}>{s.name} <small>({published(products,[s.name]).length})</small></Link></li>)}</ul>}
    </div>)}</div>}
  </main>;
}

function ProductBrowser({items,label,emptyText}:{items:Product[];label:string;emptyText:string}){
  const [sort,setSort]=useState('featured');
  const sorted=useMemo(()=>[...items].sort(sorters[sort]),[items,sort]);
  return <>
    <div className="collection-toolbar"><p className="muted" aria-live="polite">{items.length} piece{items.length===1?'':'s'}</p><select aria-label={'Sort '+label} value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></div>
    {sorted.length?<div className="product-grid">{sorted.map((p,i)=><Card key={p.id} p={p} delay={(i%4)*60}/>)}</div>:<div className="empty">{emptyText} <Link className="text-link" href="/shop/">Explore everything ↗</Link></div>}
  </>;
}

/** A main category (all its products, with subcategory chips) or one subcategory. */
export function CollectionView({main,sub}:{main:Category;sub:Category|null}){
  const {products,categoryTree,loaded,site}=useStore();
  const subs=subcategoriesOf(categoryTree,main.name);
  const family=sub?[sub.name]:categoryFamily(categoryTree,main.name);
  const items=published(products,family);
  return <main className="section shop collection-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><ol><li><Link href="/collections/">Collections</Link></li>{sub?<><li><Link href={categoryPath(categoryTree,main.name)}>{main.name}</Link></li><li aria-current="page">{sub.name}</li></>:<li aria-current="page">{main.name}</li>}</ol></nav>
    <div className="eyebrow">THE AURZÉN COLLECTION</div><h1>{sub?sub.name:main.name}</h1>{site.categories[(sub||main).slug]?.description&&<p className="collection-intro">{site.categories[(sub||main).slug].description}</p>}
    {subs.length>0&&<nav className="chips subcategory-chips" aria-label={'Browse '+main.name}>
      <Link className={!sub?'chosen':''} aria-current={!sub?'page':undefined} href={categoryPath(categoryTree,main.name)}>All {main.name}</Link>
      {subs.map(s=><Link key={s.slug} className={sub?.name===s.name?'chosen':''} aria-current={sub?.name===s.name?'page':undefined} href={categoryPath(categoryTree,s.name)}>{s.name}</Link>)}
    </nav>}
    {!loaded?<p role="status">Loading the collection…</p>:<ProductBrowser items={items} label={(sub||main).name} emptyText="Nothing here yet — new pieces are on their way."/>}
  </main>;
}

/** Products with an active offer, using the same pricing rules as product pages and checkout. */
export function SaleView(){
  const {products,now,loaded,site}=useStore(),page=site.sales.page;
  const items=saleProducts(products,now);
  return <main className="section shop sale-page">
    {page.banner&&<img className="sale-banner" src={page.banner} alt="" width={1600} height={500}/>}{page.eyebrow&&<div className="eyebrow">{page.eyebrow}</div>}<h1>{page.title}</h1>
    {page.intro&&<p>{page.intro}</p>}
    {!loaded?<p role="status">Loading offers…</p>:<ProductBrowser items={items} label="sale products" emptyText="No offers are running right now."/>}
  </main>;
}
