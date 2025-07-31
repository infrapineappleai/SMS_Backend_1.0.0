const { sequelize } = require('../../models/slot_models/index');
const { Op, fn, col, where, literal } = require('sequelize');

// Helper function to format time
const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

// Create a new schedule
const createSchedule = async (req, res) => {
  const { user_id, grade_id, course_id, branch_id, days, start_time, end_time } = req.body;

  if (!user_id || !grade_id || !Array.isArray(days) || !start_time || !end_time || !course_id || !branch_id) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const transaction = await sequelize.transaction();
  try {
    const { User, Slot, UserSlot, UserGrade } = sequelize.models;

    const teacher = await User.findOne({ where: { id: user_id, role: 'teacher' }, transaction });
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'User not found or not a teacher' });
    }

    // Create user-grade association if it doesn't exist
    await UserGrade.findOrCreate({ where: { user_id, grade_id }, defaults: { user_id, grade_id }, transaction });

    const createdSlots = [];
    const skippedDays = [];

    for (const day of days) {
      const slotCount = await Slot.count({ where: { day }, transaction });
      if (slotCount >= 10) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Maximum slots reached for this day' });
      }

      // Check if slot with same day, time, course, branch, and user already exists
      const existingSlot = await Slot.findOne({
        where: { day, st_time: start_time, end_time: end_time, course_id, branch_id, grade_id },
        include: [{
          model: User,
          as: 'Users',
          where: { id: user_id },
          through: { where: { user_id } },
          required: true
        }],
        transaction
      });

      if (existingSlot) {
        skippedDays.push(day);
        continue;
      }

      // Create slot with grade_id directly
      const newSlot = await Slot.create({ day, st_time: start_time, end_time, branch_id, course_id, grade_id }, { transaction });

      await UserSlot.create({ user_id, slot_id: newSlot.id }, { transaction });

      createdSlots.push({
        slot_id: newSlot.id,
        day,
        start_time,
        end_time,
        lecturer_name: `${teacher.first_name} ${teacher.last_name}`,
        course_name: null,
        grade: null,
        course_id,
        grade_id,
        user_id
      });
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Schedule created successfully',
      data: createdSlots,
      skipped_days: skippedDays.length ? `Skipped existing slots for days: ${skippedDays.join(', ')}` : null
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Schedule creation failed:', error);
    res.status(500).json({ success: false, message: 'Failed to create schedule', error: error.message });
  }
};

