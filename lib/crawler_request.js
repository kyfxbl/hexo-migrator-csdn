var request = require('request');

exports.get = get;

function get(url, callback){

    var options = {
        url: url,
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "deflate, sdch",
            "Accept-Language": "zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4,ja;q=0.2",
            "Cache-Control": "max-age=0",
            "Connection": "keep-alive",
            "Referer": "blog.csdn.net",
            "Host": "blog.csdn.net",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36"
        },
        timeout: 5000
    };

    request.get(options, callback);
}