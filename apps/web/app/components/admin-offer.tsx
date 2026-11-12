'use client';
import {useState} from 'react';
import {money,productPricing,type Product} from '@aurzen/shared/catalog';

function localDate(value?:string|null){
  if(!value)return '';
  const time=new Date(value).getTime();
  return Number.isFinite(time)?new Date(time+6*60*60*1000).toISOString().slice(0,23):'';
}
function utcDate(value:string){
  if(!value)return null;
  const date=new Date(value+'+06:00');
  return Number.isFinite(date.getTime())?date.toISOString():value;
}
export default function AdminOffer({initialOffer,price,disabled}:{initialOffer?:Product['offer'];price:number;disabled:boolean}){
  const [enabled,setEnabled]=useState(initialOffer?.enabled||false),[percent,setPercent]=useState(String(initialOffer?.percent||20));
  const [startsAt,setStartsAt]=useState(localDate(initialOffer?.startsAt)),[endsAt,setEndsAt]=useState(localDate(initialOffer?.endsAt));
  const offer={enabled,percent:Number(percent),startsAt:utcDate(startsAt),endsAt:utcDate(endsAt)};
  const validPrice=Number.isSafeInteger(price)&&price>0&&price<=1000000;
  const validPercent=Number.isSafeInteger(offer.percent)&&offer.percent>=1&&offer.percent<=99;
  const invalidRange=Boolean(startsAt&&endsAt&&startsAt>=endsAt);
  const preview=productPricing({price,offer:{...offer,enabled:true,startsAt:null,endsAt:null}} as Product);
  return <fieldset className="admin-offer" disabled={disabled} aria-describedby="offer-timezone">
    <legend>Offer</legend>
    <label className="offer-toggle"><input name="offerEnabled" type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/>Enable offer</label>
    <input type="hidden" name="offer" value={JSON.stringify(offer)}/>
    <div className="form-pair"><label>Discount percentage<input name="offerPercent" type="number" min="1" max="99" step="1" required={enabled} disabled={!enabled} value={percent} onChange={event=>setPercent(event.target.value)}/></label><p className="field-hint">Keep the regular price above as your base price. Discounts round to the nearest whole taka, with a minimum price of ৳1.</p></div>
    <div className="form-pair"><label>Offer start (optional)<input name="offerStart" type="datetime-local" step="any" value={startsAt} disabled={!enabled} onChange={event=>setStartsAt(event.target.value)}/></label><label>Offer end (optional)<input name="offerEnd" type="datetime-local" step="any" value={endsAt} disabled={!enabled} onChange={event=>setEndsAt(event.target.value)} min={startsAt||undefined} aria-invalid={invalidRange} aria-describedby={invalidRange?'offer-range-error':undefined}/></label></div>
    <small id="offer-timezone">All times are Asia/Dhaka (UTC+06:00). A blank start begins immediately; a blank end has no expiry. The server decides when the offer is active.</small>
    {invalidRange&&<p id="offer-range-error" className="field-error" role="alert">Offer end must be after its start.</p>}
    <div className="offer-preview" aria-live="polite">{validPrice&&validPercent?<><span>Regular price <strong>{money(price)}</strong></span><span>Offer price <strong>{money(preview.unitPrice)}</strong></span><span>Customer saves <strong>{money(preview.savings)} ({offer.percent}%)</strong></span><small>{enabled?'Preview applies while the offer is enabled and within its schedule.':'Offer is disabled. Customers see the regular price.'}</small></>:<span>Enter a regular price and a whole discount percentage from 1 to 99 to preview the offer.</span>}</div>
  </fieldset>;
}
