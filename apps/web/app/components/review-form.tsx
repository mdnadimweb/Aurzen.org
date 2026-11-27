'use client';
// "Write a review" on a product page. The review is saved hidden and shows only after the owner
// approves it (Studio → Reviews). The phone number is never shown; it stops repeat posts and marks
// reviews from customers with a delivered order as "Verified buyer".
import {useState,type FormEvent} from 'react';
import {api} from '../providers';

export default function ReviewForm({productId,productName}:{productId:number;productName:string}){
  const [open,setOpen]=useState(false),[rating,setRating]=useState(0),[state,setState]=useState<'idle'|'busy'|'done'>('idle'),[error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(state==='busy')return;
    if(!rating){setError('Choose a star rating.');return;}
    const f=new FormData(event.currentTarget);
    setState('busy');setError('');
    try{await api('/api/reviews/',{method:'POST',body:JSON.stringify({product:productId,rating,name:f.get('name'),phone:f.get('phone'),text:f.get('text')})});setState('done');}
    catch(e){setError((e as Error).message);setState('idle');}
  }
  if(state==='done')return <section className="review-form review-form--done" aria-live="polite"><h3>Thank you for your review.</h3><p>It will appear here once we have checked it.</p></section>;
  if(!open)return <section className="review-form review-form--closed"><p>Bought {productName}? Tell other customers what you think.</p><button type="button" className="review-form__open" onClick={()=>setOpen(true)}>Write a review</button></section>;
  return <section className="review-form" aria-labelledby="review-form-title">
    <h3 id="review-form-title">Write a review</h3>
    <form onSubmit={submit} onChange={()=>error&&setError('')}>
      <fieldset className="review-form__stars"><legend>Your rating</legend>
        <div role="radiogroup" aria-label="Rating">{[1,2,3,4,5].map(n=><label key={n} className={n<=rating?'is-on':''}><input type="radio" name="rating" value={n} checked={rating===n} onChange={()=>setRating(n)}/><span aria-hidden="true">★</span><span className="sr-only">{n} star{n>1?'s':''}</span></label>)}</div>
      </fieldset>
      <div className="review-form__row">
        <label>Your name<input name="name" required minLength={2} maxLength={60} autoComplete="name"/></label>
        <label>Mobile number<input name="phone" type="tel" inputMode="tel" required minLength={11} maxLength={20} autoComplete="tel" placeholder="01XXXXXXXXX" aria-describedby="review-phone-hint"/><small id="review-phone-hint">Not shown on the shop. Used only to check your order.</small></label>
      </div>
      <label>Your review<textarea name="text" required minLength={10} maxLength={1000} rows={4} placeholder="Fit, fabric, how it looked…"/></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="review-form__actions"><button type="button" className="text-link" onClick={()=>setOpen(false)}>Cancel</button><button className="primary" disabled={state==='busy'}>{state==='busy'?'Sending…':'Send review'}</button></div>
      <small className="review-form__note">Reviews appear after a quick check.</small>
    </form>
  </section>;
}
