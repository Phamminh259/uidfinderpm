// ===== Cấu hình hiển thị trên Google (xem docs/15-seo-va-favicon.md) =====
// SITE_URL lấy từ biến môi trường NEXT_PUBLIC_SITE_URL (được nhúng lúc BUILD).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const SITE_NAME = 'UIDFinder'; // Tên site Google hiển thị (cũng dùng trong schema WebSite)
export const SITE_ALT_NAME = 'UID Finder'; // Tên thay thế cho schema WebSite
export const SITE_TITLE = 'UIDFinder - Tìm Facebook UID nhanh từ link Facebook'; // Title trang chủ (≈50 ký tự)
export const SITE_DESCRIPTION =
  'Công cụ lấy Facebook UID miễn phí từ link trang cá nhân, Page, nhóm hoặc bài viết. Không cần đăng nhập, có kết quả trong vài giây.'; // Meta description trang chủ (≈130 ký tự)
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const NAV = [
  { href: '/', label: 'Trang chủ' },
  { href: '/tinh-nang', label: 'Tính năng' },
  { href: '/huong-dan', label: 'Hướng dẫn' },
  { href: '/faq', label: 'FAQ' },
  { href: '/gioi-thieu', label: 'Giới thiệu' },
  { href: '/lien-he', label: 'Liên hệ' },
] as const;

export const LEGAL = [
  { href: '/chinh-sach-bao-mat', label: 'Chính sách bảo mật' },
  { href: '/dieu-khoan-su-dung', label: 'Điều khoản sử dụng' },
  { href: '/mien-tru-trach-nhiem', label: 'Miễn trừ trách nhiệm' },
] as const;

export const STEPS = [
  {
    title: 'Sao chép đường dẫn',
    text: 'Mở Facebook, vào trang cá nhân, Page, nhóm hoặc bài viết cần tra cứu rồi sao chép đường dẫn trên thanh địa chỉ.',
  },
  {
    title: 'Dán vào ô nhập',
    text: 'Dán đường dẫn vào ô nhập của UIDFinder. Bạn có thể dùng nút Dán để điền nhanh từ bộ nhớ tạm.',
  },
  {
    title: 'Nhấn Lấy UID',
    text: 'Nhấn nút Lấy UID, hệ thống trả về dãy số UID cùng loại đối tượng. Dùng nút Sao chép để lưu lại.',
  },
] as const;

export const FEATURES = [
  {
    title: 'Hỗ trợ nhiều loại đường dẫn',
    text: 'Trang cá nhân, username, Page, nhóm, bài viết và liên kết chia sẻ của Facebook.',
  },
  {
    title: 'Không cần đăng nhập',
    text: 'UIDFinder không yêu cầu tài khoản, mật khẩu, cookie hay token Facebook. Chỉ đọc dữ liệu công khai.',
  },
  {
    title: 'Kết quả nhanh',
    text: 'Kết quả được lưu đệm nên các lần tra cứu lặp lại gần như tức thì.',
  },
  {
    title: 'Thông báo lỗi rõ ràng',
    text: 'Khi Facebook giới hạn truy cập hoặc đối tượng không công khai, hệ thống cho biết lý do cụ thể.',
  },
  {
    title: 'Sao chép một chạm',
    text: 'Sao chép UID hoặc mở thẳng đối tượng trên Facebook chỉ bằng một nút.',
  },
  {
    title: 'Tôn trọng quyền riêng tư',
    text: 'Địa chỉ IP được băm trước khi lưu và không dùng để định danh cá nhân.',
  },
] as const;

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Facebook UID là gì?',
    a: 'UID (User ID) là dãy số định danh duy nhất mà Facebook gán cho mỗi tài khoản, Page hoặc nhóm. UID không đổi kể cả khi bạn đổi tên hay đổi username.',
  },
  {
    q: 'UIDFinder có miễn phí không?',
    a: 'Có. Bạn có thể tra cứu mà không cần đăng ký tài khoản. Hệ thống giới hạn số lượt tra cứu mỗi phút để chống lạm dụng.',
  },
  {
    q: 'Tôi có cần đăng nhập Facebook không?',
    a: 'Không. UIDFinder không bao giờ yêu cầu mật khẩu, cookie hay token Facebook của bạn.',
  },
  {
    q: 'Vì sao có đường dẫn không lấy được UID?',
    a: 'Đối tượng có thể để chế độ riêng tư, đã bị xóa, hoặc Facebook đang giới hạn truy cập từ máy chủ. UIDFinder chỉ dùng dữ liệu công khai và không vượt qua cơ chế bảo mật của Facebook.',
  },
  {
    q: 'Có tra cứu được UID của nhóm và bài viết không?',
    a: 'Có thể, nếu ID xuất hiện trong đường dẫn hoặc có thể xác định từ trang công khai. Các bài viết dạng pfbid thường cần Facebook cho phép truy cập.',
  },
  {
    q: 'Dữ liệu tra cứu có được lưu không?',
    a: 'Hệ thống lưu đường dẫn đã nhập, kết quả và thời gian để thống kê và chống lạm dụng. Địa chỉ IP chỉ lưu dưới dạng mã băm một chiều.',
  },
];

export const SOCIAL_LABELS: Record<string, string> = {
  socialFacebook: 'Facebook',
  socialTiktok: 'TikTok',
  socialYoutube: 'YouTube',
  socialZalo: 'Zalo',
  socialTelegram: 'Telegram',
};
