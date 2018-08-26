'use strict';

const axios = require('axios');

module.exports.hello = (event, context, callback) => {
  console.log("Hello, world!");
  callback(null);
};
