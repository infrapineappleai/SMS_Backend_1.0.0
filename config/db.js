const { Sequelize } = require("sequelize");
require("dotenv").config(); // Load environment variables

// Create a Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,  // Database name
  process.env.DB_USER,  // Database user
  process.env.DB_PASS,  // Database password
  {
    host: process.env.DB_HOST, // Database host (localhost)
    dialect: "mysql",
    logging: false, // Disable SQL logs in console
  }
);

// Function to test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
