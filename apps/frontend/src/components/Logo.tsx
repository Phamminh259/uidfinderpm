import Link from 'next/link';

export function Logo({ logoUrl, name = 'UIDFinder' }: { logoUrl?: string; name?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-slate-900" aria-label={`${name} - Trang chủ`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-8 w-auto" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white" aria-hidden="true">
          ID
        </span>
      )}
      <span className="text-lg">{name}</span>
    </Link>
  );
}
