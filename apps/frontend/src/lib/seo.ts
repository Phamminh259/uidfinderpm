import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './site';

export function buildMetadata(args: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${args.path === '/' ? '' : args.path}`;
  const fullTitle = args.path === '/' ? args.title : `${args.title} | ${SITE_NAME}`;
  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: url },
    robots: args.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description: args.description,
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description: args.description,
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path === '/' ? '' : it.path}`,
    })),
  };
}
