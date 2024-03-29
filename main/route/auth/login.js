const config = require('../../config')
const ws = require(config.app.ws)
const wsmysql = require(config.app.wsmysql)
const express = require('express')
const router = express.Router()

router.use(function(req, res, next) {
	req.title = 'login'
	next() //next('error') for going to ws.util.watchRouterError() below
})

router.post('/', async function(req, res) {
	let conn, sql, data, len, userid
	try { 
		const rs = ws.http.resInit()
		const { uid, pwd, autologin } = req.body
		const device = ws.http.deviceFrom(req) //console.log(uid, pwd, autologin, device)
		if (device == 'web') {
			if (!uid) {
				userid = await ws.jwt.chkToken(req, res) //사용자 부서 위변조체크 필요없으면 세번째 인자인 conn을 빼면 됨
				if (!userid) return			
			} else {
				userid = uid
			}
		} else {
			userid = uid
		}
		conn = await wsmysql.getConnFromPool(global.pool)
		sql =  "SELECT USER_ID, PWD, USER_NM, PASSKEY, ORG_CD, ORG_NM, TOP_ORG_CD, TOP_ORG_NM, NICK_NM, JOB, AB_CD, AB_NM, STANDALONE, NOTI_OFF, "
		sql += "       SOUND_OFF, TM_FR, TM_TO, BODY_OFF, SENDER_OFF "
		sql += "  FROM Z_USER_TBL "
		sql += " WHERE USER_ID = ? "
		data = await wsmysql.query(conn, sql, [userid])
		if (data.length == 0) {
			ws.http.resWarn(res, '사용자아이디가 없습니다.')
			return
		}		
		if (device == 'web') {
			//위 토큰 인증을 신뢰하고 진행함
		} else {
			let pwdToCompare
			if (autologin == 'Y') { //pwd는 앱에 저장된 암호화된 상태의 값이므로 pwdToCompare도 암호화된 값 그대로 비교 필요
				pwdToCompare = data[0].PWD
			} else { //pwd는 암호화되지 않은 사용자 입력분 그대로이므 pwdToCompare도 디코딩 필요
				pwdToCompare = ws.util.decrypt(data[0].PWD, nodeConfig.crypto.key)
			}
			if (pwd != pwdToCompare) {
				ws.http.resWarn(res, '비번이 다릅니다.')
				return
			}
		}		
		Object.assign(rs, data[0])
		if (ws.http.deviceFrom(req) == 'web') delete rs['PWD'] //웹에서는 브라우저에서 비번저장하지 않음 (암호화된 비번도 내리지도 말기)
		//여기는 모두 세션 쿠키로 내림. 아래 쿠키설정은 verifyUser() in common.js의 쿠키가져오기와 일치해야 함 
		//userid는 여기가 아닌 (아이디저장 옵션때문에 session/persist 여부를) login.html에서 판단 : 여기서도 설정하면 브라우저에서와 충돌 (더 먼저 수행될 수 있어 문제)
		//ws.http.resCookie(res, "usernm", rs.USER_NM); ws.http.resCookie(res, "orgcd", rs.ORG_CD); ws.http.resCookie(res, "orgnm", rs.ORG_NM)
		//ws.http.resCookie(res, "toporgcd", rs.TOP_ORG_CD); ws.http.resCookie(res, "toporgnm", rs.TOP_ORG_NM)
		//위 쿠키는 여기서해도 되지만 코드 편의상 login.html에서 userid와 함께 전체적으로 설정함
		//결론적으로, 사용자정보는 응답본문으로 내리고 토큰만 응답본문+쿠키로 내림 (쿠키만 내려도 구현을 가능한데 코딩이 불편해서 아예 응답본문으로도 토큰을 내림)
		//1) 웹에서는 사용자정보는 login.html에서 쿠키로 설정하고 토큰은 자동으로 쿠키로 내려감 (비번 불포함)
		//2) 앱에서는 사용자정보 및 토큰을 응답본문으로 모두 받으므로 그걸 모두 UserInfo()에서 KeyChain으로 저장함 (비번 포함)
		ws.http.resJson(res, rs, userid) //세번째 인자가 있으면 token 생성(갱신)해 내림
	} catch (ex) {
		ws.http.resException(req, res, ex)
	} finally {
		wsmysql.closeConn(conn, req.title)
	}
})

ws.util.watchRouterError(router)

module.exports = router