const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Branch = sequelize.define(
    "Branch",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      branch_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      currency: { 
        type: DataTypes.ENUM('LKR', '$', 'RS'), 
        allowNull: false 
        },
    },
    {
      tableName: "branch",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Branch.associate = (models) => {
    Branch.hasMany(models.Slot, { foreignKey: "branch_id", as: "Slots" });
    Branch.hasMany(models.UserBranch, { foreignKey: "branch_id", as: "UserBranches" });

  };

  return Branch;
};