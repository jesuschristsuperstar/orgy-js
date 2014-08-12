require('source-map-support').install({
  handleUncaughtExceptions: false
});

Orgy = require("../dist/orgy.devel.js");

var q = Orgy.queue([
    {
        timeout : 2500
        ,type : "timer"
    }
    ,{
        url : "data/data1.json"
        ,type : "json"
    }
    ,{
        url : "data/data2.json"
        ,type : "json"
    }
    ,{
        url : "data/data3.json"
        ,type : "json"
    }
    ,{
        type : "css"
        ,url : "data/sample.css"
    }
],{
    id : "q1"
});

//FIRES WHEN RESOLVED
q.then(function(r){
    var msg = this.id + " then-1";
    console.log(msg);
});

//FIRES WHEN RESOLVED
q.then(function(r){
    var msg = this.id + " then-2";
    console.log(msg);
});

//FIRES WHEN RESOLVED
q.then(function(r){
    var msg = this.id + " then-3";
    console.log(msg);
});

q.done(function(r){
    var msg = this.id + " done-";
    console.log(msg);
    console.log(r);
});

//console.log(Orgy.list.q1.value); //GLOBAL ACCESSOR TO Q1 SETTLEMENT VALUE 