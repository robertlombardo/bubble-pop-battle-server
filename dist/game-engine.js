"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var GameEngine = function GameEngine(initial_player, io, SOCKET_PATH, match_secs) {
  var game_id = initial_player.id;
  var players = [initial_player];
  var state = {
    id: game_id,
    players: players,
    started: false,
    game_length: match_secs * 1000,
    bubbles: [],
    score: _defineProperty({}, initial_player.id, 0)
  };

  var createBubbles = function createBubbles() {
    try {
      if (!state.started) return create_bubbles_timeout = setTimeout(createBubbles, 1000);
      create_bubbles_timeout = setTimeout(createBubbles, 3000 + Math.random() * 3000); // clear out any bubbles that are too old to possibly be in play anymore
      // (bit of a hack, but much better than trying to initiate this cleanup from the client)

      var now = new Date().getTime();
      state.bubbles = state.bubbles.filter(function (b) {
        return now - b.created_at < 120000;
      });
      var new_bubbles = [];
      var num = 10 * Object.keys(state.players).length + Math.random() * 15;

      for (var i = 0; i < num; ++i) {
        new_bubbles.push({
          id: (now * (i + 1)).toString(),
          game_id: game_id,
          token_key: Math.ceil(Math.random() * 7),
          created_at: now
        });
      }

      state.bubbles = state.bubbles.concat(new_bubbles); // for (let p of state.players) sockets_by_player_id[p.id].emit(`new_bubbles`, {new_bubles, state})

      io.of(SOCKET_PATH).to(game_id).emit("new_bubbles", {
        new_bubbles: new_bubbles,
        state: state
      });
    } catch (create_bubbles_err) {
      console.error({
        create_bubbles_err: create_bubbles_err
      });
    }
  };

  var create_bubbles_timeout = setTimeout(createBubbles, 1000);
  return {
    state: state,
    attemptPopBubble: function attemptPopBubble(bubble, popping_player) {
      var exists = state.bubbles.find(function (b) {
        return b.id === bubble.id;
      });

      if (exists) {
        state.bubbles = state.bubbles.filter(function (b) {
          return b.id !== bubble.id;
        });
        state.score[popping_player.id] += bubble.token_key === popping_player.avatar_key ? 3 : 1;
        io.of(SOCKET_PATH).to(game_id).emit("bubble_was_popped", {
          bubble: bubble,
          state: state
        });
      }
    },
    dispose: function dispose() {
      clearTimeout(create_bubbles_timeout);
      state.players.splice(0);
    }
  };
};

var _default = GameEngine;
exports.default = _default;