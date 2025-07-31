const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/student_controller/userController');

router.post('/', UserController.createUser);
router.get('/', UserController.listUsers);
router.get('/:id', UserController.getUser);
router.patch('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser)

module.exports = router;