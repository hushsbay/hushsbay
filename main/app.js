const config = require('./config')
const nodeConfig = require(config.app.nodeConfig)
const ws = require(config.app.ws)
const wsmysql = require(config.app.wsmysql)
const wslogger = require(config.app.wslogger)(config.app.logPath, 'hushsbay')

ws.util.addToGlobal(wslogger, { dirName: __dirname, logPath : config.app.logPath }, nodeConfig)
global.pool = wsmysql.createPool(config.mysql.schema, true)

const app = ws.util.initExpressApp('public')
const wasServer = ws.util.createWas(app, config.http.method) //프로젝트 hushsbay는 aws 기반(https는 로드밸런서CLB 이용)이므로 여기서는 https가 아닌 http로 설정
wasServer.listen(config.http.port, () => { console.log('wasServer listening on ' + config.http.port) })

app.use('/auth/login', require('./route/auth/login'))

let rt = ['userlist', 'getuser', 'setuser']
for (let i; i < rt.length; i++) app.use('/user/' + rt[i], require('./route/user/' + rt[i])) //의도적으로 인증체크하지 않음
//app.use('/user/userlist', require('./route/user/userlist')) //의도적으로 인증체크하지 않음
//app.use('/user/getuser', require('./route/user/getuser')) //의도적으로 인증체크하지 않음
//app.use('/user/setuser', require('./route/user/setuser')) //의도적으로 인증체크하지 않음

rt = ['orgtree', 'empsearch', 'deptsearch']
for (let i; i < rt.length; i++) app.use('/org/' + rt[i], require('./route/org/' + rt[i])) 
//for (let item in rt) app.use('/org/' + item, require('./route/org/' + item))
//app.use('/org/orgtree', require('./route/org/orgtree')) 
//app.use('/org/empsearch', require('./route/org/empsearch')) 
//app.use('/org/deptsearch', require('./route/org/deptsearch')) 

ws.util.watchProcessError()
