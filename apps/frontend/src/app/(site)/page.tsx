import Link from 'next/link';
import { FaqAccordion } from '@/components/FaqAccordion';
import { JsonLd } from '@/components/JsonLd';
import { UidForm } from '@/components/UidForm';
import { buildMetadata } from '@/lib/seo';
import { FAQ, FEATURES, SITE_ALT_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, STEPS } from '@/lib/site';
import { getPublicSettings } from '@/lib/settings';

export const metadata = buildMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: '/',
});

export default async function HomePage() {
  const settings = await getPublicSettings();
  const sameAs = [
    settings.socialFacebook,
    settings.socialTiktok,
    settings.socialYoutube,
    settings.socialZalo,
    settings.socialTelegram,
  ].filter(Boolean);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#website`,
              url: SITE_URL,
              name: SITE_NAME,
              alternateName: SITE_ALT_NAME,
              inLanguage: 'vi-VN',
              ...(sameAs.length ? { sameAs } : {}),
            },
            {
              '@type': 'WebApplication',
              '@id': `${SITE_URL}/#app`,
              name: SITE_NAME,
              url: SITE_URL,
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any',
              description: 'Công cụ lấy Facebook UID từ đường dẫn Facebook công khai.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
            },
          ],
        }}
      />

      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="container-page py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Tìm Facebook UID nhanh từ đường dẫn.
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Dán đường dẫn trang cá nhân, Page, nhóm hoặc bài viết Facebook để lấy UID. Miễn phí và không cần đăng nhập.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-3xl">
            <UidForm />
          </div>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Cách lấy UID trong 3 bước
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-slate-600">
          Cần thêm chi tiết? Xem <Link href="/huong-dan" className="text-brand-600 underline">hướng dẫn sử dụng</Link>.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white" aria-labelledby="features">
        <div className="container-page py-14">
          <h2 id="features" className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Tính năng nổi bật
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-600">
            Xem đầy đủ tại trang <Link href="/tinh-nang" className="text-brand-600 underline">tính năng</Link>.
          </p>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Câu hỏi thường gặp
        </h2>
        <div className="mt-8">
          <FaqAccordion items={FAQ.slice(0, 4)} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/faq" className="text-brand-600 underline">Xem tất cả câu hỏi</Link>
        </p>
      </section>
    </>
  );
}
