const mongoose = require("mongoose")

var deckSchema = new mongoose.Schema({
  content: Array,
  author: String,
  img: String,
  title: String

});
module.exports = mongoose.model('Deck', deckSchema );
  