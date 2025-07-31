const express = require('express');
const router = express.Router();
const { createSchedule, getSchedule,deleteSchedule,getScheduleById,updateShedule,searchSchedule,getCourses,getGrades, getDays,getTimeSlots,getLecturers } = require('../../controllers/slot_controller/sheduleController');

router.post('/schedule/',createSchedule)
router.get('/schedule/', getSchedule);
router.get('/schedule/search',searchSchedule);
router.get('/schedule/:id',getScheduleById);
router.delete('/schedule/:id',deleteSchedule);
router.patch('/schedule/:id',updateShedule);

router.get('/master/courses', getCourses);
router.get('/master/grades', getGrades);
router.get('/master/days', getDays);
router.get('/master/timeslots', getTimeSlots);
router.get('/master/lecturers', getLecturers);

module.exports = router;
