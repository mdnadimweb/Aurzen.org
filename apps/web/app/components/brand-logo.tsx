import Link from 'next/link';

export default function BrandLogo(){
  return <Link href="/" className="logo brand-logo" aria-label="AURZÉN home">
    <img src="/brand/aurzen-logo.png?v=2" width={157} height={96} alt="AURZÉN"/>
  </Link>;
}
