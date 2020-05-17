const router = require('express').Router()
const jwt = require('jsonwebtoken')
const fs = require('fs')
const config = JSON.parse(fs.readFileSync("config.json"))


//services
const users = require('../services/userMangement.js');
const decks = require('../services/deckMangement.js');

//Game services
const testFactory = require('../gamelogic/testFactory.js')



//endpoints
router.get("/", (req, res) => {
    res.status(200).send("Game Api UP")
});


//Protected (user) routes
router.post("/test-factory",verifyToken, async (req,res) =>{

    if(typeof req.body.deckID !== "undefined"){
      res.json( await testFactory.createRoom(req.user,req.body.deckID))
    }else{
        res.json({success: false,error:"Invalid api call"})
    }
 
});




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