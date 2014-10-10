var r = {};
r.deps = [
    {
        type : "timer"
        ,timeout : 1000
    }
    ,{
        url : "./data/data1.json"
        ,type : "json"
    }
    ,{
        url : "./data/sample.css"
        ,type : "css"
    }
    ,{
        type : "script"
        ,url : "./data/subdir0/test-module.js"
        ,autoresolve : false
    }
];

//if node
if(typeof process === 'object' && process + '' === '[object process]'){
  
  Orgy = require("../dist/orgy.devel.js");

  Orgy.config({
      //SET DOM CONTEXT TO MODIFY [ONLY NEEDED IN NODEJS]
      document : (function(){
          var cheerio = require('cheerio');
          return global.$ = cheerio.load("<html><head></head><body></body></html>");
      }())
      //saves path to this script's location
      ,cwd : __dirname
      ,debug_mode : 1
  });

  var q = Orgy.queue(r.deps,{
    id : "q1" //Optional. Used to get instance outside of local scope.                //i.e. var q = Orgy.get("q1")
  });

  q.then(function(r,deferred,last){
    return 'foo';
  });

  q.then(function(r,deferred,last){
    $("body").append("Appended value: "+last); //'foo'
    return 'bar';
  });

  /*
  //Error example
  q.then(function(value){
      var d = Orgy.deferred();
      return d;       
  });
  */

  q.done(function(value,deferred,last){
      console.log("Done...");
      //GET MODIFIED DOM CONTENT 
      console.log($("body").html());
  });
  
  //Export the dependencies in this example so the same ones 
  //will be used in unit tests.
  module.exports = r;
}
//browser
else{
  //Export the dependencies in this example so the same ones 
  //will be used in unit tests.
  Deps = r.deps;
}