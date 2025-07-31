'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
    first_name: { type: DataTypes.STRING(255), allowNull: false },
    last_name: { type: DataTypes.STRING(255), allowNull: false },
    gender: { type: DataTypes.STRING(255), allowNull: false },
    username: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    phn_num: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    address: { type: DataTypes.STRING(255), allowNull: false },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: false },
    role: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.STRING(255), allowNull: false }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  User.associate = (models) => {
    User.hasOne(models.StudentDetails, {
      foreignKey: 'user_id',
      as: 'student_details' // 👈 recommended for consistency
    });

   User.hasMany(models.UserBranch, { foreignKey: 'user_id', as: 'user_branch' });

    User.hasMany(models.UserBranchHistory, { foreignKey: 'user_id' });
    User.hasMany(models.UserGrade, { foreignKey: 'user_id' });
    User.hasMany(models.UserSlot, { foreignKey: 'user_id' });
  };

  return User;
};
