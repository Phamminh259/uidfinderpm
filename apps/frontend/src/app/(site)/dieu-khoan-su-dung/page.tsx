import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng dịch vụ UIDFinder: phạm vi sử dụng, hành vi bị cấm và giới hạn trách nhiệm.',
  path: '/dieu-khoan-su-dung',
});

export default function TermsPage() {
  return (
    <PageShell title="Điều khoản sử dụng" path="/dieu-khoan-su-dung" intro="Cập nhật lần cuối: 10/11/2026.">
      <h2>1. Chấp nhận điều khoản</h2>
      <p>Khi sử dụng UIDFinder, bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.</p>

      <h2>2. Phạm vi dịch vụ</h2>
      <p>UIDFinder cung cấp công cụ tra cứu UID từ đường dẫn Facebook công khai, miễn phí và không có cam kết về độ sẵn sàng hay độ chính xác tuyệt đối.</p>

      <h2>3. Hành vi bị cấm</h2>
      <ul>
        <li>Dùng dịch vụ để quấy rối, theo dõi trái phép hoặc xâm phạm quyền riêng tư người khác.</li>
        <li>Gửi lượng yêu cầu tự động lớn nhằm làm quá tải hệ thống hoặc né giới hạn tốc độ.</li>
        <li>Tìm cách khai thác lỗ hổng, truy cập trái phép hoặc vượt qua cơ chế bảo mật.</li>
        <li>Sử dụng kết quả vào mục đích vi phạm pháp luật.</li>
      </ul>

      <h2>4. Giới hạn truy cập</h2>
      <p>Chúng tôi có quyền giới hạn hoặc chặn truy cập khi phát hiện lạm dụng, không cần báo trước.</p>

      <h2>5. Sở hữu trí tuệ</h2>
      <p>Giao diện và mã nguồn của UIDFinder thuộc về chủ sở hữu dịch vụ. Facebook là thương hiệu của Meta Platforms, Inc.</p>

      <h2>6. Thay đổi điều khoản</h2>
      <p>Điều khoản có thể được cập nhật. Việc tiếp tục sử dụng đồng nghĩa với việc chấp nhận bản mới.</p>
    </PageShell>
  );
}
