const config = require('../../config')
const ws = require(config.app.ws)
const wsmysql = require(config.app.wsmysql)
const express = require('express')
const router = express.Router()

router.use(function(req, res, next) {
	req.title = 'empsearch'
	next() //next('error') for going to ws.util.watchRouterError() below
})

router.post('/', async function(req, res) {
	let conn, sql, data, len
	const rs = ws.http.resInit()
	try {
		const keyword = req.body.keyword
		const teamcode = req.body.teamcode
		const comp = (!req.body.comp || req.body.comp.toLowerCase() == 'all') ? 'all' : ws.util.toStringForInClause(req.body.comp)
		conn = await wsmysql.getConnFromPool(global.pool)
		rs.token = await ws.jwt.chkVerify(req, res, req.body.tokenInfo, conn)
		if (rs.token == '') return //모바일앱 등 고려해서 편의상 쿠키로 처리하지 않음
		rs.token = ws.jwt.make({ userid : req.body.tokenInfo.userid }) //모바일앱 등 고려해서 편의상 쿠키로 처리하지 않음		
		sql =  "SELECT ORG_CD, ORG_NM, TOP_ORG_CD, TOP_ORG_NM, USER_ID, USER_NM, NICK_NM, JOB, TEL_NO, AB_CD, AB_NM "
		sql += "  FROM JAY.Z_USER_TBL "
		sql += " WHERE ORG_CD IS NOT NULL " //바로 아래 조건이 where는 고려하지 말고 and만 편하게 사용하기 위한 dummy where절임
        if (comp != 'all') sql += " AND TOP_ORG_CD IN ('" + comp + "') "
        if (teamcode) {
            sql += " AND ORG_CD = '" + teamcode + "' "
        } else {
            sql += " AND (USER_NM LIKE '%" + keyword + "%' OR ORG_NM LIKE '%" + keyword + "%') "
        }
        sql += " ORDER BY USER_NM, USER_ID "
		data = await wsmysql.query(conn, sql, null)
		len = data.length
        if (len == 0) {
			ws.http.resWarn(res, ws.cons.MSG_NO_DATA, true) //true=toast
			return
		}
       	rs.list = data
		res.json(rs)
	} catch (ex) {
		ws.http.resException(req, res, ex)
	} finally {
		wsmysql.closeConn(conn, req.title)
	}
})

ws.util.watchRouterError(router)

module.exports = router