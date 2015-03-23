Orgy
====

[![Build Status](https://travis-ci.org/tecfu/orgy-js.svg?branch=master)](https://travis-ci.org/tecfu/orgy-js) [![Dependency Status](https://david-dm.org/tecfu/orgy-js.png)](https://david-dm.org/tecfu/orgy-js) [![NPM version](https://badge.fury.io/js/orgy.svg)](http://badge.fury.io/js/orgy) [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

Deferred / Queue library that yields to no spec.  

## Documentation:
[See the API reference here.](orgy.html "API Reference")

## Features:

- Browser and [nodej](https://nodejs.org/) / [iojs](https://iojs.org/en/index.html) compatible.

- Handles a variety of dependency types and automatically converts them into promises.
    - javascript files
    - css files
    - DOMContentLoaded, window.load
    - timers
    - all other file types handled as text

- Creates deferreds or queues.

- Queues can be held back from settling after their dependencies have resolved by a resolver method.

- When then() returns a value that value is passed down the execution chain.

- When then() returns an unsettled instance (deferred/queue), further execution on the callback chain is halted until that instance resolves. The deferred is then passed to the next tick of the callback chain, where its return value can be accessed.

- When running under nodejs, you can set a DOM context to modify [required when adding CSS dependencies] using JSDOM, Cheerio, or some other DOM parser.

For example:

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

## Usage:

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
        type : "json"
        ,url : "data/data1.json"
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
  id : "q1" //Optional. Id used to get instance outside of local scope.
            //i.e. var q = Orgy.get("q1")
});


//Done can be called async and out of order.
setTimeout(function(){
  q.done(function(r,deferred,last){
    console.log(last); // 2
  });
},500)


/**
 * If a then function returns a value, that value is passed down to any
 * subsequent then() or done() functions.
*/
q.then(function(r){

    //Modify some DOM content
    $("body").append("hey!");

    console.log(r); //Dependency values.
    return 1;
});


q.then(function(r,deferred,last){

    //Get modified DOM content
    console.log($("body").html()); //hey!

    console.log(last); // 1
    return 2;
});


/**
 * To reference the queue above outside of the local scope:
 *
*/
var q = Orgy.get("q1");

```

## Todo:

- Test / deploy devel branch, which is browserified and refactored
- Add optional retry configuration setting when remote requests rejected due non 200 HTTP response?
- Extend deferred, queue from native [ES6](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)    promises
- Create unit tests for assign, define

## More examples:

[Here](../test).
