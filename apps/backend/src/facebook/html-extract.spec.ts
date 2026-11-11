import { extractIdFromHtml, idFromUrl } from './html-extract';

describe('extractIdFromHtml', () => {
  it('đọc ID nhóm từ link chuẩn (canonical)', () => {
    const html = '<head><link rel="canonical" href="https://www.facebook.com/groups/123456789012345/" /></head>';
    expect(extractIdFromHtml(html, 'GROUP')).toEqual({ id: '123456789012345', pattern: 'canonical/og:url' });
  });

  it('đọc ID bài viết từ og:url, thứ tự thuộc tính đảo ngược', () => {
    const html = '<meta content="https://www.facebook.com/someone/posts/987654321098765" property="og:url">';
    expect(extractIdFromHtml(html, 'POST')?.id).toBe('987654321098765');
  });

  it('giải mã &amp; trong canonical', () => {
    const html = '<link rel="canonical" href="https://www.facebook.com/profile.php?id=100012345678901&amp;sk=photos">';
    expect(extractIdFromHtml(html, 'USERNAME')?.id).toBe('100012345678901');
  });

  it('bỏ qua canonical khác loại', () => {
    const html = '<link rel="canonical" href="https://www.facebook.com/profile.php?id=100012345678901">';
    expect(extractIdFromHtml(html, 'GROUP')).toBeNull();
  });

  it('đọc groupID từ JSON, cả dạng bị thoát dấu', () => {
    expect(extractIdFromHtml('{"groupID":"123456789012345"}', 'GROUP')?.id).toBe('123456789012345');
    expect(extractIdFromHtml('{\\"groupID\\":\\"123456789012345\\"}', 'GROUP')?.id).toBe('123456789012345');
  });

  it('nhóm có thể rơi về entity_id', () => {
    expect(extractIdFromHtml('{"entity_id":"123456789012345"}', 'GROUP')?.id).toBe('123456789012345');
  });

  it('nhóm KHÔNG nhận link thành viên (tránh trả nhầm ID thành viên)', () => {
    const html = '<a href="https://www.facebook.com/profile.php?id=100012345678901">Thành viên</a>{"userID":"100099999999999"}';
    expect(extractIdFromHtml(html, 'GROUP')).toBeNull();
  });

  it('bài viết ưu tiên top_level_post_id', () => {
    const html = '{"post_id":"111111111111111","top_level_post_id":"222222222222222"}';
    expect(extractIdFromHtml(html, 'POST')?.id).toBe('222222222222222');
  });

  it('bài viết KHÔNG rơi về entity_id (tránh trả nhầm ID chủ bài viết)', () => {
    expect(extractIdFromHtml('{"entity_id":"100064123456789"}', 'POST')).toBeNull();
  });

  it('reel/video đọc video_id', () => {
    expect(extractIdFromHtml('{"video_id":"1234567890123456"}', 'REEL')?.id).toBe('1234567890123456');
    expect(extractIdFromHtml('{"videoID":"1234567890123456"}', 'VIDEO')?.id).toBe('1234567890123456');
  });

  it('ảnh đọc fbid', () => {
    expect(extractIdFromHtml('{"fbid":"1234567890123"}', 'PHOTO')?.id).toBe('1234567890123');
  });

  it('trang cá nhân giữ thứ tự mẫu cũ (entity_id trước userID)', () => {
    const html = '{"userID":"999999999999999","entity_id":"100012345678901"}';
    expect(extractIdFromHtml(html, 'USERNAME')?.id).toBe('100012345678901');
  });

  it('bỏ qua userID bằng 0 và trang không có ID', () => {
    expect(extractIdFromHtml('{"userID":"0"}', 'USERNAME')).toBeNull();
    expect(extractIdFromHtml('<html>Đăng nhập Facebook</html>', 'USERNAME')).toBeNull();
  });

  it('không nhận post_id dạng ghép số_số', () => {
    expect(extractIdFromHtml('{"post_id":"12345_67890"}', 'POST')).toBeNull();
  });

  it('nhóm: đọc groupId (camelCase) và đối tượng __typename Group', () => {
    expect(extractIdFromHtml('{"groupId":"123456789012345"}', 'GROUP')?.id).toBe('123456789012345');
    expect(extractIdFromHtml('{"__typename":"Group","id":"123456789012345"}', 'GROUP')?.id).toBe('123456789012345');
    expect(extractIdFromHtml('{\\"id\\":\\"123456789012345\\",\\"__typename\\":\\"Group\\"}', 'GROUP')?.id).toBe('123456789012345');
  });

  it('idFromUrl: địa chỉ sau chuyển hướng', () => {
    expect(idFromUrl('https://m.facebook.com/groups/123456789012345/', 'GROUP')?.id).toBe('123456789012345');
    expect(idFromUrl('https://m.facebook.com/groups/mygroup', 'GROUP')).toBeNull();
    expect(idFromUrl('https://m.facebook.com/profile.php?id=100012345678901', 'GROUP')).toBeNull();
  });
});
