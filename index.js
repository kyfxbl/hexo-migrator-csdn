var migrate_all = require("./lib/migrate_all");
var migrate_single = require("./lib/migrate_single");

hexo.extend.migrator.register('csdn', function(args){

    var username = args._.shift();
    if (!username) {
        var help = [
            'Usage: hexo migrate csdn <username>',
            '',
            'More info: https://github.com/kyfxbl/hexo-migrator-csdn/'
        ];
        console.log(help.join('\n'));
        return;
    }

    var postId = args._.shift();

    if(!postId){
        migrate_all(hexo, username);// 只有在index.js里才能访问到hexo
    }else{
        migrate_single(hexo, username, postId);
    }
});