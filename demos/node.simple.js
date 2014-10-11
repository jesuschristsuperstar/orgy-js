Orgy = require("../dist/orgy.devel.js");

var t0 = new Date().getMilliseconds();
var q = Orgy.queue([]);

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

q.done(function(r,deferred,last){
  console.log("Chain end value:",last);
  var t1 = new Date().getMilliseconds();
  console.log("This queue finished in..."+(t1-t0)+"ms");
});