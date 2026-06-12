import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

// ATS-friendly: una sola columna, sin tablas ni gráficos, fuente estándar
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    color: "#1a1a1a",
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  headline: {
    fontSize: 11,
    color: "#444",
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9,
    color: "#555",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  experienceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  company: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  role: {
    fontSize: 10,
    color: "#333",
    marginBottom: 3,
  },
  dates: {
    fontSize: 9,
    color: "#666",
  },
  bullet: {
    fontSize: 9.5,
    marginBottom: 1.5,
    paddingLeft: 10,
  },
  bulletDot: {
    fontSize: 9.5,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillTag: {
    fontSize: 9,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 3,
    marginRight: 3,
  },
  summaryText: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#333",
  },
  educationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
});

interface CvDocumentProps {
  profile: CvProfile;
}

export function CvDocument({ profile }: CvDocumentProps) {
  const { contact, headline, summary, experience, education, skills, languages, certifications } = profile;

  const contactParts = [
    contact.email,
    contact.phone,
    contact.linkedin,
    contact.location,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.contactLine}>{contactParts.join(" · ")}</Text>

        {/* Resumen profesional */}
        {summary && (
          <>
            <Text style={styles.sectionTitle}>Resumen Profesional</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </>
        )}

        {/* Experiencia */}
        {experience.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Experiencia</Text>
            {experience.map((exp, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.company}>{exp.company}</Text>
                  <Text style={styles.dates}>
                    {exp.start} – {exp.current ? "Presente" : exp.end ?? ""}
                  </Text>
                </View>
                <Text style={styles.role}>{exp.role}</Text>
                {(exp.achievements_with_metrics?.length
                  ? exp.achievements_with_metrics
                  : exp.bullets
                ).map((bullet, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>• </Text>
                    <Text style={styles.bullet}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Educación */}
        {education.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Educación</Text>
            {education.map((edu, i) => (
              <View key={i} style={styles.educationRow}>
                <View>
                  <Text style={styles.company}>{edu.institution}</Text>
                  <Text style={styles.role}>
                    {edu.degree}{edu.field ? ` en ${edu.field}` : ""}
                  </Text>
                </View>
                {(edu.start || edu.end) && (
                  <Text style={styles.dates}>
                    {edu.start ?? ""}{edu.end ? ` – ${edu.end}` : ""}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Habilidades */}
        {(skills.hard.length > 0 || skills.tools.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Habilidades</Text>
            <View style={styles.skillsRow}>
              {[...skills.hard, ...skills.tools].map((skill, i) => (
                <Text key={i} style={styles.skillTag}>{skill}</Text>
              ))}
            </View>
          </>
        )}

        {/* Idiomas */}
        {languages.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Idiomas</Text>
            <Text style={styles.summaryText}>
              {languages.map((l) => `${l.name} (${l.level})`).join(" · ")}
            </Text>
          </>
        )}

        {/* Certificaciones */}
        {certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Certificaciones</Text>
            {certifications.map((cert, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>• </Text>
                <Text style={styles.bullet}>{cert}</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
