const { Branch } = require('../../models/student_models/index');

exports.listBranches = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      attributes: ['id', 'branch_name', 'currency']
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};