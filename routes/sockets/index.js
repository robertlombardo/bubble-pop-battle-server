import SocketIO   from 'socket.io'
import HTTP       from 'http'
import GameEngine from '../../game-engine'

const SOCKET_PATH = `/` // `/sockets`

const sockets_by_player_id = {}
const active_games         = {}

const getGameStates = active_games => {
    const result = {}
    Object.keys(active_games).forEach(game_id => {result[game_id] = active_games[game_id].state})
    return result
}

exports.init = app => {
    const options = {
        path       : SOCKET_PATH,
        origins    : [
            `http://${process.env.KOJI_SERVICE_HOSTNAME_frontend}:*`,
            `https://${process.env.KOJI_SERVICE_HOSTNAME_frontend}:*`,
            `http://bubblepopbattle.withkoji.com:*`,
            `https://bubblepopbattle.withkoji.com:*`,
            `http://frontend-dee728a3-6698-4305-92d2-8a9f34f0af19.koji-staging.com:*`,
            `https://frontend-dee728a3-6698-4305-92d2-8a9f34f0af19.koji-staging.com:*`,
        ]/*.join(` `)*/,
        // origins: `*`,
        transports : [`websocket`, `polling`], // process.env.NODE_ENV === `production` ? [`websocket`, `polling`] : [`polling`],
    }

    const server = HTTP.createServer(app)

    // console.log('\nprocess.env:')
    // console.log(process.env)

    const PORT = process.env.PORT || 3333
    server.once(`listening`, () => {
        console.info(`\nMultiplayer Bubble Pop - Sockets server is listening on port: ${PORT}`)
    });
    server.listen(PORT)

    const io = SocketIO.listen(server, options)

    const emitActiveGames = () => { io.of(SOCKET_PATH).emit(`active_games`, {active_games: getGameStates(active_games)}) }
    
    io.of(SOCKET_PATH).on(`connection`, socket => {

        // initialize a new player (TODO - don't do this if we're pulling player from localStorage)
        const player_id = new Date().getTime().toString()
        const player = socket.player = {
            id           : player_id,
            display_name : `player_${player_id.slice(player_id.length - 4)}`,
            avatar_key   : Math.ceil(Math.random() * 7),
            color_a      : '#'+(Math.random()*0xFFFFFF<<0).toString(16),
            color_b      : '#'+(Math.random()*0xFFFFFF<<0).toString(16),
        }
        setTimeout(() => {
            socket.emit(`player_state`, {player})
            socket.emit(`active_games`, {active_games: getGameStates(active_games)})
        }, 500)

        sockets_by_player_id[player_id] = socket

        socket.on(`disconnect`, data => {
            try {
                const { player } = socket
                if (player) {
                    delete sockets_by_player_id[player.id]

                    // deal with any active games this player is in
                    for (let game_id in active_games) {
                        const game        = active_games[game_id]
                        const { players } = game.state
                        
                        for (let p of players) {
                            if (p.id === player.id) {
                                socket.leave(game_id)

                                game.state.players = game.state.players.filter(in_game_p => in_game_p.id !== p.id)

                                if (game.state.players.length == 0) {
                                    // close game if this player is the only one left in it
                                    game.dispose()
                                    delete active_games[game_id]
                                }
                               
                                emitActiveGames()
                            }
                        }
                    }
                }
            } catch (disconnect_err) {
                console.error({disconnect_err})
            }
        })

        socket.on(`error`, data => {
            console.error({socket_err: data})
        })

        socket.on(`create_new_game`, data => {
            try {
                const {player} = socket
                const {id}     = player

                if (active_games[id]) throw `A game with id ${id} already exists.`

                socket.join(id)
                active_games[id] = GameEngine(player, io, SOCKET_PATH, data.match_secs)
                emitActiveGames()
            
            } catch (create_new_game_err) {
                console.error({create_new_game_err})
            }
        })

        socket.on(`join_game`, data => {
            try {
                const { game_id } = data
                const game = active_games[game_id]
                if (game && game.state.players.length < 4) {
                    socket.join(game_id)
                    game.state.players.push(socket.player)
                    game.state.score[socket.player.id] = 0
                    emitActiveGames()
                } 

            } catch (join_game_err) {
                console.error({join_game_err})
            }
        })

        socket.on(`start_game`, data => {
            try {
                const { game_id } = data
                const game        = active_games[game_id]
                
                // only the game originator can start the game
                if (game && game.state.players[0].id === socket.player.id) {
                    const { state }  = game
                    state.started    = true
                    state.start_time = new Date().getTime()
                    emitActiveGames()

                    // when the time runs out, notify clients & dispose the game
                    setTimeout(() => {
                        delete active_games[game_id]
                        emitActiveGames()

                        io.of(SOCKET_PATH).emit(`game_over`, {state})
                        game.dispose()
                    }, state.game_length)
                }
            
            } catch (start_game_err) {
                console.error({start_game_err})
            }
        })

        socket.on(`pop_bubble`, data => {
            try {
                const { bubble } = data
                const game       = active_games[bubble.game_id]
                
                if (game) game.attemptPopBubble(bubble, socket.player)
            } catch (pop_bubble_err) {
                console.error({pop_bubble_err})
            }
        })

        socket.emit(`connected`)
    })
}