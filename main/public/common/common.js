(function() { //jQuery 없음
    window.hush = {
        cons : {
            failOnLoad : "failOnLoad"
        },
        http : {
            handleNoCache: (url) => {
                let _url = url
                if (!_url.includes("nocache=")) _url += (_url.includes("?") ? "&" : "?") + "nocache=" + hush.util.getRnd()
                return _url
            },
        },
        msg : { //1. alert 2. alertWait(text) 3. alertWait(text, boolean) 4. toast (여러개의 메시지를 순서대로 처리하는 기능도 지원)
            alertSeq : -1,
            toastTextArr : [],
            toastSecArr : [],
            toastProcessing : false,
            addHtml : (_type, _text, _callbackOk, _callbackCancel, _obj) => { //_obj (alert에만 사용하고 toast에는 미사용) : width, height, backColor, color
                const maxWidth = (_obj && _obj.width) ? _obj.width : 400
                const maxHeight = (_obj && _obj.height) ? _obj.height : 600
                const backColor = (_obj && _obj.backColor) ? _obj.backColor : "beige"
                const color = (_obj && _obj.color) ? _obj.color : "black"
                const _seq = (_type == "toast") ? "" : (++hush.msg.alertSeq).toString()
                let _html = "<div id=hushPopup" + _seq + " style='z-index:9999;position:fixed;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent'>"
                _html += "	    <div id=hushPopupMain" + _seq + " style='min-width:180px;min-height:120px;max-width:" + maxWidth + "px;max-height:" + maxHeight + "px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;background:" + backColor + ";color:" + color + ";border:1px solid darkgray;border-radius:5px;box-shadow:3px 3px 3px grey;padding:10px'>"
                _html += "		    <div style='width:100%;height:calc(100% - 45px);overflow:auto'>" + _text + "</div>"
                _html += "		    <div id=hushBtn" + _seq + " style='width:100%;height:45px;display:flex;align-items:center;justify-content:flex-end;border-top:1px solid darkgray;padding-top:10px;margin-top:10px'>"
                _html += "			    <div id=hushPopupOk" + _seq + " style='cursor:pointer;font-weight:bold;color:black;border-radius:5px;background:#0082AD;color:white;padding:10px 15px;margin:0px 0px 0px 10px'>확인</div>"
                _html += "			    <div id=hushPopupCancel" + _seq + " style='display:none;cursor:pointer;font-weight:bold;color:black;border-radius:5px;background:#0082AD;color:white;padding:10px 15px;margin:0px 0px 0px 10px'>취소</div>"
                _html += "		    </div>"				
                _html += "	    </div>"
                _html += "</div>"
                const _body = document.querySelector("body")
                _body.insertAdjacentHTML('beforeend', _html)
                if (_type == "toast") return
                const _div = document.getElementById("hushPopup" + _seq)
                const _divOk = document.getElementById("hushPopupOk" + _seq)
                const _divCancel = document.getElementById("hushPopupCancel" + _seq)
                if (_callbackCancel) _divCancel.style.display = "block"
                _divOk.addEventListener("click", function() { //onclick=xxx()로는 promise resolve 처리못함
                    _div.remove()
                    if (_callbackOk) _callbackOk()
                })
                _divCancel.addEventListener("click", function() {
                    _div.remove()
                    if (_callbackCancel) _callbackCancel()
                })
            },
            // alert : (_text, _callbackOk, _callbackCancel, _obj) => { //비동기콜백이므로 루틴내에서는 1개만 또는 alertWait 다음에만 1개 사용 가능 
            //     hush.msg.addHtml("alert", _text, _callbackOk, _callbackCancel, _obj)
            // },
            // alertWait : (_text, OKCancel, _obj) => new Promise((resolve) => {
            //     if (OKCancel) { //window.prompt()와 유사
            //         hush.msg.alert(_text, function() {
            //             resolve(true)
            //         }, function() {
            //             resolve(false)
            //         }, _obj)
            //     } else { //window.alert()와 유사
            //         hush.msg.alert(_text, function() {
            //             resolve(true)
            //         }, null, _obj)
            //     }
            // }),
            msg : (_text, _callbackOk, _callbackCancel, _obj) => { //비동기콜백이므로 루틴내에서는 1개만 또는 alertWait 다음에만 1개 사용 가능 
                hush.msg.addHtml("", _text, _callbackOk, _callbackCancel, _obj)
            },
            alert : (_text, _obj) => new Promise((resolve) => {
                hush.msg.msg(_text, function() {
                    resolve(true)
                }, null, _obj)
            }),
            confirm : (_text, _obj) => new Promise((resolve) => {
                hush.msg.msg(_text, function() {
                    resolve(true)
                }, function() {
                    resolve(false)
                }, _obj)
            }),
            toast : (_text, _sec) => { //alertWait 다음에도 여러 개 사용 가능 
                hush.msg.toastTextArr.push(_text)
                hush.msg.toastSecArr.push(_sec)
                hush.msg.toastLoop()
            },
            toastEnd : () => {
                const _div = document.getElementById("hushPopup")
                _div.remove()
                hush.msg.toastTextArr.splice(0, 1) //첫번째 아이템 제거
                hush.msg.toastSecArr.splice(0, 1) //첫번째 아이템 제거
                hush.msg.toastProcessing = false
                hush.msg.toastLoop()
            },
            toastLoop : () => {
                const _len = hush.msg.toastTextArr.length
                if (_len == 0) return 
                if (hush.msg.toastTextArr.length > 10) {
                    hush.msg.toastTextArr = []
                    hush.msg.toastSecArr = []
                    alert("토스트 메시지는 한번에 10개까지만 지원합니다.") 
                    return
                }
                if (hush.msg.toastProcessing) {
                    setTimeout(function() {
                        hush.msg.toastLoop()
                    }, 500)
                    return
                }
                hush.msg.toastProcessing = true
                hush.msg.addHtml("toast", hush.msg.toastTextArr[0])                
                const _divBtn = document.getElementById("hushBtn")
                _divBtn.style.display = "none"
                const _divPopupMain = document.getElementById("hushPopupMain")
                _divPopupMain.style.minWidth = "0px"
                _divPopupMain.style.minHeight = "0px"
                const _sec = hush.msg.toastSecArr[0]
                if (_sec == -1) { 
                    //endless toast (예: 서버호출) : 사용자가 toastEnd()를 이용해 종료
                } else {
                    const sec = (!_sec ? 3 : _sec) * 1000
                    setTimeout(function() {
                        hush.msg.toastEnd()
                    }, sec)
                }
            }
        },
        util : {
            isvoid : (obj) => {
                if (typeof obj == "undefined" || obj == null) return true
                return false
            },
            showEx : (ex, title, showToast) => {
                const _title = title ? "[" + title + "]<br>" : ""
                let _msg
                if (typeof ex == "string") {
                    _msg = _title + ex
                } else if (typeof ex == "object" && ex.stack) {
                    const arr = ex.stack.split("\n")
                    arr.splice(0, 1) //첫번째 아이템 제거
                    const strAt = arr.join("\n")
                    console.log(ex.stack)
                    _msg = _title + ex.message + "<br><br>" + strAt
                } else {
                    _msg = _title + ex.toString()
                }
                if (showToast) {
                    hush.msg.toast(_msg)
                } else {
                    hush.msg.alert(_msg)
                }
            },
            getRnd : (_min, _max) => {
                const min = (!_min && _min != 0) ? 100000 : _min
                const max = (!_max && _max != 0) ? 999999 : _max
                return Math.floor(Math.random() * (max - min)) + min //return min(inclusive) ~ max(exclusive) Integer only 
            },
            openWinPop : (url, width, height, pos) => { //pos : 1) 없으면 중앙 2) 1~9999면 중앙인데 top만 지정 3) 0이면 (0, 0) 4) random은 랜덤
                let _left, _top
                const _width = width ? width : "550"
                const _height = height ? height : "700"
                if (hush.util.isvoid(pos)) {
                    _left = (parseInt(screen.width) - _width) / 2
                    _top = (parseInt(screen.height) - _height) / 2
                } else if (pos >= 1 && pos <= 9999) { //9999이하면 top으로 정의
                    _left = (parseInt(screen.width) - _width) / 2
                    _top = pos
                } else if (pos == 0) {
                    _left = 0
                    _top = 0
                } else {
                    const _leftMax = screen.width - _width
                    const _topMax = screen.height - _height                
                    _left = hush.util.getRnd(0, _leftMax)
                    _top = hush.util.getRnd(0, _topMax)
                }
                const _bar = "left=" + _left + ",top=" + _top + ",width=" + _width + ",height=" + _height + ",menubar=no,status=no,toolbar=no,resizable=yes,location=no"
                const _url = hush.http.handleNoCache(url)
                return window.open(_url, "", _bar)
            },
        }
    }
})()