import {redirect} from 'next/navigation';
import {isAdmin} from '@/server/backend';
import Store from '../store';
export const metadata={title:'Studio | AURZÉN',robots:{index:false,follow:false}};
export default async function Page(){if(!await isAdmin())redirect('/admin/login');return <Store initial="admin"/>;}
