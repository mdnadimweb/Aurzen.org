'use client';
import {useEffect,useRef,useState,type FocusEvent,type InvalidEvent,type FormEvent} from 'react';
import {api} from '../providers';
import {normalizePhone} from '@aurzen/shared/phone';
import type {PublicOrder} from '@aurzen/shared/tracking';

type Tracking=PublicOrder;
type Field='reference'|'phone';
type FieldErrors=Partial<Record<Field,string>>;
function fieldError(field:Field,value:string){
  if(field==='reference')return value.trim().length===0?'Enter the order reference from your confirmation.':value.trim().length>100?'Use the complete reference from your order confirmation.':'';
  return /^01[3-9]\d{8}$/.test(normalizePhone(value))?'':'Enter the Bangladesh mobile number used at checkout.';
}
export default function OrderTracking(){
  const [order,setOrder]=useState<Tracking|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[fieldErrors,setFieldErrors]=useState<FieldErrors>({});
  const reference=useRef<HTMLInputElement>(null),result=useRef<HTMLElement>(null),feedback=useRef<HTMLParagraphElement>(null),submitting=useRef(false);
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get('reference');if(value&&reference.current)reference.current.value=value.slice(0,100);},[]);
  useEffect(()=>{if(order)result.current?.focus();},[order]);
  function checkField(field:Field,value:string){setFieldErrors(current=>({...current,[field]:fieldError(field,value)}));}
  const fieldProps=(field:Field)=>({
    'aria-invalid':Boolean(fieldErrors[field]),
    'aria-describedby':`${field==='phone'?'tracking-phone-hint ':''}${fieldErrors[field]?'tracking-'+field+'-error':''}`.trim()||undefined,
    onBlur:(event:FocusEvent<HTMLInputElement>)=>checkField(field,event.currentTarget.value),
    onInvalid:(event:InvalidEvent<HTMLInputElement>)=>checkField(field,event.currentTarget.value),
    onInput:(event:FormEvent<HTMLInputElement>)=>{setOrder(null);setError('');if(fieldErrors[field])checkField(field,event.currentTarget.value);},
  });
  const message=(field:Field)=>fieldErrors[field]&&<span className="field-error" id={'tracking-'+field+'-error'}>{fieldErrors[field]}</span>;
  return <main className="section tracking-page"><div className="eyebrow">FROM OUR STORE TO YOUR DOOR</div><h1>Track your little finds.</h1><p>Enter your order reference and the mobile number used at checkout.</p><form className="panel tracking-form" method="post" action="/api/tracking/" aria-busy={busy} onSubmit={async event=>{
    event.preventDefault();if(submitting.current)return;
    const form=event.currentTarget,data=new FormData(form),errors:FieldErrors={};
    setOrder(null);setError('');
    for(const field of ['reference','phone'] as const){const message=fieldError(field,String(data.get(field)||''));if(message)errors[field]=message;}
    setFieldErrors(errors);
    const first=(['reference','phone'] as const).find(field=>errors[field]);
    if(first){(form.elements.namedItem(first) as HTMLElement|null)?.focus();return;}
    submitting.current=true;setBusy(true);
    try{
      setOrder(await api('/api/tracking/',{method:'POST',body:JSON.stringify({reference:String(data.get('reference')||'').trim(),phone:normalizePhone(String(data.get('phone')||''))})}));
      form.reset();setFieldErrors({});
    }catch(error){setError((error as Error).message);requestAnimationFrame(()=>feedback.current?.focus());}
    finally{submitting.current=false;setBusy(false);}
  }}>
    <label htmlFor="tracking-reference">Order reference<input ref={reference} id="tracking-reference" name="reference" required maxLength={100} placeholder="AZ-…" autoCapitalize="none" autoComplete="off" spellCheck={false} enterKeyHint="next" disabled={busy} {...fieldProps('reference')}/>{message('reference')}</label><label htmlFor="tracking-phone">Mobile number<input id="tracking-phone" name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" enterKeyHint="go" placeholder="01XXXXXXXXX" disabled={busy} {...fieldProps('phone')}/><span className="field-hint" id="tracking-phone-hint">Local and +880 formats are accepted.</span>{message('phone')}</label><button className="primary" disabled={busy}>{busy?'Finding your order…':'Track order ↗'}</button>{error&&<p ref={feedback} tabIndex={-1} className="form-error form-feedback" role="alert">{error}</p>}
  </form>{order&&<section ref={result} tabIndex={-1} aria-label="Order tracking result" className="panel tracking-result" aria-live="polite"><div className="tracking-status"><div className="eyebrow">CURRENT STATUS</div><h2>{order.status}</h2></div><p className="order-reference">{order.id}</p><p>Placed {new Date(order.date).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</p><p>{order.status==='Cancelled'?'This order has been cancelled.':order.status==='Returned'?'This order has been returned.':order.status==='Delivered'?'Your order has been delivered.':'Your current order status is shown above. Delivery updates appear when available.'}</p><ul>{order.items.map((item,i)=><li key={i}>{item.name} × {item.qty} · {item.size}</li>)}</ul>{!!order.history?.length&&<><h3>Status updates</h3><ol>{order.history.map((event,i)=><li key={i}>{event.status} · {new Date(event.date).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</li>)}</ol></>}{order.courier&&order.trackingReference&&<p>Courier: {order.courier}<br/>Tracking reference: {order.trackingReference}</p>}</section>}</main>;
}