// Get all schedules
const getSchedule = async (req, res) => {
  try {
    const { page = 1, limit = 30, course_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (course_id) where.course_id = course_id;

    const slots = await sequelize.models.Slot.findAll({
      where,
      attributes: ['id', 'day', 'st_time', 'end_time', 'course_id', 'branch_id', 'grade_id'],
      include: [
        {
          model: sequelize.models.User,
          as: 'Users',
          attributes: ['id', 'first_name', 'last_name'],
          through: { attributes: [] },
          where: { role: 'teacher' },
          required: false,
        },
        {
          model: sequelize.models.Course,
          as: 'Course',
          attributes: ['id', 'name'],
        },
        {
          model: sequelize.models.Grade,
          as: 'Grade',
          attributes: ['id', 'grade_name'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['day', 'ASC'], ['st_time', 'ASC']],
    });

    const formattedSchedule = slots.map(slot => {
      const teacher = slot.Users.length > 0 ? slot.Users[0] : null;

      return {
        id: slot.id,
        slot_id: slot.id,
        lecturer_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A',
        course_id: slot.Course?.id || null,
        course_name: slot.Course?.name || 'N/A',
        grade_id: slot.grade_id || null,
        grade: slot.Grade ? slot.Grade.grade_name : 'N/A',
        days: [slot.day],
        time: slot.st_time && slot.end_time
          ? `${slot.st_time.substring(0, 5)}-${slot.end_time.substring(0, 5)}`
          : 'N/A',
        start_time: slot.st_time,
        end_time: slot.end_time,
        user_id: teacher?.id || null,
        branch_id: slot.branch_id
      };
    });

    const totalCount = await sequelize.models.Slot.count({ where });

    res.json({
      success: true,
      data: formattedSchedule,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount
      }
    });
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching schedule', error: error.message });
  }
};

// Get schedule by ID
const getScheduleById = async (req, res) => {
  const slot_id = req.params.id;
  if (!slot_id) 
    return res.status(400).json({ success: false, message: 'Slot ID is required' });

  try {
    const { Slot, User, Grade, Course } = sequelize.models;

    // Find slot with Course, Grade, and Users (teachers)
    const slot = await Slot.findOne({
      where: { id: slot_id },
      attributes: ['id', 'day', 'st_time', 'end_time', 'course_id', 'branch_id', 'grade_id'],
      include: [
        {
          model: User,
          as: 'Users',
          attributes: ['id', 'first_name', 'last_name'],
          through: { attributes: [] },
          required: false
        },
        {
          model: Course,
          as: 'Course',
          attributes: ['id', 'name']
        },
        {
          model: Grade,
          as: 'Grade',
          attributes: ['id', 'grade_name']
        }
      ]
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Get first teacher if exists
    const teacher = slot.Users.length > 0 ? slot.Users[0] : null;

    // Prepare response data
    const scheduleDetails = {
      id: slot.id,
      lecturer_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A',
      user_id: teacher ? teacher.id : null,
      course_id: slot.Course ? slot.Course.id : null,
      course_name: slot.Course ? slot.Course.name : 'N/A',
      grade_id: slot.grade_id || null,
      grade: slot.Grade ? slot.Grade.grade_name : 'N/A',
      day: slot.day,
      start_time: slot.st_time,
      end_time: slot.end_time,
      time: `${slot.st_time?.substring(0, 5)} - ${slot.end_time?.substring(0, 5)}`,
      branch_id: slot.branch_id
    };

    res.status(200).json({ success: true, data: scheduleDetails });
  } catch (error) {
    console.error('Error fetching schedule by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule details', error: error.message });
  }
};

// Update schedule
const updateShedule = async (req, res) => {
  const slot_id = parseInt(req.params.id, 10);
  if (!slot_id || isNaN(slot_id) || slot_id <= 0) {
    return res.status(400).json({ success: false, message: 'Valid Slot ID is required' });
  }

  const { day, start_time, end_time, course_id, branch_id, user_id, grade_id } = req.body;

  if (!day && !start_time && !end_time && !course_id && !branch_id && !user_id && !grade_id) {
    return res.status(400).json({
      success: false,
      message: 'At least one field must be provided for update',
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const { Slot, UserSlot, UserGrade, User } = sequelize.models;

    const existingSlot = await Slot.findOne({
      where: { id: slot_id },
      include: [{ model: User, as: 'Users', through: { attributes: [] } }],
      transaction,
    });

    if (!existingSlot) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    const currentUserId = existingSlot.Users[0]?.id;

    // Update UserSlot if user_id changed
    if (user_id && user_id !== currentUserId) {
      await UserSlot.destroy({ where: { slot_id }, transaction });
      await UserSlot.create({ user_id, slot_id }, { transaction });
    }

    // Update UserGrade if user_id and grade_id provided, but do NOT auto-change grade if only user_id changed
    if (user_id && grade_id) {
      const userGrade = await UserGrade.findOne({ where: { user_id }, transaction });
      if (userGrade) {
        if (userGrade.grade_id !== grade_id) {
          await userGrade.update({ grade_id }, { transaction });
        }
      } else {
        await UserGrade.create({ user_id, grade_id }, { transaction });
      }
    }

    // Update slot fields including grade_id (directly on slot)
    await Slot.update(
      {
        day: day ?? existingSlot.day,
        st_time: start_time ?? existingSlot.st_time,
        end_time: end_time ?? existingSlot.end_time,
        course_id: course_id ?? existingSlot.course_id,
        branch_id: branch_id ?? existingSlot.branch_id,
        grade_id: grade_id ?? existingSlot.grade_id,
      },
      { where: { id: slot_id }, transaction }
    );

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Slot updated successfully',
      slot_id,
      updated_fields: Object.keys(req.body),
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update schedule error:', error);
    res.status(500).json({ success: false, message: 'Failed to update slot', error: error.message });
  }
};

// Delete schedule
const deleteSchedule = async (req, res) => {
  const slot_id = req.params.id;

  if (!slot_id) {
    return res.status(400).json({ success: false, message: 'Slot ID is required' });
  }

  const transaction = await sequelize.transaction();

  try {
    await sequelize.models.UserSlot.destroy({ where: { slot_id }, transaction });
    const deletedCount = await sequelize.models.Slot.destroy({ where: { id: slot_id }, transaction });

    if (deletedCount === 0) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: `Slot with ID ${slot_id} not found` });
    }

    await transaction.commit();
    res.status(200).json({ success: true, message: `Slot with ID ${slot_id} deleted successfully` });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete slot error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete slot', error: error.message });
  }
};

// Search schedules
const searchSchedule = async (req, res) => {
  try {
    const { lecturer_name, course, grade, day } = req.query;

    const whereUser = {};
    const whereCourse = {};
    const whereGrade = {};
    const whereSlot = {};

    if (lecturer_name) {
      const cleanName = lecturer_name.trim().toLowerCase();
      whereUser[Op.or] = [
        where(fn('LOWER', fn('TRIM', col('User.first_name'))), { [Op.like]: `%${cleanName}%` }),
        where(fn('LOWER', fn('TRIM', col('User.last_name'))), { [Op.like]: `%${cleanName}%` }),
        literal(`LOWER(CONCAT(TRIM(\`User\`.\`first_name\`), ' ', TRIM(\`User\`.\`last_name\`))) LIKE '%${cleanName}%'`)
      ];
    }

    if (course) {
      whereCourse.name = { [Op.like]: `%${course.toLowerCase()}%` };
    }

    if (grade) {
      whereGrade.grade_name = { [Op.like]: `%${grade.toLowerCase()}%` };
    }

    if (day) {
      whereSlot.day = { [Op.eq]: day.toLowerCase() };
    }

    const users = await sequelize.models.User.findAll({
      where: whereUser,
      include: [
        {
          model: sequelize.models.Slot,
          through: { attributes: [] },
          where: whereSlot,
          attributes: ['day', 'st_time', 'end_time', 'course_id'],
          include: [{
            model: sequelize.models.Course,
            attributes: ['name'],
            as: 'Course',
            where: Object.keys(whereCourse).length ? whereCourse : undefined
          }]
        },
        {
          model: sequelize.models.Grade,
          through: { attributes: [] },
          attributes: ['grade_name'],
          where: Object.keys(whereGrade).length ? whereGrade : undefined
        }
      ]
    });

    const schedule = users.map(user => {
      const fullName = `${user.first_name} ${user.last_name}`;
      return user.Slots.map(slot => ({
        lecturer_name: fullName,
        course: slot.Course?.name || 'N/A',
        grade: user.Grades[0]?.grade_name || 'N/A',
        day: slot.day,
        time: `${slot.st_time} - ${slot.end_time}`,
        start_time: slot.st_time,
        end_time: slot.end_time,
        course_id: slot.course_id
      }));
    }).flat();

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Search schedule error:', error);
    res.status(500).json({ success: false, message: 'Error searching schedule', error: error.message });
  }
};

// Get all lecturers
const getLecturers = async (req, res) => {
  try {
    const lecturers = await sequelize.models.User.findAll({
      where: { role: 'teacher' },
      attributes: [
        'id',
        [sequelize.fn('CONCAT', sequelize.col('first_name'), ' ', sequelize.col('last_name')), 'name']
      ],
      order: [[sequelize.fn('CONCAT', sequelize.col('first_name'), ' ', sequelize.col('last_name')), 'ASC']]
    });
    res.json({ success: true, data: lecturers });
  } catch (error) {
    console.error('Lecturers fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lecturers', error: error.message });
  }
};

// Get all courses
const getCourses = async (req, res) => {
  try {
    const courses = await sequelize.models.Course.findAll({
      attributes: ['id', 'name', 'course_code'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Courses fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses', error: error.message });
  }
};

// Get all grades
const getGrades = async (req, res) => {
  try {
    const grades = await sequelize.models.Grade.findAll({
      attributes: ['id', 'grade_name', 'course_id'],
      include: [{
        model: sequelize.models.Course,
        attributes: ['name'],
        as: 'Course'
      }],
      order: [['grade_name', 'ASC']]
    });

    const transformed = grades.map(grade => ({
      id: grade.id,
      name: grade.grade_name,
      course_id: grade.course_id,
      course_name: grade.Course ? grade.Course.name : null
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    console.error('Grades fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching grades', error: error.message });
  }
};

// Get all available days
const getDays = async (req, res) => {
  try {
    const days = await sequelize.models.Slot.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('day')), 'name']],
      raw: true
    });

    const dayOrder = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const formatted = days
      .map((d, i) => ({ id: i + 1, name: d.name || d.day }))
      .sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Days fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching days', error: error.message });
  }
};

// Get all available time slots
const getTimeSlots = async (req, res) => {
  try {
    const startTimes = await sequelize.models.Slot.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('st_time')), 'time']],
      raw: true,
    });

    const endTimes = await sequelize.models.Slot.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('end_time')), 'time']],
      raw: true,
    });

    const allTimes = [];

    for (const t of startTimes) {
      allTimes.push({ time: t.time, type: 'start' });
    }

    for (const t of endTimes) {
      const existing = allTimes.find(slot => slot.time === t.time);
      if (existing) {
        existing.type = 'both';
      } else {
        allTimes.push({ time: t.time, type: 'end' });
      }
    }

    const uniqueTimes = allTimes
      .map(slot => ({
        id: slot.time,
        value: slot.time,
        label: formatTime(slot.time),
        type: slot.type
      }))
      .sort((a, b) => new Date(`1970-01-01T${a.value}`) - new Date(`1970-01-01T${b.value}`));

    res.json({ success: true, data: uniqueTimes });
  } catch (error) {
    console.error('Time slots fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching time slots', error: error.message });
  }
};

module.exports = {
  createSchedule,
  getSchedule,
  getScheduleById,
  updateShedule,
  deleteSchedule,
  searchSchedule,
  getLecturers,
  getCourses,
  getGrades,
  getDays,
  getTimeSlots
};
