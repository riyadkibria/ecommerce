// app/page.tsx

interface Student {
  name: string;
  age: number;
  city: string;
}

export default function Home() {
  const student: Student = {
    name: "Riyad",
    age: 38,
    city: "Dhaka",
  };

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Student Card</h1>

      <h2>{student.name}</h2>

      <p>Age: {student.age}</p>

      <p>City: {student.city}</p>
    </main>
  );
}