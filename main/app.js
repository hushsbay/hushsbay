const config = require('./config')
const nodeConfig = require(config.app.nodeConfig)
const ws = require(config.app.ws)
const wsmysql = require(config.app.wsmysql)
const wslogger = require(config.app.wslogger)(config.app.logPath, 'hushsbay')

ws.util.addToGlobal(wslogger, { dirName: __dirname }, nodeConfig)
global.pool = wsmysql.createPool(config.mysql.schema, true)

const app = ws.util.initExpressApp('public')
const wasServer = ws.util.createWas(app, config.http.method) //not https (because of aws load balancer)
wasServer.listen(config.http.port, () => { console.log('wasServer listening on ' + config.http.port) })

app.use('/org/orgtree', require('./route/org/orgtree')) 
app.use('/org/empsearch', require('./route/org/empsearch')) 

ws.util.watchProcessError()
