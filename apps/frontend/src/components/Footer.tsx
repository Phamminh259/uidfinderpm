import Link from 'next/link';
import { LEGAL, NAV, SOCIAL_LABELS } from '@/lib/site';
import type { PublicSettings } from '@/lib/settings';
import { Logo } from './Logo';

export function Footer({ settings }: { settings: PublicSettings }) {
  const socials = Object.keys(SOCIAL_LABELS)
    .map((key) => ({ key, label: SOCIAL_LABELS[key], url: settings[key as keyof PublicSettings] }))
    .filter((s) => s.url);

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo logoUrl={settings.logoUrl} name={settings.siteName} />
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {settings.siteTagline ?? 'Công cụ tra cứu Facebook UID từ đường dẫn, nhanh và không cần đăng nhập.'}
          </p>
        </div>

        <nav aria-label="Liên kết nhanh">
          <h2 className="text-sm font-semibold text-slate-900">Khám phá</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-slate-600 hover:text-brand-600">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Pháp lý">
          <h2 className="text-sm font-semibold text-slate-900">Pháp lý</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LEGAL.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-slate-600 hover:text-brand-600">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Liên hệ</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-brand-600">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.contactPhone && <li>{settings.contactPhone}</li>}
            {settings.contactAddress && <li>{settings.contactAddress}</li>}
          </ul>
          {socials.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-slate-900">Theo dõi chúng tôi</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.key}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {settings.siteName ?? 'UIDFinder'}. UIDFinder không liên kết với Meta hay Facebook.
      </div>
    </footer>
  );
}
