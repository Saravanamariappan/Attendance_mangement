
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Student Schema
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  department: {
    type: String,
    default: "CSE",
    trim: true
  }
});

const Student = mongoose.model("Student", studentSchema);

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Present", "Absent"],
    required: true
  }
});

// One attendance record per student per day
attendanceSchema.index(
  { studentId: 1, date: 1 },
  { unique: true }
);

const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);

// Home Route
app.get("/", (req, res) => {
  res.send("Student Attendance Management API is running");
});

// Add Student
app.post("/api/students", async (req, res) => {
  try {
    const { name, rollNo, department } = req.body;

    if (!name || !rollNo) {
      return res.status(400).json({
        message: "Name and roll number are required"
      });
    }

    const student = await Student.create({
      name,
      rollNo,
      department: department || "CSE"
    });

    res.status(201).json({
      message: "Student added successfully",
      student
    });
  } catch (error) {
    res.status(400).json({
      message: error.code === 11000
        ? "Roll number already exists"
        : error.message
    });
  }
});

// Get All Students
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find().sort({
      rollNo: 1
    });

    res.json(students);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// Delete Student and Attendance
app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(
      req.params.id
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    await Attendance.deleteMany({
      studentId: student._id
    });

    res.json({
      message: "Student and attendance deleted successfully"
    });
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

// Mark or Update Attendance
app.post("/api/attendance", async (req, res) => {
  try {
    const { studentId, date, status } = req.body;

    if (
      !studentId ||
      !date ||
      !["Present", "Absent"].includes(status)
    ) {
      return res.status(400).json({
        message: "Valid student, date and status are required"
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    const record = await Attendance.findOneAndUpdate(
      { studentId, date },
      { studentId, date, status },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      message: "Attendance saved successfully",
      record
    });
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

// Get Attendance History
app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("studentId", "name rollNo")
      .sort({ date: -1 });

    const history = records.map(record => ({
      _id: record._id,
      studentName: record.studentId
        ? record.studentId.name
        : "Deleted student",
      rollNo: record.studentId
        ? record.studentId.rollNo
        : "-",
      date: record.date,
      status: record.status
    }));

    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// Get Attendance Percentage
app.get("/api/summary", async (req, res) => {
  try {
    const students = await Student.find();
    const records = await Attendance.find();

    const summary = students.map(student => {
      const studentRecords = records.filter(
        record =>
          record.studentId.toString() ===
          student._id.toString()
      );

      const present = studentRecords.filter(
        record => record.status === "Present"
      ).length;

      const absent = studentRecords.filter(
        record => record.status === "Absent"
      ).length;

      const total = present + absent;

      return {
        _id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        present,
        absent,
        total,
        percentage: total > 0
          ? Math.round((present / total) * 100)
          : 0
      };
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// Start Server and Connect MongoDB
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error(
    "ERROR: MONGO_URI is missing in the backend .env file"
  );
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
    process.exit(1);
  });
