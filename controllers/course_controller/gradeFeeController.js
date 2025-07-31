const db = require('../../models/course_models/index');

// STANDALONE GRADE FEE OPERATIONS
exports.createGradeFee = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { grade_id, branch_id, fee } = req.body;

    // Validate grade and branch exist
    const [grade, branch] = await Promise.all([
      db.Grade.findByPk(grade_id, { transaction }),
      db.Branch.findByPk(branch_id, { transaction })
    ]);

    if (!grade || !branch) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Validation failed',
        details: {
          gradeExists: !!grade,
          branchExists: !!branch
        }
      });
    }

    const gradeFee = await db.GradeFee.create({ grade_id, branch_id, fee }, { transaction });
    await transaction.commit();
    res.status(201).json(gradeFee);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.getAllGradeFees = async (req, res) => {
  try {
    const gradeFees = await db.GradeFee.findAll({
      include: [
        { model: db.Grade, attributes: ['id', 'grade_name'], as: 'grade' },
        { model: db.Branch, attributes: ['id', 'branch_name'], as: 'branch' }
      ]
    });
    res.status(200).json(gradeFees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGradeFeeById = async (req, res) => {
  try {
    const gradeFee = await db.GradeFee.findByPk(req.params.id, {
      include: [
        { model: db.Grade, attributes: ['id', 'grade_name'], as: 'grade' },
        { model: db.Branch, attributes: ['id', 'branch_name'], as: 'branch' }
      ]
    });
    if (!gradeFee) return res.status(404).json({ message: "Grade fee not found" });
    res.status(200).json(gradeFee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateGradeFee = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { fee, branch_id } = req.body;
    const gradeFee = await db.GradeFee.findByPk(req.params.id, { transaction });

    if (!gradeFee) {
      await transaction.rollback();
      return res.status(404).json({ message: "Grade fee not found" });
    }

    // Validate branch if changing
    if (branch_id && branch_id !== gradeFee.branch_id) {
      const branch = await db.Branch.findByPk(branch_id, { transaction });
      if (!branch) {
        await transaction.rollback();
        return res.status(400).json({ error: 'New branch not found' });
      }
    }

    await gradeFee.update({ fee, branch_id }, { transaction });
    await transaction.commit();
    res.status(200).json(gradeFee);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Updated deleteGradeFee function
exports.deleteGradeFee = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const gradeFeeId = req.params.id || req.params.gradeFeeId;
    const courseId = req.params.courseId;

    console.log(`[DeleteGradeFee] Start: gradeFeeId=${gradeFeeId}, courseId=${courseId}`);

    if (!gradeFeeId || isNaN(parseInt(gradeFeeId))) {
      await transaction.rollback();
      console.log(`[DeleteGradeFee] Invalid grade fee ID: ${gradeFeeId}`);
      return res.status(400).json({ success: false, message: 'Invalid grade fee ID' });
    }

    // Fetch grade fee with minimal data to validate course
    console.log(`[DeleteGradeFee] Fetching grade fee ID: ${gradeFeeId}`);
    const gradeFee = await db.GradeFee.findByPk(gradeFeeId, {
      attributes: ['id', 'grade_id'],
      include: [
        {
          model: db.Grade,
          as: 'grade',
          attributes: ['id', 'course_id'],
        },
      ],
      transaction,
    });

    if (!gradeFee) {
      await transaction.rollback();
      console.log(`[DeleteGradeFee] Grade fee not found: ${gradeFeeId}`);
      return res.status(404).json({ success: false, message: 'Grade fee not found' });
    }

    // Validate courseId if provided
    if (courseId && parseInt(courseId) !== gradeFee.grade.course_id) {
      await transaction.rollback();
      console.log(`[DeleteGradeFee] Grade fee ${gradeFeeId} does not belong to course ${courseId}`);
      return res.status(400).json({
        success: false,
        message: 'Grade fee does not belong to the specified course',
      });
    }

    const gradeId = gradeFee.grade_id;
    console.log(`[DeleteGradeFee] Grade fee ${gradeFeeId} belongs to grade ID: ${gradeId}`);

    // Delete the grade fee
    console.log(`[DeleteGradeFee] Deleting grade fee ID: ${gradeFeeId}`);
    await gradeFee.destroy({ transaction });

    // Check if grade has remaining grade fees and delete grade if none remain
    console.log(`[DeleteGradeFee] Counting remaining grade fees for grade ID: ${gradeId}`);
    const remainingGradeFees = await db.GradeFee.count({
      where: { grade_id: gradeId },
      transaction,
    });
    console.log(`[DeleteGradeFee] Remaining grade fees: ${remainingGradeFees}`);

    let gradeDeleted = false;
    if (remainingGradeFees === 0) {
      console.log(`[DeleteGradeFee] No remaining grade fees, fetching grade ID: ${gradeId}`);
      const grade = await db.Grade.findByPk(gradeId, {
        attributes: ['id'],
        transaction,
      });
      if (grade) {
        console.log(`[DeleteGradeFee] Deleting grade ID: ${gradeId}`);
        await grade.destroy({ transaction });
        console.log(`[DeleteGradeFee] Grade deleted: ${gradeId}`);
        gradeDeleted = true;
      }
    }

    await transaction.commit();
    console.log(`[DeleteGradeFee] Completed successfully for gradeFeeId: ${gradeFeeId}`);

    res.status(200).json({
      success: true,
      message: gradeDeleted
        ? 'Grade fee and associated grade deleted successfully'
        : 'Grade fee deleted successfully',
      data: { grade_id: gradeId, gradeDeleted }
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`[DeleteGradeFee] Error for gradeFeeId ${gradeFeeId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete grade fee',
      error: error.message,
    });
  }
};