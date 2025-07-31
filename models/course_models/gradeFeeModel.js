'use strict';

module.exports = (sequelize, DataTypes) => {
  const GradeFee = sequelize.define(
    "GradeFee",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      grade_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fee: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "grade_fee",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  GradeFee.associate = (models) => {
    GradeFee.belongsTo(models.Grade, {
      foreignKey: 'grade_id',
      as: 'grade',
      onDelete: 'CASCADE',
    });
    GradeFee.belongsTo(models.Branch, {
      foreignKey: 'branch_id',
      as: 'branch',
      onDelete: 'CASCADE',
    });
  };

  return GradeFee;
};