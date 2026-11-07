import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * 전자책 PDF의 모든 페이지 하단에 구매자 정보를 찍는다 (PLAN.md 5절 전자책).
 * 기본 글꼴(Helvetica)은 한글을 못 쓰므로 영문 · 숫자만 넣는다 (이메일 · 주문번호).
 */
export async function watermarkPdf(bytes: Uint8Array, line: string) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = line.replace(/[^\x20-\x7E]/g, "");
  const size = 7;
  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(12, (width - textWidth) / 2),
      y: 12,
      size,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.8,
    });
  }
  pdf.setProducer("Make & Grow");
  return pdf.save();
}
