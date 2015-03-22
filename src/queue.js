var Config = require('./config.js');
var DeferredSchema = require('./deferred.schema.js');
var QueueSchema = require('./queue.schema.js');
var _private = require('./queue.private.js');

/**
 * Creates a new queue object.
 * If no <b>resolver</b> option is set, resolved when all dependencies are resolved. Else, resolved when the deferred param passed to the resolver option
 * is resolved.
 *
 * ### Queue usage example:

```
var q = Orgy.queue([
  {
    comment : "This is a nested queue created on the fly."
    ,type : "json"
    ,url : "/api/json/somnums"
    ,resolver : function(r,deferred){
      //Filter out even numbers
      var odd = arr.filter(function(val) {
        return 0 != val % 2;
      });
      deferred.resolve(odd);
    }
  }
],{
  id : "q1",
  resolver : function(r,deferred){
    var primes = r[0].filter(function(val) {
      high = Math.floor(Math.sqrt(val)) + 1;
      for (var div = 2; div <= high; div++) {
        if (value % div == 0) {
          return false;
        }
      }
      return true;
    });
    deferred.resolve(primes);
  })
});

```

 *
 * @memberof orgy
 * @function queue
 *
 * @param {array} deps Array of dependencies that must be resolved before <b>resolver</b> option is called.
 * @param {object} options  List of options:
 *  - {string} <b>id</b> Unique id of the object. Can be used with Orgy.get(id). Optional.
 *
 *  - {number} <b>timeout</b>
 *  Time in ms after which reject is called. Defaults to Orgy.config().timeout [5000].
 *
 *  - {function(result,deferred)} <b>resolver</b>
 *  Callback function to execute after all dependencies have resolved. Arg1 is an array of the dependencies' resolved values. Arg2 is the deferred object. The queue will only resolve when Arg2.resolve() is called. If not, it will timeout to options.timeout || Orgy.config.timeout.
 *
 * @returns {object} queue
 */
module.exports = function(deps,options){

  var _o;
  if(!(deps instanceof Array)){
    return Config.debug("Queue dependencies must be an array.");
  }

  options = options || {};

  //DOES NOT ALREADY EXIST
  if(!Config.list[options.id]){

    //Pass array of prototypes to queue factory
    var _o = _private.factory([DeferredSchema,QueueSchema],[options]);

    //Activate queue
    _o = _private.activate(_o,options,deps);

  }
  //ALREADY EXISTS
  else {

    _o = Config.list[options.id];

    if(_o.model !== 'queue'){
    //MATCH FOUND BUT NOT A QUEUE, UPGRADE TO ONE

      options.overwritable = 1;

      _o = _private.upgrade(_o,options,deps);
    }
    else{

      //OVERWRITE ANY EXISTING OPTIONS
      for(var i in options){
        _o[i] = options[i];
      }

      //ADD ADDITIONAL DEPENDENCIES IF NOT RESOLVED
      if(deps.length > 0){
        _private.tpl.add.call(_o,deps);
      }

    }

    //RESUME RESOLUTION UNLESS SPECIFIED OTHERWISE
    _o.halt_resolution = (typeof options.halt_resolution !== 'undefined') ?
    options.halt_resolution : 0;
  }

  return _o;
};
