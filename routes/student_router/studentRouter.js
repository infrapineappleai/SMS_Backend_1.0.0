const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const studentController = require('../../controllers/student_controller/studentController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/students/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const userId = req.body.user ? JSON.parse(req.body.user || '{}').id || timestamp : timestamp;
    cb(null, `student-${userId}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, or .png files allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/finalize', upload.single('photo'), studentController.finalizeStudentRegistration);
router.get('/:userId/profile', studentController.getStudentProfile);
router.post('/:userId/photo', upload.single('photo'), studentController.uploadStudentPhoto);
router.delete('/:userId', studentController.deleteStudent);
router.patch('/:userId', express.json(), upload.single('photo'), studentController.updateStudentProfile); 
router.patch('/:userId/photo', upload.single('photo'), studentController.uploadStudentPhoto);
router.get('/:studentId/branches', studentController.getStudentBranches);
router.get('/:studentId/slots', studentController.getStudentSlots);

module.exports = router;