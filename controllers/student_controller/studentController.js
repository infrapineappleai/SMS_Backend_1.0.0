const { User, StudentDetails, UserGrade, UserSlot, UserBranch, Branch, Slot, Payment, sequelize } = require('../../models/student_models/index');

exports.finalizeStudentRegistration = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      user,
      student_details,
      grade_ids,
      slot_ids,
      branch_ids
    } = req.body;

    const parsedUser = JSON.parse(user || '{}');
    const parsedStudentDetails = JSON.parse(student_details || '{}');
    const parsedGradeIds = JSON.parse(grade_ids || '[]');
    const parsedSlotIds = JSON.parse(slot_ids || '[]');
    const parsedBranchIds = JSON.parse(branch_ids || '[]');

    if (!parsedStudentDetails.student_no) {
      throw new Error('student_no is required');
    }

    // Create User
    const newUser = await User.create(
      {
        ...parsedUser,
        role: 'student',
        status: 'active'
      },
      { transaction }
    );

    // Handle photo upload
    let photoUrl = '/default-avatar.png';
    if (req.file) {
      photoUrl = `/uploads/students/${req.file.filename}`;
      console.log('Photo saved:', photoUrl); // Debug
    }

    // Create Student Details
    await StudentDetails.create(
      {
        user_id: newUser.id,
        student_no: parsedStudentDetails.student_no,
        salutation: parsedStudentDetails.salutation,
        ice_contact: parsedStudentDetails.ice_contact,
        photo_url: photoUrl
      },
      { transaction }
    );

    // Assign Grades
    if (Array.isArray(parsedGradeIds) && parsedGradeIds.length > 0) {
      const gradeRecords = parsedGradeIds.map(grade_id => ({
        user_id: newUser.id,
        grade_id
      }));
      await UserGrade.bulkCreate(gradeRecords, { transaction });
    }

    // Assign Slots
    if (Array.isArray(parsedSlotIds) && parsedSlotIds.length > 0) {
      const slotRecords = parsedSlotIds.map(slot_id => ({
        user_id: newUser.id,
        slot_id
      }));
      await UserSlot.bulkCreate(slotRecords, { transaction });
    }

    // Assign Branches
    if (Array.isArray(parsedBranchIds) && parsedBranchIds.length > 0) {
      const branchRecords = parsedBranchIds.map(branch_id => ({
        user_id: newUser.id,
        branch_id
      }));
      await UserBranch.bulkCreate(branchRecords, { transaction, ignoreDuplicates: true });
    }

    await transaction.commit();
    res.status(201).json({
      success: true,
      message: 'Student registration completed successfully',
      user_id: newUser.id,
      id: newUser.id, 
      photo_url: photoUrl 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in finalizeStudentRegistration:', error);
    res.status(400).json({
      success: false,
      message: 'Student registration failed',
      error: error.message
    });
  }
};

