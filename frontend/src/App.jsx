
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState([]);
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      const urls = [
        `${API}/api/students`,
        `${API}/api/attendance`,
        `${API}/api/summary`
      ];

      const responses = await Promise.all(
        urls.map(url => fetch(url))
      );

      if (responses.some(response => !response.ok)) {
        throw new Error("Failed to load data");
      }

      const data = await Promise.all(
        responses.map(response => response.json())
      );

      setStudents(data[0]);
      setHistory(data[1]);
      setSummary(data[2]);
    } catch {
      setMessage("Check backend and MongoDB connection.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addStudent(e) {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rollNo, department })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setName("");
      setRollNo("");
      setMessage("Student added successfully!");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function markAttendance(studentId, status) {
    try {
      const response = await fetch(`${API}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, date, status })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setMessage(data.message);
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteStudent(id) {
    if (!window.confirm("Delete this student?")) return;

    try {
      const response = await fetch(`${API}/api/students/${id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setMessage(data.message);
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const presentToday = history.filter(
    item => item.date === date && item.status === "Present"
  ).length;

  const absentToday = history.filter(
    item => item.date === date && item.status === "Absent"
  ).length;

  return (
    <div className="container">
      <header>
        <h1>Student Attendance Management System</h1>
        <p>Manage students and daily attendance</p>
      </header>

      {message && <p className="message">{message}</p>}

      <div className="stats">
        <div className="stat">
          <h3>Total Students</h3>
          <p>{students.length}</p>
        </div>
        <div className="stat">
          <h3>Present Today</h3>
          <p>{presentToday}</p>
        </div>
        <div className="stat">
          <h3>Absent Today</h3>
          <p>{absentToday}</p>
        </div>
      </div>

      <section className="panel">
        <h2>Add Student</h2>

        <form onSubmit={addStudent}>
          <input
            placeholder="Student Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <input
            placeholder="Roll Number"
            value={rollNo}
            onChange={e => setRollNo(e.target.value)}
            required
          />

          <input
            placeholder="Department"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            required
          />

          <button type="submit">Add Student</button>
        </form>
      </section>

      <section className="panel">
        <h2>Mark Attendance</h2>

        <label>
          Date:{" "}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </label>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map(student => {
                const record = history.find(
                  item =>
                    item.rollNo === student.rollNo &&
                    item.date === date
                );

                return (
                  <tr key={student._id}>
                    <td>{student.rollNo}</td>
                    <td>{student.name}</td>
                    <td>{student.department}</td>
                    <td>{record?.status || "Not marked"}</td>
                    <td>
                      <button
                        className="present"
                        onClick={() =>
                          markAttendance(student._id, "Present")
                        }
                      >
                        Present
                      </button>{" "}
                      <button
                        className="absent"
                        onClick={() =>
                          markAttendance(student._id, "Absent")
                        }
                      >
                        Absent
                      </button>{" "}
                      <button
                        className="delete"
                        onClick={() => deleteStudent(student._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Attendance Percentage</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Percentage</th>
              </tr>
            </thead>

            <tbody>
              {summary.map(student => (
                <tr key={student._id}>
                  <td>{student.rollNo}</td>
                  <td>{student.name}</td>
                  <td>{student.present}</td>
                  <td>{student.absent}</td>
                  <td>{student.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Attendance History</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Roll No</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {history.map(record => (
                <tr key={record._id}>
                  <td>{record.date}</td>
                  <td>{record.rollNo}</td>
                  <td>{record.studentName}</td>
                  <td>{record.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
