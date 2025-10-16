const authMiddleware = require("./auth");
const errorHandler = require("./errorHandler");
const validation = require("./validation");

module.exports = {
  authMiddleware,
  errorHandler,
  ...validation
};