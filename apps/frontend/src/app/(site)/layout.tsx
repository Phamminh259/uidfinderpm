import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Tracker } from '@/components/Tracker';
import { getPublicSettings } from '@/lib/settings';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Bỏ qua điều hướng
      </a>
      <Header logoUrl={settings.logoUrl} name={settings.siteName} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <Tracker />
    </>
  );
}
