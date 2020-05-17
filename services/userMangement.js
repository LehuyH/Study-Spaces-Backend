//Load Modules
const mongoose = require("mongoose")
const fs = require('fs')
const bcrypt = require('bcrypt')
const validator = require('validator');
const jwt = require('jsonwebtoken')


//Load config
const config = JSON.parse(fs.readFileSync("config.json"))

//Models
let User = require("../models/user.js")

//Connect to DB
mongoose.connect(config.dbUrl,{useNewUrlParser: true,useUnifiedTopology:true})


//Services
async function createUser(username, password) {

  //Check if the username is already in use
 
  let user = await User.findOne({username: username})
   
  if (user !== null) { //username already in use
    return {
      success: false,
      error: "This username is already in use"
    }
  } else {
    if (validator.isAlphanumeric(username)) { // Make sure username is an username
      //username not in use, hash password and store in database
      const hashedPassword = await bcrypt.hash(password, 10)
      //Starting info to store
      let data = {
        username: username,
        password: hashedPassword,
        userDecks: []
      }
      //Wrtie to DB
      User.create(data)
      return {success: true}
    }else{ // Not valid username
      return {success: false,error: "Invalid username"}
    }
  }

  



}

///user:{username:user.username,userDecks:user.userDecks}

async function loginUser(username, password) {
 
  //Check if the username exists
 
  let user = await User.findOne({username: username})

  if (user !== null) { //username exists
  
      //Compare hashes
       if(await bcrypt.compare(password, user.password)){
         //Generate a web token
        const token = jwt.sign({username:user.username,userDecks: user.userDecks,id:user._id,random: await bcrypt.genSalt(10)}, config.secret, { expiresIn: '1h' })
        return {success: true,token:token}
       }else{ //Invalid password
       
        return {success: false,error: "Invalid Password"}
       }
    
  } else {
    return {success: false,error: "Invalid username"}
  }

  



}

async function getUser(username) {
  let user = await User.findOne({username: username})
  if(user !== undefined){
     
      return {success:true,user:{username: user.username, userDecks: user.userDecks}};
  }else{
      return {success:false,error:`Cannot get user with id ${deckID}`}
  }


}

module.exports = {
  create: createUser,
  login: loginUser,
  getUserById : getUser
}