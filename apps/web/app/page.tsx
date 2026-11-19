import Store from './store';
import {content} from '@/server/backend';
export default async function Page(){return <Store reviews={(await content()).reviews}/>}
