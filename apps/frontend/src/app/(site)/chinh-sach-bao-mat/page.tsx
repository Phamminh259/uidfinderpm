import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật của UIDFinder: dữ liệu được thu thập, mục đích sử dụng, thời gian lưu trữ và quyền của người dùng.',
  path: '/chinh-sach-bao-mat',
});

export default function PrivacyPage() {
  return (
    <PageShell title="Chính sách bảo mật" path="/chinh-sach-bao-mat" intro="Cập nhật lần cuối: 10/11/2026.">
      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>Đường dẫn Facebook bạn nhập và kết quả tra cứu, kèm thời gian và trạng thái.</li>
        <li>Địa chỉ IP dưới dạng mã băm một chiều có muối, không lưu IP gốc.</li>
        <li>Thông tin truy cập cơ bản: trang đã xem, nguồn truy cập, loại thiết bị.</li>
      </ul>
      <p>Chúng tôi không thu thập mật khẩu, cookie hay token Facebook và không yêu cầu bạn đăng nhập Facebook.</p>

      <h2>2. Mục đích sử dụng</h2>
      <p>Dữ liệu dùng để vận hành dịch vụ, chống lạm dụng, thống kê lưu lượng và cải thiện chất lượng. Chúng tôi không bán dữ liệu cho bên thứ ba.</p>

      <h2>3. Lưu trữ và bảo vệ</h2>
      <p>Dữ liệu được lưu trên máy chủ do chúng tôi quản lý, truyền qua HTTPS. Kết quả tra cứu có thể được lưu đệm tạm thời để tăng tốc.</p>

      <h2>4. Cookie</h2>
      <p>Trang công khai không dùng cookie theo dõi quảng cáo. Khu vực quản trị dùng cookie phiên cần thiết để đăng nhập.</p>

      <h2>5. Quyền của bạn</h2>
      <p>Bạn có thể liên hệ để yêu cầu xem hoặc xóa dữ liệu liên quan đến mình trong phạm vi chúng tôi xác định được.</p>

      <h2>6. Thay đổi chính sách</h2>
      <p>Chúng tôi có thể cập nhật chính sách này và sẽ ghi rõ ngày cập nhật ở đầu trang.</p>
    </PageShell>
  );
}
