const router = require('express').Router()
const jwt = require('jsonwebtoken')
const fs = require('fs')
const config = JSON.parse(fs.readFileSync("config.json"))


//services
const users = require('../services/userMangement.js');
const decks = require('../services/deckMangement.js');





router.get("/", (req, res) => {
    res.status(200).send("Api UP")
});

  //Unprotected (public) routes
  router.post("/signup", async (req,res) =>{
      if(typeof req.body.username == "string" && typeof req.body.password == "string"){
        //Action here
       res.json( await users.create(req.body.username,req.body.password))
      }else{
          res.json({success: false,error:"Invalid api call"})
      }
  });

  router.post("/login", async (req,res) =>{
    if(typeof req.body.username !== "undefined" && typeof req.body.password !== "undefined"){
         //Action here
      res.json( await users.login(req.body.username,req.body.password))
    }else{
      res.json({success: false,error:"Invalid api call"})
    }
  });
  router.post("/getdeck", async (req,res) =>{
    if(typeof req.body.deckID !== "undefined"){
         //Action here
      res.json( await decks.get(req.body.deckID))
    }else{
      res.json({success: false,error:"Invalid api call"})
    }
  });

  
//Protected (user) routes
router.post("/createdeck",verifyToken, async (req,res) =>{

    if(typeof req.body.deck == "object"){
         //Action here
      res.json( await decks.create(req.body.deck,req.user))
    }else{
      res.json({success: false,error:"Invalid api call"})
    }
});

router.post("/deletedeck",verifyToken, async (req,res) =>{
  if(typeof req.body.deckID == "string"){
       //Action here
    res.json( await decks.delete(req.body.deckID,req.user))
  }else{
    res.json({success: false,error:"Invalid api call"})
  }
});

router.post("/getuser-token",verifyToken, async (req,res) =>{
    res.json( await users.getUserById(req.user.username))
  
});





//Middlewares ==============

//Verify token
function verifyToken(req,res,next){
    //Get token
    const bearHeader = req.headers['authorization']
    //Check if they supplied a token
    if(typeof bearHeader !== "undefined"){
          const token = bearHeader.split(' ')[1]
          req.token = token
          //Verify token
          jwt.verify(req.token, config.secret, function(err, decoded) {
            if (err) {

              switch (err.name) {
                case "TokenExpiredError":
                  res.json({success:false,error:"Login expired", errorType:"token"})
                  break;

                default:
                  res.json({success:false,error:"Error in token", errorType:"token"})
                  break;

              }
          
            }else{ //Take data from token and put in req
         
              req.user = decoded
              next();

            }
          });
    }else{
        res.json({success:false,error:"Token was not supplied"})
    }

}

  module.exports = router;