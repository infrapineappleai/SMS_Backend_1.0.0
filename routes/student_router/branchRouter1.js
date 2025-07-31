const express = require('express');
const router = express.Router();
const BranchController = require('../../controllers/student_controller/branchController');

router.get('/', BranchController.listBranches);

module.exports = router;