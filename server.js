const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mineflayer = require('mineflayer')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static('public'))

let activeBots = {}

io.on('connection', (socket) => {
  console.log('Ek user website par connect ho gaya hai.')

  socket.on('start-bot', (data) => {
    const { host, port, username } = data
    const botId = `${username}_${host}`

    if (activeBots[botId]) {
      socket.emit('bot-log', `Ye bot (${username}) pehle se is server par active hai!`)
      return
    }

    socket.emit('bot-log', `Connecting bot '${username}' to ${host}:${port}...`)

    const bot = mineflayer.createBot({
      host: host,
      port: parseInt(port),
      username: username
    })

    bot.on('spawn', () => {
      socket.emit('bot-log', `Success! Bot '${username}' server ke andar chala gaya hai aur active ho gaya hai.`)
      
      // Anti-AFK loop taake bot kick na ho
      const afkInterval = setInterval(() => {
        if (!bot.entity) {
          clearInterval(afkInterval)
          return
        }
        const movements = ['forward', 'back', 'left', 'right', 'jump']
        const randomMove = movements[Math.floor(Math.random() * movements.length)]
        
        if (randomMove === 'jump') {
          bot.setControlState('jump', true)
          setTimeout(() => bot.setControlState('jump', false), 400)
        } else {
          bot.setControlState(randomMove, true)
          setTimeout(() => {
            bot.setControlState(randomMove, false)
          }, 1500)
        }
      }, 10000)

      bot.afkInterval = afkInterval
    })

    bot.on('end', () => {
      socket.emit('bot-log', `Bot '${username}' disconnect ho gaya. 5 seconds baad dobara connect hone ki koshish...`)
      if (bot.afkInterval) clearInterval(bot.afkInterval)
      
      // Auto reconnect
      setTimeout(() => {
        if (activeBots[botId]) {
          // Reconnect logic agar zaroorat ho
        }
      }, 5000)
      
      delete activeBots[botId]
    })

    bot.on('error', (err) => {
      socket.emit('bot-log', `Error (${username}): ${err.message}`)
    })

    activeBots[botId] = bot
  })

  socket.on('stop-bot', (data) => {
    const { host, username } = data
    const botId = `${username}_${host}`

    if (activeBots[botId]) {
      activeBots[botId].quit()
      delete activeBots[botId]
      socket.emit('bot-log', `Bot '${username}' ko manually stop kar diya gaya hai.`)
    } else {
      socket.emit('bot-log', `Is name ka koi active bot nahi mila.`)
    }
  })
})

server.listen(3000, () => {
  console.log('Server chal raha hai! Browser me kholein: http://localhost:3000')
})