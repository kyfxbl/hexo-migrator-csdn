var request = require('./crawler_request');
var process = require("./html_handler");

exports = module.exports = function(hexo, username, postId){

    var log = hexo.log;

    var url = "http://blog.csdn.net/" + username + "/article/details/" + postId;
    log.i("dealing with: " + url);

    request.get(url, function(err, response){

        if(err){
            log.e(err);
            return;
        }

        process(hexo, response.body, function(err){

            if(err){
                log.e(err);
                return;
            }

            log.i("导出成功");
        });
    });
};