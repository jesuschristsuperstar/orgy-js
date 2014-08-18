Orgy = require("../dist/orgy.devel.js");

Orgy.config({
    //SET DOM CONTEXT TO MODIFY [ONLY NEEDED IN NODEJS]
    document : (function(){
        var cheerio = require('cheerio');
        return global.$ = cheerio.load("<html><head></head><body></body></html>");
    }())
});

var basepath = __dirname;
var dependencies = [
    {
        type : "timer"
        ,timeout : 1000
    }
    ,{
        url : basepath + "/data/data1.json"
        ,type : "json"
    }
    ,{
        url : basepath + "/data/data2.json"
        ,type : "json"
    }
    ,{
        url : basepath + "/data/data3.json"
        ,type : "json"
    }
    ,{
        url : basepath + "/data/sample.css"
        ,type : "css"
    }
];

var q = Orgy.queue(dependencies,{
    id : "q1"
});

q.then(function(value,def){
    console.log("then");
    console.log(value);
    $("body").append("Appended value: "+value[1].value);
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