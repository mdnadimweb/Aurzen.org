import './tailwind.css';
import './globals.css';
import './launch.css';
import './motion.css';
import './brand-intro.css';
import './commerce.css';
import './presentation.css';
import './premium.css';
import './collections.css';
import './polish.css';
import './site.css';
import type {Viewport} from 'next';
import localFont from 'next/font/local';
import BrandIntro from './components/brand-intro';
import { StoreProvider } from './providers';
import { catalog, site } from '@/server/backend';
import type { Metadata } from 'next';
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
// Title, description, social image, favicon and search verification come from Studio → Settings.
export async function generateMetadata(): Promise<Metadata> {
    const s = await site();
    return { title: s.seo.title, description: s.seo.description, robots: { index: process.env.CHECKOUT_ENABLED === 'true' && s.seo.indexing, follow: true }, ...(s.general.favicon ? { icons: { icon: s.general.favicon } } : {}), ...(s.seo.ogImage ? { openGraph: { images: [s.seo.ogImage] }, twitter: { card: 'summary_large_image', images: [s.seo.ogImage] } } : {}), ...(s.integrations.searchConsole ? { verification: { google: s.integrations.searchConsole } } : {}) };
}
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}><body suppressHydrationWarning><noscript><style>{'[data-fade],[data-fade-media]{opacity:1!important;transform:none!important;clip-path:none!important}'}</style></noscript><StoreProvider initialCatalog={await catalog()}><BrandIntro>{children}</BrandIntro></StoreProvider></body></html>; }
