import Link from 'next/link';

/** The AURZÉN logo.
 *  - default: slightly deeper gold for the light storefront (footer).
 *  - header: the same deeper gold without the small "Fashion • Beauty • Lifestyle" line,
 *    which is too small to read at header size.
 *  - light: the original bright gold for dark backgrounds (admin sidebar, sign-in). */
export default function BrandLogo({variant}:{variant?:'header'|'light'}){
  return <Link href="/" className="logo brand-logo" aria-label="AURZÉN home">
    {variant==='header'
      ?<img src="/brand/aurzen-logo-header.png?v=2" width={176} height={92} alt="AURZÉN"/>
      :variant==='light'
      ?<img src="/brand/aurzen-logo-gold.png?v=1" width={157} height={96} alt="AURZÉN"/>
      :<img src="/brand/aurzen-logo.png?v=3" width={157} height={96} alt="AURZÉN"/>}
  </Link>;
}
