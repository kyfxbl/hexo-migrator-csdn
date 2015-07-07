var extend = hexo.extend;
var async = require("async");
var _ = require("underscore");
var request = require('request');
var cheerio = require('cheerio');
var XRegExp = require('xregexp').XRegExp;
var tomd = require('to-markdown');
var fs = require("fs");

extend.migrator.register('csdn', function(args){

    var username = args._.shift();
    if (!username) {
        console.log("\nUsage:hexo migrate csdn <username>\n\nMore info:https://github.com/kyfxbl/hexo-migrator-csdn/");
        return;
    }

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

    async.series(steps, function(err){

        if(err){
            console.log(err);
            return;
        }

        console.log("导出完成，导出成功" + successCount + "篇，导出失败" + failureCount + "篇\n");
        if(errorUrls.length !== 0){
            console.log("建议手工处理:\n");
        }
        _.each(errorUrls, function(url){
            console.log(url + "\n");
        });
    });

    function _fetchTotalPageCount(callback){

        console.log("查询博客分页中...");

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

        console.log("查询博客总数...");

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
            console.log("dealing with: " + detailUrl);

            request.get(detailUrl, function(err, response){

                if(err){
                    failureCount ++;
                    errorUrls.push(detailUrl);
                    next(null);
                    return;
                }

                try{
                    var html = response.body;
                    var $ = cheerio.load(html);

                    var title = $("span.link_title > a").text().trim().replace("/", "-");
                    var date = $("span.link_postdate").text();
                    var markdown = "";

                    _transferToMarkdown();
                    _saveToHexo();

                    function _transferToMarkdown(){

                        var article = $("div#article_content").html();
                        var $$ = cheerio.load(article);
                        $$("div").last().remove();// 移除最后一个div，是版权声明
                        $$("br").remove();// 移除br，因为会影响pre解析

                        var preConverter = {
                            filter: 'pre',
                            replacement: function(content) {
                                return "```\n" + content + "\n```\n";
                            }
                        };

                        markdown = tomd($$.html(), {converters: [preConverter]});
                    }

                    function _saveToHexo(){

                        var distDir = hexo.source_dir + "_posts/";

                        var frontMatter = [
                            'title: ' + title,
                            'date: ' + date,
                            'tags: ',
                            '---'
                        ];

                        var fileContent = frontMatter.join('\n') + "\n" + markdown;

                        fs.writeFile(distDir + title + '.md', fileContent, function(err){

                            if(err){
                                failureCount ++;
                                errorUrls.push(detailUrl);
                                next(null);
                                return;
                            }

                            successCount ++;
                            next(null);
                        });
                    }

                }catch(err){
                    failureCount ++;
                    errorUrls.push(detailUrl);
                    next(null);
                }
            });

        }, callback);
    }
});