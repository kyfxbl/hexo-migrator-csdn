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
    var postMetadatas = [];
    var successCount = 0;
    var failureCount = 0;
    var errorUrls = [];

    var steps = [
        _fetchTotalPageCount,
        _gatherPostIds,
        _fetchEachPostContent,
        _savePostToHexo
    ];

    async.series(steps, function(err){

        if(err){
            console.log(err);
            return;
        }

        console.log("导出完成，导出成功" + successCount + "篇，导出失败" + failureCount + "篇，建议手工处理\n");
        _.each(errorUrls, function(url){
            console.log("导出失败: " + url + "\n");
        });
    });

    function _fetchTotalPageCount(callback){

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

    function _fetchEachPostContent(callback){

        async.eachLimit(postIds, 5, function(postId, next){

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

                    var title = $("span.link_title > a").text().trim();
                    var date = $("span.link_postdate").text();

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

                    var markdown = tomd($$.html(), {converters: [preConverter]});

                    var post = {
                        title: title,
                        date: date,
                        content: markdown
                    };

                    successCount ++;
                    postMetadatas.push(post);
                    next(null);

                }catch(err){

                    failureCount ++;
                    errorUrls.push(detailUrl);
                    next(null);
                }
            });

        }, callback);
    }

    function _savePostToHexo(callback){

        async.eachLimit(postMetadatas, 10, function(post, next){

            var frontMatter = [
                'title: ' + post.title,
                'date: ' + post.date,
                'tags: ',
                '---'
            ];

            var fileContent = frontMatter.join('\n') + "\n" + post.content;

            var distDir =  hexo.source_dir + "_posts/";

            fs.writeFile(distDir + post.title + '.md', fileContent, next);

        }, callback);
    }
});


