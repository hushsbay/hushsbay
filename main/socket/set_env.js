const config = require('../config')
const nodeConfig = require(config.app.nodeConfig)
const ws = require(nodeConfig.app.ws)
const wsmysql = require(nodeConfig.app.wsmysql)

module.exports = async function(socket, param) {
	const _logTitle = param.ev
	let conn, sql, data, len
	try { //ws.sock.warn(null, socket, _logTitle, com.cons.rq + JSON.stringify(param))
		const _kind = param.data.kind		
		const userid = socket.userid //param.data.userid
		conn = await wsmysql.getConnFromPool(global.pool)
		param.data.userid = userid
		if (_kind == 'noti' || _kind == 'dispmem') {
			const _value = param.data.value
			const _roomid = param.data.roomid
			if (_kind == 'noti') {
				await wsmysql.query(conn, "UPDATE A_ROOMDTL_TBL SET NOTI = ? WHERE ROOMID = ? AND USERID = ? ", [_value, _roomid, userid]) 
				socket.emit(ws.cons.sock_ev_common, param)	
				ws.sock.sendToMyOtherSocket(socket, param)
			} else { //mobile only
				await wsmysql.query(conn, "UPDATE A_ROOMDTL_TBL SET DISPMEM = ? WHERE ROOMID = ? AND USERID = ? ", [_value, _roomid, userid])
				socket.emit(ws.cons.sock_ev_common, param)	 
			}					
		} else if (_kind == 'userinfo') {
			ws.sock.broadcast(ws.cons.sock_ev_set_env, param.data, 'all')
		} //ws.sock.warn(null, socket, _logTitle, com.cons.rs + JSON.stringify(param))
	} catch (ex) {
		ws.sock.warn(ws.cons.sock_ev_alert, socket, _logTitle, ex)
	} finally {
		wsmysql.closeConn(conn, _logTitle)
	}
}
