import Link from 'next/link';
import {site} from '@/server/backend';
export default async function NotFound(){const a=(await site()).appearance;return <main className="section empty"><div className="eyebrow">A LITTLE DETOUR</div><h1>{a.notFoundTitle}</h1>{a.notFoundText&&<p>{a.notFoundText}</p>}<Link className="primary" href="/shop">Explore the collection ↗</Link></main>;}
