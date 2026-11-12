import {createHash} from 'node:crypto';
import {rateLimit} from '../../../lib/auth';
import {body,failure,json,sameOrigin} from '../../../lib/http';
import {trackOrder} from '../../../lib/tracking';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    sameOrigin(request);
    // Do not trust client-controlled forwarding headers. The per-reference limit
    // below is durable; also configure per-client limits at the Coolify ingress.
    await rateLimit('tracking-global',2000,15*60*1000);
    const data=await body(request);
    if(typeof data.reference==='string')await rateLimit('tracking-ref:'+createHash('sha256').update(data.reference.trim()).digest('hex'),30,15*60*1000);
    return json(await trackOrder(data.reference,data.phone));
  }catch(error){return failure(error);}
}
