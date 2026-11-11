import { InvalidFacebookUrlError, parseFacebookUrl } from './url-parser';

const p = parseFacebookUrl;

describe('parseFacebookUrl: trang cá nhân, username, page', () => {
  it('đọc UID từ profile.php?id=', () => {
    const r = p('https://www.facebook.com/profile.php?id=100012345678901');
    expect(r.uid).toBe('100012345678901');
    expect(r.type).toBe('PROFILE');
  });

  it('nhận diện username và cần tra cứu', () => {
    const r = p('facebook.com/zuck');
    expect(r.uid).toBeNull();
    expect(r.username).toBe('zuck');
    expect(r.type).toBe('USERNAME');
  });

  it('đọc ID Page dạng /p/Ten-Trang-<id>', () => {
    const r = p('https://www.facebook.com/p/Ten-Trang-Cua-Toi-100064123456789/');
    expect(r.uid).toBe('100064123456789');
    expect(r.type).toBe('PAGE');
  });

  it('đọc ID Page dạng /pages/<tên>/<id>', () => {
    const r = p('https://www.facebook.com/pages/Some-Name/123456789');
    expect(r.uid).toBe('123456789');
    expect(r.type).toBe('PAGE');
  });

  it('chấp nhận m.facebook.com', () => {
    expect(p('https://m.facebook.com/profile.php?id=100012345678901').uid).toBe('100012345678901');
  });
});

describe('parseFacebookUrl: nhóm', () => {
  it('ID nhóm dạng số', () => {
    const r = p('https://facebook.com/groups/123456789012345/');
    expect(r.uid).toBe('123456789012345');
    expect(r.type).toBe('GROUP');
  });

  it('nhóm dạng tên cần tải trang', () => {
    const r = p('https://www.facebook.com/groups/mygroup');
    expect(r.uid).toBeNull();
    expect(r.username).toBe('mygroup');
    expect(r.type).toBe('GROUP');
  });

  it('bài viết trong nhóm (ID nhóm dạng số): trả ID bài viết, kèm ID nhóm', () => {
    const r = p('https://www.facebook.com/groups/123456789012345/posts/987654321098765/');
    expect(r.uid).toBe('987654321098765');
    expect(r.type).toBe('POST');
    expect(r.related).toEqual({ id: '123456789012345', role: 'GROUP' });
  });

  it('bài viết trong nhóm dạng permalink', () => {
    const r = p('https://www.facebook.com/groups/mygroup/permalink/987654321098765/?comment_id=1');
    expect(r.uid).toBe('987654321098765');
    expect(r.type).toBe('POST');
    expect(r.related).toBeNull();
  });

  it('bài viết trong nhóm dạng ?multi_permalinks=', () => {
    const r = p('https://www.facebook.com/groups/mygroup/?multi_permalinks=987654321098765');
    expect(r.uid).toBe('987654321098765');
    expect(r.type).toBe('POST');
  });

  it('bài viết nhóm dạng pfbid cần tải trang', () => {
    const r = p('https://www.facebook.com/groups/123456789012345/posts/pfbid02abcDEF/');
    expect(r.uid).toBeNull();
    expect(r.type).toBe('POST');
    expect(r.related?.role).toBe('GROUP');
  });

  it('thành viên nhóm: /groups/<g>/user/<id>', () => {
    const r = p('https://www.facebook.com/groups/123456789/user/100012345678901/');
    expect(r.uid).toBe('100012345678901');
    expect(r.type).toBe('PROFILE');
  });
});

describe('parseFacebookUrl: bài viết', () => {
  it('/<user>/posts/<số>', () => {
    const r = p('https://www.facebook.com/someone/posts/1234567890');
    expect(r.uid).toBe('1234567890');
    expect(r.type).toBe('POST');
    expect(r.username).toBe('someone');
  });

  it('/<user>/posts/pfbid... cần tải trang', () => {
    const r = p('https://www.facebook.com/someone/posts/pfbid02abcDEFghi');
    expect(r.uid).toBeNull();
    expect(r.type).toBe('POST');
    expect(r.username).toBe('someone');
  });

  it('bài viết của trang có ID số trong đường dẫn', () => {
    const r = p('https://www.facebook.com/100064123456789/posts/987654321098765');
    expect(r.uid).toBe('987654321098765');
    expect(r.related).toEqual({ id: '100064123456789', role: 'OWNER' });
    expect(r.username).toBeNull();
  });

  it('permalink.php với story_fbid là số', () => {
    const r = p('https://www.facebook.com/permalink.php?story_fbid=987654321098765&id=100064123456789');
    expect(r.uid).toBe('987654321098765');
    expect(r.related).toEqual({ id: '100064123456789', role: 'OWNER' });
  });

  it('permalink.php với story_fbid dạng pfbid cần tải trang', () => {
    const r = p('https://www.facebook.com/permalink.php?story_fbid=pfbid02abc&id=100064123456789');
    expect(r.uid).toBeNull();
    expect(r.type).toBe('POST');
    expect(r.related?.id).toBe('100064123456789');
  });
});

