Orgy
====

[![Build Status](https://travis-ci.org/tecfu/orgy.svg?branch=master)](https://travis-ci.org/tecfu/orgy) [![Dependency Status](https://david-dm.org/tecfu/orgy.png)](https://david-dm.org/tecfu/orgy) [![NPM version](https://badge.fury.io/js/orgy.svg)](http://badge.fury.io/js/orgy) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

Promise / Deferred / Queue library and file loader that yields to no spec.  

## Features:
- Works both with nodejs and with browsers. 
- Creates deferreds or queues.
- Queues can be held back from settling after their dependencies have resolved by a resolver method. 
- When then() is passed a return value that value is passed down the execution chain.
- When then() is passed an unsettled thenable, it pauses further execution on the dependency/queue callback chain until that thenable is settled. The return value of the child thenable is appended to the parent then's return value.
- When running under nodejs, can be passed a DOM context to modify [required when adding CSS dependencies] using JSDOM, Cheerio, or some other DOM parser: 
```
Orgy.config({
    document : (function(){
        var cheerio = require('cheerio');
        return global.$ = cheerio.load("<html><head></head><body></body></html>");
    }())
});
```

## Nodejs install:

```
npm install orgy
```

## Browser Install:

```
<script src="/dist/orgy.min.js"></script>
```

## Example:

- Wait for an array of dependencies to resolve prior to executing a callback:


```
var Orgy = require("orgy");

Orgy.config({
    //SET DOM CONTEXT TO MODIFY [ONLY NEEDED IN NODEJS]
    document : (function(){
        var cheerio = require('cheerio');
        return global.$ = cheerio.load("<html><head></head><body></body></html>");
    }())
});

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

## More examples:

[Here](https://github.com/tecfu/orgy/tree/master/demos).
