import type {CSSProperties} from 'react';

type SaleBadgeProps={
  percentage:number;
  label?:string;
  className?:string;
  style?:CSSProperties;
  colors?:{ribbon?:string;fold?:string;strip?:string;text?:string;stripText?:string};
};

export default function SaleBadge({percentage,label='HOT DEAL',className='',style,colors={}}:SaleBadgeProps){
  // Match the existing offer rules; this component only draws the badge.
  if(!Number.isInteger(percentage)||percentage<1||percentage>99)return null;
  const value=String(percentage);
  const palette={
    ribbon:colors.ribbon??'var(--sale-ribbon, var(--plum))',
    fold:colors.fold??'var(--sale-fold, var(--ink))',
    strip:colors.strip??'var(--sale-strip, var(--rose))',
    text:colors.text??'var(--sale-text, var(--ivory))',
    stripText:colors.stripText??'var(--sale-strip-text, var(--plum))',
  };
  return <span className={'sale-badge '+className} style={style}>
    <svg viewBox="0 0 300 275" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${value}% off`} focusable="false">
      <ellipse cx="165" cy="253" rx="64" ry="7" fill="#000" opacity="0.05"/>
      <ellipse cx="165" cy="253" rx="47" ry="4" fill="#000" opacity="0.07"/>
      <path d="M 20 205 L 104 176 L 181 247 Z" fill={palette.ribbon}/>
      <path d="M 20 205 L 104 176 L 133 204 Z" fill={palette.fold}/>
      <path className="sale-badge-face" d="M 20 65 L 253 21 L 286 88 L 252 174 L 20 216 Z" fill={palette.ribbon}/>
      <g transform="translate(38 87) rotate(-10)" fill={palette.text} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900">
        <text x={value.length===1?61:0} y="96" fontSize="94" letterSpacing="-5" textLength={value.length===1?96:157} lengthAdjust="spacingAndGlyphs">{value}</text>
        <text x="167" y="60" fontSize="57">%</text>
        <text x="168" y="94" fontSize="24" letterSpacing="0.5">OFF</text>
      </g>
      <g transform="translate(45 43) rotate(-10)">
        <path d="M 0 0 H 180 V 35 H 0 Z" fill={palette.strip}/>
        <text x="90" y="23" textAnchor="middle" fill={palette.stripText} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="18" letterSpacing="0.8">{label}</text>
      </g>
    </svg>
  </span>;
}
