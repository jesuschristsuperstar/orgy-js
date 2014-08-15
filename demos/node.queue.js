Orgy = require("../dist/orgy.devel.js");
    
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

q.then(function(value){
    console.log("then");
    console.log(value);
});

q.done(function(value){
    console.log("done");
    console.log(value);
});








/** IGNORE UNIT TESTING INFO **/
exports.dependencies = dependencies;
/** END IGNORE UNIT TESTING INFO **/