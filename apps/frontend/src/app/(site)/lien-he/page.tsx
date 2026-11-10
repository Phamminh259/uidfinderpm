import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';
import { SOCIAL_LABELS } from '@/lib/site';
import { getPublicSettings } from '@/lib/settings';

export const metadata = buildMetadata({
  title: 'Liên hệ',
  description: 'Thông tin liên hệ UIDFinder: email, số điện thoại và các kênh mạng xã hội để được hỗ trợ.',
  path: '/lien-he',
});

export default async function ContactPage() {
  const s = await getPublicSettings();
  const socials = Object.keys(SOCIAL_LABELS)
    .map((k) => ({ label: SOCIAL_LABELS[k], url: s[k as keyof typeof s] }))
    .filter((x) => x.url);
  const hasAny = s.contactEmail || s.contactPhone || s.contactAddress || socials.length > 0;

  return (
    <PageShell title="Liên hệ" path="/lien-he" intro="Chúng tôi luôn sẵn sàng lắng nghe góp ý và hỗ trợ bạn.">
      {hasAny ? (
        <ul>
          {s.contactEmail && (
            <li>
              Email: <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
            </li>
          )}
          {s.contactPhone && <li>Điện thoại: {s.contactPhone}</li>}
          {s.contactAddress && <li>Địa chỉ: {s.contactAddress}</li>}
          {socials.map((x) => (
            <li key={x.label}>
              {x.label}:{' '}
              <a href={x.url} target="_blank" rel="noopener noreferrer nofollow">
                {x.url}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Thông tin liên hệ đang được cập nhật.</p>
      )}
    </PageShell>
  );
}
