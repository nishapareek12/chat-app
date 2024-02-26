const express = require("express")
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require("./utils/message")
const http = require('http')
const path = require('path')
const {addUser, removeUser, getUser, getUsersInRoom} = require("./utils/users")
const app = express()
const server = http.createServer(app)
const io = socketio(server)
const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname,'../public')
app.use(express.static(publicDirectoryPath))
  
let count = 0
io.on('connection', (socket) => {
    console.log('new websocket connection') 
     socket.on('join',(options, callback) => {
           const {error, user} = addUser({id: socket.id, ...options})
           if(error){
            return callback(error)
           }
           socket.join(user.room)  
           socket.emit('message',generateMessage("Admin","welcome!"))
           socket.broadcast.to(user.room).emit('message', generateMessage("Admin",`${user.username} has joined`))   
           io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
           })
           callback()
          })
     socket.on('sendMessage', (message, callback) => {
          const user = getUser(socket.id)
          const filter = new Filter() 
          if(filter.isProfane(message)){
            return callback("profanity is not allowed")
          }
          io.to(user.room).emit('message',generateMessage(user.username,message))
          callback()
     })
     socket.on('disconnect', () => {
         
        const user = removeUser(socket.id)
        if(user){
          io.to(user.room).emit('message', generateMessage("Admin", `${user.username} has left!`))
          io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
          })
        }
        
     })
     socket.on('sendlocation', (coords,callback) => {
         const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`http://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        if (callback && typeof callback === 'function') {
         callback();
     }
     })
} )
server.listen(port, () => {
    console.log(`app is listening to port ${port}`)
})


