import Link from 'next/link';

/** The AURZÉN logo. The storefront header uses a version without the small
 *  "Fashion • Beauty • Lifestyle" line, which is too small to read at header size. */
export default function BrandLogo({variant}:{variant?:'header'}){
  return <Link href="/" className="logo brand-logo" aria-label="AURZÉN home">
    {variant==='header'
      ?<img src="/brand/aurzen-logo-header.png?v=1" width={176} height={92} alt="AURZÉN"/>
      :<img src="/brand/aurzen-logo.png?v=2" width={157} height={96} alt="AURZÉN"/>}
  </Link>;
}
