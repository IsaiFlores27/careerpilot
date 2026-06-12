import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

// ── Modern ─────────────────────────────────────────────────────────────────
// Barra de acento violeta en el header, tipografía limpia, dos columnas
// para skills/contacto y contenido principal.

const PW = PageSizes.Letter[0];
const PH = PageSizes.Letter[1];
const M  = 36;
const CW = PW - M * 2;
const HEADER_H = 90;
const RIGHT_COL_X = 370;
const LEFT_CW = RIGHT_COL_X - M - 16;
const RIGHT_CW = PW - RIGHT_COL_X - M;

const C = {
  violet:    rgb(0.45, 0.27, 0.90),
  violetLt:  rgb(0.62, 0.47, 0.96),
  white:     rgb(1, 1, 1),
  black:     rgb(0.08, 0.08, 0.10),
  dark:      rgb(0.18, 0.18, 0.22),
  gray:      rgb(0.46, 0.46, 0.50),
  lightGray: rgb(0.70, 0.70, 0.74),
  bg:        rgb(0.97, 0.97, 0.99),
  line:      rgb(0.87, 0.85, 0.95),
};

export async function buildModernPdf(profile: CvProfile): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage(PageSizes.Letter);

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

  // ─ Header with gradient bar ─
  // Violet accent stripe at the top
  page.drawRectangle({ x:0, y:PH-8, width:PW, height:8, color:C.violet });
  // Lighter sub-stripe
  page.drawRectangle({ x:0, y:PH-14, width:PW, height:6, color:C.violetLt });
  // Header bg
  page.drawRectangle({ x:0, y:PH-HEADER_H, width:PW, height:HEADER_H-14, color:C.bg });

  // Name in header
  const nameSize = 22;
  page.drawText(profile.contact.name ?? "", { x:M, y:PH-40, size:nameSize, font:bold, color:C.violet });
  if (profile.headline) {
    page.drawText(profile.headline, { x:M, y:PH-60, size:10, font:reg, color:C.dark });
  }
  // Contact row
  const contact = [
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
  ].filter(Boolean).join("   ·   ");
  if (contact) {
    page.drawText(contact, { x:M, y:PH-78, size:8.5, font:reg, color:C.gray });
  }
  if (profile.contact.linkedin) {
    const liW = reg.widthOfTextAtSize(profile.contact.linkedin, 8.5);
    page.drawText(profile.contact.linkedin, { x:PW-M-liW, y:PH-78, size:8.5, font:reg, color:C.violet });
  }

  // ─ Two-column body ─
  let ly = PH - HEADER_H - 14; // left col y
  let ry = ly;                  // right col y

  const needL = (h: number) => {
    if (ly - h < M + 10) { page = doc.addPage(PageSizes.Letter); ly = PH - M; ry = ly; }
  };
  const needR = (h: number) => {
    if (ry - h < M + 10) { page = doc.addPage(PageSizes.Letter); ly = PH - M; ry = ly; }
  };

  const leftText = (t: string, size: number, font: typeof bold, color: ReturnType<typeof rgb>, lh?: number) => {
    const lines = wrap(t, font, size, LEFT_CW);
    const lineH = lh ?? size * 1.45;
    for (const l of lines) {
      needL(lineH);
      page.drawText(l, { x:M, y:ly, size, font, color });
      ly -= lineH;
    }
  };

  const rightText = (t: string, size: number, font: typeof bold, color: ReturnType<typeof rgb>, lh?: number) => {
    const lines = wrap(t, font, size, RIGHT_CW);
    const lineH = lh ?? size * 1.45;
    for (const l of lines) {
      needR(lineH);
      page.drawText(l, { x:RIGHT_COL_X, y:ry, size, font, color });
      ry -= lineH;
    }
  };

  const leftSection = (title: string) => {
    ly -= 8;
    needL(20);
    page.drawText(title.toUpperCase(), { x:M, y:ly, size:8, font:bold, color:C.violet });
    ly -= 12;
    page.drawLine({ start:{x:M,y:ly}, end:{x:RIGHT_COL_X-16,y:ly}, thickness:0.5, color:C.line });
    ly -= 7;
  };

  const rightSection = (title: string) => {
    ry -= 8;
    needR(20);
    page.drawText(title.toUpperCase(), { x:RIGHT_COL_X, y:ry, size:8, font:bold, color:C.violet });
    ry -= 12;
    page.drawLine({ start:{x:RIGHT_COL_X,y:ry}, end:{x:PW-M,y:ry}, thickness:0.5, color:C.line });
    ry -= 7;
  };

  // LEFT COLUMN — Summary + Experience
  if (profile.summary) {
    leftSection("Resumen");
    leftText(profile.summary, 9, reg, C.dark, 13);
  }

  if (profile.experience?.length) {
    leftSection("Experiencia");
    for (const exp of profile.experience) {
      needL(34);
      const dStr = `${exp.start ?? ""} – ${exp.current ? "Presente" : (exp.end ?? "")}`;
      const dW = reg.widthOfTextAtSize(dStr, 8.5);
      page.drawText(exp.company ?? "", { x:M, y:ly, size:10, font:bold, color:C.black });
      page.drawText(dStr, { x:RIGHT_COL_X-16-dW, y:ly, size:8.5, font:reg, color:C.gray });
      ly -= 14;
      leftText(exp.role ?? "", 9, reg, C.violet, 13);
      ly -= 2;
      const bullets = exp.achievements_with_metrics?.length ? exp.achievements_with_metrics : (exp.bullets ?? []);
      for (const b of bullets) {
        needL(13);
        page.drawText("▸", { x:M, y:ly, size:8, font:reg, color:C.violetLt });
        const ls = wrap(b, reg, 8.5, LEFT_CW-12);
        for (const l of ls) {
          needL(12.5);
          page.drawText(l, { x:M+11, y:ly, size:8.5, font:reg, color:C.dark });
          ly -= 12.5;
        }
      }
      ly -= 5;
    }
  }

  if (profile.education?.length) {
    leftSection("Educación");
    for (const edu of profile.education) {
      needL(26);
      const dStr = [edu.start, edu.end].filter(Boolean).join(" – ");
      if (dStr) {
        const dW = reg.widthOfTextAtSize(dStr, 8.5);
        page.drawText(dStr, { x:RIGHT_COL_X-16-dW, y:ly, size:8.5, font:reg, color:C.gray });
      }
      leftText(edu.institution ?? "", 10, bold, C.black, 14);
      const deg = [edu.degree, edu.field ? `en ${edu.field}` : ""].filter(Boolean).join(" ");
      if (deg) leftText(deg, 9, reg, C.dark, 13);
      ly -= 4;
    }
  }

  // RIGHT COLUMN — Skills, Languages, Certs
  const skills = [...(profile.skills?.hard ?? []), ...(profile.skills?.soft ?? []), ...(profile.skills?.tools ?? [])];
  if (skills.length) {
    rightSection("Habilidades");
    for (const s of skills.slice(0, 16)) {
      needR(15);
      // Pill-style skill tag
      const sw = bold.widthOfTextAtSize(s, 8);
      page.drawRectangle({ x:RIGHT_COL_X, y:ry-2, width:Math.min(sw+12, RIGHT_CW), height:13, color:C.line });
      page.drawText(s, { x:RIGHT_COL_X+6, y:ry+1, size:8, font:bold, color:C.violet });
      ry -= 17;
    }
    ry -= 4;
  }

  if (profile.languages?.length) {
    rightSection("Idiomas");
    for (const l of profile.languages) {
      needR(14);
      rightText(`${l.name}`, 9, bold, C.black, 13);
      rightText(l.level, 8.5, reg, C.gray, 12);
      ry -= 3;
    }
  }

  if (profile.certifications?.length) {
    rightSection("Certificaciones");
    for (const c of profile.certifications.slice(0, 5)) {
      needR(12);
      const ls = wrap(c, reg, 8.5, RIGHT_CW-8);
      for (const l of ls) {
        page.drawText("·", { x:RIGHT_COL_X, y:ry, size:9, font:bold, color:C.violet });
        page.drawText(l, { x:RIGHT_COL_X+8, y:ry, size:8.5, font:reg, color:C.dark });
        ry -= 12.5;
      }
    }
  }

  // Vertical divider between columns
  const allPages = doc.getPages();
  for (const p of allPages) {
    p.drawLine({
      start:{ x:RIGHT_COL_X-10, y:p.getHeight()-HEADER_H-10 },
      end:  { x:RIGHT_COL_X-10, y:M },
      thickness:0.4,
      color:C.line,
    });
  }

  return doc.save();
}
