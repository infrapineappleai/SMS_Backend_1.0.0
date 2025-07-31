module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    gender: DataTypes.STRING,
    username: DataTypes.STRING,
    password: {type: 
      DataTypes.STRING,
      defaultValue:'123'
    },
    email: DataTypes.STRING,
    phn_num: DataTypes.STRING,
    date_of_birth: DataTypes.STRING,
    role: {
      type: DataTypes.STRING,
      defaultValue: 'student', 
      allowNull: false,
      validate: {
        isIn: [['student', 'teacher', 'branch_admin', 'super_admin']] 
      }
    },
    status: DataTypes.STRING,
    address: DataTypes.STRING
  }, {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  User.associate = (models) => {
    User.hasOne(models.StudentDetails, { foreignKey: "user_id", as: "StudentDetail" });
    User.hasMany(models.UserSlot, { foreignKey: "user_id", as: "UserSlots" });
    User.hasMany(models.UserGrade, { foreignKey: "user_id", as: "UserGrades" });
    User.hasMany(models.UserBranch, { foreignKey: "user_id", as: "UserBranches" });
    User.hasMany(models.UserBranchHistory, { foreignKey: "user_id", as: "UserBranchHistories" });
    User.belongsToMany(models.Slot, {
      through: models.UserSlot,
      foreignKey: "user_id",
      otherKey: "slot_id",
      as: "Slots"
    });
  };

  return User;
};