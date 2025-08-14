

//removed unwanted slot without students details show array
const { Slot, UserSlot, User, Branch, StudentDetails } = require('../../models/student_models/index');

// Helper function to format time into 12-hour AM/PM
const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

exports.getDashboardSchedule = async (req, res) => {
  try {
    const { branchId } = req.query; // Optional: Filter by branch ID

    // Build where clause if filtering by branch
    const where = {};
    if (branchId) {
      where.branch_id = branchId;
    }

    // Fetch all slots with their students
    const slots = await Slot.findAll({
      where,
      attributes: ['id', 'day', 'st_time', 'end_time', 'branch_id'],
      include: [
        {
          model: Branch,
          as: 'Branch',
          attributes: ['id', 'branch_name'],
        },
        {
          model: UserSlot,
          as: 'Users',
          attributes: ['user_id'],
          include: [
            {
              model: User,
              as: 'User',
              where: { role: 'student' },
              attributes: ['id', 'username'],
              include: [
                {
                  model: StudentDetails,
                  as: 'StudentDetail',
                  attributes: ['photo_url'],
                },
              ],
            },
          ],
        },
      ],
    });

    // Initialize schedule object
    const schedule = {};

    // Step 1: Loop through each slot
    slots.forEach((slot) => {
      const branchName = slot.Branch?.branch_name || 'Unknown';
      const timeSlot = `${formatTime(slot.st_time)}-${formatTime(slot.end_time)}`;
      const day = slot.day;

      // Initialize nested objects if they don't exist
      if (!schedule[branchName]) schedule[branchName] = {};
      if (!schedule[branchName][timeSlot]) schedule[branchName][timeSlot] = {};
      if (!schedule[branchName][timeSlot][day]) schedule[branchName][timeSlot][day] = [];

      // Step 2: Add each student to the corresponding day/time slot
      slot.Users.forEach((userSlot) => {
        if (userSlot.User && userSlot.User.StudentDetail) {
          schedule[branchName][timeSlot][day].push({
            name: userSlot.User.username,
            photo_url: `${req.protocol}://${req.get('host')}${userSlot.User.StudentDetail.photo_url}`,
          });
        }
      });
    });

    // Step 3: Remove empty days and time slots
    for (const branch in schedule) {
      for (const timeSlot in schedule[branch]) {
        for (const day in schedule[branch][timeSlot]) {
          if (schedule[branch][timeSlot][day].length === 0) {
            delete schedule[branch][timeSlot][day]; // remove empty day
          }
        }
        // Remove time slot if no days left
        if (Object.keys(schedule[branch][timeSlot]).length === 0) {
          delete schedule[branch][timeSlot];
        }
      }
    }

    // Step 4: Send final response
    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('Error fetching dashboard schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard schedule',
      error: error.message,
    });
  }
};
