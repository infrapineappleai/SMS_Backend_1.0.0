const express = require("express");
const { connectDB } = require("./config/db"); // Import DB connection
const path = require('path');
const cors = require('cors');
const fs = require('fs');


const app = express();



// Middleware for parsing JSON
app.use(express.json());
app.use(cors());

const scheduleRouter = require('./routes/slot_router/sheduleRouter');
const paymentRoutes = require('./routes/payment_router/paymentRouter');
const studentRouter = require('./routes/student_router/studentRouter');
const courseRouter = require('./routes/course_router/courseRouter');
const gradeRouter = require('./routes/course_router/gradeRouter');
const gradeFeeRouter = require('./routes/course_router/gradeFeeRouter');
const branchRouter = require('./routes/course_router/branchRouter');
const userRouter = require('./routes/student_router/userRouter');


const branchRouter1 = require('./routes/student_router/branchRouter1');
const courseRouter1 = require('./routes/student_router/courseRouter1');
const slotRouter1 = require('./routes/student_router/slotRouter1');


// Ensure Uploads/students directory exists
const uploadDir = path.join(__dirname, 'Uploads', 'students');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static uploads folder
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// API routes
app.use('/api/users', userRouter);
app.use('/api/students', studentRouter);
app.use('/api/course', courseRouter);
app.use('/api/grade', gradeRouter);
app.use('/api/grade-fee', gradeFeeRouter);
app.use('/api/branch', branchRouter);
app.use('/api', scheduleRouter);
app.use('/api', paymentRoutes);

app.use('/api/courses', courseRouter1);
app.use('/api/slots', slotRouter1);
app.use('/api/branches', branchRouter1);






// 404 middleware for undefined routes
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();


app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port `);
});
