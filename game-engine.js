const GameEngine = (initial_player, io, SOCKET_PATH, match_secs) => {
    const game_id = initial_player.id
    const players = [initial_player]

    const state = {
        id          : game_id,
        players,
        started     : false,
        game_length : match_secs * 1000,
        bubbles     : [],
        score       : {
            [initial_player.id]: 0,
        }
    }

    const createBubbles = () => {
        try {
            if (!state.started) return create_bubbles_timeout = setTimeout(createBubbles, 1000)
            create_bubbles_timeout = setTimeout(createBubbles, 3000 + Math.random() * 3000)

            // clear out any bubbles that are too old to possibly be in play anymore
            // (bit of a hack, but much better than trying to initiate this cleanup from the client)
            const now     = new Date().getTime()
            state.bubbles = state.bubbles.filter(b => now - b.created_at < 120000)

            const new_bubbles = []
            const num         = 10 * Object.keys(state.players).length + Math.random() * 15

            for (let i = 0; i < num; ++i) {
                new_bubbles.push({
                    id         : (now * (i + 1)).toString(),
                    game_id,
                    token_key  : Math.ceil(Math.random() * 7),
                    created_at : now, 
                })
            }
            state.bubbles = state.bubbles.concat(new_bubbles)

            // for (let p of state.players) sockets_by_player_id[p.id].emit(`new_bubbles`, {new_bubles, state})
            io.of(SOCKET_PATH).to(game_id).emit(`new_bubbles`, {new_bubbles, state})
        } catch (create_bubbles_err) {
            console.error({create_bubbles_err})
        }
    }
    let create_bubbles_timeout = setTimeout(createBubbles, 1000)

    return {
        state,
        attemptPopBubble: (bubble, popping_player) => {
            const exists = state.bubbles.find(b => b.id === bubble.id)
            if (exists) {
                state.bubbles = state.bubbles.filter(b => b.id !== bubble.id)

                state.score[popping_player.id] += bubble.token_key === popping_player.avatar_key ? 3 : 1

                io.of(SOCKET_PATH).to(game_id).emit(`bubble_was_popped`, {bubble, state})
            }
        },
        dispose: () => {
            clearTimeout(create_bubbles_timeout)
            state.players.splice(0)
        },
    }
}
export default GameEngine
