import {statusKey} from './metrics';

export default function StatusPill({status}:{status:string}){
  return <span className="a-pill" data-status={statusKey(status)}><span className="a-pill__dot" aria-hidden="true"/>{status}</span>;
}
