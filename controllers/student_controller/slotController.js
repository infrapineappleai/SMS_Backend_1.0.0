const { Slot, UserSlot, User } = require('../../models/student_models/index');

exports.getAvailableSlots = async (req, res) => {
  try {
    const { branchId, courseId, gradeId } = req.query;
    if (!branchId || !courseId || !gradeId) {
      throw new Error('Missing query parameters: branchId, courseId, or gradeId');
    }

    console.log('Querying slots with:', { branchId, courseId, gradeId });
    const slots = await Slot.findAll({
      where: {
        branch_id: branchId,
        course_id: courseId,
        grade_id: gradeId
      },
      attributes: ['id', 'day', 'st_time', 'end_time', 'branch_id', 'course_id', 'grade_id'],
      include: [{
        model: UserSlot,
        as: 'Users',
        attributes: ['id']
      }]
    });
    console.log('Found slots:', slots);

    const availableSlots = slots
      .filter(slot => slot.Users.length < 10)
      .map(slot => ({
        id: slot.id,
        day: slot.day,
        start_time: slot.st_time,
        end_time: slot.end_time,
        branch_id: slot.branch_id,
        course_id: slot.course_id,
        grade_id: slot.grade_id
      }));

    if (availableSlots.length === 0) throw new Error('No slots available');
    res.json(availableSlots);
  } catch (error) {
    console.error('getAvailableSlots error:', error);
    res.status(404).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.bookSlot = async (req, res) => {
  try {
    const student = await User.findOne({
      where: { id: req.params.studentId, role: 'student' }
    });
    if (!student) throw new Error('Student not found');

    const slot = await Slot.findByPk(req.params.slotId);
    if (!slot) throw new Error('Slot not found');

    const bookingCount = await UserSlot.count({ where: { slot_id: req.params.slotId } });
    if (bookingCount >= 10) throw new Error('Slot is fully booked');

    const booking = await UserSlot.create({
      user_id: req.params.studentId,
      slot_id: req.params.slotId
    });
    res.json({ success: true, booking });
  } catch (error) {
    console.error('bookSlot error:', error);
    res.status(400).json({
      error: error.message.includes('unique constraint')
        ? 'Slot already booked by this student'
        : error.message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};