import './globals.css';
import './launch.css';
import './motion.css';
import './brand-intro.css';
import './commerce.css';
import './presentation.css';
import type {Viewport} from 'next';
import BrandIntro from './components/brand-intro';
import { StoreProvider } from './providers';
import { catalog } from '@/server/backend';
export const dynamic = 'force-dynamic';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};
export const metadata = { title: 'AURZÉN | A little elegance. A little unexpected.', description: 'Discover thoughtfully selected fashion, accessories and Mystery Style Boxes from AURZÉN. Premium style for everyday moments.', robots: { index: process.env.CHECKOUT_ENABLED === 'true', follow: true } };
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body suppressHydrationWarning><StoreProvider initialCatalog={await catalog()}><BrandIntro>{children}</BrandIntro></StoreProvider></body></html>; }
