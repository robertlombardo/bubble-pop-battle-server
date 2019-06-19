"use strict";

var _socket = _interopRequireDefault(require("socket.io"));

var _http = _interopRequireDefault(require("http"));

var _gameEngine = _interopRequireDefault(require("../../game-engine"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SOCKET_PATH = "/sockets";
var sockets_by_player_id = {};
var active_games = {};

var getGameStates = function getGameStates(active_games) {
  var result = {};
  Object.keys(active_games).forEach(function (game_id) {
    result[game_id] = active_games[game_id].state;
  });
  return result;
};

exports.init = function (app) {
  var options = {
    path: SOCKET_PATH,
    origins: ["*:*", "http://127.0.0.1:*", "http://".concat(process.env.KOJI_SERVICE_HOSTNAME_frontend, ":*"), "https://".concat(process.env.KOJI_SERVICE_HOSTNAME_frontend, ":*"), "http://bubblepopbattle.withkoji.com:*", "https://bubblepopbattle.withkoji.com:*", "http://frontend-dee728a3-6698-4305-92d2-8a9f34f0af19.koji-staging.com:*", "https://frontend-dee728a3-6698-4305-92d2-8a9f34f0af19.koji-staging.com:*"].join(" ") // origins: `*`,
    // transports : process.env.NODE_ENV === `production` ? [`websocket`, `polling`] : [`polling`],

  };

  var server = _http.default.createServer(app); // console.log('\nprocess.env:')
  // console.log(process.env)


  var PORT = process.env.PORT || 3333;
  server.once("listening", function () {
    console.info("\nMultiplayer Bubble Pop - Sockets server is listening on port: ".concat(PORT));
  });
  server.listen(PORT);

  var io = _socket.default.listen(server, options);

  var emitActiveGames = function emitActiveGames() {
    io.of(SOCKET_PATH).emit("active_games", {
      active_games: getGameStates(active_games)
    });
  };

  io.of(SOCKET_PATH).on("connection", function (socket) {
    console.log('got a connection!'); // initialize a new player (TODO - don't do this if we're pulling player from localStorage)

    var player_id = new Date().getTime().toString();
    var player = socket.player = {
      id: player_id,
      display_name: "player_".concat(player_id.slice(player_id.length - 4)),
      avatar_key: Math.ceil(Math.random() * 7),
      color_a: '#' + (Math.random() * 0xFFFFFF << 0).toString(16),
      color_b: '#' + (Math.random() * 0xFFFFFF << 0).toString(16)
    };
    setTimeout(function () {
      console.log('emitting player_state, active_games');
      socket.emit("player_state", {
        player: player
      });
      socket.emit("active_games", {
        active_games: getGameStates(active_games)
      });
    }, 500);
    sockets_by_player_id[player_id] = socket;
    socket.on("disconnect", function (data) {
      try {
        var _player = socket.player;

        if (_player) {
          delete sockets_by_player_id[_player.id]; // deal with any active games this player is in

          for (var game_id in active_games) {
            var game = active_games[game_id];
            var players = game.state.players;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              var _loop = function _loop() {
                var p = _step.value;

                if (p.id === _player.id) {
                  socket.leave(game_id);
                  game.state.players = game.state.players.filter(function (in_game_p) {
                    return in_game_p.id !== p.id;
                  });

                  if (game.state.players.length == 0) {
                    // close game if this player is the only one left in it
                    game.dispose();
                    delete active_games[game_id];
                  }

                  emitActiveGames();
                }
              };

              for (var _iterator = players[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                _loop();
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return != null) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }
          }
        }
      } catch (disconnect_err) {
        console.error({
          disconnect_err: disconnect_err
        });
      }
    });
    socket.on("error", function (data) {
      console.error({
        socket_err: data
      });
    });
    socket.on("create_new_game", function (data) {
      try {
        var _player2 = socket.player;
        var id = _player2.id;
        if (active_games[id]) throw "A game with id ".concat(id, " already exists.");
        socket.join(id);
        active_games[id] = (0, _gameEngine.default)(_player2, io, SOCKET_PATH, data.match_secs);
        emitActiveGames();
      } catch (create_new_game_err) {
        console.error({
          create_new_game_err: create_new_game_err
        });
      }
    });
    socket.on("join_game", function (data) {
      try {
        var game_id = data.game_id;
        var game = active_games[game_id];

        if (game && game.state.players.length < 4) {
          socket.join(game_id);
          game.state.players.push(socket.player);
          game.state.score[socket.player.id] = 0;
          emitActiveGames();
        }
      } catch (join_game_err) {
        console.error({
          join_game_err: join_game_err
        });
      }
    });
    socket.on("start_game", function (data) {
      try {
        var game_id = data.game_id;
        var game = active_games[game_id]; // only the game originator can start the game

        if (game && game.state.players[0].id === socket.player.id) {
          var state = game.state;
          state.started = true;
          state.start_time = new Date().getTime();
          emitActiveGames(); // when the time runs out, notify clients & dispose the game

          setTimeout(function () {
            delete active_games[game_id];
            emitActiveGames();
            io.of(SOCKET_PATH).emit("game_over", {
              state: state
            });
            game.dispose();
          }, state.game_length);
        }
      } catch (start_game_err) {
        console.error({
          start_game_err: start_game_err
        });
      }
    });
    socket.on("pop_bubble", function (data) {
      try {
        var bubble = data.bubble;
        var game = active_games[bubble.game_id];
        if (game) game.attemptPopBubble(bubble, socket.player);
      } catch (pop_bubble_err) {
        console.error({
          pop_bubble_err: pop_bubble_err
        });
      }
    });
    socket.emit("connected");
  });
};