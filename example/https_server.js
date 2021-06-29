const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const httpsOptions = {
  key: fs.readFileSync('./certificates/localhost.key'),
  cert: fs.readFileSync('./certificates/localhost.crt')
}
app.prepare().then(() =>
  createServer(httpsOptions, (req, res) => {
    app.getRequestHandler()(req, res, parse(req.url, true))
  }).listen(3000, err => {
    if (err) {
      throw err
    }
    console.log('> Server started on https://localhost:3000')
  })
)
