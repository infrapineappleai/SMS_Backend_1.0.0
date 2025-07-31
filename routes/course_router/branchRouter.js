const express = require("express");
const router = express.Router();
const branchController = require("../../controllers/course_controller/branchController");

// Branch CRUD Endpoints
router.post("/", branchController.createBranch);          // Create new branch
router.get("/", branchController.getAllBranches);        // Get all branches
router.get("/:id", branchController.getBranchById);      // Get single branch
router.patch("/:id", branchController.updateBranch);     // Update branch
router.delete("/:id", branchController.deleteBranch);    // Delete branch

module.exports = router;