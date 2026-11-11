import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo';
import { FEATURES } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Tính năng',
  description: 'Các tính năng của UIDFinder: hỗ trợ nhiều loại đường dẫn Facebook, không cần đăng nhập, kết quả nhanh và thông báo lỗi rõ ràng.',
  path: '/tinh-nang',
});

const SUPPORTED = [
  ['Trang cá nhân', 'Dạng facebook.com/profile.php?id=… hoặc facebook.com/username'],
  ['Page', 'Trang công khai có username hoặc dạng /pages/tên/ID'],
  ['Nhóm', 'Dạng facebook.com/groups/ID. Bài viết trong nhóm trả ID bài viết kèm ID nhóm. Nhóm dùng tên rút gọn cần đọc từ trang công khai'],
  ['Bài viết', 'Dạng /username/posts/ID hoặc permalink.php?story_fbid=…'],
  ['Reel, ảnh, video', 'Dạng /reel/ID, /watch/?v=ID, photo.php?fbid=ID, /username/photos/…/ID, /username/videos/ID'],
  ['Liên kết chia sẻ', 'Dạng facebook.com/share/… và fb.watch, được xử lý qua chuyển hướng hợp lệ'],
];

export default function FeaturesPage() {
  return (
    <PageShell
      title="Tính năng"
      path="/tinh-nang"
      intro="UIDFinder tập trung vào một việc: lấy UID Facebook từ đường dẫn công khai, nhanh và an toàn."
    >
      <h2>Điểm nổi bật</h2>
      <ul>
        {FEATURES.map((f) => (
          <li key={f.title}>
            <strong>{f.title}.</strong> {f.text}
          </li>
        ))}
      </ul>

      <h2>Loại đường dẫn được hỗ trợ</h2>
      <ul>
        {SUPPORTED.map(([name, desc]) => (
          <li key={name}>
            <strong>{name}.</strong> {desc}
          </li>
        ))}
      </ul>

      <h2>Giới hạn cần biết</h2>
      <p>
        UIDFinder chỉ đọc dữ liệu công khai. Với đối tượng riêng tư, đã bị xóa hoặc khi Facebook giới hạn truy cập, hệ thống sẽ báo lỗi thay vì đoán kết quả.
      </p>
    </PageShell>
  );
}
