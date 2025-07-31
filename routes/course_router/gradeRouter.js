const express = require("express");
const router = express.Router();
const gradeController = require("../../controllers/course_controller/gradeController");

// Grade CRUD Endpoints
router.post("/", gradeController.createGrade);            // Create new grade
router.get("/", gradeController.getAllGrades);           // Get all grades
router.get("/:id", gradeController.getGradeById);        // Get single grade
router.patch("/:id", gradeController.updateGrade);       // Update grade
router.delete("/:id", gradeController.deleteGrade);      // Delete grade

// Grade-Course Relationship Endpoints
router.post("/course/:id", gradeController.createGradesForCourse);       // Add grade to course
router.patch("/course/:id", gradeController.updateGradesForCourse);    // Bulk update course grades

module.exports = router;