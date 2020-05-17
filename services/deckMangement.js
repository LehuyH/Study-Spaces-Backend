//Load Modules
const mongoose = require("mongoose")
const fs = require('fs')
const bcrypt = require('bcrypt')
const validator = require('validator');
const jwt = require('jsonwebtoken')
const schemaValidator = require("schema-validator")
//Load config
const config = JSON.parse(fs.readFileSync("config.json"))

//Models
let Deck = require("../models/deck.js")
let User = require("../models/user.js")

//Connect to DB already done in user.js

//Format of decks
const Deckschema = {
    content: {
      type: Array,
      required: true,
  
      length: {
        min: 1,
        
      },
      test: /^[a-z0-9]+$/gi
    },
    img:{
        type: String,
        format: "uri",
        required: false
    },
    title:{
            type: String,
            required: true,
    
    }
  };
  
var validDeck = new schemaValidator(Deckschema);


//Services
async function createDeck(deck,reqUser) {

 if(validDeck.check(deck)){
    deck.author = reqUser.username
    //Get user from db
    let user = await User.findOne({username: reqUser.username})
    //Save deck
    let newDeck = await Deck.create(deck)
    //Push new deck ID to user
    user.userDecks.push(newDeck._id)
    user.save()
    return {success:true}
 }else{
     return {success:false,error:"Invalid deck format"}
 }


}

async function getDeck(deckID) {
    let deck = await Deck.findById(deckID)
    if(deck !== undefined){
        return {success:true,deck:deck};
    }else{
        return {success:false,error:`Cannot get deck with id ${deckID}`}
    }


}

async function removeDeck(deckID,user) {
    let deck = await Deck.findById(deckID)
    if(deck.author == user.username){
       if(deck !== undefined){
           deck.delete()
          return {success:true};
        }else{
           return {success:false,error:`Cannot get deck with id ${deckID}`}
        }
    }else{
        return {success:false,error:`You do not have permission to delete this deck`}
    }


}
   


module.exports = {
  create: createDeck,
  get: getDeck,
  delete: removeDeck
}