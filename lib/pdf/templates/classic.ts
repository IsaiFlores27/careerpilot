import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

// ── Classic ATS ────────────────────────────────────────────────────────────
// Una columna, Helvetica, sin color, máxima compatibilidad con parsers ATS.

const M = 50;
const PW = PageSizes.Letter[0];
const PH = PageSizes.Letter[1];
const CW = PW - M * 2;

const C = {
  black:  rgb(0.08, 0.08, 0.08),
  dark:   rgb(0.20, 0.20, 0.20),
  gray:   rgb(0.45, 0.45, 0.45),
  light:  rgb(0.62, 0.62, 0.62),
  line:   rgb(0.82, 0.82, 0.82),
};

export async function buildClassicPdf(profile: CvProfile): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage(PageSizes.Letter);
  let y    = PH - M;

  const wrap = (text: string, font: typeof bold, size: number, maxW: number): string[] => {
    const words = (text ?? "").split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const need = (h: number) => {
    if (y - h < M + 10) { page = doc.addPage(PageSizes.Letter); y = PH - M; }
  };

  const text = (
    t: string, x: number, size: number,
    font: typeof bold, color: ReturnType<typeof rgb>,
    maxW = CW, lh?: number
  ) => {
    const lines = wrap(t, font, size, maxW);
    const lineH = lh ?? size * 1.45;
    for (const l of lines) {
      need(lineH);
      page.drawText(l, { x, y, size, font, color });
      y -= lineH;
    }
  };

  const hr = () => {
    need(6);
    page.drawLine({ start:{x:M,y}, end:{x:PW-M,y}, thickness:0.5, color:C.line });
    y -= 6;
  };

  const section = (title: string) => {
    y -= 6;
    text(title.toUpperCase(), M, 8.5, bold, C.black, CW, 12);
    hr();
  };

  // Header
  text(profile.contact.name ?? "", M, 18, bold, C.black, CW, 22);
  y -= 2;
  if (profile.headline) text(profile.headline, M, 10.5, reg, C.dark, CW, 14);
  const cp = [profile.contact.email, profile.contact.phone, profile.contact.location, profile.contact.linkedin].filter(Boolean).join("  ·  ");
  if (cp) text(cp, M, 8.5, reg, C.light, CW, 12);
  y -= 4; hr();

  // Summary
  if (profile.summary) {
    section("Resumen Profesional");
    text(profile.summary, M, 9.5, reg, C.dark, CW, 13.5);
  }

  // Experience
  if (profile.experience?.length) {
    section("Experiencia");
    for (const exp of profile.experience) {
      need(36);
      const dStr = `${exp.start ?? ""} – ${exp.current ? "Presente" : (exp.end ?? "")}`;
      const dW = reg.widthOfTextAtSize(dStr, 9);
      page.drawText(exp.company ?? "", { x:M, y, size:10, font:bold, color:C.black });
      page.drawText(dStr, { x:PW-M-dW, y, size:9, font:reg, color:C.gray });
      y -= 14;
      text(exp.role ?? "", M, 9.5, reg, C.dark, CW, 13);
      y -= 2;
      const bullets = exp.achievements_with_metrics?.length ? exp.achievements_with_metrics : (exp.bullets ?? []);
      for (const b of bullets) {
        need(13);
        page.drawText("•", { x:M+4, y, size:9, font:reg, color:C.gray });
        text(b, M+14, 9, reg, C.dark, CW-14, 13);
      }
      y -= 5;
    }
  }

  // Education
  if (profile.education?.length) {
    section("Educación");
    for (const edu of profile.education) {
      need(26);
      const dStr = [edu.start, edu.end].filter(Boolean).join(" – ");
      if (dStr) {
        const dW = reg.widthOfTextAtSize(dStr, 9);
        page.drawText(dStr, { x:PW-M-dW, y, size:9, font:reg, color:C.gray });
      }
      text(edu.institution ?? "", M, 10, bold, C.black, CW-60, 14);
      const deg = [edu.degree, edu.field ? `en ${edu.field}` : ""].filter(Boolean).join(" ");
      if (deg) text(deg, M, 9.5, reg, C.dark, CW, 13);
      y -= 4;
    }
  }

  // Skills
  const skills = [...(profile.skills?.hard ?? []), ...(profile.skills?.tools ?? [])];
  if (skills.length) {
    section("Habilidades");
    text(skills.join("  ·  "), M, 9, reg, C.dark, CW, 13);
  }

  // Languages
  if (profile.languages?.length) {
    section("Idiomas");
    text(profile.languages.map(l=>`${l.name} (${l.level})`).join("  ·  "), M, 9, reg, C.dark, CW, 13);
  }

  // Certifications
  if (profile.certifications?.length) {
    section("Certificaciones");
    for (const c of profile.certifications) {
      need(13);
      page.drawText("•", { x:M+4, y, size:9, font:reg, color:C.gray });
      text(c, M+14, 9, reg, C.dark, CW-14, 13);
    }
  }

  return doc.save();
}
