import type {Review} from '@aurzen/shared/site';
import FadeIn from '../FadeIn';

const stars=(n:number)=><span className="review-stars" aria-label={n+' out of 5 stars'}>{'★'.repeat(n)}<span aria-hidden="true">{'★'.repeat(5-n)}</span></span>;
function Item({r}:{r:Review}){
  return <figure className="review">
    {r.photo&&<img src={r.photo} alt="" loading="lazy" width={64} height={64}/>}
    <div>{stars(r.rating)}<blockquote>{r.text}</blockquote><figcaption>— {r.name}{r.verified&&<span className="review-verified">Verified buyer</span>}</figcaption></div>
  </figure>;
}
/** Homepage testimonials: the newest approved reviews (Studio → Reviews). */
export function Testimonials({reviews}:{reviews:Review[]}){
  const list=[...reviews].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  if(!list.length)return null;
  return <FadeIn as="section" className="section testimonials" aria-labelledby="testimonials-title">
    <div className="section-heading"><div className="eyebrow">KIND WORDS</div><h2 id="testimonials-title">Loved by our customers.</h2></div>
    <div className="reviews-grid">{list.map(r=><Item key={r.id} r={r}/>)}</div>
  </FadeIn>;
}
/** Approved reviews linked to one product, with the average rating. */
export function ProductReviews({reviews}:{reviews:Review[]}){
  if(!reviews.length)return null;
  const average=reviews.reduce((s,r)=>s+r.rating,0)/reviews.length;
  return <section className="section product-reviews" aria-labelledby="product-reviews-title">
    <h2 id="product-reviews-title">Reviews <small>{average.toFixed(1)} ★ · {reviews.length}</small></h2>
    <div className="reviews-grid">{reviews.map(r=><Item key={r.id} r={r}/>)}</div>
  </section>;
}
