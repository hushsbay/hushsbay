const config = require('../../config')
const ws = require(config.app.ws)
const wsmysql = require(config.app.wsmysql)
const express = require('express')
const router = express.Router()

router.use(function(req, res, next) {
	req.title = 'qry_poral'
	next() //next('error') for going to ws.util.watchRouterError() below
})

router.post('/', async function(req, res) {
	let conn, sql, data, len, userid
	try {
		const rs = ws.http.resInit()	
		const dateFr = ws.util.setDateAdd(new Date(), ws.cons.max_days_to_fetch)

		let { type, roomid, keyword, dt, cnt } = req.body
		keyword = decodeURIComponent(keyword) || ''
		cnt = parseInt(cnt)

		//const _type = req.query.type
		//const _keyword = decodeURIComponent(req.query.keyword) || ''
		//const _roomid = req.query.roomid			
		//const _dt = req.query.dt
		//const _cnt = parseInt(req.query.cnt)
		conn = await wsmysql.getConnFromPool(global.pool)
		userid = await ws.jwt.chkToken(req, res, conn) //사용자 부서 위변조체크 필요없으면 세번째 인자인 conn을 빼면 됨
		if (!userid) return
		const subqry = "(SELECT CDT FROM A_MSGDTL_TBL WHERE ROOMID = A.ROOMID AND RECEIVERID = '" + userid + "' AND STATE IN ('', 'R') ORDER BY CDT DESC LIMIT 1) "
		sql = "SELECT ROOMID, ROOMNM, MASTERID, MASTERNM, MEMCNT, MAINNM, NOTI, STATE, NICKNM, LASTMSG, LASTDT "
		sql += "	 FROM ("
		sql += "   SELECT A.ROOMID, A.ROOMNM, A.MASTERID, A.MASTERNM, A.MEMCNT, A.NICKNM MAINNM, B.NOTI, B.STATE, B.NICKNM, "
		sql += "		  (SELECT CONCAT(TYP, '" + ws.cons.subdeli + "', BODY) "
		sql += "		     FROM A_MSGMST_TBL WHERE MSGID = (SELECT MSGID FROM A_MSGDTL_TBL "
		sql += "		     								             WHERE ROOMID = A.ROOMID AND RECEIVERID = '" + userid + "' AND STATE IN ('', 'R') " 
		sql += "		     								             ORDER BY CDT DESC LIMIT 1)) LASTMSG, "
		sql += "		  IF(" + subqry + " IS NULL, (SELECT CDT FROM A_MSGMST_TBL WHERE ROOMID = A.ROOMID ORDER BY CDT DESC LIMIT 1), " + subqry + ") LASTDT " //Consider in case all mesaages deleted since it's order is important.
		sql += "     FROM A_ROOMMST_TBL A, A_ROOMDTL_TBL B "
		sql += "    WHERE A.ROOMID = B.ROOMID "
		if (type == 'search') {
			sql += "  AND B.USERID = '" + userid + "' AND B.STATE = '' "
			sql += "  AND (A.ROOMNM LIKE '%" + keyword + "%' OR A.NICKNM LIKE '%" + keyword + "%' OR B.NICKNM LIKE '%" + keyword + "%')) Z "
			sql += "WHERE LASTDT >= '" + dateFr + "' "
			sql += "ORDER BY LASTDT DESC "
		} else if (type == 'row') { //for refreshing specific room info
			sql += "  AND A.ROOMID = '" + roomid + "' "
			sql += "  AND B.USERID = '" + userid + "' AND B.STATE = '') Z "
		} else { //normal (endless scrolling) or reconnect
			sql += "  AND B.USERID = '" + userid + "' AND B.STATE = '') Z "
			sql += "WHERE LASTDT >= '" + dateFr + "' AND LASTDT < '" + dt + "' "
			sql += "ORDER BY LASTDT DESC LIMIT 0, " + cnt
		}
		data = await wsmysql.query(conn, sql, null)
		len = data.length
		if (data.length == 0) {
			ws.http.resWarn(res, ws.cons.MSG_NO_DATA, true)
			return
		}
		rs.list = data
		ws.http.resJson(res, rs, userid) //세번째 인자가 있으면 token 생성(갱신)해 내림
	} catch (ex) {
		ws.http.resException(req, res, ex)
	} finally {
		wsmysql.closeConn(conn, req.title)
	}
})

ws.util.watchRouterError(router)

module.exports = router