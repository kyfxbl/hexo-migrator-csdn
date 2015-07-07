var cheerio = require('cheerio');
var XRegExp = require('xregexp').XRegExp;
var tomd = require('to-markdown');
var fs = require("fs");

exports = module.exports = function(hexo, html, callback){

    try{
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
                    callback(err);
                    return;
                }

                callback(null);
            });
        }

    }catch(err){
        callback(err);
    }
};