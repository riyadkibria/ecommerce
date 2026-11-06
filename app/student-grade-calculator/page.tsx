
import {
  Page,
  Header,
  StudentCard,
  SummaryGrid,
  SummaryCard,
  SubjectTable,
  Footer,
} from "./design";

export default function StudentGradeCalculator() {
  // 1. Student Information
  const studentName: string = "Riyad";
  const studentId: string = "STU-2026-001";

  // 2. Subject Information
  const subjects: string[] = [
    "Mathematics",
    "English",
    "Science",
    "Computer Science",
    "Physics",
  ];

  const subjectMarks: number[] = [80, 90, 85, 75, 95];

  // 3. Calculate Total
  function calculateTotal(marks: number[]): number {
    let total: number = 0;

    for (const mark of marks) {
      total = total + mark;
    }

    return total;
  }

  // 4. Calculate Average
  function calculateAverage(
    total: number,
    totalSubjects: number
  ): number {
    if (totalSubjects === 0) {
      return 0;
    }

    return total / totalSubjects;
  }

  // 5. Check Result
  function checkResult(average: number): string {
    if (average >= 40) {
      return "Passed";
    }

    return "Failed";
  }

  // 6. Calculate Grade
  function calculateGrade(average: number): string {
    if (average >= 90) {
      return "A+";
    } else if (average >= 70) {
      return "A";
    } else if (average >= 60) {
      return "A-";
    } else if (average >= 50) {
      return "B";
    } else if (average >= 40) {
      return "C";
    } else {
      return "F";
    }
  }

  // 7. Function Calls
  const totalMarks = calculateTotal(subjectMarks);

  const averageMarks = calculateAverage(
    totalMarks,
    subjectMarks.length
  );

  const result = checkResult(averageMarks);
  const grade = calculateGrade(averageMarks);

  // 8. UI
  return (
    <Page>
      <Header />

      <StudentCard
        name={studentName}
        studentId={studentId}
      />

      <SummaryGrid>
        <SummaryCard
          label="TOTAL MARKS"
          value={totalMarks}
          description={`Out of ${subjectMarks.length * 100} marks`}
          accent="#a78bfa"
        />

        <SummaryCard
          label="AVERAGE"
          value={`${averageMarks.toFixed(2)}%`}
          description="Overall performance"
          accent="#22d3ee"
        />

        <SummaryCard
          label="FINAL GRADE"
          value={grade}
          description="Academic grade"
          accent="#fbbf24"
        />

        <SummaryCard
          label="RESULT STATUS"
          value={result}
          description="Final examination"
          accent={result === "Passed" ? "#34d399" : "#fb7185"}
        />
      </SummaryGrid>

      <SubjectTable
        subjects={subjects}
        marks={subjectMarks}
      />

      <Footer />
    </Page>
  );
}
