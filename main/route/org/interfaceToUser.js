const config = require('../../config')
const nodeConfig = require(config.app.nodeConfig)
const ws = require(nodeConfig.app.ws)
const wsmysql = require(nodeConfig.app.wsmysql)
const express = require('express')
const router = express.Router()

router.use(function(req, res, next) {
	req.title = 'interfaceToUser'
	next() //next('error')는 아래 ws.util.watchRouterError()로 연결
})

router.post('/', async function(req, res) {
	let conn, sql, data, len
	try {
		const rs = ws.http.resInit()	
		conn = await wsmysql.getConnFromPool(global.pool)
		const user = req.body.user
		const objToken = await ws.jwt.chkToken(req, res) //res : 오류시 바로 클라이언트로 응답. conn : 사용자 조직정보 위변조체크
		const userid = objToken.userid
		if (!userid) {
			ws.http.resWarn(res, objToken.msg, false, objToken.code, req.title)
			return
		}
		if (!ws.http.ipChk(config.app.ipAccess, req.clientIp)) throw new Error('client ip not allowed')
		if (!Array.isArray(user)) throw new Error('user 파라미터는 배열이어야 합니다.') 
		if (user.length == 0) throw new Error('배열의 길이가 0입니다.')
		await wsmysql.txBegin(conn)
		let dtkey = user[0].DTKEY ? user[0].DTKEY : ws.util.getCurDateTimeStr()
		sql = "SELECT COUNT(*) CNT FROM Z_INTUSER_TBL WHERE DTKEY = ? "
		data = await wsmysql.query(conn, sql, [dtkey])
		if (data[0].CNT > 0) {
			sql = "DELETE FROM Z_INTUSER_TBL WHERE DTKEY = ? "
			await wsmysql.query(conn, sql, [dtkey])
		}
		len = user.length
		for (let i = 0; i < len; i++) {			
			sql = "INSERT INTO Z_INTUSER_TBL (DTKEY, USER_ID, USER_NM, ORG_CD, ORG_NM, TOP_ORG_CD, TOP_ORG_NM, JOB, TEL_NO, AB_CD, AB_NM) "
			sql += " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
			await wsmysql.query(conn, sql, [
				dtkey, user[i].USER_ID, user[i].USER_NM, user[i].ORG_CD, user[i].ORG_NM, user[i].TOP_ORG_CD, user[i].TOP_ORG_NM, 
				user[i].JOB, user[i].TEL_NO, user[i].AB_CD, user[i].AB_NM
			])
		}
		rs.dtkey = dtkey
		await wsmysql.txCommit(conn)
		ws.http.resJson(res, rs, userid) //세번째 인자(userid) 있으면 token 갱신
	} catch (ex) {
		if (conn) await wsmysql.txRollback(conn)
		ws.http.resException(req, res, ex)
	} finally {
		wsmysql.closeConn(conn, req.title)
	}
})

ws.util.watchRouterError(router)

module.exports = router
