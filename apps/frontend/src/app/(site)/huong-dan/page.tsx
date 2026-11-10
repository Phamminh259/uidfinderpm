import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';
import { STEPS } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Hướng dẫn sử dụng',
  description: 'Hướng dẫn lấy Facebook UID từ đường dẫn bằng UIDFinder trên máy tính và điện thoại, kèm cách xử lý lỗi thường gặp.',
  path: '/huong-dan',
});

export default function GuidePage() {
  return (
    <PageShell
      title="Hướng dẫn sử dụng"
      path="/huong-dan"
      intro="Chỉ cần 3 bước để lấy UID từ một đường dẫn Facebook."
    >
      <h2>Các bước thực hiện</h2>
      <ol>
        {STEPS.map((s) => (
          <li key={s.title}>
            <strong>{s.title}.</strong> {s.text}
          </li>
        ))}
      </ol>

      <h2>Cách lấy đường dẫn trên điện thoại</h2>
      <p>
        Trong ứng dụng Facebook, mở trang cần tra cứu, chọn nút ba chấm hoặc Chia sẻ, rồi chọn Sao chép liên kết. Sau đó mở UIDFinder và dán vào ô nhập.
      </p>

      <h2>Xử lý lỗi thường gặp</h2>
      <ul>
        <li><strong>Đường dẫn không hợp lệ.</strong> Hãy kiểm tra đường dẫn thuộc facebook.com và không bị cắt thiếu.</li>
        <li><strong>Không tìm thấy UID.</strong> Đối tượng có thể riêng tư hoặc đã bị xóa.</li>
        <li><strong>Facebook giới hạn truy cập.</strong> Hãy thử lại sau vài phút.</li>
        <li><strong>Thao tác quá nhanh.</strong> Hệ thống giới hạn số lượt tra cứu mỗi phút, hãy chờ rồi thử lại.</li>
      </ul>

      <p>
        Chưa giải đáp được thắc mắc? Xem <Link href="/faq">câu hỏi thường gặp</Link> hoặc <Link href="/lien-he">liên hệ</Link> với chúng tôi.
      </p>
    </PageShell>
  );
}
