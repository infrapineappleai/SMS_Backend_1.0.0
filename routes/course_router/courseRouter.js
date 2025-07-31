// routes/courseRouter.js
const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/course_controller/courseController');

// GET all courses (with optional query params)
router.get('/', courseController.getAllCourses);

// GET single course
router.get('/:id', courseController.getCourseById);

// POST create course (with optional nested grades)
router.post('/', courseController.createCourse);

// PUT/PATCH update course (with nested grades)
router.put('/:id', courseController.updateCourse); 
router.patch('/:id', courseController.updateCourse);

// DELETE course
router.delete('/:id', courseController.deleteCourse);

//16
router.delete('/:courseId/grade-fee/:gradeFeeId', (req, res, next) => {
  console.log(`[CourseRouter] DELETE /api/course/${req.params.courseId}/grade-fee/${req.params.gradeFeeId}`);
  next();
}, require('../../controllers/course_controller/gradeFeeController').deleteGradeFee);

// Nested routes for grades
router.use('/:courseId/grades', require('./gradeRouter'));

// ✅ Define search route first
router.get('/search', courseController.searchCourses);

module.exports = router;