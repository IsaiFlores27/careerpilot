import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

// ── Executive ──────────────────────────────────────────────────────────────
// Barra lateral izquierda oscura (navy) con datos de contacto y skills.
// Columna derecha con experiencia y educación.

const PW = PageSizes.Letter[0];
const PH = PageSizes.Letter[1];
const SIDEBAR = 170;
const M_SIDE  = 16;
const M_MAIN  = 20;
const M_TOP   = 44;
const MAIN_W  = PW - SIDEBAR - M_MAIN - 36;

const C = {
  navy:     rgb(0.10, 0.14, 0.28),
  navyDark: rgb(0.07, 0.10, 0.20),
  white:    rgb(1, 1, 1),
  offWhite: rgb(0.88, 0.90, 0.95),
  accent:   rgb(0.40, 0.65, 0.95),
  black:    rgb(0.08, 0.08, 0.10),
  dark:     rgb(0.20, 0.20, 0.24),
  gray:     rgb(0.50, 0.50, 0.55),
  line:     rgb(0.85, 0.85, 0.88),
};

export async function buildExecutivePdf(profile: CvProfile): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage(PageSizes.Letter);

  const drawSidebarBg = (p: typeof page) => {
    p.drawRectangle({ x:0, y:0, width:SIDEBAR, height:PH, color:C.navy });
  };
  drawSidebarBg(page);

  const wrap = (t: string, font: typeof bold, size: number, maxW: number) => {
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

  // ─ Sidebar state ─
  let sy = PH - M_TOP;

  const sideText = (t: string, size: number, font: typeof bold, color: ReturnType<typeof rgb>, lh?: number) => {
    const lines = wrap(t, font, size, SIDEBAR - M_SIDE * 2);
    const lineH = lh ?? size * 1.4;
    for (const l of lines) {
      if (sy < 30) { page = doc.addPage(PageSizes.Letter); drawSidebarBg(page); sy = PH - M_TOP; }
      page.drawText(l, { x:M_SIDE, y:sy, size, font, color });
      sy -= lineH;
    }
  };

  const sideDivider = () => {
    sy -= 6;
    page.drawLine({ start:{x:M_SIDE,y:sy}, end:{x:SIDEBAR-M_SIDE,y:sy}, thickness:0.4, color:rgb(1,1,1,) });
    sy -= 8;
  };

  const sideSection = (title: string) => {
    sy -= 4;
    sideText(title.toUpperCase(), 7.5, bold, C.accent, 11);
    sideDivider();
  };

  // Sidebar — Name
  sideText(profile.contact.name ?? "", 14, bold, C.white, 18);
  sy -= 4;
  if (profile.headline) sideText(profile.headline, 8.5, reg, C.offWhite, 12);
  sideDivider();

  // Sidebar — Contact
  sideSection("Contacto");
  for (const item of [
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
    profile.contact.linkedin,
  ].filter(Boolean) as string[]) {
    sideText(item, 8, reg, C.offWhite, 12);
    sy -= 2;
  }

  // Sidebar — Skills
  const skills = [...(profile.skills?.hard ?? []), ...(profile.skills?.tools ?? [])];
  if (skills.length) {
    sideSection("Habilidades");
    for (const s of skills.slice(0, 14)) {
      sideText(`· ${s}`, 8, reg, C.offWhite, 12);
      sy -= 1;
    }
  }

  // Sidebar — Languages
  if (profile.languages?.length) {
    sideSection("Idiomas");
    for (const l of profile.languages) {
      sideText(`${l.name}`, 8, bold, C.white, 12);
      sideText(l.level, 7.5, reg, C.offWhite, 11);
      sy -= 2;
    }
  }

  // Sidebar — Certs
  if (profile.certifications?.length) {
    sideSection("Certificaciones");
    for (const c of profile.certifications.slice(0, 4)) {
      sideText(`· ${c}`, 7.5, reg, C.offWhite, 11);
      sy -= 1;
    }
  }

  // ─ Main column ─
  let my = PH - M_TOP;
  const MX = SIDEBAR + M_MAIN;

  const need = (h: number) => {
    if (my - h < 30) {
      page = doc.addPage(PageSizes.Letter);
      drawSidebarBg(page);
      my = PH - M_TOP;
    }
  };

  const mainText = (t: string, size: number, font: typeof bold, color: ReturnType<typeof rgb>, lh?: number) => {
    const lines = wrap(t, font, size, MAIN_W);
    const lineH = lh ?? size * 1.45;
    for (const l of lines) {
      need(lineH);
      page.drawText(l, { x:MX, y:my, size, font, color });
      my -= lineH;
    }
  };

  const mainSection = (title: string) => {
    my -= 8;
    need(18);
    page.drawText(title.toUpperCase(), { x:MX, y:my, size:8.5, font:bold, color:C.navy });
    my -= 12;
    need(4);
    page.drawLine({ start:{x:MX,y:my}, end:{x:PW-30,y:my}, thickness:0.6, color:C.navy });
    my -= 7;
  };

  // Summary
  if (profile.summary) {
    mainSection("Resumen");
    mainText(profile.summary, 9.5, reg, C.dark, 13.5);
  }

  // Experience
  if (profile.experience?.length) {
    mainSection("Experiencia");
    for (const exp of profile.experience) {
      need(34);
      const dStr = `${exp.start ?? ""} – ${exp.current ? "Presente" : (exp.end ?? "")}`;
      const dW = reg.widthOfTextAtSize(dStr, 8.5);
      page.drawText(exp.company ?? "", { x:MX, y:my, size:10, font:bold, color:C.navy });
      page.drawText(dStr, { x:PW-30-dW, y:my, size:8.5, font:reg, color:C.gray });
      my -= 14;
      mainText(exp.role ?? "", 9.5, reg, C.dark, 13);
      my -= 2;
      const bullets = exp.achievements_with_metrics?.length ? exp.achievements_with_metrics : (exp.bullets ?? []);
      for (const b of bullets) {
        need(13);
        page.drawText("▸", { x:MX, y:my, size:8, font:reg, color:C.accent });
        const lines = wrap(b, reg, 9, MAIN_W-12);
        const lh = 13;
        for (const l of lines) {
          need(lh);
          page.drawText(l, { x:MX+12, y:my, size:9, font:reg, color:C.dark });
          my -= lh;
        }
      }
      my -= 5;
    }
  }

  // Education
  if (profile.education?.length) {
    mainSection("Educación");
    for (const edu of profile.education) {
      need(26);
      const dStr = [edu.start, edu.end].filter(Boolean).join(" – ");
      if (dStr) {
        const dW = reg.widthOfTextAtSize(dStr, 8.5);
        page.drawText(dStr, { x:PW-30-dW, y:my, size:8.5, font:reg, color:C.gray });
      }
      mainText(edu.institution ?? "", 10, bold, C.navy, 14);
      const deg = [edu.degree, edu.field ? `en ${edu.field}` : ""].filter(Boolean).join(" ");
      if (deg) mainText(deg, 9.5, reg, C.dark, 13);
      my -= 4;
    }
  }

  return doc.save();
}
