const { Course, Grade, UserGrade, User } = require('../../models/student_models/index');



// ASSIGN Grade
exports.assignGrade = async (req, res) => {
  try {
    const student = await User.findOne({
      where: { id: req.params.studentId, role: 'student' }
    });
    if (!student) throw new Error('Student not found');

    const gradeAssignment = await UserGrade.create({
      user_id: req.params.studentId,
      grade_id: req.body.gradeId
    });
    res.json({ success: true, gradeAssignment });
  } catch (error) {
    res.status(400).json({
      error: error.message.includes('unique constraint')
        ? 'Grade already assigned'
        : error.message
    });
  }
};

// LIST Courses
exports.listCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
      attributes: ['id', 'name', 'course_code']
    });
    if (courses.length === 0) throw new Error('No courses found');
    res.json(courses);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// GET Grades for Course
exports.getCourseGrades = async (req, res) => {
  try {
    const grades = await Grade.findAll({
      where: { course_id: req.params.courseId },
      attributes: ['id', 'grade_name']
    });
    if (grades.length === 0) throw new Error('No grades found');
    res.json(grades);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// GET Grades for a Student, including course_id
exports.getStudentGrades = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const grades = await UserGrade.findAll({
      where: { user_id: studentId },
      include: [
        {
          model: Grade,
          as: 'Grade',
          include: [
            {
              model: Course,
              as: 'Course',
              attributes: ['id', 'name', 'course_code']
            }
          ],
          attributes: ['id', 'grade_name']
        }
      ]
    });

    if (!grades.length) throw new Error('No grades found for student');

    res.json(grades);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

