define(["avalon"], function() {
    function parseCookieValue(s) {
        if (s.indexOf('"') === 0) {
// This is a quoted cookie as according to RFC2068, unescape...
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
            return  decodeURIComponent(s.replace(/\+/g, ' '))//处理加号
        } catch (e) {
            return s
        }
    }

    // Cookie.stringify('foo', 'bar', { httpOnly: true })  => "foo=bar; httpOnly"
    //将两个字符串变成一个cookie字段
    var Cookie = {
        stringify: function(name, val, opts) {
            var pairs = [name + "=" + encodeURIComponent(val)]
            if (isFinite(opts) && typeof opts === "number") {
                pairs.push("Max-Age=" + opts)
            } else {
                opts = opts || {}
                if (opts.maxAge)
                    pairs.push("Max-Age=" + opts.maxAge)
                if (opts.domain)
                    pairs.push("Domain=" + opts.domain)
                if (opts.path)
                    pairs.push("Path=" + opts.path)
                if (opts.expires)
                    pairs.push("Expires=" + opts.expires.toUTCString())
                if (opts.httpOnly)
                    pairs.push("HttpOnly")
                if (opts.secure)
                    pairs.push("Secure")
            }
            return pairs.join("; ")
        },
        //将一段字符串变成对象
        parse: function(str) {
            var obj = {}
            var pairs = str.split(/[;,] */)
            pairs.forEach(function(pair) {
                var index = pair.indexOf("=")
                var key = pair.substr(0, index)
                if (key) {
                    var val = pair.substr(++index, pair.length).trim()
                    if (!(key in obj)) {
                        obj[key] = parseCookieValue(val)
                    }
                }
            })
            return obj
        }
    }
    Cookie.getAll = function() {
        return Cookie.parse(String(document.cookie))
    }
    Cookie.get = function(name) {
        var ret, m;
        if (/\S/.test(name)) {
            if ((m = String(document.cookie).match(
                    new RegExp('(?:^| )' + name + '(?:(?:=([^;]*))|;|$)')))) {
                ret = m[1] ? parseCookieValue(m[1]) : ""
            }
        }
        return ret
    }
    Cookie.set = function(name, val, opts) {
        var str = Cookie.stringify.apply(0, arguments)
        document.cookie = str
    }
    // 置空，并立刻过期
    Cookie.remove = function(name, opt) {
        opt = opt || {}
        if (!opt.expires) {
            opt.expires = new Date(1970, 0, 1)
        }
        Cookie.set(name, '', opt)
    }

    Cookie.clear = function() { 
        for(var name in Cookie.getAll()){
              Cookie.remove(name)
        }
    }
    avalon.cookie = Cookie
    return avalon
})
//2012.8.19 (mass Framework) 全新cookie工具类
//2014.7.8 移至avalon.ui