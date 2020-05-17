// server.js

const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');

//Setup socket.io
const app = require('express')();

// listen for requests 
const server = app.listen(3000, () => {
  console.log("Your app is listening on port " + server.address().port);
});

const io = require('socket.io').listen(server);

io.origins('*:*')

//Services import


app.use(cors())
app.use(bodyParser.json());

//Routes
const apiRoutes = require("./routes/api-routes.js")
app.use('/api',apiRoutes)
const gameApiRoutes = require("./routes/game-routes.js")
app.use('/api/game',gameApiRoutes)




//Setup game logic
const testFactory = require('./gamelogic/testFactory')
testFactory.start(io)



