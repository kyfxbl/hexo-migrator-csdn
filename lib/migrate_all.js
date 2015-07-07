var async = require("async");
var _ = require("underscore");
var cheerio = require('cheerio');
var XRegExp = require('xregexp').XRegExp;
var request = require('./crawler_request');
var process = require("./html_handler");

exports = module.exports = function(hexo, username){

    var log = hexo.log;

    var pageCount = 0;
    var postIds = [];
    var successCount = 0;
    var failureCount = 0;
    var errorUrls = [];

    var steps = [
        _fetchTotalPageCount,
        _gatherPostIds,
        _fetchPostThenSave
    ];

    log.i('Migrate from %s...', username);
    var begin = new Date().getTime();

    async.series(steps, function(err){

        var end = new Date().getTime();
        var timeConsume = (end - begin) / 1000;
        log.i("执行时间: " + timeConsume);

        if(err){
            log.e(err);
            return;
        }

        log.i("导出完成。成功" + successCount + "篇，失败" + failureCount + "篇");
        if(errorUrls.length !== 0){
            log.i("建议手工处理，Usage: hexo migrate csdn <username> <postid>");
        }
        _.each(errorUrls, function(url){
            log.i(url);
        });
    });

    function _fetchTotalPageCount(callback){

        log.i("查询博客分页中...");

        var _url = 'http://blog.csdn.net/' + username;

        request.get(_url, function(err, response){

            if(err){
                callback(err);
                return;
            }

            var html = response.body;

            var $ = cheerio.load(html);

            var span = $("div#papelist > span").text();// xx条数据，共xx页

            pageCount = Number(XRegExp.exec(span, new XRegExp('共(?<pageCount>\\d+)页')).pageCount);

            callback(null);
        });
    }

    function _gatherPostIds(callback){

        log.i("查询博客总数...");

        async.times(pageCount, function(n, next){

            var listUrl = "http://blog.csdn.net/" + username + "/article/list/" + (n + 1);

            request.get(listUrl, function(err, response){

                if(err){
                    next(err);
                    return;
                }

                var html = response.body;

                var $ = cheerio.load(html);

                $("span.link_title > a").each(function(){
                    var href = $(this).attr("href");
                    var postId = XRegExp.exec(href, new XRegExp('/article/details/(?<postId>\\d+)')).postId;
                    postIds.push(postId);
                });

                next(null);
            });

        }, callback);
    }

    function _fetchPostThenSave(callback){

        // 并发http请求，似乎会引起csdn延迟响应
        async.eachLimit(postIds, 1, function(postId, next){

            var detailUrl = "http://blog.csdn.net/" + username + "/article/details/" + postId;
            log.i("dealing with: " + detailUrl);

            request.get(detailUrl, function(err, response){

                if(err){
                    _increaseFailure();
                    return;
                }

                process(hexo, response.body, function(err){

                    if(err){
                        _increaseFailure();
                        return;
                    }

                    _increaseSuccess();
                });
            });

            function _increaseSuccess(){
                successCount ++;
                next(null);
            }

            function _increaseFailure(){
                failureCount ++;
                errorUrls.push(detailUrl);
                next(null);
            }

        }, callback);
    }
};