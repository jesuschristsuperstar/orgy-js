Orgy
====

[![Build Status](https://travis-ci.org/tecfu/orgy-js.svg?branch=master)](https://travis-ci.org/tecfu/orgy-js) [![Dependency Status](https://david-dm.org/tecfu/orgy-js.png)](https://david-dm.org/tecfu/orgy-js) [![NPM version](https://badge.fury.io/js/orgy.svg)](http://badge.fury.io/js/orgy)

Promises library that supports queues of file requests.


- Requires nodejs > 4.0.0. 

For nodejs versions 0.0.10 - 0.0.12:  
```
npm install orgy@2.0.7
```

## Documentation:
[View the API reference here.](http://tecfu.github.io/orgy-js/docs/orgy.html "API Reference")

## Installation: 

- Nodejs

```sh
npm install orgy
```

- Browser (attached to window object) 

```js
<script src="/dist/orgy.min.js"></script>
<script>
var def = Orgy.deferred();
...
</script>
```

- Browser (via browserify)

```js
<script src="/dist/orgy.bundle.min.js"></script>
<script>
var Orgy = require("orgy");
var def = Orgy.deferred();
...
</script>
```

## Example:

- Fetch a group of resources asynchronously, then return manipulated results 
down the chain.

```js
const Orgy = require("orgy");

const q = Orgy.queue([
  {
    type : "json",
    url : "data/data1.json"
  },
  {
    type : "json",
    url : "data/data2.json"
  },
  {
    type : "css",
    url : "data/sample.css"
  }
],{
  //Set an id for the queue, so can reference it in other contexts (optional).
  id : "q1" 
});

//Done can be called async and out of order.
q.done(function(r,deferred,last){
  console.log(last); // 2
});

// If a then function returns a value, that value is passed down to any
// subsequent then() or done() functions.
q.then(function(r){
  console.log(r); //Dependency values.
  return 1;
});

q.then(function(r,deferred,last){
  console.log(last); // 1
  return 2;
});
```

```js
// To reference the queue above outside of the local scope:
const Orgy = require("orgy");
const q = Orgy.get("q1");
```

## Features:

- Browser and [nodej](https://nodejs.org/) / [iojs](https://iojs.org/en/index.html) compatible.

- Handles a variety of dependency types and automatically converts them into promises.
    
  - javascript files
  - css files
  - timers
  - all other file types handled as text

- Queues can be held back from settling after their dependencies have resolved by a resolver method.

- When then() returns a value that value is passed down the execution chain.

- When then() returns an unsettled instance (deferred/queue), further execution on the callback chain is halted until that instance resolves. The deferred is then passed to the next tick of the callback chain, where its return value can be accessed.

## Running tests:
```sh
grunt t
```

## Todo:

- Add optional retry configuration setting when remote requests rejected due non 200 HTTP response?
- Extend deferred, queue from native [ES6](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)    promises

## More examples:

[Here](https://github.com/tecfu/orgy-js/tree/master/test).
