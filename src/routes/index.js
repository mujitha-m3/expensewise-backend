const authRoutes = require("./auth");
const expenseRoutes = require("./expenses");
const incomeRoutes = require("./income");
const categoryRoutes = require("./categories");
const analyticsRoutes = require("./analytics");
const allocationRoutes = require('./allocations');

module.exports = {
  authRoutes,
  expenseRoutes,
  incomeRoutes,
  categoryRoutes,
  analyticsRoutes,
  allocationRoutes
};