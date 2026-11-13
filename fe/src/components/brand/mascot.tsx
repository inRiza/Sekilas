import Image from 'next/image';

// size = lebar; rasio asli maskot 366x321
export function SekilasMascot({ size = 80, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/mascot.png"
      alt="Maskot Sekilas"
      width={size}
      height={Math.round((size * 321) / 366)}
      className={`select-none ${className}`}
    />
  );
}