describe('parseFacebookUrl: reel, ảnh, video', () => {
  it('reel', () => {
    const r = p('https://www.facebook.com/reel/1234567890123456?s=single_unit&fs=e');
    expect(r.uid).toBe('1234567890123456');
    expect(r.type).toBe('REEL');
  });

  it('video /watch/?v=', () => {
    const r = p('https://www.facebook.com/watch/?v=123456789012345');
    expect(r.uid).toBe('123456789012345');
    expect(r.type).toBe('VIDEO');
  });

  it('video /<user>/videos/<id>', () => {
    const r = p('https://www.facebook.com/someone/videos/123456789012');
    expect(r.uid).toBe('123456789012');
    expect(r.type).toBe('VIDEO');
  });

  it('video dạng cũ /<user>/videos/<tiêu đề>/<id>', () => {
    const r = p('https://www.facebook.com/someone/videos/tieu-de/123456789012/');
    expect(r.uid).toBe('123456789012');
    expect(r.type).toBe('VIDEO');
  });

  it('ảnh photo.php?fbid=', () => {
    const r = p('https://www.facebook.com/photo.php?fbid=1234567890123&set=a.111&type=3');
    expect(r.uid).toBe('1234567890123');
    expect(r.type).toBe('PHOTO');
  });

  it('ảnh /photo/?fbid= kèm chủ sở hữu', () => {
    const r = p('https://www.facebook.com/photo/?fbid=1234567890123&set=pcb.5&id=100064123456789');
    expect(r.uid).toBe('1234567890123');
    expect(r.related).toEqual({ id: '100064123456789', role: 'OWNER' });
  });

  it('ảnh /<user>/photos/<set>/<id>', () => {
    const r = p('https://www.facebook.com/someone/photos/a.111222333/444555666777/');
    expect(r.uid).toBe('444555666777');
    expect(r.type).toBe('PHOTO');
    expect(r.username).toBe('someone');
  });

  it('/<user>/photos (album, không có ID ảnh) vẫn là username', () => {
    const r = p('https://www.facebook.com/someone/photos');
    expect(r.type).toBe('USERNAME');
  });
});

describe('parseFacebookUrl: chia sẻ, đăng nhập, link xấu', () => {
  it('link share cần chuyển hướng', () => {
    const r = p('https://www.facebook.com/share/p/abc123/');
    expect(r.needsRedirect).toBe(true);
    expect(r.type).toBe('SHARE');
    expect(p('https://www.facebook.com/share/r/abc123/').needsRedirect).toBe(true);
  });

  it('lấy lại link gốc từ trang đăng nhập ?next=', () => {
    const r = p(
      'https://www.facebook.com/login/?next=https%3A%2F%2Fwww.facebook.com%2Freel%2F1234567890123456',
    );
    expect(r.uid).toBe('1234567890123456');
    expect(r.type).toBe('REEL');
  });

  it('trang đăng nhập không có next bị từ chối', () => {
    expect(() => p('https://www.facebook.com/login')).toThrow(InvalidFacebookUrlError);
  });

  it('từ chối host không phải Facebook và host giả mạo', () => {
    expect(() => p('https://evil.com/facebook.com/x')).toThrow(InvalidFacebookUrlError);
    expect(() => p('https://facebook.com.evil.com/abc')).toThrow(InvalidFacebookUrlError);
    expect(() => p('https://facebook.com@evil.com/abc')).toThrow(InvalidFacebookUrlError);
  });

  it('từ chối chuỗi rỗng, scheme lạ, reel thiếu ID', () => {
    expect(() => p('')).toThrow(InvalidFacebookUrlError);
    expect(() => p('ftp://facebook.com/abc')).toThrow(InvalidFacebookUrlError);
    expect(() => p('https://www.facebook.com/reel/abc')).toThrow(InvalidFacebookUrlError);
  });
});
