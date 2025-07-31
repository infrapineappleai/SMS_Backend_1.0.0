'use strict';
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define('Branch', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    branch_name: { type: DataTypes.STRING(255), allowNull: false },
    currency: { type: DataTypes.STRING(255), allowNull: false }
  }, {
    tableName: 'branch',
    timestamps: false
  });

  Branch.associate = (models) => {
    Branch.hasMany(models.UserBranch, { foreignKey: 'branch_id' });
    Branch.hasMany(models.UserBranchHistory, { foreignKey: 'branch_id' });
    Branch.hasMany(models.Slot, { foreignKey: 'branch_id' });
    Branch.hasMany(models.GradeFee, { foreignKey: 'branch_id' });
    Branch.hasMany(models.Admission, { foreignKey: 'branch_id' });
  };

  return Branch;
};
