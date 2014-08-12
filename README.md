Orgy
====

[![Build Status](https://travis-ci.org/tecfu/orgy.svg?branch=master)](https://travis-ci.org/tecfu/orgy)

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
   id : "q1"    //GLOBAL ACCESSOR
});

q.done(function(value){
    console.log(value);
});

//console.log(Orgy.list.q1.value); //GLOBAL ACCESSOR TO Q1 SETTLEMENT VALUE 
```

## More demos 

[Here](https://github.com/tecfu/orgy/tree/master/demos).