exports.createStudentProfile = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findOne({
      where: { id: req.params.userId, role: 'student' }
    });
    if (!user) throw new Error('User is not a student or does not exist');

    if (!req.body.student_no) {
      throw new Error('Student number is required');
    }

    let photoUrl = '/default-avatar.png';
    if (req.file) {
      photoUrl = `/uploads/students/${req.file.filename}`;
      console.log('Photo saved:', photoUrl);
    }

    const studentProfile = await StudentDetails.create(
      {
        user_id: req.params.userId,
        student_no: req.body.student_no,
        salutation: req.body.salutation,
        ice_contact: req.body.ice_contact,
        photo_url: photoUrl
      },
      { transaction }
    );

    await transaction.commit();
    res.status(201).json({
      success: true,
      studentProfile,
      photo_url: photoUrl,
      next_step: `/students/${req.params.userId}/photo`
    });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({
      success: false,
      error: error.message.startsWith('Student number')
        ? error.message
        : 'Student profile creation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getStudentProfile = async (req, res) => {
  try {
    const student = await User.findOne({
      where: { id: req.params.userId, role: 'student' },
      include: [{ model: StudentDetails, as: 'StudentDetail' }]
    });
    if (!student) throw new Error('Student not found');
    res.json(student);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.getStudentGrades = async (req, res) => {
  try {
    const student = await User.findOne({
      where: { id: req.params.userId, role: 'student' }
    });
    if (!student) throw new Error('Student not found');

    const grades = await UserGrade.findAll({
      where: { user_id: req.params.userId },
      include: [
        {
          model: Grade,
          as: 'Grade',
          attributes: ['id', 'grade_name', 'course_id']
        }
      ]
    });

    res.json(grades.map(grade => ({
      id: grade.Grade.id,
      grade_name: grade.Grade.grade_name,
      course_id: grade.Grade.course_id
    })));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.updateStudentProfile = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Parse request data
    let studentDetails;
    try {
      studentDetails = req.body.student_details
        ? JSON.parse(req.body.student_details)
        : req.body;
    } catch (parseError) {
      throw new Error('Invalid student_details format');
    }

    let userDetails;
    try {
      userDetails = req.body.user
        ? JSON.parse(req.body.user)
        : req.body.user || {};
    } catch (parseError) {
      throw new Error('Invalid user format');
    }

    let gradeIds = [];
    try {
      gradeIds = req.body.grade_ids
        ? JSON.parse(req.body.grade_ids)
        : [];
    } catch (parseError) {
      throw new Error('Invalid grade_ids format');
    }

    let slotIds = [];
    try {
      slotIds = req.body.slot_ids
        ? JSON.parse(req.body.slot_ids)
        : [];
    } catch (parseError) {
      throw new Error('Invalid slot_ids format');
    }

    // Validate student_no
    if (studentDetails.student_no && studentDetails.student_no.trim() === '') {
      throw new Error('Student number must be a non-empty string');
    }

    // Prepare student update data
    const studentUpdateData = {
      student_no: studentDetails.student_no,
      salutation: studentDetails.salutation,
      ice_contact: studentDetails.ice_contact,
    };

    // Handle photo upload
    if (req.file) {
      studentUpdateData.photo_url = `/uploads/students/${req.file.filename}`;
      console.log('Photo saved:', studentUpdateData.photo_url);
    } else if (studentDetails.hasOwnProperty('photo_url')) {
      studentUpdateData.photo_url = studentDetails.photo_url;
    }

    // Validate userId
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID');
    }

    // Verify student exists
    const user = await User.findOne({ where: { id: userId, role: 'student' }, transaction });
    if (!user) {
      throw new Error('Student not found');
    }

    // Update User model
    await User.update(
      {
        name: userDetails.name,
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        username: userDetails.username,
        email: userDetails.email,
        phn_num: userDetails.phn_num,
        gender: userDetails.gender,
        date_of_birth: userDetails.date_of_birth,
        address: userDetails.address,
      },
      { where: { id: userId }, transaction }
    );

    // Update StudentDetails model
    const [updated] = await StudentDetails.update(
      studentUpdateData,
      { where: { user_id: userId }, transaction }
    );
    if (updated === 0) {
      throw new Error('Student profile not found');
    }

    // Update UserGrade (Grades and Courses)
    if (Array.isArray(gradeIds) && gradeIds.length > 0) {
      // Delete existing grades
      await UserGrade.destroy({ where: { user_id: userId }, transaction });
      // Insert new grades
      const gradeRecords = gradeIds.map(grade_id => ({
        user_id: userId,
        grade_id: parseInt(grade_id, 10),
      }));
      await UserGrade.bulkCreate(gradeRecords, { transaction });
    }

    // Update UserSlot (Slots: Day and Time)
    if (Array.isArray(slotIds) && slotIds.length > 0) {
      // Delete existing slots
      await UserSlot.destroy({ where: { user_id: userId }, transaction });
      // Insert new slots
      const slotRecords = slotIds.map(slot_id => ({
        user_id: userId,
        slot_id: parseInt(slot_id, 10),
      }));
      await UserSlot.bulkCreate(slotRecords, { transaction });
    }

    await transaction.commit();
    res.json({ success: true, photo_url: studentUpdateData.photo_url || 'unchanged' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating student:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.uploadStudentPhoto = async (req, res) => {
  try {
    const student = await User.findOne({
      where: { id: req.params.userId, role: 'student' },
    });
    if (!student) throw new Error('Student not found');

    if (!req.file) throw new Error('No file uploaded');

    const photoUrl = `/uploads/students/${req.file.filename}`;

    const [updated] = await StudentDetails.update(
      { photo_url: photoUrl },
      { where: { user_id: req.params.userId } }
    );
    if (updated === 0) throw new Error('Student profile not found');

    res.json({ success: true, photo_url: photoUrl });
  } catch (error) {
    console.error('Error uploading photo:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.params.userId;

    // Find student detail to get student_details.id
    const studentDetail = await StudentDetails.findOne({
      where: { user_id: userId },
      transaction,
    });

    if (!studentDetail) throw new Error("Student not found");

    const studentDetailsId = studentDetail.id;

    // Delete related records
    await Promise.all([
      Payment.destroy({ where: { student_details_id: studentDetailsId }, transaction }),
      UserGrade.destroy({ where: { user_id: userId }, transaction }),
      UserSlot.destroy({ where: { user_id: userId }, transaction }),
      UserBranch.destroy({ where: { user_id: userId }, transaction }),
      StudentDetails.destroy({ where: { user_id: userId }, transaction }),
    ]);

    // Delete the user last
    const deleted = await User.destroy({ where: { id: userId }, transaction });
    if (deleted === 0) throw new Error('User not found');

    await transaction.commit();
    res.json({ success: true, message: 'Student and all related data deleted permanently' });
  } catch (error) {
    await transaction.rollback();
    console.error("Hard delete failed:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};



exports.getStudentBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      attributes: ['id', 'branch_name'],
      include: [{
        model: UserBranch,
        as: 'UserBranches',
        where: { user_id: req.params.studentId },
        attributes: [],
        include: [{
          model: User,
          as: 'User',
          where: { role: 'student' },
          attributes: [],
        }],
      }],
    });
    res.json(branches);
  } catch (error) {
    console.error('Error fetching student branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};

exports.getStudentSlots = async (req, res) => {
  try {
    const slots = await Slot.findAll({
      attributes: ['id', 'day', 'st_time', 'end_time', 'branch_id', 'course_id', 'grade_id'],
      include: [{
        model: UserSlot,
        as: 'Users',
        where: { user_id: req.params.studentId },
        attributes: [],
        include: [{
          model: User,
          as: 'User',
          where: { role: 'student' },
          attributes: [],
        }],
      }],
    });
    res.json(slots);
  } catch (error) {
    console.error('Error fetching student slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};