import { z } from "zod";

export const WeakBulletSchema = z.object({
  original: z.string(),
  problem: z.string(),
  suggestion: z.string(),
});

export const DiagnosisSchema = z.object({
  ats_score: z.number().min(0).max(100),
  weak_bullets: z.array(WeakBulletSchema),
  missing_metrics: z.array(z.string()),
  missing_keywords_for_target: z.array(z.string()),
  format_issues: z.array(z.string()),
  top_3_priorities: z.array(z.string()),
  overall_assessment: z.string(),
});

export const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  start: z.string(),
  end: z.string().optional(),
  current: z.boolean().optional(),
  bullets: z.array(z.string()),
  achievements_with_metrics: z.array(z.string()),
});

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  gpa: z.string().optional(),
});

export const CvProfileSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
  }),
  headline: z.string(),
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.object({
    hard: z.array(z.string()),
    soft: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  certifications: z.array(z.string()),
  diagnosis: DiagnosisSchema,
});

export type CvProfile = z.infer<typeof CvProfileSchema>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

// JSON Schema compatible (para output_config.format)
export const CV_PROFILE_JSON_SCHEMA = {
  type: "object",
  properties: {
    contact: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        linkedin: { type: "string" },
        location: { type: "string" },
      },
      required: ["name"],
    },
    headline: { type: "string" },
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          current: { type: "boolean" },
          bullets: { type: "array", items: { type: "string" } },
          achievements_with_metrics: { type: "array", items: { type: "string" } },
        },
        required: ["company", "role", "start", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          field: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
        },
        required: ["institution", "degree"],
      },
    },
    skills: {
      type: "object",
      properties: {
        hard: { type: "array", items: { type: "string" } },
        soft: { type: "array", items: { type: "string" } },
        tools: { type: "array", items: { type: "string" } },
      },
      required: ["hard", "soft", "tools"],
    },
    languages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          level: { type: "string" },
        },
        required: ["name", "level"],
      },
    },
    certifications: { type: "array", items: { type: "string" } },
    diagnosis: {
      type: "object",
      properties: {
        ats_score: { type: "number" },
        weak_bullets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              original: { type: "string" },
              problem: { type: "string" },
              suggestion: { type: "string" },
            },
            required: ["original", "problem", "suggestion"],
          },
        },
        missing_metrics: { type: "array", items: { type: "string" } },
        missing_keywords_for_target: { type: "array", items: { type: "string" } },
        format_issues: { type: "array", items: { type: "string" } },
        top_3_priorities: { type: "array", items: { type: "string" } },
        overall_assessment: { type: "string" },
      },
      required: ["ats_score", "weak_bullets", "missing_metrics", "top_3_priorities", "overall_assessment"],
    },
  },
  required: ["contact", "headline", "summary", "experience", "education", "skills", "languages", "certifications", "diagnosis"],
};
