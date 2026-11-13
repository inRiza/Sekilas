import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

// size = tinggi; rasio asli logo 497x762
export function SekilasLogoIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/sekilas-logo.png"
      alt="Logo Sekilas"
      width={Math.round((size * 497) / 762)}
      height={size}
      className={className}
    />
  );
}

export function SekilasLogo({
  size = 26,
  showText = true,
  className = '',
  textClassName = 'text-[17px] font-semibold tracking-[-0.02em] text-ink',
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <SekilasLogoIcon size={size} />
      {showText && <span className={textClassName}>Sekilas</span>}
    </div>
  );
}
