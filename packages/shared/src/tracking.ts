import type {Order} from './catalog';
export type PublicOrder = Pick<Order,'id'|'date'|'status'|'history'|'courier'|'trackingReference'> & {
  items: {name:string;qty:number;size:string}[];
};
