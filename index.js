const express = require("express");

const app = express();

const PORT = 3000;

// Middleware
app.use(express.json());

// Sample Data
let students = [
    { id: 1, name: "Ayush", age: 20 },
    { id: 2, name: "Rahul", age: 21 }
];


// ================= GET =================

// Get all students
app.get("/students", (req, res) => {
    res.json(students);
});


// Get student by ID
app.get("/students/:id", (req, res) => {

    const id = parseInt(req.params.id);

    const student = students.find(s => s.id === id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    res.json(student);

});


// ================= POST =================

// Add new student
app.post("/students", (req, res) => {

    const { id, name, age } = req.body;

    const student = {
        id,
        name,
        age
    };

    students.push(student);

    res.status(201).json({
        message: "Student Added",
        student
    });

});


// ================= PUT =================

// Update student
app.put("/students/:id", (req, res) => {

    const id = parseInt(req.params.id);

    const student = students.find(s => s.id === id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    student.name = req.body.name;
    student.age = req.body.age;

    res.json({
        message: "Student Updated",
        student
    });

});


// ================= DELETE =================

// Delete student
app.delete("/students/:id", (req, res) => {

    const id = parseInt(req.params.id);

    students = students.filter(s => s.id !== id);

    res.json({
        message: "Student Deleted"
    });

});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});