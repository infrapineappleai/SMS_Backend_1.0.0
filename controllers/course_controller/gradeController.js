const db = require('../../models/course_models/index');


// STANDALONE GRADE OPERATIONS
exports.createGrade = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { course_id, grade_name, status = 'Active' } = req.body;
    const grade = await db.Grade.create({ course_id, grade_name, status }, { transaction });
    await transaction.commit();
    res.status(201).json(grade);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.getAllGrades = async (req, res) => {
  try {
    const grades = await db.Grade.findAll();
    res.status(200).json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGradeById = async (req, res) => {
  try {
    const grade = await db.Grade.findByPk(req.params.id);
    if (!grade) return res.status(404).json({ message: "Grade not found" });
    res.status(200).json(grade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateGrade = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const grade = await db.Grade.findByPk(req.params.id, { transaction });
    if (!grade) {
      await transaction.rollback();
      return res.status(404).json({ message: "Grade not found" });
    }
    await grade.update(req.body, { transaction });
    await transaction.commit();
    res.status(200).json(grade);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.deleteGrade = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const grade = await db.Grade.findByPk(req.params.id, { transaction });
    if (!grade) {
      await transaction.rollback();
      return res.status(404).json({ message: "Grade not found" });
    }

    await grade.destroy({ transaction });
    
    await transaction.commit();
    res.status(200).json({ message: "Grade deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// COURSE-GRADE RELATIONSHIPS (CREATE ONLY)
exports.createGradesForCourse = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const courseId = req.params.id;
    const { grades = [] } = req.body;

    // Validate all branch IDs exist
    const branchIds = [...new Set(
      grades.flatMap(grade => 
        (grade.gradeFees || []).map(fee => fee.branch_id)
      ).filter(Boolean)
    )];

    if (branchIds.length > 0) {
      const existingBranches = await db.Branch.findAll({
        where: { id: branchIds },
        attributes: ['id'],
        transaction,
        raw: true
      });
      const missingIds = branchIds.filter(id => 
        !existingBranches.some(b => b.id === id)
      );
      if (missingIds.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Invalid branch IDs', 
          missingBranchIds: missingIds 
        });
      }
    }

    // Create grades and gradeFees
    for (const gradeData of grades) {
      const { grade_name, status = 'Active', gradeFees = [] } = gradeData;
      const grade = await db.Grade.create({
        course_id: courseId,
        grade_name,
        status
      }, { transaction });

      // Create associated gradeFees
      if (gradeFees.length > 0) {
        await Promise.all(gradeFees.map(fee => 
          db.GradeFee.create({
            grade_id: grade.id,
            fee: fee.fee,
            branch_id: fee.branch_id
          }, { transaction })
        ));
      }
    }

    await transaction.commit();
    res.status(201).json({ message: 'Grades created successfully' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// COURSE-GRADE RELATIONSHIPS (UPDATE ONLY)
exports.updateGradesForCourse = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const courseId = req.params.id;
    const { grades = [] } = req.body;

    // Validate all grade IDs belong to the course
    const gradeIds = grades.map(g => g.id).filter(Boolean);
    if (gradeIds.length > 0) {
      const existingGrades = await db.Grade.findAll({
        where: { id: gradeIds, course_id: courseId },
        attributes: ['id'],
        transaction,
        raw: true
      });
      const invalidIds = gradeIds.filter(id => 
        !existingGrades.some(g => g.id === id)
      );
      if (invalidIds.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Invalid grade IDs for this course',
          invalidGradeIds: invalidIds
        });
      }
    }

    // Process updates
    for (const gradeData of grades) {
      const { id: gradeId, grade_name, status, gradeFees } = gradeData;
      const grade = await db.Grade.findByPk(gradeId, { transaction });

      // Update grade details
      if (grade_name || status) {
        await grade.update({
          grade_name: grade_name || grade.grade_name,
          status: status || grade.status
        }, { transaction });
      }

      // Process gradeFees if provided
      if (gradeFees && gradeFees.length > 0) {
        await exports._handleGradeFeeUpdates(grade.id, gradeFees, transaction);
      }
    }

    await transaction.commit();
    res.status(200).json({ message: 'Grades updated successfully' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// PRIVATE: Handle grade fee updates (used internally)
exports._handleGradeFeeUpdates = async (gradeId, gradeFees, transaction) => {
  for (const feeData of gradeFees) {
    const { id: feeId, fee, branch_id } = feeData;
    if (feeId) {
      // Update existing
      const gradeFee = await db.GradeFee.findByPk(feeId, { transaction });
      if (gradeFee) {
        await gradeFee.update({ fee, branch_id }, { transaction });
      }
    } else {
      // Create new
      await db.GradeFee.create({
        grade_id: gradeId,
        fee,
        branch_id
      }, { transaction });
    }
  }
};