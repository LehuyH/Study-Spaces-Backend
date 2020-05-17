const decks = require('../services/deckMangement.js');
const mongoose = require("mongoose")
const friendlyWords = require('friendly-words');
const bcrypt = require('bcrypt')
//Models
let Deck = require("../models/deck.js")
let User = require("../models/user.js")

//Rooms
let testFactoryRooms = {

   "raghavm-noble-unit": {
        questions: [{"q":"Who is Bill Nye?","a":"The Russian Spy","wa":[{"a":"The Science Guy"},{"a":"The Butterfly"},{"a":"His Mom's A Guy"}]},{"q":"Is Bill Big Brain?","a":"Yes","wa":[{"a":"no"},{"a":"maybe"},{"a":"fewfwekwewefwne"}]}],
        round: -1,
        answers: [],
        players: {},
        readyCount: 0,
        code: 'raghavm-noble-unit',
        page: 'lobby',
        roundData: {
          readOnlyplayers: {},
          question: null,
          answers: null,
          type: null,
          status: 'waiting'
        }
      }
      

}

//config
let minPlayers = 2

//logic
async function createPlayer(name){
    let player = {
        points : 0,
        leader:false,
        id: `${name}${await bcrypt.genSalt(10)}`,
        name: name,
        answer: null,
        choose: "",
        ready:false
    }
    return player
}

function startLogic(io){

    const testFactory = io.of('/game/test-factory')

    testFactory.on('connection', (socket) => { // User joined

        //Get the code from the client
        socket.emit("getRoom")
        socket.on('getRoom', async (code, name) => { 
            //Check if room exists
            if(testFactoryRooms[code]){
                let room = testFactoryRooms[code]
                //Check if game is ready to join
                if(room.roundData.status == "waiting" && room.roundData.readOnlyplayers[name] == undefined){
                    //Add player to room
                    let player = await createPlayer(name)
                    if(Object.keys(room.players).length == 0){ //make leader if first
                      player.leader = true   
                    }
                    room.players[player.id] = player

                     //Asign ID
                     socket.emit('assignID', player.id, player.leader)
                     
                    //Clear ID for readonly round data
                    player.id = null
                    room.roundData.readOnlyplayers[player.name] = player
                    //Join socket to room
                    socket.join(code);
                   
                    //Notfiy everyone in room of new player
                    io.of('/game/test-factory').to(code).emit('updateRoomState', room.roundData, "playerJoin");
                    

                    
                }else{
                    socket.emit("errorMsg","Could not join game. This may be because the game started or your name is already in use. Try again")
                }
            }else{
                socket.emit("errorMsg","Invalid code")
            }


        })


        //Start Game
        socket.on('startGame', async (roomID,id) => { 
          
          
            let room = testFactoryRooms[roomID] 
            if(room !== undefined){  //Check if room exists
                let player = room.players[id]
                if(player !== undefined){
                        //check if player is leader
                if(player.leader){
                    //Start first round
                 nextRound(roomID, io)
                }else{ //Player is not party leader ignore
                    return
                }
                }else{ // Player is not valid ignore
                    return;
                }
            
            
            }else{//Room does not exist, ignore
                return;
            }

        })

        //Submit answer
        socket.on('submitAnswer', async (roomID,id,answer) => {
            let room = testFactoryRooms[roomID] 
            if(room !== undefined){  //Check if room exists
                let player = room.players[id]
                if(player !== undefined){
                    let readOnlyPlayer = room.roundData.readOnlyplayers[player.name]
                    if(player.ready == false && room.roundData.status == "submit"){
                        //Set answer 
                        player.answer = answer
                        room.answers.push({author:player.name,answer:answer,type:"wrong",choose:[]})
                        //Set ready
                        readOnlyPlayer.ready = true
                        room.readyCount++
                        //Check if all players are ready
                        if(room.readyCount == Object.keys(room.players).length){
                           //Add real answer and shuffle
                           room.answers.push({author:"Deck",type:"real",answer:room.questions[room.round].a,choose:[]})
                           room.answers = shuffle(room.answers)
                           room.roundData.status = "choosing"
                          //Show answers in read only data
                          room.answers.forEach((answer,i) =>{
                            room.roundData.answers.push(answer.answer)
                           

                          })
                          //Reset
                          room.readyCount = 0
                          room.roundData.readOnlyplayers = resetReady(room.roundData.readOnlyplayers)
                          io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "showAnswers");
                         

                        }else{
                        //Update room state for all players
                        io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "playerReady");
                        }

                    }else{ //Already answered ignore
                        return;
                    }
                }else{ // Not a player in this room, ignore
                    return;

                }   
            }else{ //Room does not exist, ignore
                return;
            }
        })
       
        //Choose answer
        socket.on('chooseAnswer', async (roomID,id,answerID) => {
            let room = testFactoryRooms[roomID] 
            if(room !== undefined){  //Check if room exists
                let player = room.players[id]
                if(player !== undefined){
                    let readOnlyPlayer = room.roundData.readOnlyplayers[player.name]
                    if(player.ready == false && room.roundData.status == "choosing"){
                        //Set answer 
                        let answer = room.answers[answerID]
                        if(answer !== undefined){
                            
                            //Apply vote
                            room.answers[answerID].choose.push({user:player.name})
                            //Give point if answer is correct
                            if(room.answers[answerID].type == "real"){
                                player.points++
                                readOnlyPlayer.points++
                            }
                            //Set ready
                            readOnlyPlayer.ready = true
                            room.readyCount++
                            //Check if all players are ready
                            if(room.readyCount == Object.keys(room.players).length){
                                //Set answers to the ones on the server, note this is an object this time
                                room.roundData.answers = room.answers
                                //Set status
                                room.roundData.status = "roundResults"
                                io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "showRoundResults");
                                setTimeout(()=>{
                                    nextRound(roomID, io)
                                },10000)

                                }else{
                                    //Update room state for all players
                                    io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "playerReadyChoose");
                                }
                        }else{ //Unknown answer ID, set ready do not apply answer
                            readOnlyPlayer.ready = true
                            room.readyCount++
                            io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "playerReadyChoose");
                        }
                    }else{ //Already answered ignore
                        return;
                    }
                }else{ // Not a player in this room, ignore
                    return;

                }   
            }else{ //Room does not exist, ignore
                return;
            }
        })


        

    })










    console.log("Test Factory Logic Running...")
}

