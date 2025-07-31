'use strict';
module.exports = (sequelize, DataTypes) => {
  const Admission = sequelize.define('Admission', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    branch_id: { type: DataTypes.BIGINT, allowNull: false },
    admission_fee: { type: DataTypes.DOUBLE, allowNull: false }
  }, {
    tableName: 'admission',
    timestamps: false
  });

  Admission.associate = (models) => {
    Admission.belongsTo(models.Branch, { foreignKey: 'branch_id' });
  };

  return Admission;
};
