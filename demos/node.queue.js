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
    ,
    {
        type : "css"
        ,url : "data/sample.css"
    }
],{
   id : "q1" //GLOBAL ACCESSOR
});


/*
If a then statement returns a value, that value becomes the new 
value of the queue and is passed to any subsequent
then() or done() statements.
*/

q.then(function(value){
    value.push('foo');
    return value;
});

q.then(function(value){
    value.pop(); //'foo'
    value.push('bar');
    return value;
});

q.done(function(value){ 
    //Done value is carried from last then .then() statement.
    console.log(value);
});