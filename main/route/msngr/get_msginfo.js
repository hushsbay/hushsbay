const config = require('../../config')
const ws = require(config.app.ws)
const wsmysql = require(config.app.wsmysql)
const fs = require('fs')
const mime = require('mime')
const express = require('express')
const router = express.Router()
//1) Image downloading 2) Checking sending failure

router.use(function(req, res, next) {
	req.title = 'get_msginfo'
	next() //next('error') for going to ws.util.watchRouterError() below
})

router.post('/', async function(req, res) {
	let conn, sql, data, len
	try {
		const rs = ws.http.resInit()
		const { msgid, body, kind, msgids } = req.body
		conn = await wsmysql.getConnFromPool(global.pool) //의도적으로 인증체크하지 않음??
		if (kind == 'check') {
			const _arr = []
			for (let _msgid of msgids) {
				sql = "SELECT COUNT(*) CNT FROM A_MSGMST_TBL WHERE MSGID = ? "
				data = await wsmysql.query(conn, sql, [_msgid])
				if (data[0].CNT == 0) _arr.push(_msgid) //sending failure
			}
			rs.list = _arr
			ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
		} else {
			sql = "SELECT TYP TYPE, BUFFER, BODY FROM A_MSGMST_TBL WHERE MSGID = ? "
			data = await wsmysql.query(conn, sql, [msgid])
			if (data.length == 0) {
				ws.http.resWarn(res, ws.cons.MSG_NO_DATA, true) //true=toast
				return
			}
			if (data[0].TYPE == 'image') {
				//const ret = await ws.chkAccessUserWithTarget(req.cookies.userid, msgid, '')
				//if (ret != '') throw new Error(ret)
				//rs.buffer = data[0].BUFFER //rs.bufferStr = (data[0].BUFFER) ? Buffer.from(data[0].BUFFER, 'binary').toString('base64') : null
				//resolve(rs)
				rs.list = data
				ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
			} else if (data[0].TYPE == 'file' || data[0].TYPE == 'flink') { //almost same as get_sublink.js 
				let fileToProc
				const _fileStr = body.split(ws.cons.deli)
				const objFileStr = ws.util.getFileNameAndExtension(_fileStr[0])
				if (ws.cons.sublink_ext_video.includes(objFileStr.ext)) {
					fileToProc = _fileStr[0] + ws.cons.sublink_result_img
				} else if (ws.cons.sublink_ext_image.includes(objFileStr.ext)) {
					fileToProc = _fileStr[0]
				} else {
					rs.list = data
					ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
					return
				}
				//const ret = await ws.chkAccessUserWithTarget(req.cookies.userid, msgid, 'file', _fileStr[0])
				//if (ret != '') throw new Error(ret)
				const _filepath = config.app.uploadPath + '/' + fileToProc
				fs.stat(_filepath, function(err, stat) {
					if (err) {
						rs.list = data
						ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
					} else {
						if (stat && stat.isFile() && stat.size <= ws.cons.max_size_to_sublink) { 
							fs.readFile(_filepath, function(err1, result) {
								if (!err1) data[0].BUFFER = result									
								rs.list = data
								ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
							})
						} else {
							rs.list = data
							ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
						}
					}					
				})
			} else {
				rs.list = data
				ws.http.resJson(res, rs) //세번째 인자가 있으면 token 생성(갱신)해 내림
			}
		}
	} catch (ex) {
		ws.http.resException(req, res, ex)
	} finally {
		wsmysql.closeConn(conn, req.title)
	}
})

ws.util.watchRouterError(router)

module.exports = router