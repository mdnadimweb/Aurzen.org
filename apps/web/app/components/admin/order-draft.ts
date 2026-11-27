// Unsaved New order / Edit order forms are kept in this browser, so closing the form by accident
// (a click outside it, Esc, the close button) loses nothing. Saving the order clears its draft.
// Drafts older than 3 days are ignored. Storage can be unavailable (private mode): then there is simply no draft.
const PREFIX='aurzen-order-draft:',MAX_AGE=3*24*60*60*1000;

export function readDraft<T>(key:string):T|null{
  try{
    const raw=localStorage.getItem(PREFIX+key);if(!raw)return null;
    const {at,value}=JSON.parse(raw) as {at:number;value:T};
    if(!at||Date.now()-at>MAX_AGE){localStorage.removeItem(PREFIX+key);return null;}
    return value;
  }catch{return null;}
}
export function saveDraft<T>(key:string,value:T){try{localStorage.setItem(PREFIX+key,JSON.stringify({at:Date.now(),value}));}catch{}}
export function clearDraft(key:string){try{localStorage.removeItem(PREFIX+key);}catch{}}
