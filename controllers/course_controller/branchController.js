const db = require('../../models/course_models/index');

// Branch CRUD Operations
exports.createBranch = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { branch_name, currency, status = 'Active' } = req.body;
    const branch = await db.Branch.create({
      branch_name,
      currency,
      status
    }, { transaction });

    await transaction.commit();
    res.status(201).json(branch);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.getAllBranches = async (req, res) => {
  try {
    const branches = await db.Branch.findAll();
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const branch = await db.Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ error: "Branch not found" });
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBranch = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const branch = await db.Branch.findByPk(req.params.id, { transaction });
    if (!branch) {
      await transaction.rollback();
      return res.status(404).json({ error: "Branch not found" });
    }

    await branch.update(req.body, { transaction });
    await transaction.commit();
    res.status(200).json(branch);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBranch = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const branch = await db.Branch.findByPk(req.params.id, { transaction });
    if (!branch) {
      await transaction.rollback();
      return res.status(404).json({ error: "Branch not found" });
    }

    // Check if branch is referenced in grade_fees
    const gradeFees = await db.GradeFee.findAll({
      where: { branch_id: branch.id },
      transaction
    });

    if (gradeFees.length > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: "Cannot delete branch - it's referenced in grade fees",
        referencedIn: gradeFees.map(fee => fee.id)
      });
    }

    await branch.destroy({ transaction });
    await transaction.commit();
    res.status(200).json({ message: "Branch deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};