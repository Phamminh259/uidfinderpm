import { FaqAccordion } from '@/components/FaqAccordion';
import { JsonLd } from '@/components/JsonLd';
import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';
import { FAQ } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Câu hỏi thường gặp (FAQ)',
  description: 'Giải đáp thắc mắc về Facebook UID, cách dùng UIDFinder, giới hạn truy cập và quyền riêng tư dữ liệu.',
  path: '/faq',
});

export default function FaqPage() {
  return (
    <PageShell title="Câu hỏi thường gặp" path="/faq" intro="Những thắc mắc phổ biến khi sử dụng UIDFinder.">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <div className="not-prose mt-2">
        <FaqAccordion items={FAQ} />
      </div>
    </PageShell>
  );
}
