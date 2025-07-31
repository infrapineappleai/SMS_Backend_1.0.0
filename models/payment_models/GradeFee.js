'use strict';
module.exports = (sequelize, DataTypes) => {
  const GradeFee = sequelize.define('GradeFee', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    grade_id: { type: DataTypes.BIGINT, allowNull: false },
    branch_id: { type: DataTypes.BIGINT, allowNull: false },
    fee: { type: DataTypes.DOUBLE, allowNull: false }
  }, {
    tableName: 'grade_fee',
    timestamps: false
  });

  GradeFee.associate = (models) => {
    GradeFee.belongsTo(models.Grade, { foreignKey: 'grade_id' });
    GradeFee.belongsTo(models.Branch, { foreignKey: 'branch_id' });
  };

  return GradeFee;
};
