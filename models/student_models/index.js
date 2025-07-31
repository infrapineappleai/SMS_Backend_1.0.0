// Import necessary modules
const fs = require("fs"); // File system module to work with files
const path = require("path"); // Path module to handle file paths
const Sequelize = require("sequelize"); // Sequelize ORM for database management
require("dotenv").config(); // Load environment variables from .env file

// Get the current filename
const basename = path.basename(__filename);
// Set the environment (default to "development" if not specified)
const env = process.env.NODE_ENV || "development";
// Define the path to the database configuration file
const configPath = path.join(__dirname, "../config/config.json");

let config;

// Check if the config file exists
if (fs.existsSync(configPath)) {
  // Load configuration from the config file based on the environment
  config = require(configPath)[env];
} else {
  // If config file is missing, use environment variables as fallback
  config = {
    database: process.env.DB_NAME, // Database name
    username: process.env.DB_USER, // Database username
    password: process.env.DB_PASS, // Database password
    host: process.env.DB_HOST, // Database host
    dialect: process.env.DB_DIALECT || "mysql", // Database dialect (default: MySQL)
  };
}

// Initialize an empty object to store models
const db = {};

let sequelize;

// Check if an environment variable is used for the database connection
if (config.use_env_variable) {
  // Initialize Sequelize using the environment variable
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // Initialize Sequelize using individual database credentials
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Read all files in the current directory (models directory)
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 && // Ignore hidden files (e.g., .gitignore)
      file !== basename && // Ignore the current file (index.js)
      file.endsWith(".js") // Only process JavaScript files
  )
  .forEach((file) => {
    // Require and import each model file
    const modelDef = require(path.join(__dirname, file));

    // Check if the exported module is a function (a valid Sequelize model)
    if (typeof modelDef === "function") {
      // Initialize the model with Sequelize and store it in the db object
      const model = modelDef(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    }
  });

// Associate models if they have defined associations
// loop all models and attach associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});


// Attach Sequelize instance and Sequelize class to the db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Export the db object containing models and Sequelize instance
module.exports = db;