const { User } = require('../../models/student_models/index');

exports.createUser = async (req, res) => {
  try {
    const userData = { ...req.body, role: req.body.role || 'student' };
    const user = await User.create(userData);
    res.status(201).json({ user, next_step: `/students/${user.id}/details` });
  } catch (error) {
    res.status(400).json({
      error: error.message.includes('unique constraint')
        ? 'Email or username already exists'
        : 'User creation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new Error('User not found');
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const [updated] = await User.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated === 0) throw new Error('User not found or no changes made');
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;

    const users = await User.findAll({ where });
    if (users.length === 0) throw new Error('No users found');
    res.json(users);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (deleted === 0) throw new Error('User not found');
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
