const mongoose = require("mongoose")

var userSchema = new mongoose.Schema({
  username: String,
  password: String,
  userDecks: Array

});
module.exports = mongoose.model('User', userSchema );
  