import './tailwind.css';
import './globals.css';
import './launch.css';
import './motion.css';
import './brand-intro.css';
import './commerce.css';
import './presentation.css';
import './premium.css';
import './admin.css';
import type {Viewport} from 'next';
import localFont from 'next/font/local';
import BrandIntro from './components/brand-intro';
import { StoreProvider } from './providers';
import { catalog } from '@/server/backend';
// Self-hosted brand fonts, loaded once for the whole site and exposed as CSS variables.
const headingFont = localFont({
    src: [
        { path: '../public/fonts/cormorant-garamond-latin-500.woff2', weight: '500', style: 'normal' },
        { path: '../public/fonts/cormorant-garamond-latin-500-italic.woff2', weight: '500', style: 'italic' },
    ],
    variable: '--font-cormorant', display: 'swap', fallback: ['Georgia', 'serif'],
});
const bodyFont = localFont({
    src: [{ path: '../public/fonts/dm-sans-latin-variable.woff2', weight: '400 600', style: 'normal' }],
    variable: '--font-dm-sans', display: 'swap', fallback: ['Arial', 'sans-serif'],
});
export const dynamic = 'force-dynamic';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};
export const metadata = { title: 'AURZÉN | A little elegance. A little unexpected.', description: 'Discover thoughtfully selected fashion, accessories and Mystery Style Boxes from AURZÉN. Premium style for everyday moments.', robots: { index: process.env.CHECKOUT_ENABLED === 'true', follow: true } };
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}><body suppressHydrationWarning><noscript><style>{'[data-fade],[data-fade-media]{opacity:1!important;transform:none!important;clip-path:none!important}'}</style></noscript><StoreProvider initialCatalog={await catalog()}><BrandIntro>{children}</BrandIntro></StoreProvider></body></html>; }
