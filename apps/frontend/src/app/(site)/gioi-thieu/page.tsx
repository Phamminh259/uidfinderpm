import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Giới thiệu',
  description: 'UIDFinder là công cụ tra cứu Facebook UID từ đường dẫn công khai, xây dựng theo nguyên tắc nhanh, an toàn và tôn trọng quyền riêng tư.',
  path: '/gioi-thieu',
});

export default function AboutPage() {
  return (
    <PageShell
      title="Giới thiệu UIDFinder"
      path="/gioi-thieu"
      intro="UIDFinder giúp bạn tìm Facebook UID từ đường dẫn mà không cần đăng nhập."
    >
      <h2>Chúng tôi làm gì</h2>
      <p>
        UID là dãy số định danh cố định của tài khoản, Page hoặc nhóm trên Facebook. Nhiều công việc như quản trị nhóm, chạy quảng cáo hay báo cáo vi phạm cần đến UID. UIDFinder rút gọn việc này thành một ô nhập và một nút bấm.
      </p>

      <h2>Nguyên tắc hoạt động</h2>
      <ul>
        <li>Chỉ sử dụng dữ liệu công khai và phương thức hợp pháp.</li>
        <li>Không yêu cầu mật khẩu, cookie hay token Facebook.</li>
        <li>Không vượt qua cơ chế bảo mật của Facebook.</li>
        <li>Hạn chế dữ liệu thu thập và băm địa chỉ IP trước khi lưu.</li>
      </ul>

      <p>
        Xem thêm <Link href="/chinh-sach-bao-mat">chính sách bảo mật</Link> và <Link href="/mien-tru-trach-nhiem">miễn trừ trách nhiệm</Link>.
      </p>
    </PageShell>
  );
}
