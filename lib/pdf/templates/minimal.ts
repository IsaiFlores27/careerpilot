import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

// ── Minimal ────────────────────────────────────────────────────────────────
// Ultra-clean, generoso espacio en blanco, líneas delgadas, tipografía ligera.
// Pensado para diseñadores, creativos y perfiles premium.

const M  = 54;
const PW = PageSizes.Letter[0];
const PH = PageSizes.Letter[1];
const CW = PW - M * 2;

const C = {
  black:   rgb(0.06, 0.06, 0.08),
  dark:    rgb(0.22, 0.22, 0.26),
  mid:     rgb(0.42, 0.42, 0.46),
  gray:    rgb(0.62, 0.62, 0.66),
  line:    rgb(0.88, 0.88, 0.90),
  accent:  rgb(0.10, 0.10, 0.12),
};

export async function buildMinimalPdf(profile: CvProfile): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage(PageSizes.Letter);
  let y    = PH - M - 8;

  const wrap = (t: string, font: typeof bold, size: number, maxW: number): string[] => {
    const words = (t ?? "").split(" ");
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
    if (y - h < M) { page = doc.addPage(PageSizes.Letter); y = PH - M - 8; }
  };

  const text = (
    t: string, x: number, size: number,
    font: typeof bold, color: ReturnType<typeof rgb>,
    maxW = CW, lh?: number
  ) => {
    const lines = wrap(t, font, size, maxW);
    const lineH = lh ?? size * 1.55;
    for (const l of lines) {
      need(lineH);
      page.drawText(l, { x, y, size, font, color });
      y -= lineH;
    }
  };

  // Header — name very large, sparse
  const nameStr = profile.contact.name ?? "";
  const nameSz  = 26;
  page.drawText(nameStr, { x:M, y, size:nameSz, font:bold, color:C.black });
  y -= nameSz + 6;

  if (profile.headline) {
    text(profile.headline, M, 11, reg, C.mid, CW, 16);
  }

  y -= 6;
  // Thin bottom border under name area
  page.drawLine({ start:{x:M,y}, end:{x:PW-M,y}, thickness:0.4, color:C.line });
  y -= 12;

  // Contact info — right-aligned, compact
  const contactItems = [
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
    profile.contact.linkedin,
  ].filter(Boolean) as string[];

  for (const item of contactItems) {
    const iw = reg.widthOfTextAtSize(item, 8.5);
    need(12);
    page.drawText(item, { x:PW-M-iw, y, size:8.5, font:reg, color:C.gray });
    y -= 12;
  }
  y -= 8;

  const section = (title: string) => {
    y -= 12;
    need(22);
    // Section label — small caps style, letter-spaced via spacing trick
    page.drawText(title.toUpperCase(), { x:M, y, size:7.5, font:bold, color:C.mid });
    y -= 10;
    page.drawLine({ start:{x:M,y}, end:{x:PW-M,y}, thickness:0.3, color:C.line });
    y -= 9;
  };

  // Summary
  if (profile.summary) {
    section("Perfil");
    text(profile.summary, M, 9.5, reg, C.dark, CW, 14);
    y -= 4;
  }

  // Experience
  if (profile.experience?.length) {
    section("Experiencia");
    for (const exp of profile.experience) {
      need(32);
      // Company + dates on same line
      const dStr = `${exp.start ?? ""} – ${exp.current ? "Presente" : (exp.end ?? "")}`;
      const dW   = reg.widthOfTextAtSize(dStr, 9);
      page.drawText(exp.company ?? "", { x:M, y, size:10.5, font:bold, color:C.black });
      page.drawText(dStr, { x:PW-M-dW, y, size:9, font:reg, color:C.gray });
      y -= 15;
      // Role in italic (use reg oblique not available, so lighter color)
      text(exp.role ?? "", M, 9.5, reg, C.mid, CW, 13.5);
      y -= 3;
      const bullets = exp.achievements_with_metrics?.length ? exp.achievements_with_metrics : (exp.bullets ?? []);
      for (const b of bullets) {
        need(13);
        page.drawText("–", { x:M+2, y, size:9, font:reg, color:C.gray });
        const ls = wrap(b, reg, 9, CW-14);
        for (const l of ls) {
          need(13);
          page.drawText(l, { x:M+14, y, size:9, font:reg, color:C.dark });
          y -= 13.5;
        }
      }
      y -= 6;
    }
  }

  // Education
  if (profile.education?.length) {
    section("Educación");
    for (const edu of profile.education) {
      need(24);
      const dStr = [edu.start, edu.end].filter(Boolean).join(" – ");
      if (dStr) {
        const dW = reg.widthOfTextAtSize(dStr, 9);
        page.drawText(dStr, { x:PW-M-dW, y, size:9, font:reg, color:C.gray });
      }
      text(edu.institution ?? "", M, 10.5, bold, C.black, CW - 70, 15);
      const deg = [edu.degree, edu.field ? `en ${edu.field}` : ""].filter(Boolean).join(" ");
      if (deg) text(deg, M, 9.5, reg, C.mid, CW, 13.5);
      y -= 5;
    }
  }

  // Skills — inline tags with thin border
  const skills = [...(profile.skills?.hard ?? []), ...(profile.skills?.tools ?? [])];
  if (skills.length) {
    section("Habilidades");
    // Render tags flowing left to right
    let tx = M;
    const tagH = 14;
    const tagPad = 7;
    const tagGapX = 5;
    const tagGapY = 5;
    need(tagH + 4);
    let tagY = y;
    for (const s of skills.slice(0, 18)) {
      const sw = reg.widthOfTextAtSize(s, 8.5);
      const tw = sw + tagPad * 2;
      if (tx + tw > PW - M) { tx = M; tagY -= tagH + tagGapY; need(tagH + 4); }
      page.drawRectangle({ x:tx, y:tagY-tagH+3, width:tw, height:tagH, color:C.line });
      page.drawText(s, { x:tx+tagPad, y:tagY-5, size:8.5, font:reg, color:C.dark });
      tx += tw + tagGapX;
    }
    y = tagY - tagH - 6;
  }

  // Languages & Certs
  if (profile.languages?.length || profile.certifications?.length) {
    section("Otros");
    const langs = (profile.languages ?? []).map(l => `${l.name} (${l.level})`).join("   ·   ");
    if (langs) text(langs, M, 9, reg, C.dark, CW, 13);
    for (const c of (profile.certifications ?? []).slice(0, 4)) {
      need(13);
      text(`· ${c}`, M, 9, reg, C.dark, CW, 13);
    }
  }

  return doc.save();
}
