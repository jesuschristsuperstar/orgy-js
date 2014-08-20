Orgy = require("../dist/orgy.devel.js");

Orgy.config({
    //SET DOM CONTEXT TO MODIFY [ONLY NEEDED IN NODEJS]
    document : (function(){
        var cheerio = require('cheerio');
        return global.$ = cheerio.load("<html><head></head><body></body></html>");
    }())
    ,basepath : __dirname
});

var q = Orgy.queue(
    [
        {
            type : "timer"
            ,timeout : 1000
        }
        ,{
            url : "/data/data1.json"
            ,type : "json"
        }
        ,{
            url : "/data/data2.json"
            ,type : "json"
        }
        ,{
            url : "/data/data3.json"
            ,type : "json"
        }
        ,{
            url : "/data/sample.css"
            ,type : "css"
        }
        ,{
            type : "script"
            ,url : "/data/test-module.js"
        }
    ],{
    id : "q1"
});

q.then(function(value){
    value.push('foo');
    return value;
});

q.then(function(value){
    $("body").append("Appended value: "+value.pop()); //'foo'
    value.push('bar');
    return value;
});

q.done(function(value){
    console.log("done");
    console.log(value);
    
    //GET MODIFIED DOM CONTENT 
    console.log(Orgy.config().document.html());
});








/** IGNORE UNIT TESTING INFO **/
exports.dependencies = dependencies;
/** END IGNORE UNIT TESTING INFO **/