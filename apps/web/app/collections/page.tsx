import Store from '../store';
import {pageMetadata} from '@/server/seo';
export const dynamic='force-dynamic';
export const generateMetadata=()=>pageMetadata({title:'All categories | AURZÉN',description:'Browse every AURZÉN collection and its categories.'});
export default function Page(){return <Store initial="collections"/>;}
