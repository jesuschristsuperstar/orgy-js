//This code allows you to run a virtual dom server side.
//Allows simulating CSS load
var jsdom = require("jsdom").jsdom;
var doc = jsdom("starting body content");
global.window = doc.defaultView;
global.document = global.window.document;
//var $ = require('jquery');

var r = {};
r.deps = [
    {
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

  var t0 = new Date().getMilliseconds();

  Orgy = require("../src/main.js");

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

  var q = Orgy.queue(r.deps);

  //FIRES WHEN RESOLVED
  q.then(function(r){
      //console.log(r); //Result of dependencies
      return 1;
  });

  //FIRES WHEN RESOLVED
  q.then(function(r,deferred,last){
      console.log(last); //1
      return 2;
  });

  console.log("Creating a deferred that will hold up the callback chain...");
  var def = Orgy.deferred();//.resolve('foo');

  /**/
  setTimeout(function(){
    console.log("Resolving the example deferred to resume the chain...");
    def.resolve('foo');
  },'1000');
  /**/

  //FIRES WHEN RESOLVED
  q.then(function(r,deferred,last){
      console.log(last); //2
      return def;
  });

  //FIRES WHEN RESOLVED
  q.then(function(r,deferred,last){
    console.log(last.value); //foo
    $("body").append("Appended value: "+last.value); //foo
    return last.value;
  });

  q.done(function(r,deferred,last){
    console.log("Chain end value:",last);
    console.log("HTML:",$("body").html());

    var t1 = new Date().getMilliseconds();
    console.log("This queue finished in..."+(t1-t0)+"ms");
    //console.log("Dependency values:");
    //console.log(r);
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
