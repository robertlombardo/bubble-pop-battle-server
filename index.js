import 'babel-polyfill';
import express    from 'express'
import * as fs    from 'fs'
import bodyParser from 'body-parser'
import sockets    from './routes/sockets/index'

const app = express()

// Body parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  limit: '2mb',
  extended: true,
}));

// CORS
app.use((req, res, next) => {
  res.header(`Access-Control-Allow-Origin`,   `*`)
  res.header(`Access-Control-Allow-Headers`,  `Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Jiro-Request-Tag`)
  res.header(`Access-Control-Allow-Methods`,  `GET,POST,OPTIONS`)
  res.header(`Access-Control-Expose-Headers`, `*`)
  res.header(`Content-Type`,                  `text/plain`)
  res.header(`Upgrade`,                       `$http_upgrade` )
  res.header(`Connection`,                    `upgrade` )

  if(req.method === `OPTIONS`) return res.sendStatus(200)
  else return next()
})

sockets.init(app)
