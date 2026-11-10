import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';
import './globals.css';

// Favicon và ảnh chia sẻ được Next.js tự gắn từ các file trong thư mục app/:
//   favicon.ico, icon.svg, icon.png, apple-icon.png, opengraph-image.png, twitter-image.png
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
