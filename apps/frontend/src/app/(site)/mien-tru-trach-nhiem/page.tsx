import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Miễn trừ trách nhiệm',
  description: 'Tuyên bố miễn trừ trách nhiệm của UIDFinder: không liên kết với Meta, độ chính xác của kết quả và trách nhiệm của người dùng.',
  path: '/mien-tru-trach-nhiem',
});

export default function DisclaimerPage() {
  return (
    <PageShell title="Miễn trừ trách nhiệm" path="/mien-tru-trach-nhiem" intro="Cập nhật lần cuối: 10/11/2026.">
      <h2>Không liên kết với Facebook</h2>
      <p>UIDFinder là dịch vụ độc lập, không được tài trợ, chứng thực hay liên kết với Meta Platforms, Inc. hoặc Facebook.</p>

      <h2>Độ chính xác của kết quả</h2>
      <p>Kết quả dựa trên dữ liệu công khai tại thời điểm tra cứu. Facebook có thể thay đổi cấu trúc trang hoặc giới hạn truy cập nên chúng tôi không đảm bảo luôn lấy được UID.</p>

      <h2>Trách nhiệm của người dùng</h2>
      <p>Bạn tự chịu trách nhiệm về mục đích sử dụng kết quả và phải tuân thủ pháp luật cũng như điều khoản của Facebook. Chúng tôi không chịu trách nhiệm về thiệt hại phát sinh từ việc sử dụng sai mục đích.</p>

      <h2>Liên kết bên ngoài</h2>
      <p>Trang web có thể dẫn tới nội dung của bên thứ ba. Chúng tôi không kiểm soát và không chịu trách nhiệm về nội dung đó.</p>
    </PageShell>
  );
}
