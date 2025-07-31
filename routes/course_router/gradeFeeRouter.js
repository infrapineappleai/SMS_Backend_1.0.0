const express = require("express");
const router = express.Router();
const gradeFeeController = require("../../controllers/course_controller/gradeFeeController");

// GradeFee CRUD Endpoints
router.post("/", gradeFeeController.createGradeFee);      // Create new grade fee
router.get("/", gradeFeeController.getAllGradeFees);     // Get all grade fees
router.get("/:id", gradeFeeController.getGradeFeeById);  // Get single grade fee
router.patch("/:id", gradeFeeController.updateGradeFee); // Update grade fee
router.delete("/:id", gradeFeeController.deleteGradeFee);// Delete grade fee

module.exports = router;