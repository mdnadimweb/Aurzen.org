import Link from 'next/link';

export default function BrandLogo(){
  return <Link href="/" className="logo brand-logo" aria-label="AURZÉN home">
    <img src="/brand/aurzen-logo.png" width={176} height={96} alt="AURZÉN — Elegance, Beyond Ordinary."/>
  </Link>;
}
