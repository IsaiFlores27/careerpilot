import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

const MARGIN = 50;
const PAGE_W = PageSizes.Letter[0]; // 612
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLOR_BLACK  = rgb(0.1,  0.1,  0.1);
const COLOR_DARK   = rgb(0.2,  0.2,  0.2);
const COLOR_GRAY   = rgb(0.4,  0.4,  0.4);
const COLOR_LIGHT  = rgb(0.6,  0.6,  0.6);
const COLOR_LINE   = rgb(0.8,  0.8,  0.8);
const COLOR_ACCENT = rgb(0.27, 0.15, 0.65); // violet

interface DrawCtx {
  page: ReturnType<PDFDocument["addPage"]>;
  doc: PDFDocument;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  y: number;
  pages: ReturnType<PDFDocument["addPage"]>[];
}

function addPage(ctx: DrawCtx) {
  const page = ctx.doc.addPage(PageSizes.Letter);
  ctx.pages.push(page);
  ctx.page = page;
  ctx.y = PageSizes.Letter[1] - MARGIN;
}

function ensureSpace(ctx: DrawCtx, needed: number) {
  if (ctx.y - needed < MARGIN + 20) addPage(ctx);
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts: {
    size?: number;
    font?: "bold" | "regular";
    color?: ReturnType<typeof rgb>;
    x?: number;
    indent?: number;
    maxWidth?: number;
    lineHeight?: number;
  } = {}
): number {
  const {
    size = 10,
    font = "regular",
    color = COLOR_BLACK,
    x,
    indent = 0,
    maxWidth,
    lineHeight,
  } = opts;

  const f = font === "bold" ? ctx.bold : ctx.regular;
  const lh = lineHeight ?? size * 1.4;
  const xPos = x ?? MARGIN + indent;
  const mw = maxWidth ?? CONTENT_W - indent;

  // Word wrap
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = f.widthOfTextAtSize(test, size);
    if (w > mw && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  for (const line of lines) {
    ensureSpace(ctx, lh);
    ctx.page.drawText(line, { x: xPos, y: ctx.y, size, font: f, color });
    ctx.y -= lh;
  }

  return lines.length * lh;
}

function drawLine(ctx: DrawCtx) {
  ensureSpace(ctx, 4);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: COLOR_LINE,
  });
  ctx.y -= 6;
}

function sectionTitle(ctx: DrawCtx, title: string) {
  ctx.y -= 8;
  ensureSpace(ctx, 20);
  drawText(ctx, title.toUpperCase(), { size: 9, font: "bold", color: COLOR_ACCENT });
  drawLine(ctx);
}

export async function buildCvPdf(profile: CvProfile): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const firstPage = doc.addPage(PageSizes.Letter);
  const ctx: DrawCtx = {
    doc, bold, regular,
    page: firstPage,
    y: PageSizes.Letter[1] - MARGIN,
    pages: [firstPage],
  };

  // ── HEADER ──────────────────────────────────────────
  drawText(ctx, profile.contact.name ?? "", { size: 18, font: "bold", color: COLOR_ACCENT });
  ctx.y -= 2;

  if (profile.headline) {
    drawText(ctx, profile.headline, { size: 11, color: COLOR_DARK });
    ctx.y -= 2;
  }

  const contactParts = [
    profile.contact.email,
    profile.contact.phone,
    profile.contact.location,
    profile.contact.linkedin,
  ].filter(Boolean).join("  ·  ");

  if (contactParts) {
    drawText(ctx, contactParts, { size: 8.5, color: COLOR_LIGHT });
  }
  ctx.y -= 4;
  drawLine(ctx);

  // ── RESUMEN ─────────────────────────────────────────
  if (profile.summary) {
    sectionTitle(ctx, "Resumen Profesional");
    drawText(ctx, profile.summary, { size: 9.5, color: COLOR_DARK, lineHeight: 14 });
  }

  // ── EXPERIENCIA ─────────────────────────────────────
  if (profile.experience?.length > 0) {
    sectionTitle(ctx, "Experiencia");
    for (const exp of profile.experience) {
      ensureSpace(ctx, 40);

      // Empresa + fechas en la misma línea
      const dateStr = `${exp.start ?? ""} – ${exp.current ? "Presente" : (exp.end ?? "")}`;
      const dateW = bold.widthOfTextAtSize(dateStr, 9);
      ctx.page.drawText(exp.company ?? "", {
        x: MARGIN, y: ctx.y, size: 10, font: bold, color: COLOR_BLACK,
      });
      ctx.page.drawText(dateStr, {
        x: PAGE_W - MARGIN - dateW, y: ctx.y, size: 9, font: regular, color: COLOR_GRAY,
      });
      ctx.y -= 14;

      drawText(ctx, exp.role ?? "", { size: 9.5, color: COLOR_DARK, font: "regular" });
      ctx.y -= 2;

      const bullets = exp.achievements_with_metrics?.length
        ? exp.achievements_with_metrics
        : (exp.bullets ?? []);

      for (const bullet of bullets) {
        ensureSpace(ctx, 14);
        ctx.page.drawText("•", { x: MARGIN + 4, y: ctx.y, size: 9, font: regular, color: COLOR_GRAY });
        drawText(ctx, bullet, { size: 9, indent: 14, color: COLOR_DARK, lineHeight: 13 });
      }
      ctx.y -= 4;
    }
  }

  // ── EDUCACIÓN ────────────────────────────────────────
  if (profile.education?.length > 0) {
    sectionTitle(ctx, "Educación");
    for (const edu of profile.education) {
      ensureSpace(ctx, 28);
      const dateStr = [edu.start, edu.end].filter(Boolean).join(" – ");
      if (dateStr) {
        const dw = regular.widthOfTextAtSize(dateStr, 9);
        ctx.page.drawText(dateStr, {
          x: PAGE_W - MARGIN - dw, y: ctx.y, size: 9, font: regular, color: COLOR_GRAY,
        });
      }
      drawText(ctx, edu.institution ?? "", { size: 10, font: "bold" });
      const degreeStr = [edu.degree, edu.field ? `en ${edu.field}` : ""].filter(Boolean).join(" ");
      if (degreeStr) drawText(ctx, degreeStr, { size: 9.5, color: COLOR_DARK });
      ctx.y -= 4;
    }
  }

  // ── HABILIDADES ──────────────────────────────────────
  const allSkills = [...(profile.skills?.hard ?? []), ...(profile.skills?.tools ?? [])];
  if (allSkills.length > 0) {
    sectionTitle(ctx, "Habilidades");
    drawText(ctx, allSkills.join("  ·  "), { size: 9, color: COLOR_DARK, lineHeight: 13 });
  }

  // ── IDIOMAS ──────────────────────────────────────────
  if (profile.languages?.length > 0) {
    sectionTitle(ctx, "Idiomas");
    const langStr = profile.languages.map((l) => `${l.name} (${l.level})`).join("  ·  ");
    drawText(ctx, langStr, { size: 9, color: COLOR_DARK });
  }

  // ── CERTIFICACIONES ──────────────────────────────────
  if (profile.certifications?.length > 0) {
    sectionTitle(ctx, "Certificaciones");
    for (const cert of profile.certifications) {
      ensureSpace(ctx, 14);
      ctx.page.drawText("•", { x: MARGIN + 4, y: ctx.y, size: 9, font: regular, color: COLOR_GRAY });
      drawText(ctx, cert, { size: 9, indent: 14, color: COLOR_DARK, lineHeight: 13 });
    }
  }

  return doc.save();
}
