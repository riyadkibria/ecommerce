
import type { ReactNode, CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "55px 24px",
    color: "#f8fafc",
    background:
      "radial-gradient(ellipse at 10% 0%, #302052 0%, transparent 38%), radial-gradient(ellipse at 90% 15%, #10344b 0%, transparent 35%), #080b16",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1150px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "35px",
  },
  eyebrow: {
    color: "#a78bfa",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "2px",
    marginBottom: "12px",
  },
  title: {
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 800,
    letterSpacing: "-1.5px",
    background: "linear-gradient(90deg, #fff, #a78bfa, #67e8f9)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: "12px",
    fontSize: "14px",
  },
  badge: {
    padding: "12px 17px",
    borderRadius: "30px",
    border: "1px solid #51417c",
    background: "#211a3a",
    color: "#c4b5fd",
    fontSize: "12px",
  },
  studentCard: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    padding: "28px",
    marginBottom: "25px",
    border: "1px solid #393252",
    borderRadius: "20px",
    background: "linear-gradient(120deg, #292047, #151d30)",
  },
  avatar: {
    width: "68px",
    height: "68px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #8b5cf6, #4f46e5)",
    display: "grid",
    placeItems: "center",
    fontSize: "29px",
    fontWeight: 800,
    color: "white",
    flexShrink: 0,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: "23px",
    fontWeight: 750,
    marginBottom: "7px",
  },
  muted: {
    color: "#94a3b8",
    fontSize: "12px",
  },
  active: {
    color: "#34d399",
    fontSize: "12px",
    fontWeight: 700,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "17px",
    marginBottom: "25px",
  },
  summaryCard: {
    padding: "24px",
    border: "1px solid #29334a",
    borderRadius: "18px",
    background: "linear-gradient(145deg, #1a2238, #111827)",
  },
  cardLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    marginBottom: "20px",
  },
  cardValue: {
    fontSize: "30px",
    fontWeight: 800,
    marginBottom: "9px",
  },
  cardDescription: {
    color: "#718096",
    fontSize: "11px",
  },
  subjectCard: {
    padding: "28px",
    border: "1px solid #29334a",
    borderRadius: "20px",
    background: "#141c30",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "25px",
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: 750,
  },
  count: {
    color: "#c4b5fd",
    background: "#292044",
    padding: "9px 14px",
    borderRadius: "20px",
    fontSize: "11px",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "600px",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "15px",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    borderBottom: "1px solid #29334a",
  },
  td: {
    padding: "18px 15px",
    color: "#cbd5e1",
    fontSize: "13px",
    borderBottom: "1px solid #263044",
  },
  progressTrack: {
    width: "90px",
    height: "7px",
    background: "#29334a",
    borderRadius: "20px",
    overflow: "hidden",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    padding: "25px 5px",
    color: "#64748b",
    fontSize: "11px",
  },
};

type CardProps = {
  label: string;
  value: string | number;
  description: string;
  accent: string;
};

export function Page({ children }: { children: ReactNode }) {
  return (
    <main style={styles.page}>
      <div style={styles.container}>{children}</div>
    </main>
  );
}

export function Header() {
  return (
    <header style={styles.header}>
      <div>
        <p style={styles.eyebrow}>ACADEMIC MANAGEMENT</p>
        <h1 style={styles.title}>Student Grade Calculator</h1>
        <p style={styles.subtitle}>
          Track academic performance and results.
        </p>
      </div>
      <div style={styles.badge}>● Academic Report</div>
    </header>
  );
}

export function StudentCard({
  name,
  studentId,
}: {
  name: string;
  studentId: string;
}) {
  return (
    <section style={styles.studentCard}>
      <div style={styles.avatar}>{name.charAt(0).toUpperCase()}</div>
      <div style={styles.studentInfo}>
        <p style={styles.eyebrow}>STUDENT NAME</p>
        <h2 style={styles.studentName}>{name}</h2>
        <p style={styles.muted}>Student ID: {studentId}</p>
      </div>
      <p style={styles.active}>● Active Student</p>
    </section>
  );
}

export function SummaryCard({
  label,
  value,
  description,
  accent,
}: CardProps) {
  return (
    <article
      style={{
        ...styles.summaryCard,
        borderTop: `3px solid ${accent}`,
      }}
    >
      <p style={styles.cardLabel}>{label}</p>
      <h2 style={{ ...styles.cardValue, color: accent }}>{value}</h2>
      <p style={styles.cardDescription}>{description}</p>
    </article>
  );
}

export function SummaryGrid({ children }: { children: ReactNode }) {
  return <section style={styles.summaryGrid}>{children}</section>;
}

export function SubjectTable({
  subjects,
  marks,
}: {
  subjects: string[];
  marks: number[];
}) {
  return (
    <section style={styles.subjectCard}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>PERFORMANCE BREAKDOWN</p>
          <h2 style={styles.sectionTitle}>Subject Marks</h2>
        </div>
        <span style={styles.count}>{marks.length} Subjects</span>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>Marks</th>
              <th style={styles.th}>Performance</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((mark, index) => (
              <tr key={index}>
                <td style={styles.td}>
                  {subjects[index] ?? `Subject ${index + 1}`}
                </td>
                <td style={styles.td}>{mark}/100</td>
                <td style={styles.td}>
                  <div
                    style={{
                      ...styles.progressTrack,
                      width: "100px",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(mark, 100))}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, #6366f1, #a78bfa)",
                        borderRadius: "20px",
                      }}
                    />
                  </div>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      color: mark >= 40 ? "#34d399" : "#fb7185",
                      fontWeight: 700,
                    }}
                  >
                    {mark >= 40 ? "Passed" : "Failed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer style={styles.footer}>
      <p>Student Grade Calculator</p>
      <p>Powered by Next.js & TypeScript</p>
    </footer>
  );
}
