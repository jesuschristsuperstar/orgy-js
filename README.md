Orgy
====

[![Build Status](https://travis-ci.org/tecfu/orgy.svg?branch=master)](https://travis-ci.org/tecfu/orgy) [![Dependency Status](https://gemnasium.com/tecfu/orgy.png)](https://gemnasium.com/tecfu/orgy) 

Promise / Deferred / Queue library and file loader that yields to no spec.  

## Nodejs install:

```
npm install orgy
```

## Browser Install:

```
<script src="/dist/orgy.min.js"></script>
```

## Usage:

- Wait for an array of dependencies to resolve prior to executing a callback:


```
var Orgy = require("orgy");

var q = Orgy.queue([
   {
       type : "timer"
       ,timeout : 2000
   },
   {
       type : "json"
       ,url : "data/data2.json"
   },
   {
       type : "css"
       ,url : "data/sample.css"
   }
],{
   id : "q1" //GLOBAL ACCESSOR
});


/**
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
    console.log('Done');
    console.log(value);
});
```

## More demos 

[Here](https://github.com/tecfu/orgy/tree/master/demos).