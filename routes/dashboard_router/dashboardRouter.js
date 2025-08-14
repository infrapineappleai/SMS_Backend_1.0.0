const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController/dashboardController');

router.get('/', dashboardController.getDashboardSchedule); 

module.exports = router;