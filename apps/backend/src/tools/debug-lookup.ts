/**
 * Công cụ chẩn đoán: cho biết vì sao một link Facebook không lấy được ID.
 * Chạy trên VPS (không cần Postgres/Redis):
 *   docker compose -f docker-compose.prod.yml --env-file .env exec backend \
 *     node dist/tools/debug-lookup.js "https://www.facebook.com/groups/ten-nhom"
 * Không in nội dung trang, chỉ in trạng thái từng lần tải.
 */
import { FacebookService } from '../facebook/facebook.service';
import { parseFacebookUrl, ParsedFacebookUrl } from '../facebook/url-parser';

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) {
    console.error('Cách dùng: node dist/tools/debug-lookup.js "<link facebook>"');
    process.exit(2);
  }

  const fb = new FacebookService();
  let parsed: ParsedFacebookUrl = parseFacebookUrl(input);
  console.log('1) Phân tích link:', JSON.stringify(parsed));

  if (parsed.needsRedirect) {
    const finalUrl = await fb.resolveRedirect(parsed.normalizedUrl);
    console.log('2) Sau chuyển hướng:', finalUrl);
    try {
      parsed = parseFacebookUrl(finalUrl);
    } catch {
      parsed = { ...parsed, normalizedUrl: finalUrl, needsRedirect: false };
    }
    console.log('   Phân tích lại:', JSON.stringify(parsed));
  }

  if (parsed.uid) {
    console.log(`KẾT QUẢ: ${parsed.uid} (lấy trực tiếp từ link, không cần gọi Facebook)`);
    return;
  }

  const r = await fb.findId(parsed.normalizedUrl, parsed.type);
  console.log('3) Các lần tải trang Facebook:');
  for (const a of r.attempts) console.log('  ', JSON.stringify(a));
  console.log(r.uid ? `KẾT QUẢ: ${r.uid}` : 'KẾT QUẢ: không tìm thấy ID');
}

main().catch((e: Error) => {
  console.error('LỖI:', e.name, e.message);
  process.exit(1);
});
