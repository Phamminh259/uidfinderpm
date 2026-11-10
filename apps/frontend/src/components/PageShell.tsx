import type { ReactNode } from 'react';
import { breadcrumbSchema } from '@/lib/seo';
import { Breadcrumbs } from './Breadcrumbs';
import { JsonLd } from './JsonLd';

/** Khung chung cho các trang nội dung: breadcrumb + H1 + schema BreadcrumbList. */
export function PageShell({
  title,
  intro,
  path,
  children,
}: {
  title: string;
  intro?: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page py-10">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Trang chủ', path: '/' },
          { name: title, path },
        ])}
      />
      <Breadcrumbs items={[{ name: 'Trang chủ', href: '/' }, { name: title }]} />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">{intro}</p>}
      <div className="prose-page mt-6">{children}</div>
    </div>
  );
}
