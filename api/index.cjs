"use strict";

require("dotenv").config();
const requestHandler = require("../backend/server.cjs");

module.exports = async (req, res) => {
  return requestHandler(req, res);
};