async function createRoom(user,deckID){
    let deck = await decks.get(deckID)
    if(deck.success){ // Check if deck exists
        // gen random code and put in room
        let code = `${user.username}-${friendlyWords.predicates[Math.floor(Math.random() * friendlyWords.predicates.length)]}-${friendlyWords.teams[Math.floor(Math.random() * friendlyWords.teams.length)]}`
        let room = {
            questions: deck.deck.content,
            round: -1,
            answers:[],
            players: {},
            readyCount: 0,
            code: code,
            page: "lobby",
            roundData: {
                readOnlyplayers:{},
                question: null,
                answers: null,
                type: null,
                status: "waiting",
              }
        }
    
        //Put in memory
        testFactoryRooms[code] = room
        return {success:"true", code:code}
    }else{
        return deck;
    }
}

function nextRound(roomID,io){
    let room = testFactoryRooms[roomID] 
        //Increase round by 1
        room.round++
        if(room.round > room.questions.length - 1){ //ALl questions have been gone through, end game show results
            io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "finishGame");
            delete testFactoryRooms[roomID];
        }else{
        //Set status as submit
        room.roundData.status = "submit"
        //Reset
        room.roundData.answers = []
        room.answers = []
        room.readyCount = 0
        room.roundData.readOnlyplayers = resetReady(room.roundData.readOnlyplayers)
        //Choose question
        room.roundData.question = room.questions[room.round].q
        io.of('/game/test-factory').to(roomID).emit('updateRoomState', room.roundData, "newQuestion");
        //Force choose after 30 seconds

       
        }
        
}

//util
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }


function resetReady(players){
    Object.keys(players).forEach(key => {
        if (!players.hasOwnProperty(key)) return;
      
        players[key].ready = false;
      });

     return players;
}

module.exports = {
    start: startLogic,
    createRoom: createRoom
  }