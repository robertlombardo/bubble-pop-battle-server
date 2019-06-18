"use strict";

require("babel-polyfill");

var _express = _interopRequireDefault(require("express"));

var fs = _interopRequireWildcard(require("fs"));

var _bodyParser = _interopRequireDefault(require("body-parser"));

var _index = _interopRequireDefault(require("./routes/sockets/index"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express.default)(); // Body parser

app.use(_bodyParser.default.json());
app.use(_bodyParser.default.urlencoded({
  limit: '2mb',
  extended: true
})); // CORS

app.use(function (req, res, next) {
  // res.header(`Access-Control-Allow-Origin`,   `*`)
  // res.header(`Access-Control-Allow-Headers`,  `Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Jiro-Request-Tag`)
  // res.header(`Access-Control-Allow-Methods`,  `GET,POST,OPTIONS`)
  // res.header(`Access-Control-Expose-Headers`, `*`)
  // res.header(`Content-Type`,                  `text/plain`)
  // res.header(`Upgrade`,                       `$http_upgrade` )
  // res.header(`Connection`,                    `upgrade` )
  // if(req.method === `OPTIONS`) return res.sendStatus(200)
  // else return next()
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'x-forwarded-for');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
});

_index.default.init(app);