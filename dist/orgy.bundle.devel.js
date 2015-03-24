require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
var Config = require('./config.js'),
    Deferred = require('./deferred.js');

/**
 * Casts a thenable object into an Orgy deferred object.
 *
 * > To qualify as a <b>thenable</b>, the object to be casted must have the following properties:
 * >
 * > - id
 * >
 * > - then()
 * >
 * > - error()
 *
 * @memberof orgy
 * @function cast
 *
 * @param {object} obj A thenable with the following properties:
 *  - {string} <b>id</b>  Unique id of the object.
 *
 *  - {function} <b>then</b>
 *
 *  - {function} <b>error</b>
 *
 * @returns {object} deferred
 */
module.exports = function(obj){

    var required = ["then","error","id"];
    for(var i in required){
      if(!obj[required[i]]){
        return Config.debug("Cast method missing property '" + required[i] +"'");
      }
    }

    var options = {};
    options.id = obj.id;

    //Make sure id does not conflict with existing
    if(Config.list[options.id]){
      return Config.debug("Id "+options.id+" conflicts with existing id.")
    }

    //Create a deferred
    var def = Deferred(options);

    //Create resolver
    var resolver = function(){
      def.resolve.call(def,arguments[0]);
    };

    //Set Resolver
    obj.then(resolver);

    //Reject deferred on .error
    var err = function(err){
      def.reject(err);
    };
    obj.error(err);

    //Return deferred
    return def;
};

},{"./config.js":4,"./deferred.js":5}],4:[function(require,module,exports){
(function (process){
var _public = {};


////////////////////////////////////////
//  _public VARIABLES
////////////////////////////////////////


/**
 * A directory of all promises, deferreds, and queues.
 * @type object
 */
_public.list = {};


/**
 * iterator for ids
 * @type integer
 */
_public.i = 0;


/**
 * Configuration values.
 *
 * @type object
 */
_public.settings = {

    debug_mode : 1
    //set the current working directory of the callee script,
    //because node has no constant for this
    ,cwd : false
    ,mode : (function(){
        if(typeof process === 'object' && process + '' === '[object process]'){
            // is node
            return "native";
        }
        else{
            // not node
            return "browser";
        }
    }())
    /**
     * - onActivate /when each instance activated
     * - onSettle   /when each instance settles
     *
     * @type object
     */
    ,hooks : {
    }
    ,timeout : 5000 //default timeout
};


////////////////////////////////////////
//  _private VARIABLES
////////////////////////////////////////


////////////////////////////////////////
//  _public METHODS
////////////////////////////////////////


/**
 * Options you wish to pass to set the global configuration
 *
 * @memberof orgy
 * @function config
 *
 * @param {object} obj List of options:

  - {number} <b>timeout</b>

  - {string} <b>cwd</b> Sets current working directory. Server side scripts only.

  - {boolean} <b>debug_mode</b>

 * @returns {object} configuration settings
 */
_public.config = function(obj){

    if(typeof obj === 'object'){
        for(var i in obj){
          _public.settings[i] = obj[i];
        }
    }

    return _public.settings;
};


/**
 * Debugging method.
 *
 * @param {string|array} msg
 * @param {object} def
 * @returns {Boolean}
 */
_public.debug = function(msg,def){

    var msgs = (msg instanceof Array) ? msg.join("\n") : [msg];

    var e = new Error(msgs);
    console.log(e.stack);


    if(this.settings.debug_mode){
      //turn off debug_mode to avoid hitting debugger
      debugger;
    }

    if(_public.settings.mode === 'browser'){
        return false;
    }
    else{
        process.exit();
    }
};


/**
 * Take an array of prototype objects and an array of property objects,
 * merges each, and returns a shallow copy.
 *
 * @param {array} protoObjArr Array of prototype objects which are overwritten from right to left
 * @param {array} propsObjArr Array of desired property objects which are overwritten from right to left
 * @returns {object} object
 */
_public.naive_cloner = function(protoObjArr,propsObjArr){

    function merge(donors){
      var o = {};
      for(var a in donors){
          for(var b in donors[a]){
              if(donors[a][b] instanceof Array){
                  o[b] = donors[a][b].slice(0);
              }
              else if(typeof donors[a][b] === 'object'){
                try{
                  o[b] = JSON.parse(JSON.stringify(donors[a][b]));
                }
                catch(e){
                  console.error(e);
                  debugger;
                }
              }
              else{
                  o[b] = donors[a][b];
              }
          }
      }
      return o;
    }

    var proto = merge(protoObjArr),
        props = merge(propsObjArr);

    //@todo consider manually setting the prototype instead
    var finalObject = Object.create(proto);
    for(var i in props){
      finalObject[i] = props[i];
    }

    return finalObject;
};


_public.generate_id = function(){
  return new Date().getTime() + '-' + (++this.i);
}


module.exports = _public;

}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
var Config = require('./config.js');
var _private = require('./deferred.private.js');
var DeferredSchema = require('./deferred.schema.js');

/**
 * @namespace orgy/deferred
*/

/**
 * Creates a new deferred object or if one exists by the same id,
 * returns it.

 <b>Usage:</b>
 ```
 var Orgy = require("orgy"),
        q = Orgy.deferred({
          id : "q1"
        });
 ```

 * @memberof orgy
 * @function deferred
 *
 * @param {object} options List of options:
 *
 *  - <b>id</b> {string} Unique id of the object.
 *   - Can be used with Orgy.get(id).
 *   - Optional.
 *
 *
 *  - <b>timeout</b> {number} Time in ms after which reject is called if not yet resolved.
     - Defaults to Orgy.config().timeout.
     - Delays in object.then() and object.done() won't not trigger this, because those methods run after resolve.
 *
 * @returns {object} {@link orgy/deferred}
 */
module.exports = function(options){

    var _o;
    options = options || {};

    if(options.id && Config.list[options.id]){
        _o = Config.list[options.id];
    }
    else{
        //Create a new deferred class instance
        _o = _private.factory([DeferredSchema],[options]);

        //ACTIVATE DEFERRED
        _o = _private.activate(_o);
    }

    return _o;
};

},{"./config.js":4,"./deferred.private.js":6,"./deferred.schema.js":7}],6:[function(require,module,exports){
var Config = require('./config.js');
var File_loader = require('./file_loader.js');


var _public = {};


/**
 * @param array options Prototype objects
**/
_public.factory = function(protoObjArr,optionsObjArr){

    //Merge array of objects into a single, shallow clone
    var _o = Config.naive_cloner(protoObjArr,optionsObjArr);

    //if no id, generate one
    _o.id = (!_o.id) ? Config.generate_id() : _o.id;

    return _o;
};


_public.activate = function(obj){

    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if(Config.list[obj.id] && !Config.list[obj.id].overwritable){
        Config.debug("Tried illegal overwrite of "+obj.id+".");
        return Config.list[obj.id];
    }

    //SAVE TO MASTER LIST
    Config.list[obj.id] = obj;

    //AUTO TIMEOUT
    _public.auto_timeout.call(obj);

    //Call hook
    if(Config.settings.hooks.onActivate){
      Config.settings.hooks.onActivate(obj);
    }

    return obj;
};


_public.settle = function(def){

    //REMOVE AUTO TIMEOUT TIMER
    if(def.timeout_id){
        clearTimeout(def.timeout_id);
    }

    //Set state to resolved
    _public.set_state(def,1);

    //Call hook
    if(Config.settings.hooks.onSettle){
      Config.settings.hooks.onSettle(def);
    }

    //Add done as a callback to then chain completion.
    def.callbacks.then.hooks.onComplete.train.push(function(d2,itinerary,last){
        def.caboose = last;

        //Run done
        _public.run_train(
            def
            ,def.callbacks.done
            ,def.caboose
            ,{pause_on_deferred : false}
        );
    });

    //Run then queue
    _public.run_train(
        def
        ,def.callbacks.then
        ,def.value
        ,{pause_on_deferred : true}
    );

    return def;
};


/**
 * Runs an array of functions sequentially as a partial function.
 * Each function's argument is the result of its predecessor function.
 *
 * By default, execution chain is paused when any function
 * returns an unresolved deferred. (pause_on_deferred) [OPTIONAL]
 *
 * @param {object} def  /deferred object
 * @param {object} obj  /itinerary
 *      train       {array}
 *      hooks       {object}
 *          onBefore        {array}
 *          onComplete      {array}
 * @param {mixed} param /param to pass to first callback
 * @param {object} options
 *      pause_on_deferred   {boolean}
 *
 * @returns {void}
 */
_public.run_train = function(def,obj,param,options){

    //allow previous return values to be passed down chain
    var r = param || def.caboose || def.value;

    //onBefore event
    if(obj.hooks && obj.hooks.onBefore.train.length > 0){
        _public.run_train(
            def
            ,obj.hooks.onBefore
            ,param
            ,{pause_on_deferred : false}
        );
    }

    while(obj.train.length > 0){

        //remove fn to execute
        var last = obj.train.shift();
        def.execution_history.push(last);

        //def.caboose needed for then chain declared after resolved instance
        r = def.caboose = last.call(def,def.value,def,r);

        //if result is an thenable, halt execution
        //and run unfired arr when thenable settles
        if(options.pause_on_deferred){

            //If r is an unsettled thenable
            if(r && r.then && r.settled !== 1){

                //execute rest of this train after r resolves
                r.callbacks.resolve.hooks.onComplete.train.push(function(){

                    _public.run_train(
                        def
                        ,obj
                        ,r
                        ,{pause_on_deferred : true}
                    );
                });

                //terminate execution
                return;
            }

            //If is an array than contains an unsettled thenable
            else if(r instanceof Array){

                var thenables = [];

                for(var i in r){

                    if(r[i].then && r[i].settled !== 1){

                        thenables.push(r[i]);

                        var fn = (function(t,def,obj,param){

                            return function(){

                                //Bail if any thenables unsettled
                                for(var i in t){
                                    if(t[i].settled !== 1){
                                        return;
                                    }
                                }

                                _public.run_train(
                                    def
                                    ,obj
                                    ,param
                                    ,{pause_on_deferred : true}
                                );
                            };

                        })(thenables,def,obj,param);

                        //execute rest of this train after
                        //all thenables found in r resolve
                        r[i].callbacks.resolve.hooks.onComplete.train.push(fn);

                        //terminate execution
                        return;
                    }
                }
            }
        }
    }

    //onComplete event
    if(obj.hooks && obj.hooks.onComplete.train.length > 0){
        _public.run_train(def,obj.hooks.onComplete,r,{pause_on_deferred : false});
    }
};


/**
 * Sets the state of an Orgy object.
 *
 * @param {object} def
 * @param {number} int
 * @returns {void}
 */
_public.set_state = function(def,int){

    def.state = int;

    //IF RESOLVED OR REJECTED, SETTLE
    if(int === 1 || int === 2){
        def.settled = 1;
    }

    if(int === 1 || int === 2){
        _public.signal_downstream(def);
    }
};


/**
 * Gets the state of an Orgy object
 *
 * @param {object} def
 * @returns {number}
 */
_public.get_state = function(def){
    return def.state;
};


/**
 * Sets the automatic timeout on a promise object.
 *
 * @param {integer} timeout (optional)
 * @returns {Boolean}
 */
_public.auto_timeout = function(timeout){

    this.timeout = (typeof timeout === 'undefined')
    ? this.timeout : timeout;

    //AUTO REJECT ON timeout
    if(!this.type || this.type !== 'timer'){

        //DELETE PREVIOUS TIMEOUT IF EXISTS
        if(this.timeout_id){
            clearTimeout(this.timeout_id);
        }

        if(typeof this.timeout === 'undefined'){
            Config.debug([
              "Auto timeout this.timeout cannot be undefined."
              ,this.id
            ]);
        }
        else if (this.timeout === -1){
            //NO AUTO TIMEOUT SET
            return false;
        }
        var scope = this;

        this.timeout_id = setTimeout(function(){
            _public.auto_timeout_cb.call(scope);
        }, this.timeout);

    }
    else{
        //@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?
    }

    return true;
};


/**
 * Callback for autotimeout. Declaration here avoids memory leak.
 *
 * @returns {void}
 */
_public.auto_timeout_cb = function(){

    if(this.state !== 1){

        //GET THE UPSTREAM ERROR ID
        var msgs = [];
        var scope = this;

        var fn = function(obj){
            if(obj.state !== 1){
                return obj.id;
            }
            else{
                return false;
            }
        };

        /**
         * Run over a given object property recursively,
         * applying callback until
         * callback returns a non-false value.
         */
        if(Config.settings.debug_mode){
            var r = _public.search_obj_recursively(this,'upstream',fn);
            msgs.push(scope.id + ": rejected by auto timeout after "
                    + this.timeout + "ms");
            msgs.push("Cause:");
            msgs.push(r);
            return this.reject.call(this,msgs);
        }
        else{
            return this.reject.call(this);
        }
    }
};


_public.error = function(cb){

    //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
    if(this.state === 2){
        cb();
    }
    else{
        this.reject_q.push(cb);
    }

    return this;
};


/**
 * Signals all downstream promises that _public promise object's
 * state has changed.
 *
 * @todo Since the same queue may have been assigned twice directly or
 * indirectly via shared dependencies, make sure not to double resolve
 * - which throws an error.
 *
 * @param {object} target deferred/queue
 * @returns {void}
 */
_public.signal_downstream = function(target){

    //MAKE SURE ALL DOWNSTREAM IS UNSETTLED
    for(var i in target.downstream){
        if(target.downstream[i].settled === 1){

          if(target.downstream[i].state !== 1){
            //tried to settle a rejected downstream
            continue;
          }
          else{
            //tried to settle a successfully settled downstream
            Config.debug(target.id + " tried to settle promise "+"'"+target.downstream[i].id+"' that has already been settled.");
          }
        }
    }

    //NOW THAT WE KNOW ALL DOWNSTREAM IS UNSETTLED, WE CAN IGNORE ANY
    //SETTLED THAT RESULT AS A SIDE EFFECT TO ANOTHER SETTLEMENT
    for (var i in target.downstream){
        if(target.downstream[i].settled !== 1){
            _public.receive_signal(target.downstream[i],target.id);
        }
    }
};


/**
* Run over a given object property recursively, applying callback until
* callback returns a non-false value.
*
* @param {object} obj
* @param {string} propName          The property name of the array to bubble up
* @param {function} fn              The test callback to be applied to each object
* @param {array} breadcrumb         The breadcrumb through the chain of the first match
* @returns {mixed}
*/
_public.search_obj_recursively = function(obj,propName,fn,breadcrumb){

    if(typeof breadcrumb === 'undefined'){
        breadcrumb = [obj.id];
    }

    var r1;

    for(var i in obj[propName]){

        //RUN TEST
        r1 = fn(obj[propName][i]);

        if(r1 !== false){
        //MATCH RETURNED. RECURSE INTO MATCH IF HAS PROPERTY OF SAME NAME TO SEARCH
            //CHECK THAT WE AREN'T CAUGHT IN A CIRCULAR LOOP
            if(breadcrumb.indexOf(r1) !== -1){
                return Config.debug([
                    "Circular condition in recursive search of obj property '"
                        +propName+"' of object "
                        +((typeof obj.id !== 'undefined') ? "'"+obj.id+"'" : '')
                        +". Offending value: "+r1
                    ,(function(){
                        breadcrumb.push(r1);
                        return breadcrumb.join(" [depends on]=> ");
                    })()
                ]);
            }

            breadcrumb.push(r1);

            if(obj[propName][i][propName]){
                return _public.search_obj_recursively(obj[propName][i],propName,fn,breadcrumb);
            }

            break;
        }

    }

    return breadcrumb;
};


/**
 * Converts a promise description into a promise.
 *
 * @param {type} obj
 * @returns {undefined}
 */
_public.convert_to_promise = function(obj,options){

    obj.id = obj.id || options.id;

    //Autoname
    if (!obj.id) {
      if (obj.type === 'timer') {
        obj.id = "timer-" + obj.timeout + "-" + (++Config.i);
      }
      else if (typeof obj.url === 'string') {
        obj.id = obj.url.split("/").pop();
        //REMOVE .js FROM ID
        if (obj.id.search(".js") !== -1) {
          obj.id = obj.id.split(".");
          obj.id.pop();
          obj.id = obj.id.join(".");
        }
      }
    }

    //Return if already exists
    if(Config.list[obj.id] && obj.type !== 'timer'){
      //A previous promise of the same id exists.
      //Make sure this dependency object doesn't have a
      //resolver - if it does error
      if(obj.resolver){
        Config.debug([
          "You can't set a resolver on a queue that has already been declared. You can only reference the original."
          ,"Detected re-init of '" + obj.id + "'."
          ,"Attempted:"
          ,obj
          ,"Existing:"
          ,Config.list[obj.id]
        ]);
      }
      else{
        return Config.list[obj.id];
      }
    }


    //Convert dependency to an instance
    var def;
    switch(true){

        //Event
        case(obj.type === 'event'):
            def = _public.wrap_event(obj);
            break;

        case(obj.type === 'queue'):
            var Queue = require('./queue.js');
            def = Queue(obj.dependencies,obj);
            break;

        //Already a thenable
        case(typeof obj.then === 'function'):

            switch(true){

                //Reference to an existing instance
                case(typeof obj.id === 'string'):
                    console.warn("'"+obj.id +"': did not exist. Auto creating new deferred.");
                    def = _public.deferred({
                        id : obj.id
                    });

                    //If object was a thenable, resolve the new deferred when then called
                    if(obj.then){
                      obj.then(function(r){
                        def.resolve(r);
                      });
                    }
                    break;

                //OBJECT PROPERTY .promise EXPECTED TO RETURN A PROMISE
                case(typeof obj.promise === 'function'):
                    if(obj.scope){
                        def = obj.promise.call(obj.scope);
                    }
                    else{
                        def = obj.promise();
                    }
                    break;

                //Object is a thenable
                case(obj.then):
                    def = obj;
                    break;

                default:

            }

            //Check if is a thenable
            if(typeof def !== 'object' || !def.then){
                return Config.debug("Dependency labeled as a promise did not return a promise.",obj);
            }
            break;

        case(obj.type === 'timer'):
            def = _public.wrap_timer(obj);
            break;

        //Load file
        default:
            obj.type = obj.type || "default";
            //Inherit parent's current working directory
            if(options.parent && options.parent.cwd){
              obj.cwd = options.parent.cwd;
            }
            def = _public.wrap_xhr(obj);
    }

    //Index promise by id for future referencing
    Config.list[obj.id] = def;

    return def;
};


/**
 * @todo: redo this
 *
 * Converts a reference to a DOM event to a promise.
 * Resolved on first event trigger.
 *
 * @todo remove jquery dependency
 *
 * @param {object} obj
 * @returns {object} deferred object
 */
_public.wrap_event = function(obj){

    var Deferred = require('./deferred.js');
    var def = Deferred({
        id : obj.id
    });


    if(typeof document !== 'undefined' && typeof window !== 'undefined'){

        if(typeof $ !== 'function'){
            var msg = 'window and document based events depend on jQuery';
            def.reject(msg);
        }
        else{
            //For now, depend on jquery for IE8 DOMContentLoaded polyfill
            switch(true){
                case(obj.id === 'ready' || obj.id === 'DOMContentLoaded'):
                    $(document).ready(function(){
                        def.resolve(1);
                    });
                    break;
                case(obj.id === 'load'):
                    $(window).load(function(){
                        def.resolve(1);
                    });
                    break;
                default:
                    $(document).on(obj.id,"body",function(){
                        def.resolve(1);
                    });
            }
        }
    }

    return def;
};


_public.wrap_timer = function(obj){

    var Deferred = require('./deferred.js');
    var def = Deferred();

    (function(def){

        var _start = new Date().getTime();
        setTimeout(function(){
            var _end = new Date().getTime();
            def.resolve({
                start : _start
                ,end : _end
                ,elapsed : _end - _start
                ,timeout : obj.timeout
            });
        },obj.timeout);

    }(def));

    return def;
};


/**
 * Creates a deferred object that depends on the loading of a file.
 *
 * @param {object} dep
 * @returns {object} deferred object
 */
_public.wrap_xhr = function(dep){

    var Deferred = require('./deferred.js');

    var required = ["id","url"];
    for(var i in required){
      if(!dep[required[i]]){
        return Config.debug([
          "File requests converted to promises require: " + required[i]
          ,"Make sure you weren't expecting dependency to already have been resolved upstream."
          ,dep
        ]);
      }
    }

    //IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
    if(Config.list[dep.id]){
      return Config.list[dep.id];
    }

    //CONVERT TO DEFERRED:
    var def = Deferred(dep);

    if(typeof File_loader[Config.settings.mode][dep.type] !== 'undefined'){
      File_loader[Config.settings.mode][dep.type](dep.url,def,dep);
    }
    else{
      File_loader[Config.settings.mode]['default'](dep.url,def,dep);
    }

    return def;
};

/**
* A "signal" here causes a queue to look through each item
* in its upstream and check to see if all are resolved.
*
* Signals can only be received by a queue itself or an instance
* in its upstream.
*
* @param {object} target
* @param {string} from_id
* @returns {void}
*/
_public.receive_signal = function(target,from_id){

    if(target.halt_resolution === 1) return;

   //MAKE SURE THE SIGNAL WAS FROM A PROMISE BEING LISTENED TO
   //BUT ALLOW SELF STATUS CHECK
   if(from_id !== target.id && !target.upstream[from_id]){
       return Config.debug(from_id + " can't signal " + target.id + " because not in upstream.");
   }
   //RUN THROUGH QUEUE OF OBSERVING PROMISES TO SEE IF ALL DONE
   else{
       var status = 1;
       for(var i in target.upstream){
           //SETS STATUS TO 0 IF ANY OBSERVING HAVE FAILED, BUT NOT IF PENDING OR RESOLVED
           if(target.upstream[i].state !== 1) {
               status = target.upstream[i].state;
               break;
           }
       }
   }

   //RESOLVE QUEUE IF UPSTREAM FINISHED
   if(status === 1){

        //GET RETURN VALUES PER DEPENDENCIES, WHICH SAVES ORDER AND
        //REPORTS DUPLICATES
        var values = [];
        for(var i in target.dependencies){
            values.push(target.dependencies[i].value);
        }

        target.resolve.call(target,values);
   }

   if(status === 2){
       var err = [
           target.id+" dependency '"+target.upstream[i].id + "' was rejected."
           ,target.upstream[i].arguments
       ];
       target.reject.apply(target,err);
   }
};

module.exports = _public;

},{"./config.js":4,"./deferred.js":5,"./file_loader.js":8,"./queue.js":9}],7:[function(require,module,exports){
/**
 * Default properties for all deferred objects.
 * @ignore
 */

var Config = require('./config.js');
var _public = {};

_public.is_orgy = true;

_public.id = null;

//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
_public.settled = 0;

/**
 * STATE CODES:
 * ------------------
 * -1   => SETTLING [EXECUTING CALLBACKS]
 *  0   => PENDING
 *  1   => RESOLVED / FULFILLED
 *  2   => REJECTED
 */
_public.state = 0;

_public.value = [];

//The most recent value generated by the then->done chain.
_public.caboose = null;

_public.model = "deferred";

_public.done_fired = 0;

_public.timeout_id = null;

_public.callback_states = {
  resolve : 0
  ,then : 0
  ,done : 0
  ,reject : 0
};

/**
 * Self executing function to initialize callback event
 * list.
 *
 * Returns an object with the same propertyNames as
 * _public.callback_states: adding boilerplate
 * properties for each
 *
 * @returns {object}
 */
_public.callbacks = (function(){

  var o = {};

  for(var i in _public.callback_states){
    o[i] = {
      train : []
      ,hooks : {
        onBefore : {
          train : []
        }
        ,onComplete : {
          train : []
        }
      }
    };
  }

  return o;
})();

//PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
_public.downstream = {};

_public.execution_history = [];

//WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]
_public.overwritable = 0;


/**
 * Default timeout for a deferred
 * @type number
 */
_public.timeout = Config.settings.timeout;

/**
 * REMOTE
 *
 * REMOTE == 1  =>  [DEFAULT] Make http request for file
 *
 * REMOTE == 0  =>  Read file directly from the filesystem
 *
 * ONLY APPLIES TO SCRIPTS RUN UNDER NODE AS BROWSER HAS NO
 * FILESYSTEM ACCESS
 */
_public.remote = 1;

//ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
_public.list = 1;


//////////////////////////////////////////
//  _public METHODS
//////////////////////////////////////////


/**
 * Resolves a deferred/queue.
 *
 * @memberof orgy/deferred
 * @function orgy/deferred#resolve
 *
 * @param {mixed} value Resolver value.
 * @returns {object} deferred/queue
 */
_public.resolve = function(value){

  var _private = require('./deferred.private.js');

  if(this.settled === 1){
    Config.debug([
      this.id + " can't resolve."
      ,"Only unsettled deferreds are resolvable."
    ]);
  }

  //SET STATE TO SETTLEMENT IN PROGRESS
  _private.set_state(this,-1);

  //SET VALUE
  this.value = value;

  //RUN RESOLVER BEFORE PROCEEDING
  //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
  if(!this.resolver_fired && typeof this.resolver === 'function'){

    this.resolver_fired = 1;

    //Add resolver to resolve train
    try{
      this.callbacks.resolve.train.push(function(){
        this.resolver(value,this);
      });
    }
    catch(e){
      debugger;
    }
  }
  else{

    this.resolver_fired = 1;

    //Add settle to resolve train
    //Always settle before all other complete callbacks
    this.callbacks.resolve.hooks.onComplete.train.unshift(function(){
      _private.settle(this);
    });
  }

  //Run resolve
  _private.run_train(
    this
    ,this.callbacks.resolve
    ,this.value
    ,{pause_on_deferred : false}
  );

  //resolver is expected to call resolve again
  //and that will get us past this point
  return this;
};


/**
 * Rejects a deferred/queue
 *
 * @memberof orgy/deferred
 * @function orgy/deferred#reject
 *
 * @param {string|array} err Error information.
 * @return {object} deferred/queue
 */
_public.reject = function(err){

  var _private = require('./deferred.private.js');

  if(!(err instanceof Array)){
    err = [err];
  }

  var msg = "Rejected "+this.model+": '"+this.id+"'."

  if(Config.settings.debug_mode){
    err.unshift(msg);
    Config.debug(err,this);
  }
  else{
    msg = msg + " Turn on debug mode for more info.";
    console.warn(msg);
  }

  //Remove auto timeout timer
  if(this.timeout_id){
    clearTimeout(this.timeout_id);
  }

  //Set state to rejected
  _private.set_state(this,2);

  //Execute rejection queue
  _private.run_train(
    this
    ,this.callbacks.reject
    ,err
    ,{pause_on_deferred : false}
  );

  return this;
};


/**
 * Chain method

 <b>Usage:</b>
 ```
 var Orgy = require("orgy"),
        q = Orgy.deferred({
          id : "q1"
        });

 //Resolve the deferred
 q.resolve("Some value.");

 q.then(function(r){
  console.log(r); //Some value.
 })

 ```

 * @memberof orgy/deferred
 * @function orgy/deferred#then
 *
 * @param {function} fn Callback function
 * @param {function} rejector Rejection callback function
 * @return {object} deferred/queue
 */
_public.then = function(fn,rejector){

  var _private = require('./deferred.private.js');

  switch(true){

    //An error was previously thrown, add rejector & bail out
    case(this.state === 2):
      if(typeof rejector === 'function'){
        this.callbacks.reject.train.push(rejector);
      }
      break;

    //Execution chain already finished. Bail out.
    case(this.done_fired === 1):
      return Config.debug(this.id+" can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

    default:

      //Push callback to then queue
      this.callbacks.then.train.push(fn);

      //Push reject callback to the rejection queue
      if(typeof rejector === 'function'){
        this.callbacks.reject.train.push(rejector);
      }

      //Settled, run train now
      if(this.settled === 1 && this.state === 1 && !this.done_fired){
        _private.run_train(
          this
          ,this.callbacks.then
          ,this.caboose
          ,{pause_on_deferred : true}
        );
      }
      //Unsettled, train will be run when settled
      else{}
  }

  return this;
};


/**
 * Done callback.
 *
 * @memberof orgy/deferred
 * @function orgy/deferred#done
 *
 * @param {function} fn Callback function
 * @param {function} rejector Rejection callback function
 * @returns {object} deferred/queue
 */
_public.done = function(fn,rejector){

  var _private = require('./deferred.private.js');

  if(this.callbacks.done.train.length === 0
     && this.done_fired === 0){
      if(typeof fn === 'function'){

        //wrap callback with some other commands
        var fn2 = function(r,deferred,last){

          //Done can only be called once, so note that it has been
          deferred.done_fired = 1;

          fn(r,deferred,last);
        };

        this.callbacks.done.train.push(fn2);

        //Push reject callback to the rejection queue onComplete
        if(typeof rejector === 'function'){
          this.callbacks.reject.hooks.onComplete.train.push(rejector);
        }

        //Settled, run train now
        if(this.settled === 1){
          if(this.state === 1){
            _private.run_train(
              this
              ,this.callbacks.done
              ,this.caboose
              ,{pause_on_deferred : false}
            );
          }
          else{
            _private.run_train(
              this
              ,this.callbacks.reject
              ,this.caboose
              ,{pause_on_deferred : false}
            );
          }
        }
        //Unsettled, train will be run when settled
        else{}
    }
    else{
      return Config.debug("done() must be passed a function.");
    }
  }
  else{
    return Config.debug("done() can only be called once.");
  }
};


module.exports = _public;

},{"./config.js":4,"./deferred.private.js":6}],8:[function(require,module,exports){
var Config = require('./config.js');
var _public = {},
    _private = {};

_public.browser = {},
_public.native = {},
_private.native = {};

//Browser load

_public.browser.css = function(path,deferred){

  var head =  document.getElementsByTagName("head")[0] || document.documentElement,
  elem = document.createElement("link");

  elem.setAttribute("href",path);
  elem.setAttribute("type","text/css");
  elem.setAttribute("rel","stylesheet");

  if(elem.onload){
    (function(elem,path,deferred){
        elem.onload = elem.onreadystatechange = function(path,deferred){
          deferred.resolve(elem);
       };

       elem.onerror = function(path,deferred){
          deferred.reject("Failed to load path: " + path);
       };

    }(elem,path,deferred));

    head.appendChild(elem);
  }
  else{
    //ADD elem BUT MAKE XHR REQUEST TO CHECK FILE RECEIVED
    head.appendChild(elem);
    console.warn("No onload available for link tag, autoresolving.");
    deferred.resolve(elem);
  }
}

_public.browser.script = function(path,deferred){

  var elem = document.createElement("script");
  elem.type = 'text/javascript';
  elem.setAttribute("src",path);

  (function(elem,path,deferred){
      elem.onload = elem.onreadystatechange = function(){
        //Autoresolve by default
        if(typeof deferred.autoresolve !== 'boolean'
        || deferred.autoresolve === true){
          deferred.resolve((typeof elem.value !== 'undefined') ? elem.value : elem);
        }
      };
      elem.onerror = function(){
        deferred.reject("Error loading: " + path);
      };
  }(elem,path,deferred));

  this.head.appendChild(elem);
}

_public.browser.html = function(path,deferred){
  this.default(path,deferred);
}

_public.browser.default = function(path,deferred,options){
  var r,
  req = new XMLHttpRequest();
  req.open('GET', path, true);

  (function(path,deferred){
    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        if(req.status === 200){
          r = req.responseText;
          if(options.type && options.type === 'json'){
            try{
              r = JSON.parse(r);
            }
            catch(e){
              _public.debug([
                "Could not decode JSON"
                ,path
                ,r
              ],deferred);
            }
          }
          deferred.resolve(r);
        }
        else{
          deferred.reject("Error loading: " + path);
        }
      }
    };
  }(path,deferred));

  req.send(null);
}



//Native load

_public.native.css = function(path,deferred){
  _public.browser.css(path,deferred);
}

_public.native.script = function(path,deferred){
  //local package
  if(path[0]==='.'){
    path = _private.native.prepare_path(path,deferred);
    var r = require(path);
    //Autoresolve by default
    if(typeof deferred.autoresolve !== 'boolean'
    || deferred.autoresolve === true){
      deferred.resolve(r);
    }
  }
  //remote script
  else{
    //Check that we have configured the environment to allow this,
    //as it represents a security threat and should only be used for debugging
    if(!Config.settings.debug_mode){_
      Config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.");
    }
    else{
      _private.native.get(path,deferred,function(data){
        var Vm = require('vm');
        r = Vm.runInThisContext(data);
        deferred.resolve(r);
      });
    }
  }
}

_public.native.html = function(path,deferred){
  _public.native.default(path,deferred);
}

_public.native.default = function(path,deferred){
  (function(deferred){
    _private.native.get(path,deferred,function(r){
      if(deferred.type === 'json'){
        r = JSON.parse(r);
      }
      deferred.resolve(r);
    })
  })(deferred)
}

_private.native.get = function (path,deferred,callback){
  path = _private.native.prepare_path(path);
  if(path[0] === '.'){
    //file system
    var Fs = require('fs');
    Fs.readFile(path, "utf-8", function (err, data) {
      if (err) throw err;
      callback(data);
    });
  }
  else{
    //http
    var request = require('request');
    request(path,function(error,response,body){
      if (!error && response.statusCode == 200) {
        callback(body);
      }
      else{
        throw error;
      }
    })
  }
}

_private.native.prepare_path = function(p){
  p = (p[0] !== '/' && p[0] !== '.')
  ? ((p[0].indexOf("http")!==0) ? './' + p : p) : p;
  return p;
}
module.exports = _public;

},{"./config.js":4,"fs":1,"request":1,"vm":1}],9:[function(require,module,exports){
var Config = require('./config.js');
var DeferredSchema = require('./deferred.schema.js');
var QueueSchema = require('./queue.schema.js');
var _private = require('./queue.private.js');

/**
 * @namespace orgy/queue
 * @borrows orgy/deferred#then as #then
 * @borrows orgy/deferred#done as #done
 * @borrows orgy/deferred#reject as #reject
 * @borrows orgy/deferred#resolve as #resolve
 *
*/

/**
 * Creates a new queue object.
 * If no <b>resolver</b> option is set, resolved when all dependencies are resolved. Else, resolved when the deferred param passed to the resolver option
 * is resolved.

 <b>Usage:</b>
 ```
 var Orgy = require("orgy"),
        q = Orgy.queue([
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
 * @memberof orgy
 * @function queue
 *
 * @param {array} deps Array of dependencies that must be resolved before <b>resolver</b> option is called.
 * @param {object} options  List of options:

- <b>id</b> {string} Unique id of the object.
  - Can be used with Orgy.get(id).
  - Optional.


- <b>timeout</b> {number} Time in ms after which reject is called.
  - Defaults to Orgy.config().timeout [5000].
  - Note the timeout is only affected by dependencies and/or the resolver callback.
  - Then,done delays will not flag a timeout because they are called after the instance is considered resolved.


- <b>resolver</b> {function(<i>result</i>,<i>deferred</i>)} Callback function to execute after all dependencies have resolved.
  - <i>result</i> is an array of the queue's resolved dependency values.
  - <i>deferred</i> is the queue object.
  - The queue will only resolve when <i>deferred</i>.resolve() is called. If not, it will timeout to options.timeout || Orgy.config().timeout.

  * @returns {object} {@link orgy/queue}
 *
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

},{"./config.js":4,"./deferred.schema.js":7,"./queue.private.js":10,"./queue.schema.js":11}],10:[function(require,module,exports){
var Config = require('./config.js');
var QueueSchema = require('./queue.schema.js');
var _proto = require('./deferred.private.js');
var _public = Object.create(_proto,{});


/**
 * Activates a queue object.
 *
 * @param {object} o
 * @param {object} options
 * @param {array} deps
 * @returns {object} queue
 */
_public.activate = function(o,options,deps){

    //ACTIVATE AS A DEFERRED
    //var proto = Object.getPrototypeOf(this);
    o = _proto.activate(o);

    //@todo rethink this
    //This timeout gives defined promises that are defined
    //further down the same script a chance to define themselves
    //and in case this queue is about to request them from a
    //remote source here.
    //This is important in the case of compiled js files that contain
    //multiple modules when depend on each other.

    //temporarily change state to prevent outside resolution
    o.state = -1;

    var self = this;

    setTimeout(function(){

      //Restore state
      o.state = 0;

      //ADD DEPENDENCIES TO QUEUE
      QueueSchema.add.call(o,deps);

      //SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
      self.receive_signal(o,o.id);

      //ASSIGN THIS QUEUE UPSTREAM TO OTHER QUEUES
      if(o.assign){
          for(var a in o.assign){
              self.assign(o.assign[a],[o],true);
          }
      }
    },1);

    return o;
};


/**
* Upgrades a promise object to a queue.
*
* @param {object} obj
* @param {object} options
* @param {array} deps \dependencies
* @returns {object} queue object
*/
_public.upgrade = function(obj,options,deps){

    if(obj.settled !== 0 || (obj.model !== 'promise' && obj.model !== 'deferred')){
        return Config.debug('Can only upgrade unsettled promise or deferred into a queue.');
    }

   //GET A NEW QUEUE OBJECT AND MERGE IN
    var _o = Config.naive_cloner([
        QueueSchema
        ,options
    ]);

    for(var i in _o){
       obj[i] = _o[i];
    }

    //delete _o;

    //CREATE NEW INSTANCE OF QUEUE
    obj = this.activate(obj,options,deps);

    //RETURN QUEUE OBJECT
    return obj;
};


module.exports = _public;

},{"./config.js":4,"./deferred.private.js":6,"./queue.schema.js":11}],11:[function(require,module,exports){
var Config = require('./config.js');
var _proto = require('./deferred.schema.js');

//Extend deferred schema
var _public = Object.create(_proto,{});

_public.model = 'queue';


//SET TRUE AFTER RESOLVER FIRED
_public.resolver_fired = 0;


//PREVENTS A QUEUE FROM RESOLVING EVEN IF ALL DEPENDENCIES MET
//PURPOSE: PREVENTS QUEUES CREATED BY ASSIGNMENT FROM RESOLVING
//BEFORE THEY ARE FORMALLY INSTANTIATED
_public.halt_resolution = 0;


//USED TO CHECK STATE, ENSURES ONE COPY
_public.upstream = {};


//USED RETURN VALUES, ENSURES ORDER
_public.dependencies = [];


///////////////////////////////////////////////////
//  QUEUE INSTANCE METHODS
///////////////////////////////////////////////////


/**
* Add list of dependencies to a queue's upstream array.
*
* The queue will resolve once all the promises in its
* upstream array are resolved.
*
* When _public.config.debug == 1, method will test each
* dependency is not previously scheduled to resolve
* downstream from the target, in which
* case it would never resolve because its upstream depends on it.
*
* @param {array} arr  /array of dependencies to add
* @returns {array} upstream
*/
_public.add = function(arr){

  var _private = require('./queue.private.js');

   try{
       if(arr.length === 0) return this.upstream;
   }
   catch(err){
       Config.debug(err);
   }

   //IF NOT PENDING, DO NOT ALLOW TO ADD
   if(this.state !== 0){
      return Config.debug([
        "Cannot add dependency list to queue id:'"+this.id
        +"'. Queue settled/in the process of being settled."
      ],arr,this);
   }

   for(var a in arr){

       switch(true){

           //CHECK IF EXISTS
           case(typeof Config.list[arr[a]['id']] === 'object'):
               arr[a] = Config.list[arr[a]['id']];
               break;

           //IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
           case(typeof arr[a] === 'object' && (!arr[a].is_orgy)):
               arr[a] = _private.convert_to_promise(arr[a],{
                 parent : this
               });
               break;

           //REF IS A PROMISE.
           case(typeof arr[a].then === 'function'):
               break;

           default:
               console.error("Object could not be converted to promise.");
               console.error(arr[a]);
               debugger;
               continue;
       }

       //must check the target to see if the dependency exists in its downstream
       for(var b in this.downstream){
           if(b === arr[a].id){
              return Config.debug([
                "Error adding upstream dependency '"
                +arr[a].id+"' to queue"+" '"
                +this.id+"'.\n Promise object for '"
                +arr[a].id+"' is scheduled to resolve downstream from queue '"
                +this.id+"' so it can't be added upstream."
              ]
              ,this);
           }
       }

       //ADD TO UPSTREAM, DOWNSTREAM, DEPENDENCIES
       this.upstream[arr[a].id] = arr[a];
       arr[a].downstream[this.id] = this;
       this.dependencies.push(arr[a]);
   }

   return this.upstream;
};


/**
* Remove list from a queue.
*
* @param {array} arr
* @returns {array} array of list the queue is upstream
*/
_public.remove = function(arr){

  //IF NOT PENDING, DO NOT ALLOW REMOVAL
  if(this.state !== 0){
      return Config.debug("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
  }

  for(var a in arr){
     if(this.upstream[arr[a].id]){
        delete this.upstream[arr[a].id];
        delete arr[a].downstream[this.id];
     }
  }
};


/**
* Resets an existing,settled queue back to Orgying state.
* Clears out the downstream.
* Fails if not settled.
* @param {object} options
* @returns {_private.tpl|Boolean}
*/
_public.reset = function(options){

  var _private = require('./deferred.private.js');

  if(this.settled !== 1 || this.state !== 1){
    return Config.debug("Can only reset a queue settled without errors.");
  }

  options = options || {};

  this.settled = 0;
  this.state = 0;
  this.resolver_fired = 0;
  this.done_fired = 0;

  //REMOVE AUTO TIMEOUT TIMER
  if(this.timeout_id){
    clearTimeout(this.timeout_id);
  }

  //CLEAR OUT THE DOWNSTREAM
  this.downstream = {};
  this.dependencies = [];

  //SET NEW AUTO TIMEOUT
  _private.auto_timeout.call(this,options.timeout);

  //POINTLESS - WILL JUST IMMEDIATELY RESOLVE SELF
  //this.check_self()

  return this;
};


/**
* Cauaes a queue to look over its dependencies and see if it
* can be resolved.
*
* This is done automatically by each dependency that loads,
* so is not needed unless:
*
* -debugging
*
* -the queue has been reset and no new
* dependencies were since added.
*
* @returns {int} State of the queue.
*/
_public.check_self = function(){
  var _private = require('./deferred.private.js');
  _private.receive_signal(this,this.id);
  return this.state;
};


module.exports = _public;

},{"./config.js":4,"./deferred.private.js":6,"./deferred.schema.js":7,"./queue.private.js":10}],"orgy":[function(require,module,exports){
var Deferred = require('./deferred.js'),
    Queue = require('./queue.js'),
    Cast = require('./cast.js'),
    Config = require('./config.js');

module.exports = {

/**
 * @namespace orgy
 */

/**
* Creates a new deferred from a value and an id and automatically
* resolves it.
*
* @memberof orgy
* @function define
*
* @param {string} id A unique id you give to the object
* @param {mixed}  data The value that the object is assigned
* @param {object} options 
- <b>dependencies</b> {array}
- <b>resolver</b> {function(<i>assignedValue</i>,<i>deferred</i>}
* @returns {object} resolved deferred
*/
define : function(id,data,options){

    var def;
    options = options || {};
    options.dependencies = options.dependencies || null;
    options.resolver = options.resolver || null;

    //test for a valid id
    if(typeof id !== 'string'){
      Config.debug("Must set id when defining an instance.");
    }

    //Check no existing instance defined with same id
    if(Config.list[id] && Config.list[id].settled === 1){
      return Config.debug("Can't define " + id + ". Already resolved.");
    }

    options.id = id;

    if(options.dependencies !== null
      && options.dependencies instanceof Array){
      //Define as a queue - can't autoresolve because we have deps
      var deps = options.dependencies;
      delete options.dependencies;
      def = Queue(deps,options);
    }
    else{
      //Define as a deferred
      def = Deferred(options);

      //Try to immediately settle [define]
      if(options.resolver === null
        && (typeof options.autoresolve !== 'boolean'
        || options.autoresolve === true)){
        //prevent future autoresove attempts [i.e. from xhr response]
        def.autoresolve = false;
        def.resolve(data);
      }
    }

    return def;
},


/**
 * Gets an exisiting deferred / queue object from global store.
 * Returns null if none found.
 *
 * @memberof orgy
 * @function get
 *
 * @param {string} id Id of deferred or queue object.
 * @returns {object} deferred | queue | null
 */
get : function(id){
  if(Config.list[id]){
    return Config.list[id];
  }
  else{
    return null;
  }
},


/**
 * Add/remove an upstream dependency to/from a queue.
 *
 * Can use a queue id, even for a queue that is yet to be created.
 *
 * @memberof orgy
 * @function assign
 *
 * @param {string|object} tgt Queue id / queue object
 * @param {array}  arr  Array of promise ids or dependency objects
 * @param {boolean} add  If true <b>ADD</b> array to queue dependencies, If false <b>REMOVE</b> array from queue dependencies
 *
 * @return {object} queue
 */
assign : function(tgt,arr,add){

    add = (typeof add === "boolean") ? add : 1;

    var id,q;
    switch(true){
        case(typeof tgt === 'object' && typeof tgt.then === 'function'):
            id = tgt.id;
            break;
        case(typeof tgt === 'string'):
            id = tgt;
            break;
        default:
            return Config.debug("Assign target must be a queue object or the id of a queue.",this);
    }

    //IF TARGET ALREADY LISTED
    if(Config.list[id] && Config.list[id].model === 'queue'){
        q = Config.list[id];

        //=> ADD TO QUEUE'S UPSTREAM
        if(add){
            q.add(arr);
        }
        //=> REMOVE FROM QUEUE'S UPSTREAM
        else{
            q.remove(arr);
        }
    }
    //CREATE NEW QUEUE AND ADD DEPENDENCIES
    else if(add){
        q = Queue(arr,{
            id : id
        });
    }
    //ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
    else{
        return Config.debug("Cannot remove dependencies from a queue that does not exist.",this);
    }

    return q;
},

/**
* Documented in required file.
* @ignore
*/
deferred : Deferred,

/**
* Documented in required file.
* @ignore
*/
queue : Queue,

/**
* Documented in required file.
* @ignore
*/
cast : Cast,

/**
* Documented in required file.
* @ignore
*/
config : Config.config

};

},{"./cast.js":3,"./config.js":4,"./deferred.js":5,"./queue.js":9}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9kZWZlcnJlZC5wcml2YXRlLmpzIiwic3JjL2RlZmVycmVkLnNjaGVtYS5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9xdWV1ZS5wcml2YXRlLmpzIiwic3JjL3F1ZXVlLnNjaGVtYS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2p0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIixudWxsLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyksXG4gICAgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cbi8qKlxuICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cbiAqXG4gKiA+IFRvIHF1YWxpZnkgYXMgYSA8Yj50aGVuYWJsZTwvYj4sIHRoZSBvYmplY3QgdG8gYmUgY2FzdGVkIG11c3QgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gKiA+XG4gKiA+IC0gaWRcbiAqID5cbiAqID4gLSB0aGVuKClcbiAqID5cbiAqID4gLSBlcnJvcigpXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBjYXN0XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBBIHRoZW5hYmxlIHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogIC0ge3N0cmluZ30gPGI+aWQ8L2I+ICBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cbiAqXG4gKiAgLSB7ZnVuY3Rpb259IDxiPnRoZW48L2I+XG4gKlxuICogIC0ge2Z1bmN0aW9ufSA8Yj5lcnJvcjwvYj5cbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgcmVxdWlyZWQgPSBbXCJ0aGVuXCIsXCJlcnJvclwiLFwiaWRcIl07XG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKXtcbiAgICAgIGlmKCFvYmpbcmVxdWlyZWRbaV1dKXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhc3QgbWV0aG9kIG1pc3NpbmcgcHJvcGVydHkgJ1wiICsgcmVxdWlyZWRbaV0gK1wiJ1wiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIG9wdGlvbnMuaWQgPSBvYmouaWQ7XG5cbiAgICAvL01ha2Ugc3VyZSBpZCBkb2VzIG5vdCBjb25mbGljdCB3aXRoIGV4aXN0aW5nXG4gICAgaWYoQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIklkIFwiK29wdGlvbnMuaWQrXCIgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgaWQuXCIpXG4gICAgfVxuXG4gICAgLy9DcmVhdGUgYSBkZWZlcnJlZFxuICAgIHZhciBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuICAgIC8vQ3JlYXRlIHJlc29sdmVyXG4gICAgdmFyIHJlc29sdmVyID0gZnVuY3Rpb24oKXtcbiAgICAgIGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSk7XG4gICAgfTtcblxuICAgIC8vU2V0IFJlc29sdmVyXG4gICAgb2JqLnRoZW4ocmVzb2x2ZXIpO1xuXG4gICAgLy9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG4gICAgdmFyIGVyciA9IGZ1bmN0aW9uKGVycil7XG4gICAgICBkZWYucmVqZWN0KGVycik7XG4gICAgfTtcbiAgICBvYmouZXJyb3IoZXJyKTtcblxuICAgIC8vUmV0dXJuIGRlZmVycmVkXG4gICAgcmV0dXJuIGRlZjtcbn07XG4iLCJ2YXIgX3B1YmxpYyA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQSBkaXJlY3Rvcnkgb2YgYWxsIHByb21pc2VzLCBkZWZlcnJlZHMsIGFuZCBxdWV1ZXMuXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5saXN0ID0ge307XG5cblxuLyoqXG4gKiBpdGVyYXRvciBmb3IgaWRzXG4gKiBAdHlwZSBpbnRlZ2VyXG4gKi9cbl9wdWJsaWMuaSA9IDA7XG5cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cbiAqXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5zZXR0aW5ncyA9IHtcblxuICAgIGRlYnVnX21vZGUgOiAxXG4gICAgLy9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG4gICAgLy9iZWNhdXNlIG5vZGUgaGFzIG5vIGNvbnN0YW50IGZvciB0aGlzXG4gICAgLGN3ZCA6IGZhbHNlXG4gICAgLG1vZGUgOiAoZnVuY3Rpb24oKXtcbiAgICAgICAgaWYodHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MgKyAnJyA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKXtcbiAgICAgICAgICAgIC8vIGlzIG5vZGVcbiAgICAgICAgICAgIHJldHVybiBcIm5hdGl2ZVwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvLyBub3Qgbm9kZVxuICAgICAgICAgICAgcmV0dXJuIFwiYnJvd3NlclwiO1xuICAgICAgICB9XG4gICAgfSgpKVxuICAgIC8qKlxuICAgICAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuICAgICAqIC0gb25TZXR0bGUgICAvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcbiAgICAgKlxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuICAgICxob29rcyA6IHtcbiAgICB9XG4gICAgLHRpbWVvdXQgOiA1MDAwIC8vZGVmYXVsdCB0aW1lb3V0XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBPcHRpb25zIHlvdSB3aXNoIHRvIHBhc3MgdG8gc2V0IHRoZSBnbG9iYWwgY29uZmlndXJhdGlvblxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gY29uZmlnXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9iaiBMaXN0IG9mIG9wdGlvbnM6XG5cbiAgLSB7bnVtYmVyfSA8Yj50aW1lb3V0PC9iPlxuXG4gIC0ge3N0cmluZ30gPGI+Y3dkPC9iPiBTZXRzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuIFNlcnZlciBzaWRlIHNjcmlwdHMgb25seS5cblxuICAtIHtib29sZWFufSA8Yj5kZWJ1Z19tb2RlPC9iPlxuXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBjb25maWd1cmF0aW9uIHNldHRpbmdzXG4gKi9cbl9wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIGlmKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKXtcbiAgICAgICAgZm9yKHZhciBpIGluIG9iail7XG4gICAgICAgICAgX3B1YmxpYy5zZXR0aW5nc1tpXSA9IG9ialtpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfcHVibGljLnNldHRpbmdzO1xufTtcblxuXG4vKipcbiAqIERlYnVnZ2luZyBtZXRob2QuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbl9wdWJsaWMuZGVidWcgPSBmdW5jdGlvbihtc2csZGVmKXtcblxuICAgIHZhciBtc2dzID0gKG1zZyBpbnN0YW5jZW9mIEFycmF5KSA/IG1zZy5qb2luKFwiXFxuXCIpIDogW21zZ107XG5cbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtc2dzKTtcbiAgICBjb25zb2xlLmxvZyhlLnN0YWNrKTtcblxuXG4gICAgaWYodGhpcy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICAgIC8vdHVybiBvZmYgZGVidWdfbW9kZSB0byBhdm9pZCBoaXR0aW5nIGRlYnVnZ2VyXG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG5cbiAgICBpZihfcHVibGljLnNldHRpbmdzLm1vZGUgPT09ICdicm93c2VyJyl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgcHJvY2Vzcy5leGl0KCk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIFRha2UgYW4gYXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgYW5kIGFuIGFycmF5IG9mIHByb3BlcnR5IG9iamVjdHMsXG4gKiBtZXJnZXMgZWFjaCwgYW5kIHJldHVybnMgYSBzaGFsbG93IGNvcHkuXG4gKlxuICogQHBhcmFtIHthcnJheX0gcHJvdG9PYmpBcnIgQXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuICogQHBhcmFtIHthcnJheX0gcHJvcHNPYmpBcnIgQXJyYXkgb2YgZGVzaXJlZCBwcm9wZXJ0eSBvYmplY3RzIHdoaWNoIGFyZSBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAqIEByZXR1cm5zIHtvYmplY3R9IG9iamVjdFxuICovXG5fcHVibGljLm5haXZlX2Nsb25lciA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLHByb3BzT2JqQXJyKXtcblxuICAgIGZ1bmN0aW9uIG1lcmdlKGRvbm9ycyl7XG4gICAgICB2YXIgbyA9IHt9O1xuICAgICAgZm9yKHZhciBhIGluIGRvbm9ycyl7XG4gICAgICAgICAgZm9yKHZhciBiIGluIGRvbm9yc1thXSl7XG4gICAgICAgICAgICAgIGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgICAgICAgICAgICAgIG9bYl0gPSBkb25vcnNbYV1bYl0uc2xpY2UoMCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgZG9ub3JzW2FdW2JdID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgb1tiXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZG9ub3JzW2FdW2JdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgb1tiXSA9IGRvbm9yc1thXVtiXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvO1xuICAgIH1cblxuICAgIHZhciBwcm90byA9IG1lcmdlKHByb3RvT2JqQXJyKSxcbiAgICAgICAgcHJvcHMgPSBtZXJnZShwcm9wc09iakFycik7XG5cbiAgICAvL0B0b2RvIGNvbnNpZGVyIG1hbnVhbGx5IHNldHRpbmcgdGhlIHByb3RvdHlwZSBpbnN0ZWFkXG4gICAgdmFyIGZpbmFsT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgZm9yKHZhciBpIGluIHByb3BzKXtcbiAgICAgIGZpbmFsT2JqZWN0W2ldID0gcHJvcHNbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpbmFsT2JqZWN0O1xufTtcblxuXG5fcHVibGljLmdlbmVyYXRlX2lkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgJy0nICsgKCsrdGhpcy5pKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIERlZmVycmVkU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5zY2hlbWEuanMnKTtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIG9yZ3kvZGVmZXJyZWRcbiovXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBvYmplY3Qgb3IgaWYgb25lIGV4aXN0cyBieSB0aGUgc2FtZSBpZCxcbiAqIHJldHVybnMgaXQuXG5cbiA8Yj5Vc2FnZTo8L2I+XG4gYGBgXG4gdmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcbiAgICAgICAgcSA9IE9yZ3kuZGVmZXJyZWQoe1xuICAgICAgICAgIGlkIDogXCJxMVwiXG4gICAgICAgIH0pO1xuIGBgYFxuXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGRlZmVycmVkXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuICpcbiAqICAtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cbiAqICAgLSBDYW4gYmUgdXNlZCB3aXRoIE9yZ3kuZ2V0KGlkKS5cbiAqICAgLSBPcHRpb25hbC5cbiAqXG4gKlxuICogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkIGlmIG5vdCB5ZXQgcmVzb2x2ZWQuXG4gICAgIC0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0LlxuICAgICAtIERlbGF5cyBpbiBvYmplY3QudGhlbigpIGFuZCBvYmplY3QuZG9uZSgpIHdvbid0IG5vdCB0cmlnZ2VyIHRoaXMsIGJlY2F1c2UgdGhvc2UgbWV0aG9kcyBydW4gYWZ0ZXIgcmVzb2x2ZS5cbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9kZWZlcnJlZH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuICAgIHZhciBfbztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmKG9wdGlvbnMuaWQgJiYgQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuICAgICAgICBfbyA9IENvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICAvL0NyZWF0ZSBhIG5ldyBkZWZlcnJlZCBjbGFzcyBpbnN0YW5jZVxuICAgICAgICBfbyA9IF9wcml2YXRlLmZhY3RvcnkoW0RlZmVycmVkU2NoZW1hXSxbb3B0aW9uc10pO1xuXG4gICAgICAgIC8vQUNUSVZBVEUgREVGRVJSRURcbiAgICAgICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9vO1xufTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIEZpbGVfbG9hZGVyID0gcmVxdWlyZSgnLi9maWxlX2xvYWRlci5qcycpO1xuXG5cbnZhciBfcHVibGljID0ge307XG5cblxuLyoqXG4gKiBAcGFyYW0gYXJyYXkgb3B0aW9ucyBQcm90b3R5cGUgb2JqZWN0c1xuKiovXG5fcHVibGljLmZhY3RvcnkgPSBmdW5jdGlvbihwcm90b09iakFycixvcHRpb25zT2JqQXJyKXtcblxuICAgIC8vTWVyZ2UgYXJyYXkgb2Ygb2JqZWN0cyBpbnRvIGEgc2luZ2xlLCBzaGFsbG93IGNsb25lXG4gICAgdmFyIF9vID0gQ29uZmlnLm5haXZlX2Nsb25lcihwcm90b09iakFycixvcHRpb25zT2JqQXJyKTtcblxuICAgIC8vaWYgbm8gaWQsIGdlbmVyYXRlIG9uZVxuICAgIF9vLmlkID0gKCFfby5pZCkgPyBDb25maWcuZ2VuZXJhdGVfaWQoKSA6IF9vLmlkO1xuXG4gICAgcmV0dXJuIF9vO1xufTtcblxuXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuICAgIGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgIUNvbmZpZy5saXN0W29iai5pZF0ub3ZlcndyaXRhYmxlKXtcbiAgICAgICAgQ29uZmlnLmRlYnVnKFwiVHJpZWQgaWxsZWdhbCBvdmVyd3JpdGUgb2YgXCIrb2JqLmlkK1wiLlwiKTtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5saXN0W29iai5pZF07XG4gICAgfVxuXG4gICAgLy9TQVZFIFRPIE1BU1RFUiBMSVNUXG4gICAgQ29uZmlnLmxpc3Rbb2JqLmlkXSA9IG9iajtcblxuICAgIC8vQVVUTyBUSU1FT1VUXG4gICAgX3B1YmxpYy5hdXRvX3RpbWVvdXQuY2FsbChvYmopO1xuXG4gICAgLy9DYWxsIGhvb2tcbiAgICBpZihDb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZSl7XG4gICAgICBDb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZShvYmopO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5cbl9wdWJsaWMuc2V0dGxlID0gZnVuY3Rpb24oZGVmKXtcblxuICAgIC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuICAgIGlmKGRlZi50aW1lb3V0X2lkKXtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlZi50aW1lb3V0X2lkKTtcbiAgICB9XG5cbiAgICAvL1NldCBzdGF0ZSB0byByZXNvbHZlZFxuICAgIF9wdWJsaWMuc2V0X3N0YXRlKGRlZiwxKTtcblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZShkZWYpO1xuICAgIH1cblxuICAgIC8vQWRkIGRvbmUgYXMgYSBjYWxsYmFjayB0byB0aGVuIGNoYWluIGNvbXBsZXRpb24uXG4gICAgZGVmLmNhbGxiYWNrcy50aGVuLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbihkMixpdGluZXJhcnksbGFzdCl7XG4gICAgICAgIGRlZi5jYWJvb3NlID0gbGFzdDtcblxuICAgICAgICAvL1J1biBkb25lXG4gICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsZGVmLmNhbGxiYWNrcy5kb25lXG4gICAgICAgICAgICAsZGVmLmNhYm9vc2VcbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcbiAgICB9KTtcblxuICAgIC8vUnVuIHRoZW4gcXVldWVcbiAgICBfcHVibGljLnJ1bl90cmFpbihcbiAgICAgICAgZGVmXG4gICAgICAgICxkZWYuY2FsbGJhY2tzLnRoZW5cbiAgICAgICAgLGRlZi52YWx1ZVxuICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICApO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBSdW5zIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBzZXF1ZW50aWFsbHkgYXMgYSBwYXJ0aWFsIGZ1bmN0aW9uLlxuICogRWFjaCBmdW5jdGlvbidzIGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgb2YgaXRzIHByZWRlY2Vzc29yIGZ1bmN0aW9uLlxuICpcbiAqIEJ5IGRlZmF1bHQsIGV4ZWN1dGlvbiBjaGFpbiBpcyBwYXVzZWQgd2hlbiBhbnkgZnVuY3Rpb25cbiAqIHJldHVybnMgYW4gdW5yZXNvbHZlZCBkZWZlcnJlZC4gKHBhdXNlX29uX2RlZmVycmVkKSBbT1BUSU9OQUxdXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZiAgL2RlZmVycmVkIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iaiAgL2l0aW5lcmFyeVxuICogICAgICB0cmFpbiAgICAgICB7YXJyYXl9XG4gKiAgICAgIGhvb2tzICAgICAgIHtvYmplY3R9XG4gKiAgICAgICAgICBvbkJlZm9yZSAgICAgICAge2FycmF5fVxuICogICAgICAgICAgb25Db21wbGV0ZSAgICAgIHthcnJheX1cbiAqIEBwYXJhbSB7bWl4ZWR9IHBhcmFtIC9wYXJhbSB0byBwYXNzIHRvIGZpcnN0IGNhbGxiYWNrXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogICAgICBwYXVzZV9vbl9kZWZlcnJlZCAgIHtib29sZWFufVxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnJ1bl90cmFpbiA9IGZ1bmN0aW9uKGRlZixvYmoscGFyYW0sb3B0aW9ucyl7XG5cbiAgICAvL2FsbG93IHByZXZpb3VzIHJldHVybiB2YWx1ZXMgdG8gYmUgcGFzc2VkIGRvd24gY2hhaW5cbiAgICB2YXIgciA9IHBhcmFtIHx8IGRlZi5jYWJvb3NlIHx8IGRlZi52YWx1ZTtcblxuICAgIC8vb25CZWZvcmUgZXZlbnRcbiAgICBpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQmVmb3JlLnRyYWluLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHVibGljLnJ1bl90cmFpbihcbiAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgLG9iai5ob29rcy5vbkJlZm9yZVxuICAgICAgICAgICAgLHBhcmFtXG4gICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgd2hpbGUob2JqLnRyYWluLmxlbmd0aCA+IDApe1xuXG4gICAgICAgIC8vcmVtb3ZlIGZuIHRvIGV4ZWN1dGVcbiAgICAgICAgdmFyIGxhc3QgPSBvYmoudHJhaW4uc2hpZnQoKTtcbiAgICAgICAgZGVmLmV4ZWN1dGlvbl9oaXN0b3J5LnB1c2gobGFzdCk7XG5cbiAgICAgICAgLy9kZWYuY2Fib29zZSBuZWVkZWQgZm9yIHRoZW4gY2hhaW4gZGVjbGFyZWQgYWZ0ZXIgcmVzb2x2ZWQgaW5zdGFuY2VcbiAgICAgICAgciA9IGRlZi5jYWJvb3NlID0gbGFzdC5jYWxsKGRlZixkZWYudmFsdWUsZGVmLHIpO1xuXG4gICAgICAgIC8vaWYgcmVzdWx0IGlzIGFuIHRoZW5hYmxlLCBoYWx0IGV4ZWN1dGlvblxuICAgICAgICAvL2FuZCBydW4gdW5maXJlZCBhcnIgd2hlbiB0aGVuYWJsZSBzZXR0bGVzXG4gICAgICAgIGlmKG9wdGlvbnMucGF1c2Vfb25fZGVmZXJyZWQpe1xuXG4gICAgICAgICAgICAvL0lmIHIgaXMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG4gICAgICAgICAgICBpZihyICYmIHIudGhlbiAmJiByLnNldHRsZWQgIT09IDEpe1xuXG4gICAgICAgICAgICAgICAgLy9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlciByIHJlc29sdmVzXG4gICAgICAgICAgICAgICAgci5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblxuICAgICAgICAgICAgICAgICAgICBfcHVibGljLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgICAgICAgICAgICAgLG9ialxuICAgICAgICAgICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy90ZXJtaW5hdGUgZXhlY3V0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0lmIGlzIGFuIGFycmF5IHRoYW4gY29udGFpbnMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG4gICAgICAgICAgICBlbHNlIGlmKHIgaW5zdGFuY2VvZiBBcnJheSl7XG5cbiAgICAgICAgICAgICAgICB2YXIgdGhlbmFibGVzID0gW107XG5cbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gcil7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYocltpXS50aGVuICYmIHJbaV0uc2V0dGxlZCAhPT0gMSl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW5hYmxlcy5wdXNoKHJbaV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSAoZnVuY3Rpb24odCxkZWYsb2JqLHBhcmFtKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQmFpbCBpZiBhbnkgdGhlbmFibGVzIHVuc2V0dGxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0W2ldLnNldHRsZWQgIT09IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsb2JqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAscGFyYW1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKHRoZW5hYmxlcyxkZWYsb2JqLHBhcmFtKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9hbGwgdGhlbmFibGVzIGZvdW5kIGluIHIgcmVzb2x2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgcltpXS5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZm4pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3Rlcm1pbmF0ZSBleGVjdXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vb25Db21wbGV0ZSBldmVudFxuICAgIGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25Db21wbGV0ZS50cmFpbi5sZW5ndGggPiAwKXtcbiAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9KTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHBhcmFtIHtudW1iZXJ9IGludFxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMuc2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmLGludCl7XG5cbiAgICBkZWYuc3RhdGUgPSBpbnQ7XG5cbiAgICAvL0lGIFJFU09MVkVEIE9SIFJFSkVDVEVELCBTRVRUTEVcbiAgICBpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcbiAgICAgICAgZGVmLnNldHRsZWQgPSAxO1xuICAgIH1cblxuICAgIGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuICAgICAgICBfcHVibGljLnNpZ25hbF9kb3duc3RyZWFtKGRlZik7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIEdldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuX3B1YmxpYy5nZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYpe1xuICAgIHJldHVybiBkZWYuc3RhdGU7XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgYXV0b21hdGljIHRpbWVvdXQgb24gYSBwcm9taXNlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHRpbWVvdXQgKG9wdGlvbmFsKVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbl9wdWJsaWMuYXV0b190aW1lb3V0ID0gZnVuY3Rpb24odGltZW91dCl7XG5cbiAgICB0aGlzLnRpbWVvdXQgPSAodHlwZW9mIHRpbWVvdXQgPT09ICd1bmRlZmluZWQnKVxuICAgID8gdGhpcy50aW1lb3V0IDogdGltZW91dDtcblxuICAgIC8vQVVUTyBSRUpFQ1QgT04gdGltZW91dFxuICAgIGlmKCF0aGlzLnR5cGUgfHwgdGhpcy50eXBlICE9PSAndGltZXInKXtcblxuICAgICAgICAvL0RFTEVURSBQUkVWSU9VUyBUSU1FT1VUIElGIEVYSVNUU1xuICAgICAgICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0eXBlb2YgdGhpcy50aW1lb3V0ID09PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICBcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuICAgICAgICAgICAgICAsdGhpcy5pZFxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy50aW1lb3V0ID09PSAtMSl7XG4gICAgICAgICAgICAvL05PIEFVVE8gVElNRU9VVCBTRVRcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGltZW91dF9pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIF9wdWJsaWMuYXV0b190aW1lb3V0X2NiLmNhbGwoc2NvcGUpO1xuICAgICAgICB9LCB0aGlzLnRpbWVvdXQpO1xuXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQHRvZG8gV0hFTiBBIFRJTUVSLCBBREQgRFVSQVRJT04gVE8gQUxMIFVQU1RSRUFNIEFORCBMQVRFUkFMP1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBhdXRvdGltZW91dC4gRGVjbGFyYXRpb24gaGVyZSBhdm9pZHMgbWVtb3J5IGxlYWsuXG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMuYXV0b190aW1lb3V0X2NiID0gZnVuY3Rpb24oKXtcblxuICAgIGlmKHRoaXMuc3RhdGUgIT09IDEpe1xuXG4gICAgICAgIC8vR0VUIFRIRSBVUFNUUkVBTSBFUlJPUiBJRFxuICAgICAgICB2YXIgbXNncyA9IFtdO1xuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICBpZihvYmouc3RhdGUgIT09IDEpe1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmouaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksXG4gICAgICAgICAqIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG4gICAgICAgICAqIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG4gICAgICAgICAqL1xuICAgICAgICBpZihDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgICAgICAgICB2YXIgciA9IF9wdWJsaWMuc2VhcmNoX29ial9yZWN1cnNpdmVseSh0aGlzLCd1cHN0cmVhbScsZm4pO1xuICAgICAgICAgICAgbXNncy5wdXNoKHNjb3BlLmlkICsgXCI6IHJlamVjdGVkIGJ5IGF1dG8gdGltZW91dCBhZnRlciBcIlxuICAgICAgICAgICAgICAgICAgICArIHRoaXMudGltZW91dCArIFwibXNcIik7XG4gICAgICAgICAgICBtc2dzLnB1c2goXCJDYXVzZTpcIik7XG4gICAgICAgICAgICBtc2dzLnB1c2gocik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzLG1zZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuX3B1YmxpYy5lcnJvciA9IGZ1bmN0aW9uKGNiKXtcblxuICAgIC8vSUYgRVJST1IgQUxSRUFEWSBUSFJPV04sIEVYRUNVVEUgQ0IgSU1NRURJQVRFTFlcbiAgICBpZih0aGlzLnN0YXRlID09PSAyKXtcbiAgICAgICAgY2IoKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgdGhpcy5yZWplY3RfcS5wdXNoKGNiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTaWduYWxzIGFsbCBkb3duc3RyZWFtIHByb21pc2VzIHRoYXQgX3B1YmxpYyBwcm9taXNlIG9iamVjdCdzXG4gKiBzdGF0ZSBoYXMgY2hhbmdlZC5cbiAqXG4gKiBAdG9kbyBTaW5jZSB0aGUgc2FtZSBxdWV1ZSBtYXkgaGF2ZSBiZWVuIGFzc2lnbmVkIHR3aWNlIGRpcmVjdGx5IG9yXG4gKiBpbmRpcmVjdGx5IHZpYSBzaGFyZWQgZGVwZW5kZW5jaWVzLCBtYWtlIHN1cmUgbm90IHRvIGRvdWJsZSByZXNvbHZlXG4gKiAtIHdoaWNoIHRocm93cyBhbiBlcnJvci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IGRlZmVycmVkL3F1ZXVlXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5zaWduYWxfZG93bnN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldCl7XG5cbiAgICAvL01BS0UgU1VSRSBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRURcbiAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuICAgICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkID09PSAxKXtcblxuICAgICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnN0YXRlICE9PSAxKXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgcmVqZWN0ZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvL3RyaWVkIHRvIHNldHRsZSBhIHN1Y2Nlc3NmdWxseSBzZXR0bGVkIGRvd25zdHJlYW1cbiAgICAgICAgICAgIENvbmZpZy5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vTk9XIFRIQVQgV0UgS05PVyBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRUQsIFdFIENBTiBJR05PUkUgQU5ZXG4gICAgLy9TRVRUTEVEIFRIQVQgUkVTVUxUIEFTIEEgU0lERSBFRkZFQ1QgVE8gQU5PVEhFUiBTRVRUTEVNRU5UXG4gICAgZm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgIT09IDEpe1xuICAgICAgICAgICAgX3B1YmxpYy5yZWNlaXZlX3NpZ25hbCh0YXJnZXQuZG93bnN0cmVhbVtpXSx0YXJnZXQuaWQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG4vKipcbiogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG4qIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtzdHJpbmd9IHByb3BOYW1lICAgICAgICAgIFRoZSBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBhcnJheSB0byBidWJibGUgdXBcbiogQHBhcmFtIHtmdW5jdGlvbn0gZm4gICAgICAgICAgICAgIFRoZSB0ZXN0IGNhbGxiYWNrIHRvIGJlIGFwcGxpZWQgdG8gZWFjaCBvYmplY3RcbiogQHBhcmFtIHthcnJheX0gYnJlYWRjcnVtYiAgICAgICAgIFRoZSBicmVhZGNydW1iIHRocm91Z2ggdGhlIGNoYWluIG9mIHRoZSBmaXJzdCBtYXRjaFxuKiBAcmV0dXJucyB7bWl4ZWR9XG4qL1xuX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24ob2JqLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpe1xuXG4gICAgaWYodHlwZW9mIGJyZWFkY3J1bWIgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgYnJlYWRjcnVtYiA9IFtvYmouaWRdO1xuICAgIH1cblxuICAgIHZhciByMTtcblxuICAgIGZvcih2YXIgaSBpbiBvYmpbcHJvcE5hbWVdKXtcblxuICAgICAgICAvL1JVTiBURVNUXG4gICAgICAgIHIxID0gZm4ob2JqW3Byb3BOYW1lXVtpXSk7XG5cbiAgICAgICAgaWYocjEgIT09IGZhbHNlKXtcbiAgICAgICAgLy9NQVRDSCBSRVRVUk5FRC4gUkVDVVJTRSBJTlRPIE1BVENIIElGIEhBUyBQUk9QRVJUWSBPRiBTQU1FIE5BTUUgVE8gU0VBUkNIXG4gICAgICAgICAgICAvL0NIRUNLIFRIQVQgV0UgQVJFTidUIENBVUdIVCBJTiBBIENJUkNVTEFSIExPT1BcbiAgICAgICAgICAgIGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgICAgICAgXCJDaXJjdWxhciBjb25kaXRpb24gaW4gcmVjdXJzaXZlIHNlYXJjaCBvZiBvYmogcHJvcGVydHkgJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICArcHJvcE5hbWUrXCInIG9mIG9iamVjdCBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgKygodHlwZW9mIG9iai5pZCAhPT0gJ3VuZGVmaW5lZCcpID8gXCInXCIrb2JqLmlkK1wiJ1wiIDogJycpXG4gICAgICAgICAgICAgICAgICAgICAgICArXCIuIE9mZmVuZGluZyB2YWx1ZTogXCIrcjFcbiAgICAgICAgICAgICAgICAgICAgLChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBicmVhZGNydW1iLmpvaW4oXCIgW2RlcGVuZHMgb25dPT4gXCIpO1xuICAgICAgICAgICAgICAgICAgICB9KSgpXG4gICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFkY3J1bWIucHVzaChyMSk7XG5cbiAgICAgICAgICAgIGlmKG9ialtwcm9wTmFtZV1baV1bcHJvcE5hbWVdKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KG9ialtwcm9wTmFtZV1baV0scHJvcE5hbWUsZm4sYnJlYWRjcnVtYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gYnJlYWRjcnVtYjtcbn07XG5cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHByb21pc2UgZGVzY3JpcHRpb24gaW50byBhIHByb21pc2UuXG4gKlxuICogQHBhcmFtIHt0eXBlfSBvYmpcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbl9wdWJsaWMuY29udmVydF90b19wcm9taXNlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMpe1xuXG4gICAgb2JqLmlkID0gb2JqLmlkIHx8IG9wdGlvbnMuaWQ7XG5cbiAgICAvL0F1dG9uYW1lXG4gICAgaWYgKCFvYmouaWQpIHtcbiAgICAgIGlmIChvYmoudHlwZSA9PT0gJ3RpbWVyJykge1xuICAgICAgICBvYmouaWQgPSBcInRpbWVyLVwiICsgb2JqLnRpbWVvdXQgKyBcIi1cIiArICgrK0NvbmZpZy5pKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmoudXJsID09PSAnc3RyaW5nJykge1xuICAgICAgICBvYmouaWQgPSBvYmoudXJsLnNwbGl0KFwiL1wiKS5wb3AoKTtcbiAgICAgICAgLy9SRU1PVkUgLmpzIEZST00gSURcbiAgICAgICAgaWYgKG9iai5pZC5zZWFyY2goXCIuanNcIikgIT09IC0xKSB7XG4gICAgICAgICAgb2JqLmlkID0gb2JqLmlkLnNwbGl0KFwiLlwiKTtcbiAgICAgICAgICBvYmouaWQucG9wKCk7XG4gICAgICAgICAgb2JqLmlkID0gb2JqLmlkLmpvaW4oXCIuXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9SZXR1cm4gaWYgYWxyZWFkeSBleGlzdHNcbiAgICBpZihDb25maWcubGlzdFtvYmouaWRdICYmIG9iai50eXBlICE9PSAndGltZXInKXtcbiAgICAgIC8vQSBwcmV2aW91cyBwcm9taXNlIG9mIHRoZSBzYW1lIGlkIGV4aXN0cy5cbiAgICAgIC8vTWFrZSBzdXJlIHRoaXMgZGVwZW5kZW5jeSBvYmplY3QgZG9lc24ndCBoYXZlIGFcbiAgICAgIC8vcmVzb2x2ZXIgLSBpZiBpdCBkb2VzIGVycm9yXG4gICAgICBpZihvYmoucmVzb2x2ZXIpe1xuICAgICAgICBDb25maWcuZGVidWcoW1xuICAgICAgICAgIFwiWW91IGNhbid0IHNldCBhIHJlc29sdmVyIG9uIGEgcXVldWUgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkLiBZb3UgY2FuIG9ubHkgcmVmZXJlbmNlIHRoZSBvcmlnaW5hbC5cIlxuICAgICAgICAgICxcIkRldGVjdGVkIHJlLWluaXQgb2YgJ1wiICsgb2JqLmlkICsgXCInLlwiXG4gICAgICAgICAgLFwiQXR0ZW1wdGVkOlwiXG4gICAgICAgICAgLG9ialxuICAgICAgICAgICxcIkV4aXN0aW5nOlwiXG4gICAgICAgICAgLENvbmZpZy5saXN0W29iai5pZF1cbiAgICAgICAgXSk7XG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICByZXR1cm4gQ29uZmlnLmxpc3Rbb2JqLmlkXTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vQ29udmVydCBkZXBlbmRlbmN5IHRvIGFuIGluc3RhbmNlXG4gICAgdmFyIGRlZjtcbiAgICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAgICAgLy9FdmVudFxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAnZXZlbnQnKTpcbiAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMud3JhcF9ldmVudChvYmopO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3F1ZXVlJyk6XG4gICAgICAgICAgICB2YXIgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyk7XG4gICAgICAgICAgICBkZWYgPSBRdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAvL0FscmVhZHkgYSB0aGVuYWJsZVxuICAgICAgICBjYXNlKHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cbiAgICAgICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAgICAgIC8vUmVmZXJlbmNlIHRvIGFuIGV4aXN0aW5nIGluc3RhbmNlXG4gICAgICAgICAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLmlkID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIidcIitvYmouaWQgK1wiJzogZGlkIG5vdCBleGlzdC4gQXV0byBjcmVhdGluZyBuZXcgZGVmZXJyZWQuXCIpO1xuICAgICAgICAgICAgICAgICAgICBkZWYgPSBfcHVibGljLmRlZmVycmVkKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkIDogb2JqLmlkXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vSWYgb2JqZWN0IHdhcyBhIHRoZW5hYmxlLCByZXNvbHZlIHRoZSBuZXcgZGVmZXJyZWQgd2hlbiB0aGVuIGNhbGxlZFxuICAgICAgICAgICAgICAgICAgICBpZihvYmoudGhlbil7XG4gICAgICAgICAgICAgICAgICAgICAgb2JqLnRoZW4oZnVuY3Rpb24ocil7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZShyKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIC8vT0JKRUNUIFBST1BFUlRZIC5wcm9taXNlIEVYUEVDVEVEIFRPIFJFVFVSTiBBIFBST01JU0VcbiAgICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBvYmoucHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyk6XG4gICAgICAgICAgICAgICAgICAgIGlmKG9iai5zY29wZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYgPSBvYmoucHJvbWlzZS5jYWxsKG9iai5zY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iai5wcm9taXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAvL09iamVjdCBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgICAgICAgY2FzZShvYmoudGhlbik6XG4gICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iajtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vQ2hlY2sgaWYgaXMgYSB0aGVuYWJsZVxuICAgICAgICAgICAgaWYodHlwZW9mIGRlZiAhPT0gJ29iamVjdCcgfHwgIWRlZi50aGVuKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiRGVwZW5kZW5jeSBsYWJlbGVkIGFzIGEgcHJvbWlzZSBkaWQgbm90IHJldHVybiBhIHByb21pc2UuXCIsb2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICd0aW1lcicpOlxuICAgICAgICAgICAgZGVmID0gX3B1YmxpYy53cmFwX3RpbWVyKG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAvL0xvYWQgZmlsZVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgb2JqLnR5cGUgPSBvYmoudHlwZSB8fCBcImRlZmF1bHRcIjtcbiAgICAgICAgICAgIC8vSW5oZXJpdCBwYXJlbnQncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAgICBpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2Qpe1xuICAgICAgICAgICAgICBvYmouY3dkID0gb3B0aW9ucy5wYXJlbnQuY3dkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmID0gX3B1YmxpYy53cmFwX3hocihvYmopO1xuICAgIH1cblxuICAgIC8vSW5kZXggcHJvbWlzZSBieSBpZCBmb3IgZnV0dXJlIHJlZmVyZW5jaW5nXG4gICAgQ29uZmlnLmxpc3Rbb2JqLmlkXSA9IGRlZjtcblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogQHRvZG86IHJlZG8gdGhpc1xuICpcbiAqIENvbnZlcnRzIGEgcmVmZXJlbmNlIHRvIGEgRE9NIGV2ZW50IHRvIGEgcHJvbWlzZS5cbiAqIFJlc29sdmVkIG9uIGZpcnN0IGV2ZW50IHRyaWdnZXIuXG4gKlxuICogQHRvZG8gcmVtb3ZlIGpxdWVyeSBkZXBlbmRlbmN5XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9ialxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wdWJsaWMud3JhcF9ldmVudCA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG4gICAgdmFyIGRlZiA9IERlZmVycmVkKHtcbiAgICAgICAgaWQgOiBvYmouaWRcbiAgICB9KTtcblxuXG4gICAgaWYodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cbiAgICAgICAgaWYodHlwZW9mICQgIT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgdmFyIG1zZyA9ICd3aW5kb3cgYW5kIGRvY3VtZW50IGJhc2VkIGV2ZW50cyBkZXBlbmQgb24galF1ZXJ5JztcbiAgICAgICAgICAgIGRlZi5yZWplY3QobXNnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuICAgICAgICAgICAgICAgIGNhc2Uob2JqLmlkID09PSAncmVhZHknIHx8IG9iai5pZCA9PT0gJ0RPTUNvbnRlbnRMb2FkZWQnKTpcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZShvYmouaWQgPT09ICdsb2FkJyk6XG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKG9iai5pZCxcImJvZHlcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuX3B1YmxpYy53cmFwX3RpbWVyID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQoKTtcblxuICAgIChmdW5jdGlvbihkZWYpe1xuXG4gICAgICAgIHZhciBfc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIF9lbmQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIGRlZi5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBzdGFydCA6IF9zdGFydFxuICAgICAgICAgICAgICAgICxlbmQgOiBfZW5kXG4gICAgICAgICAgICAgICAgLGVsYXBzZWQgOiBfZW5kIC0gX3N0YXJ0XG4gICAgICAgICAgICAgICAgLHRpbWVvdXQgOiBvYmoudGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sb2JqLnRpbWVvdXQpO1xuXG4gICAgfShkZWYpKTtcblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlZmVycmVkIG9iamVjdCB0aGF0IGRlcGVuZHMgb24gdGhlIGxvYWRpbmcgb2YgYSBmaWxlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZXBcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuICovXG5fcHVibGljLndyYXBfeGhyID0gZnVuY3Rpb24oZGVwKXtcblxuICAgIHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcblxuICAgIHZhciByZXF1aXJlZCA9IFtcImlkXCIsXCJ1cmxcIl07XG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKXtcbiAgICAgIGlmKCFkZXBbcmVxdWlyZWRbaV1dKXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgXCJGaWxlIHJlcXVlc3RzIGNvbnZlcnRlZCB0byBwcm9taXNlcyByZXF1aXJlOiBcIiArIHJlcXVpcmVkW2ldXG4gICAgICAgICAgLFwiTWFrZSBzdXJlIHlvdSB3ZXJlbid0IGV4cGVjdGluZyBkZXBlbmRlbmN5IHRvIGFscmVhZHkgaGF2ZSBiZWVuIHJlc29sdmVkIHVwc3RyZWFtLlwiXG4gICAgICAgICAgLGRlcFxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL0lGIFBST01JU0UgRk9SIFRISVMgVVJMIEFMUkVBRFkgRVhJU1RTLCBSRVRVUk4gSVRcbiAgICBpZihDb25maWcubGlzdFtkZXAuaWRdKXtcbiAgICAgIHJldHVybiBDb25maWcubGlzdFtkZXAuaWRdO1xuICAgIH1cblxuICAgIC8vQ09OVkVSVCBUTyBERUZFUlJFRDpcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQoZGVwKTtcblxuICAgIGlmKHR5cGVvZiBGaWxlX2xvYWRlcltDb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICBGaWxlX2xvYWRlcltDb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdKGRlcC51cmwsZGVmLGRlcCk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBGaWxlX2xvYWRlcltDb25maWcuc2V0dGluZ3MubW9kZV1bJ2RlZmF1bHQnXShkZXAudXJsLGRlZixkZXApO1xuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG4vKipcbiogQSBcInNpZ25hbFwiIGhlcmUgY2F1c2VzIGEgcXVldWUgdG8gbG9vayB0aHJvdWdoIGVhY2ggaXRlbVxuKiBpbiBpdHMgdXBzdHJlYW0gYW5kIGNoZWNrIHRvIHNlZSBpZiBhbGwgYXJlIHJlc29sdmVkLlxuKlxuKiBTaWduYWxzIGNhbiBvbmx5IGJlIHJlY2VpdmVkIGJ5IGEgcXVldWUgaXRzZWxmIG9yIGFuIGluc3RhbmNlXG4qIGluIGl0cyB1cHN0cmVhbS5cbipcbiogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuKiBAcGFyYW0ge3N0cmluZ30gZnJvbV9pZFxuKiBAcmV0dXJucyB7dm9pZH1cbiovXG5fcHVibGljLnJlY2VpdmVfc2lnbmFsID0gZnVuY3Rpb24odGFyZ2V0LGZyb21faWQpe1xuXG4gICAgaWYodGFyZ2V0LmhhbHRfcmVzb2x1dGlvbiA9PT0gMSkgcmV0dXJuO1xuXG4gICAvL01BS0UgU1VSRSBUSEUgU0lHTkFMIFdBUyBGUk9NIEEgUFJPTUlTRSBCRUlORyBMSVNURU5FRCBUT1xuICAgLy9CVVQgQUxMT1cgU0VMRiBTVEFUVVMgQ0hFQ0tcbiAgIGlmKGZyb21faWQgIT09IHRhcmdldC5pZCAmJiAhdGFyZ2V0LnVwc3RyZWFtW2Zyb21faWRdKXtcbiAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKGZyb21faWQgKyBcIiBjYW4ndCBzaWduYWwgXCIgKyB0YXJnZXQuaWQgKyBcIiBiZWNhdXNlIG5vdCBpbiB1cHN0cmVhbS5cIik7XG4gICB9XG4gICAvL1JVTiBUSFJPVUdIIFFVRVVFIE9GIE9CU0VSVklORyBQUk9NSVNFUyBUTyBTRUUgSUYgQUxMIERPTkVcbiAgIGVsc2V7XG4gICAgICAgdmFyIHN0YXR1cyA9IDE7XG4gICAgICAgZm9yKHZhciBpIGluIHRhcmdldC51cHN0cmVhbSl7XG4gICAgICAgICAgIC8vU0VUUyBTVEFUVVMgVE8gMCBJRiBBTlkgT0JTRVJWSU5HIEhBVkUgRkFJTEVELCBCVVQgTk9UIElGIFBFTkRJTkcgT1IgUkVTT0xWRURcbiAgICAgICAgICAgaWYodGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlICE9PSAxKSB7XG4gICAgICAgICAgICAgICBzdGF0dXMgPSB0YXJnZXQudXBzdHJlYW1baV0uc3RhdGU7XG4gICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgfVxuICAgICAgIH1cbiAgIH1cblxuICAgLy9SRVNPTFZFIFFVRVVFIElGIFVQU1RSRUFNIEZJTklTSEVEXG4gICBpZihzdGF0dXMgPT09IDEpe1xuXG4gICAgICAgIC8vR0VUIFJFVFVSTiBWQUxVRVMgUEVSIERFUEVOREVOQ0lFUywgV0hJQ0ggU0FWRVMgT1JERVIgQU5EXG4gICAgICAgIC8vUkVQT1JUUyBEVVBMSUNBVEVTXG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpIGluIHRhcmdldC5kZXBlbmRlbmNpZXMpe1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godGFyZ2V0LmRlcGVuZGVuY2llc1tpXS52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXQucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpO1xuICAgfVxuXG4gICBpZihzdGF0dXMgPT09IDIpe1xuICAgICAgIHZhciBlcnIgPSBbXG4gICAgICAgICAgIHRhcmdldC5pZCtcIiBkZXBlbmRlbmN5ICdcIit0YXJnZXQudXBzdHJlYW1baV0uaWQgKyBcIicgd2FzIHJlamVjdGVkLlwiXG4gICAgICAgICAgICx0YXJnZXQudXBzdHJlYW1baV0uYXJndW1lbnRzXG4gICAgICAgXTtcbiAgICAgICB0YXJnZXQucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpO1xuICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwiLyoqXG4gKiBEZWZhdWx0IHByb3BlcnRpZXMgZm9yIGFsbCBkZWZlcnJlZCBvYmplY3RzLlxuICogQGlnbm9yZVxuICovXG5cbnZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wdWJsaWMgPSB7fTtcblxuX3B1YmxpYy5pc19vcmd5ID0gdHJ1ZTtcblxuX3B1YmxpYy5pZCA9IG51bGw7XG5cbi8vQSBDT1VOVEVSIEZPUiBBVVQwLUdFTkVSQVRFRCBQUk9NSVNFIElEJ1Ncbl9wdWJsaWMuc2V0dGxlZCA9IDA7XG5cbi8qKlxuICogU1RBVEUgQ09ERVM6XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS1cbiAqIC0xICAgPT4gU0VUVExJTkcgW0VYRUNVVElORyBDQUxMQkFDS1NdXG4gKiAgMCAgID0+IFBFTkRJTkdcbiAqICAxICAgPT4gUkVTT0xWRUQgLyBGVUxGSUxMRURcbiAqICAyICAgPT4gUkVKRUNURURcbiAqL1xuX3B1YmxpYy5zdGF0ZSA9IDA7XG5cbl9wdWJsaWMudmFsdWUgPSBbXTtcblxuLy9UaGUgbW9zdCByZWNlbnQgdmFsdWUgZ2VuZXJhdGVkIGJ5IHRoZSB0aGVuLT5kb25lIGNoYWluLlxuX3B1YmxpYy5jYWJvb3NlID0gbnVsbDtcblxuX3B1YmxpYy5tb2RlbCA9IFwiZGVmZXJyZWRcIjtcblxuX3B1YmxpYy5kb25lX2ZpcmVkID0gMDtcblxuX3B1YmxpYy50aW1lb3V0X2lkID0gbnVsbDtcblxuX3B1YmxpYy5jYWxsYmFja19zdGF0ZXMgPSB7XG4gIHJlc29sdmUgOiAwXG4gICx0aGVuIDogMFxuICAsZG9uZSA6IDBcbiAgLHJlamVjdCA6IDBcbn07XG5cbi8qKlxuICogU2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBjYWxsYmFjayBldmVudFxuICogbGlzdC5cbiAqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIHByb3BlcnR5TmFtZXMgYXNcbiAqIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzOiBhZGRpbmcgYm9pbGVycGxhdGVcbiAqIHByb3BlcnRpZXMgZm9yIGVhY2hcbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5fcHVibGljLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG4gIHZhciBvID0ge307XG5cbiAgZm9yKHZhciBpIGluIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzKXtcbiAgICBvW2ldID0ge1xuICAgICAgdHJhaW4gOiBbXVxuICAgICAgLGhvb2tzIDoge1xuICAgICAgICBvbkJlZm9yZSA6IHtcbiAgICAgICAgICB0cmFpbiA6IFtdXG4gICAgICAgIH1cbiAgICAgICAgLG9uQ29tcGxldGUgOiB7XG4gICAgICAgICAgdHJhaW4gOiBbXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBvO1xufSkoKTtcblxuLy9QUk9NSVNFIEhBUyBPQlNFUlZFUlMgQlVUIERPRVMgTk9UIE9CU0VSVkUgT1RIRVJTXG5fcHVibGljLmRvd25zdHJlYW0gPSB7fTtcblxuX3B1YmxpYy5leGVjdXRpb25faGlzdG9yeSA9IFtdO1xuXG4vL1dIRU4gVFJVRSwgQUxMT1dTIFJFLUlOSVQgW0ZPUiBVUEdSQURFUyBUTyBBIFFVRVVFXVxuX3B1YmxpYy5vdmVyd3JpdGFibGUgPSAwO1xuXG5cbi8qKlxuICogRGVmYXVsdCB0aW1lb3V0IGZvciBhIGRlZmVycmVkXG4gKiBAdHlwZSBudW1iZXJcbiAqL1xuX3B1YmxpYy50aW1lb3V0ID0gQ29uZmlnLnNldHRpbmdzLnRpbWVvdXQ7XG5cbi8qKlxuICogUkVNT1RFXG4gKlxuICogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcbiAqXG4gKiBSRU1PVEUgPT0gMCAgPT4gIFJlYWQgZmlsZSBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtXG4gKlxuICogT05MWSBBUFBMSUVTIFRPIFNDUklQVFMgUlVOIFVOREVSIE5PREUgQVMgQlJPV1NFUiBIQVMgTk9cbiAqIEZJTEVTWVNURU0gQUNDRVNTXG4gKi9cbl9wdWJsaWMucmVtb3RlID0gMTtcblxuLy9BRERTIFRPIE1BU1RFUiBMSVNULiBBTFdBWVMgVFJVRSBVTkxFU1MgVVBHUkFESU5HIEEgUFJPTUlTRSBUTyBBIFFVRVVFXG5fcHVibGljLmxpc3QgPSAxO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGRlZmVycmVkL3F1ZXVlLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG4gKiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZXNvbHZlXG4gKlxuICogQHBhcmFtIHttaXhlZH0gdmFsdWUgUmVzb2x2ZXIgdmFsdWUuXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuICovXG5fcHVibGljLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbiAgaWYodGhpcy5zZXR0bGVkID09PSAxKXtcbiAgICBDb25maWcuZGVidWcoW1xuICAgICAgdGhpcy5pZCArIFwiIGNhbid0IHJlc29sdmUuXCJcbiAgICAgICxcIk9ubHkgdW5zZXR0bGVkIGRlZmVycmVkcyBhcmUgcmVzb2x2YWJsZS5cIlxuICAgIF0pO1xuICB9XG5cbiAgLy9TRVQgU1RBVEUgVE8gU0VUVExFTUVOVCBJTiBQUk9HUkVTU1xuICBfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywtMSk7XG5cbiAgLy9TRVQgVkFMVUVcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuXG4gIC8vUlVOIFJFU09MVkVSIEJFRk9SRSBQUk9DRUVESU5HXG4gIC8vRVZFTiBJRiBUSEVSRSBJUyBOTyBSRVNPTFZFUiwgU0VUIElUIFRPIEZJUkVEIFdIRU4gQ0FMTEVEXG4gIGlmKCF0aGlzLnJlc29sdmVyX2ZpcmVkICYmIHR5cGVvZiB0aGlzLnJlc29sdmVyID09PSAnZnVuY3Rpb24nKXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgcmVzb2x2ZXIgdG8gcmVzb2x2ZSB0cmFpblxuICAgIHRyeXtcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnJlc29sdmUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnJlc29sdmVyKHZhbHVlLHRoaXMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNhdGNoKGUpe1xuICAgICAgZGVidWdnZXI7XG4gICAgfVxuICB9XG4gIGVsc2V7XG5cbiAgICB0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuICAgIC8vQWRkIHNldHRsZSB0byByZXNvbHZlIHRyYWluXG4gICAgLy9BbHdheXMgc2V0dGxlIGJlZm9yZSBhbGwgb3RoZXIgY29tcGxldGUgY2FsbGJhY2tzXG4gICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnVuc2hpZnQoZnVuY3Rpb24oKXtcbiAgICAgIF9wcml2YXRlLnNldHRsZSh0aGlzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vUnVuIHJlc29sdmVcbiAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgIHRoaXNcbiAgICAsdGhpcy5jYWxsYmFja3MucmVzb2x2ZVxuICAgICx0aGlzLnZhbHVlXG4gICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICApO1xuXG4gIC8vcmVzb2x2ZXIgaXMgZXhwZWN0ZWQgdG8gY2FsbCByZXNvbHZlIGFnYWluXG4gIC8vYW5kIHRoYXQgd2lsbCBnZXQgdXMgcGFzdCB0aGlzIHBvaW50XG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFJlamVjdHMgYSBkZWZlcnJlZC9xdWV1ZVxuICpcbiAqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG4gKiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNyZWplY3RcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gZXJyIEVycm9yIGluZm9ybWF0aW9uLlxuICogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuICovXG5fcHVibGljLnJlamVjdCA9IGZ1bmN0aW9uKGVycil7XG5cbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbiAgaWYoIShlcnIgaW5zdGFuY2VvZiBBcnJheSkpe1xuICAgIGVyciA9IFtlcnJdO1xuICB9XG5cbiAgdmFyIG1zZyA9IFwiUmVqZWN0ZWQgXCIrdGhpcy5tb2RlbCtcIjogJ1wiK3RoaXMuaWQrXCInLlwiXG5cbiAgaWYoQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuICAgIGVyci51bnNoaWZ0KG1zZyk7XG4gICAgQ29uZmlnLmRlYnVnKGVycix0aGlzKTtcbiAgfVxuICBlbHNle1xuICAgIG1zZyA9IG1zZyArIFwiIFR1cm4gb24gZGVidWcgbW9kZSBmb3IgbW9yZSBpbmZvLlwiO1xuICAgIGNvbnNvbGUud2Fybihtc2cpO1xuICB9XG5cbiAgLy9SZW1vdmUgYXV0byB0aW1lb3V0IHRpbWVyXG4gIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gIH1cblxuICAvL1NldCBzdGF0ZSB0byByZWplY3RlZFxuICBfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywyKTtcblxuICAvL0V4ZWN1dGUgcmVqZWN0aW9uIHF1ZXVlXG4gIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICB0aGlzXG4gICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICxlcnJcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogQ2hhaW4gbWV0aG9kXG5cbiA8Yj5Vc2FnZTo8L2I+XG4gYGBgXG4gdmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcbiAgICAgICAgcSA9IE9yZ3kuZGVmZXJyZWQoe1xuICAgICAgICAgIGlkIDogXCJxMVwiXG4gICAgICAgIH0pO1xuXG4gLy9SZXNvbHZlIHRoZSBkZWZlcnJlZFxuIHEucmVzb2x2ZShcIlNvbWUgdmFsdWUuXCIpO1xuXG4gcS50aGVuKGZ1bmN0aW9uKHIpe1xuICBjb25zb2xlLmxvZyhyKTsgLy9Tb21lIHZhbHVlLlxuIH0pXG5cbiBgYGBcblxuICogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcbiAqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3RoZW5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvblxuICogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG4gKi9cbl9wdWJsaWMudGhlbiA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAvL0FuIGVycm9yIHdhcyBwcmV2aW91c2x5IHRocm93biwgYWRkIHJlamVjdG9yICYgYmFpbCBvdXRcbiAgICBjYXNlKHRoaXMuc3RhdGUgPT09IDIpOlxuICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICAvL0V4ZWN1dGlvbiBjaGFpbiBhbHJlYWR5IGZpbmlzaGVkLiBCYWlsIG91dC5cbiAgICBjYXNlKHRoaXMuZG9uZV9maXJlZCA9PT0gMSk6XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKHRoaXMuaWQrXCIgY2FuJ3QgYXR0YWNoIC50aGVuKCkgYmVjYXVzZSAuZG9uZSgpIGhhcyBhbHJlYWR5IGZpcmVkLCBhbmQgdGhhdCBtZWFucyB0aGUgZXhlY3V0aW9uIGNoYWluIGlzIGNvbXBsZXRlLlwiKTtcblxuICAgIGRlZmF1bHQ6XG5cbiAgICAgIC8vUHVzaCBjYWxsYmFjayB0byB0aGVuIHF1ZXVlXG4gICAgICB0aGlzLmNhbGxiYWNrcy50aGVuLnRyYWluLnB1c2goZm4pO1xuXG4gICAgICAvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWVcbiAgICAgIGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG4gICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEgJiYgdGhpcy5zdGF0ZSA9PT0gMSAmJiAhdGhpcy5kb25lX2ZpcmVkKXtcbiAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgIHRoaXNcbiAgICAgICAgICAsdGhpcy5jYWxsYmFja3MudGhlblxuICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcbiAgICAgIGVsc2V7fVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogRG9uZSBjYWxsYmFjay5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuICogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjZG9uZVxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSByZWplY3RvciBSZWplY3Rpb24gY2FsbGJhY2sgZnVuY3Rpb25cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG4gKi9cbl9wdWJsaWMuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLmxlbmd0aCA9PT0gMFxuICAgICAmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuICAgICAgaWYodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKXtcblxuICAgICAgICAvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG4gICAgICAgIHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG4gICAgICAgICAgLy9Eb25lIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLCBzbyBub3RlIHRoYXQgaXQgaGFzIGJlZW5cbiAgICAgICAgICBkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuICAgICAgICAgIGZuKHIsZGVmZXJyZWQsbGFzdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cbiAgICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcbiAgICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgICAgICAgIGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuICAgICAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgICB0aGlzXG4gICAgICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy5kb25lXG4gICAgICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgdGhpc1xuICAgICAgICAgICAgICAsdGhpcy5jYWxsYmFja3MucmVqZWN0XG4gICAgICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuICAgICAgICBlbHNle31cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJkb25lKCkgbXVzdCBiZSBwYXNzZWQgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcImRvbmUoKSBjYW4gb25seSBiZSBjYWxsZWQgb25jZS5cIik7XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cbl9wdWJsaWMuYnJvd3NlciA9IHt9LFxuX3B1YmxpYy5uYXRpdmUgPSB7fSxcbl9wcml2YXRlLm5hdGl2ZSA9IHt9O1xuXG4vL0Jyb3dzZXIgbG9hZFxuXG5fcHVibGljLmJyb3dzZXIuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cbiAgdmFyIGhlYWQgPSAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuXG4gIGVsZW0uc2V0QXR0cmlidXRlKFwiaHJlZlwiLHBhdGgpO1xuICBlbGVtLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpO1xuICBlbGVtLnNldEF0dHJpYnV0ZShcInJlbFwiLFwic3R5bGVzaGVldFwiKTtcblxuICBpZihlbGVtLm9ubG9hZCl7XG4gICAgKGZ1bmN0aW9uKGVsZW0scGF0aCxkZWZlcnJlZCl7XG4gICAgICAgIGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuICAgICAgIH07XG5cbiAgICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJGYWlsZWQgdG8gbG9hZCBwYXRoOiBcIiArIHBhdGgpO1xuICAgICAgIH07XG5cbiAgICB9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG4gICAgaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbiAgfVxuICBlbHNle1xuICAgIC8vQUREIGVsZW0gQlVUIE1BS0UgWEhSIFJFUVVFU1QgVE8gQ0hFQ0sgRklMRSBSRUNFSVZFRFxuICAgIGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgY29uc29sZS53YXJuKFwiTm8gb25sb2FkIGF2YWlsYWJsZSBmb3IgbGluayB0YWcsIGF1dG9yZXNvbHZpbmcuXCIpO1xuICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG4gIH1cbn1cblxuX3B1YmxpYy5icm93c2VyLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG4gIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgZWxlbS50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwic3JjXCIscGF0aCk7XG5cbiAgKGZ1bmN0aW9uKGVsZW0scGF0aCxkZWZlcnJlZCl7XG4gICAgICBlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgLy9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG4gICAgICAgIGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgICAgIHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCh0eXBlb2YgZWxlbS52YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpID8gZWxlbS52YWx1ZSA6IGVsZW0pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcbiAgICAgIH07XG4gIH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cbiAgdGhpcy5oZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xufVxuXG5fcHVibGljLmJyb3dzZXIuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICB0aGlzLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCxvcHRpb25zKXtcbiAgdmFyIHIsXG4gIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICByZXEub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cbiAgKGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICBpZihyZXEuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgIHIgPSByZXEucmVzcG9uc2VUZXh0O1xuICAgICAgICAgIGlmKG9wdGlvbnMudHlwZSAmJiBvcHRpb25zLnR5cGUgPT09ICdqc29uJyl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIHIgPSBKU09OLnBhcnNlKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgIF9wdWJsaWMuZGVidWcoW1xuICAgICAgICAgICAgICAgIFwiQ291bGQgbm90IGRlY29kZSBKU09OXCJcbiAgICAgICAgICAgICAgICAscGF0aFxuICAgICAgICAgICAgICAgICxyXG4gICAgICAgICAgICAgIF0sZGVmZXJyZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0ocGF0aCxkZWZlcnJlZCkpO1xuXG4gIHJlcS5zZW5kKG51bGwpO1xufVxuXG5cblxuLy9OYXRpdmUgbG9hZFxuXG5fcHVibGljLm5hdGl2ZS5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgX3B1YmxpYy5icm93c2VyLmNzcyhwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5uYXRpdmUuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIC8vbG9jYWwgcGFja2FnZVxuICBpZihwYXRoWzBdPT09Jy4nKXtcbiAgICBwYXRoID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoLGRlZmVycmVkKTtcbiAgICB2YXIgciA9IHJlcXVpcmUocGF0aCk7XG4gICAgLy9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG4gICAgaWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICB8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgIH1cbiAgfVxuICAvL3JlbW90ZSBzY3JpcHRcbiAgZWxzZXtcbiAgICAvL0NoZWNrIHRoYXQgd2UgaGF2ZSBjb25maWd1cmVkIHRoZSBlbnZpcm9ubWVudCB0byBhbGxvdyB0aGlzLFxuICAgIC8vYXMgaXQgcmVwcmVzZW50cyBhIHNlY3VyaXR5IHRocmVhdCBhbmQgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgZGVidWdnaW5nXG4gICAgaWYoIUNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtfXG4gICAgICBDb25maWcuZGVidWcoXCJTZXQgY29uZmlnLmRlYnVnX21vZGU9MSB0byBydW4gcmVtb3RlIHNjcmlwdHMgb3V0c2lkZSBvZiBkZWJ1ZyBtb2RlLlwiKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgdmFyIFZtID0gcmVxdWlyZSgndm0nKTtcbiAgICAgICAgciA9IFZtLnJ1bkluVGhpc0NvbnRleHQoZGF0YSk7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuX3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLm5hdGl2ZS5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIChmdW5jdGlvbihkZWZlcnJlZCl7XG4gICAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKHIpe1xuICAgICAgaWYoZGVmZXJyZWQudHlwZSA9PT0gJ2pzb24nKXtcbiAgICAgICAgciA9IEpTT04ucGFyc2Uocik7XG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgIH0pXG4gIH0pKGRlZmVycmVkKVxufVxuXG5fcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuICBwYXRoID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoKTtcbiAgaWYocGF0aFswXSA9PT0gJy4nKXtcbiAgICAvL2ZpbGUgc3lzdGVtXG4gICAgdmFyIEZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICBGcy5yZWFkRmlsZShwYXRoLCBcInV0Zi04XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIGNhbGxiYWNrKGRhdGEpO1xuICAgIH0pO1xuICB9XG4gIGVsc2V7XG4gICAgLy9odHRwXG4gICAgdmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG4gICAgcmVxdWVzdChwYXRoLGZ1bmN0aW9uKGVycm9yLHJlc3BvbnNlLGJvZHkpe1xuICAgICAgaWYgKCFlcnJvciAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICBjYWxsYmFjayhib2R5KTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH0pXG4gIH1cbn1cblxuX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aCA9IGZ1bmN0aW9uKHApe1xuICBwID0gKHBbMF0gIT09ICcvJyAmJiBwWzBdICE9PSAnLicpXG4gID8gKChwWzBdLmluZGV4T2YoXCJodHRwXCIpIT09MCkgPyAnLi8nICsgcCA6IHApIDogcDtcbiAgcmV0dXJuIHA7XG59XG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBEZWZlcnJlZFNjaGVtYSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuc2NoZW1hLmpzJyk7XG52YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpO1xudmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9xdWV1ZS5wcml2YXRlLmpzJyk7XG5cbi8qKlxuICogQG5hbWVzcGFjZSBvcmd5L3F1ZXVlXG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3RoZW4gYXMgI3RoZW5cbiAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjZG9uZSBhcyAjZG9uZVxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNyZWplY3QgYXMgI3JlamVjdFxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNyZXNvbHZlIGFzICNyZXNvbHZlXG4gKlxuKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHF1ZXVlIG9iamVjdC5cbiAqIElmIG5vIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgc2V0LCByZXNvbHZlZCB3aGVuIGFsbCBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkLiBFbHNlLCByZXNvbHZlZCB3aGVuIHRoZSBkZWZlcnJlZCBwYXJhbSBwYXNzZWQgdG8gdGhlIHJlc29sdmVyIG9wdGlvblxuICogaXMgcmVzb2x2ZWQuXG5cbiA8Yj5Vc2FnZTo8L2I+XG4gYGBgXG4gdmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcbiAgICAgICAgcSA9IE9yZ3kucXVldWUoW1xuICAgICAgICAgICB7XG4gICAgICAgICAgICAgY29tbWVudCA6IFwiVGhpcyBpcyBhIG5lc3RlZCBxdWV1ZSBjcmVhdGVkIG9uIHRoZSBmbHkuXCJcbiAgICAgICAgICAgICAsdHlwZSA6IFwianNvblwiXG4gICAgICAgICAgICAgLHVybCA6IFwiL2FwaS9qc29uL3NvbW51bXNcIlxuICAgICAgICAgICAgICxyZXNvbHZlciA6IGZ1bmN0aW9uKHIsZGVmZXJyZWQpe1xuICAgICAgICAgICAgICAgLy9GaWx0ZXIgb3V0IGV2ZW4gbnVtYmVyc1xuICAgICAgICAgICAgICAgdmFyIG9kZCA9IGFyci5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgICAgIHJldHVybiAwICE9IHZhbCAlIDI7XG4gICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUob2RkKTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICAgIF0se1xuICAgICAgICAgICBpZCA6IFwicTFcIixcbiAgICAgICAgICAgcmVzb2x2ZXIgOiBmdW5jdGlvbihyLGRlZmVycmVkKXtcbiAgICAgICAgICAgICB2YXIgcHJpbWVzID0gclswXS5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgICBoaWdoID0gTWF0aC5mbG9vcihNYXRoLnNxcnQodmFsKSkgKyAxO1xuICAgICAgICAgICAgICAgZm9yICh2YXIgZGl2ID0gMjsgZGl2IDw9IGhpZ2g7IGRpdisrKSB7XG4gICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAlIGRpdiA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByaW1lcyk7XG4gICAgICAgICAgIH0pXG4gICAgICAgICB9KTtcblxuIGBgYFxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBxdWV1ZVxuICpcbiAqIEBwYXJhbSB7YXJyYXl9IGRlcHMgQXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRoYXQgbXVzdCBiZSByZXNvbHZlZCBiZWZvcmUgPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBjYWxsZWQuXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAgTGlzdCBvZiBvcHRpb25zOlxuXG4tIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cbiAgLSBDYW4gYmUgdXNlZCB3aXRoIE9yZ3kuZ2V0KGlkKS5cbiAgLSBPcHRpb25hbC5cblxuXG4tIDxiPnRpbWVvdXQ8L2I+IHtudW1iZXJ9IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC5cbiAgLSBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQgWzUwMDBdLlxuICAtIE5vdGUgdGhlIHRpbWVvdXQgaXMgb25seSBhZmZlY3RlZCBieSBkZXBlbmRlbmNpZXMgYW5kL29yIHRoZSByZXNvbHZlciBjYWxsYmFjay5cbiAgLSBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuXG5cbi0gPGI+cmVzb2x2ZXI8L2I+IHtmdW5jdGlvbig8aT5yZXN1bHQ8L2k+LDxpPmRlZmVycmVkPC9pPil9IENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgYWZ0ZXIgYWxsIGRlcGVuZGVuY2llcyBoYXZlIHJlc29sdmVkLlxuICAtIDxpPnJlc3VsdDwvaT4gaXMgYW4gYXJyYXkgb2YgdGhlIHF1ZXVlJ3MgcmVzb2x2ZWQgZGVwZW5kZW5jeSB2YWx1ZXMuXG4gIC0gPGk+ZGVmZXJyZWQ8L2k+IGlzIHRoZSBxdWV1ZSBvYmplY3QuXG4gIC0gVGhlIHF1ZXVlIHdpbGwgb25seSByZXNvbHZlIHdoZW4gPGk+ZGVmZXJyZWQ8L2k+LnJlc29sdmUoKSBpcyBjYWxsZWQuIElmIG5vdCwgaXQgd2lsbCB0aW1lb3V0IHRvIG9wdGlvbnMudGltZW91dCB8fCBPcmd5LmNvbmZpZygpLnRpbWVvdXQuXG5cbiAgKiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9xdWV1ZX1cbiAqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGVwcyxvcHRpb25zKXtcblxuICB2YXIgX287XG4gIGlmKCEoZGVwcyBpbnN0YW5jZW9mIEFycmF5KSl7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuICBpZighQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXG4gICAgLy9QYXNzIGFycmF5IG9mIHByb3RvdHlwZXMgdG8gcXVldWUgZmFjdG9yeVxuICAgIHZhciBfbyA9IF9wcml2YXRlLmZhY3RvcnkoW0RlZmVycmVkU2NoZW1hLFF1ZXVlU2NoZW1hXSxbb3B0aW9uc10pO1xuXG4gICAgLy9BY3RpdmF0ZSBxdWV1ZVxuICAgIF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKTtcblxuICB9XG4gIC8vQUxSRUFEWSBFWElTVFNcbiAgZWxzZSB7XG5cbiAgICBfbyA9IENvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuXG4gICAgaWYoX28ubW9kZWwgIT09ICdxdWV1ZScpe1xuICAgIC8vTUFUQ0ggRk9VTkQgQlVUIE5PVCBBIFFVRVVFLCBVUEdSQURFIFRPIE9ORVxuXG4gICAgICBvcHRpb25zLm92ZXJ3cml0YWJsZSA9IDE7XG5cbiAgICAgIF9vID0gX3ByaXZhdGUudXBncmFkZShfbyxvcHRpb25zLGRlcHMpO1xuICAgIH1cbiAgICBlbHNle1xuXG4gICAgICAvL09WRVJXUklURSBBTlkgRVhJU1RJTkcgT1BUSU9OU1xuICAgICAgZm9yKHZhciBpIGluIG9wdGlvbnMpe1xuICAgICAgICBfb1tpXSA9IG9wdGlvbnNbaV07XG4gICAgICB9XG5cbiAgICAgIC8vQUREIEFERElUSU9OQUwgREVQRU5ERU5DSUVTIElGIE5PVCBSRVNPTFZFRFxuICAgICAgaWYoZGVwcy5sZW5ndGggPiAwKXtcbiAgICAgICAgX3ByaXZhdGUudHBsLmFkZC5jYWxsKF9vLGRlcHMpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLy9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuICAgIF9vLmhhbHRfcmVzb2x1dGlvbiA9ICh0eXBlb2Ygb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gIT09ICd1bmRlZmluZWQnKSA/XG4gICAgb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gOiAwO1xuICB9XG5cbiAgcmV0dXJuIF9vO1xufTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIFF1ZXVlU2NoZW1hID0gcmVxdWlyZSgnLi9xdWV1ZS5zY2hlbWEuanMnKTtcbnZhciBfcHJvdG8gPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcbnZhciBfcHVibGljID0gT2JqZWN0LmNyZWF0ZShfcHJvdG8se30pO1xuXG5cbi8qKlxuICogQWN0aXZhdGVzIGEgcXVldWUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHthcnJheX0gZGVwc1xuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xuX3B1YmxpYy5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG8sb3B0aW9ucyxkZXBzKXtcblxuICAgIC8vQUNUSVZBVEUgQVMgQSBERUZFUlJFRFxuICAgIC8vdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpO1xuICAgIG8gPSBfcHJvdG8uYWN0aXZhdGUobyk7XG5cbiAgICAvL0B0b2RvIHJldGhpbmsgdGhpc1xuICAgIC8vVGhpcyB0aW1lb3V0IGdpdmVzIGRlZmluZWQgcHJvbWlzZXMgdGhhdCBhcmUgZGVmaW5lZFxuICAgIC8vZnVydGhlciBkb3duIHRoZSBzYW1lIHNjcmlwdCBhIGNoYW5jZSB0byBkZWZpbmUgdGhlbXNlbHZlc1xuICAgIC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG4gICAgLy9yZW1vdGUgc291cmNlIGhlcmUuXG4gICAgLy9UaGlzIGlzIGltcG9ydGFudCBpbiB0aGUgY2FzZSBvZiBjb21waWxlZCBqcyBmaWxlcyB0aGF0IGNvbnRhaW5cbiAgICAvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuICAgIC8vdGVtcG9yYXJpbHkgY2hhbmdlIHN0YXRlIHRvIHByZXZlbnQgb3V0c2lkZSByZXNvbHV0aW9uXG4gICAgby5zdGF0ZSA9IC0xO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAvL1Jlc3RvcmUgc3RhdGVcbiAgICAgIG8uc3RhdGUgPSAwO1xuXG4gICAgICAvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcbiAgICAgIFF1ZXVlU2NoZW1hLmFkZC5jYWxsKG8sZGVwcyk7XG5cbiAgICAgIC8vU0VFIElGIENBTiBCRSBJTU1FRElBVEVMWSBSRVNPTFZFRCBCWSBDSEVDS0lORyBVUFNUUkVBTVxuICAgICAgc2VsZi5yZWNlaXZlX3NpZ25hbChvLG8uaWQpO1xuXG4gICAgICAvL0FTU0lHTiBUSElTIFFVRVVFIFVQU1RSRUFNIFRPIE9USEVSIFFVRVVFU1xuICAgICAgaWYoby5hc3NpZ24pe1xuICAgICAgICAgIGZvcih2YXIgYSBpbiBvLmFzc2lnbil7XG4gICAgICAgICAgICAgIHNlbGYuYXNzaWduKG8uYXNzaWduW2FdLFtvXSx0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfSwxKTtcblxuICAgIHJldHVybiBvO1xufTtcblxuXG4vKipcbiogVXBncmFkZXMgYSBwcm9taXNlIG9iamVjdCB0byBhIHF1ZXVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4qIEBwYXJhbSB7YXJyYXl9IGRlcHMgXFxkZXBlbmRlbmNpZXNcbiogQHJldHVybnMge29iamVjdH0gcXVldWUgb2JqZWN0XG4qL1xuX3B1YmxpYy51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cbiAgICBpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoJ0NhbiBvbmx5IHVwZ3JhZGUgdW5zZXR0bGVkIHByb21pc2Ugb3IgZGVmZXJyZWQgaW50byBhIHF1ZXVlLicpO1xuICAgIH1cblxuICAgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuICAgIHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIoW1xuICAgICAgICBRdWV1ZVNjaGVtYVxuICAgICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgZm9yKHZhciBpIGluIF9vKXtcbiAgICAgICBvYmpbaV0gPSBfb1tpXTtcbiAgICB9XG5cbiAgICAvL2RlbGV0ZSBfbztcblxuICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBRVUVVRVxuICAgIG9iaiA9IHRoaXMuYWN0aXZhdGUob2JqLG9wdGlvbnMsZGVwcyk7XG5cbiAgICAvL1JFVFVSTiBRVUVVRSBPQkpFQ1RcbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJvdG8gPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpO1xuXG4vL0V4dGVuZCBkZWZlcnJlZCBzY2hlbWFcbnZhciBfcHVibGljID0gT2JqZWN0LmNyZWF0ZShfcHJvdG8se30pO1xuXG5fcHVibGljLm1vZGVsID0gJ3F1ZXVlJztcblxuXG4vL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG5fcHVibGljLnJlc29sdmVyX2ZpcmVkID0gMDtcblxuXG4vL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuLy9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG4vL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcbl9wdWJsaWMuaGFsdF9yZXNvbHV0aW9uID0gMDtcblxuXG4vL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcbl9wdWJsaWMudXBzdHJlYW0gPSB7fTtcblxuXG4vL1VTRUQgUkVUVVJOIFZBTFVFUywgRU5TVVJFUyBPUkRFUlxuX3B1YmxpYy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiogQWRkIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIGEgcXVldWUncyB1cHN0cmVhbSBhcnJheS5cbipcbiogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG4qIHVwc3RyZWFtIGFycmF5IGFyZSByZXNvbHZlZC5cbipcbiogV2hlbiBfcHVibGljLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcbiogZGVwZW5kZW5jeSBpcyBub3QgcHJldmlvdXNseSBzY2hlZHVsZWQgdG8gcmVzb2x2ZVxuKiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcbiogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG4qXG4qIEBwYXJhbSB7YXJyYXl9IGFyciAgL2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcbiogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuKi9cbl9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL3F1ZXVlLnByaXZhdGUuanMnKTtcblxuICAgdHJ5e1xuICAgICAgIGlmKGFyci5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLnVwc3RyZWFtO1xuICAgfVxuICAgY2F0Y2goZXJyKXtcbiAgICAgICBDb25maWcuZGVidWcoZXJyKTtcbiAgIH1cblxuICAgLy9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFRPIEFERFxuICAgaWYodGhpcy5zdGF0ZSAhPT0gMCl7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgXCJDYW5ub3QgYWRkIGRlcGVuZGVuY3kgbGlzdCB0byBxdWV1ZSBpZDonXCIrdGhpcy5pZFxuICAgICAgICArXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCJcbiAgICAgIF0sYXJyLHRoaXMpO1xuICAgfVxuXG4gICBmb3IodmFyIGEgaW4gYXJyKXtcblxuICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAvL0NIRUNLIElGIEVYSVNUU1xuICAgICAgICAgICBjYXNlKHR5cGVvZiBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dID09PSAnb2JqZWN0Jyk6XG4gICAgICAgICAgICAgICBhcnJbYV0gPSBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dO1xuICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgLy9JRiBOT1QsIEFUVEVNUFQgVE8gQ09OVkVSVCBJVCBUTyBBTiBPUkdZIFBST01JU0VcbiAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdID09PSAnb2JqZWN0JyAmJiAoIWFyclthXS5pc19vcmd5KSk6XG4gICAgICAgICAgICAgICBhcnJbYV0gPSBfcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcbiAgICAgICAgICAgICAgICAgcGFyZW50IDogdGhpc1xuICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAvL1JFRiBJUyBBIFBST01JU0UuXG4gICAgICAgICAgIGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIik7XG4gICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGFyclthXSk7XG4gICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgIH1cblxuICAgICAgIC8vbXVzdCBjaGVjayB0aGUgdGFyZ2V0IHRvIHNlZSBpZiB0aGUgZGVwZW5kZW5jeSBleGlzdHMgaW4gaXRzIGRvd25zdHJlYW1cbiAgICAgICBmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcbiAgICAgICAgICAgaWYoYiA9PT0gYXJyW2FdLmlkKXtcbiAgICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcbiAgICAgICAgICAgICAgICArYXJyW2FdLmlkK1wiJyB0byBxdWV1ZVwiK1wiICdcIlxuICAgICAgICAgICAgICAgICt0aGlzLmlkK1wiJy5cXG4gUHJvbWlzZSBvYmplY3QgZm9yICdcIlxuICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcbiAgICAgICAgICAgICAgICArdGhpcy5pZCtcIicgc28gaXQgY2FuJ3QgYmUgYWRkZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAsdGhpcyk7XG4gICAgICAgICAgIH1cbiAgICAgICB9XG5cbiAgICAgICAvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG4gICAgICAgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuICAgICAgIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdID0gdGhpcztcbiAgICAgICB0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG4gICB9XG5cbiAgIHJldHVybiB0aGlzLnVwc3RyZWFtO1xufTtcblxuXG4vKipcbiogUmVtb3ZlIGxpc3QgZnJvbSBhIHF1ZXVlLlxuKlxuKiBAcGFyYW0ge2FycmF5fSBhcnJcbiogQHJldHVybnMge2FycmF5fSBhcnJheSBvZiBsaXN0IHRoZSBxdWV1ZSBpcyB1cHN0cmVhbVxuKi9cbl9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKXtcblxuICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG4gIH1cblxuICBmb3IodmFyIGEgaW4gYXJyKXtcbiAgICAgaWYodGhpcy51cHN0cmVhbVthcnJbYV0uaWRdKXtcbiAgICAgICAgZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcbiAgICAgICAgZGVsZXRlIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdO1xuICAgICB9XG4gIH1cbn07XG5cblxuLyoqXG4qIFJlc2V0cyBhbiBleGlzdGluZyxzZXR0bGVkIHF1ZXVlIGJhY2sgdG8gT3JneWluZyBzdGF0ZS5cbiogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cbiogRmFpbHMgaWYgbm90IHNldHRsZWQuXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4qIEByZXR1cm5zIHtfcHJpdmF0ZS50cGx8Qm9vbGVhbn1cbiovXG5fcHVibGljLnJlc2V0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbiAgaWYodGhpcy5zZXR0bGVkICE9PSAxIHx8IHRoaXMuc3RhdGUgIT09IDEpe1xuICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdGhpcy5zZXR0bGVkID0gMDtcbiAgdGhpcy5zdGF0ZSA9IDA7XG4gIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuICB0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG4gIC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICB9XG5cbiAgLy9DTEVBUiBPVVQgVEhFIERPV05TVFJFQU1cbiAgdGhpcy5kb3duc3RyZWFtID0ge307XG4gIHRoaXMuZGVwZW5kZW5jaWVzID0gW107XG5cbiAgLy9TRVQgTkVXIEFVVE8gVElNRU9VVFxuICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cbiAgLy9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG4gIC8vdGhpcy5jaGVja19zZWxmKClcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcbiogY2FuIGJlIHJlc29sdmVkLlxuKlxuKiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2Fkcyxcbiogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG4qXG4qIC1kZWJ1Z2dpbmdcbipcbiogLXRoZSBxdWV1ZSBoYXMgYmVlbiByZXNldCBhbmQgbm8gbmV3XG4qIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuKlxuKiBAcmV0dXJucyB7aW50fSBTdGF0ZSBvZiB0aGUgcXVldWUuXG4qL1xuX3B1YmxpYy5jaGVja19zZWxmID0gZnVuY3Rpb24oKXtcbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG4gIF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG4gIHJldHVybiB0aGlzLnN0YXRlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyksXG4gICAgQ2FzdCA9IHJlcXVpcmUoJy4vY2FzdC5qcycpLFxuICAgIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZpbmVcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH0gIGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBcbi0gPGI+ZGVwZW5kZW5jaWVzPC9iPiB7YXJyYXl9XG4tIDxiPnJlc29sdmVyPC9iPiB7ZnVuY3Rpb24oPGk+YXNzaWduZWRWYWx1ZTwvaT4sPGk+ZGVmZXJyZWQ8L2k+fVxuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBkZWZlcnJlZFxuKi9cbmRlZmluZSA6IGZ1bmN0aW9uKGlkLGRhdGEsb3B0aW9ucyl7XG5cbiAgICB2YXIgZGVmO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuZGVwZW5kZW5jaWVzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXMgfHwgbnVsbDtcbiAgICBvcHRpb25zLnJlc29sdmVyID0gb3B0aW9ucy5yZXNvbHZlciB8fCBudWxsO1xuXG4gICAgLy90ZXN0IGZvciBhIHZhbGlkIGlkXG4gICAgaWYodHlwZW9mIGlkICE9PSAnc3RyaW5nJyl7XG4gICAgICBDb25maWcuZGVidWcoXCJNdXN0IHNldCBpZCB3aGVuIGRlZmluaW5nIGFuIGluc3RhbmNlLlwiKTtcbiAgICB9XG5cbiAgICAvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG4gICAgaWYoQ29uZmlnLmxpc3RbaWRdICYmIENvbmZpZy5saXN0W2lkXS5zZXR0bGVkID09PSAxKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW4ndCBkZWZpbmUgXCIgKyBpZCArIFwiLiBBbHJlYWR5IHJlc29sdmVkLlwiKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmlkID0gaWQ7XG5cbiAgICBpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuICAgICAgJiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAvL0RlZmluZSBhcyBhIHF1ZXVlIC0gY2FuJ3QgYXV0b3Jlc29sdmUgYmVjYXVzZSB3ZSBoYXZlIGRlcHNcbiAgICAgIHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWYgPSBRdWV1ZShkZXBzLG9wdGlvbnMpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9EZWZpbmUgYXMgYSBkZWZlcnJlZFxuICAgICAgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAgIC8vVHJ5IHRvIGltbWVkaWF0ZWx5IHNldHRsZSBbZGVmaW5lXVxuICAgICAgaWYob3B0aW9ucy5yZXNvbHZlciA9PT0gbnVsbFxuICAgICAgICAmJiAodHlwZW9mIG9wdGlvbnMuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgICAgICB8fCBvcHRpb25zLmF1dG9yZXNvbHZlID09PSB0cnVlKSl7XG4gICAgICAgIC8vcHJldmVudCBmdXR1cmUgYXV0b3Jlc292ZSBhdHRlbXB0cyBbaS5lLiBmcm9tIHhociByZXNwb25zZV1cbiAgICAgICAgZGVmLmF1dG9yZXNvbHZlID0gZmFsc2U7XG4gICAgICAgIGRlZi5yZXNvbHZlKGRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59LFxuXG5cbi8qKlxuICogR2V0cyBhbiBleGlzaXRpbmcgZGVmZXJyZWQgLyBxdWV1ZSBvYmplY3QgZnJvbSBnbG9iYWwgc3RvcmUuXG4gKiBSZXR1cm5zIG51bGwgaWYgbm9uZSBmb3VuZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGdldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCBJZCBvZiBkZWZlcnJlZCBvciBxdWV1ZSBvYmplY3QuXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCB8IHF1ZXVlIHwgbnVsbFxuICovXG5nZXQgOiBmdW5jdGlvbihpZCl7XG4gIGlmKENvbmZpZy5saXN0W2lkXSl7XG4gICAgcmV0dXJuIENvbmZpZy5saXN0W2lkXTtcbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBudWxsO1xuICB9XG59LFxuXG5cbi8qKlxuICogQWRkL3JlbW92ZSBhbiB1cHN0cmVhbSBkZXBlbmRlbmN5IHRvL2Zyb20gYSBxdWV1ZS5cbiAqXG4gKiBDYW4gdXNlIGEgcXVldWUgaWQsIGV2ZW4gZm9yIGEgcXVldWUgdGhhdCBpcyB5ZXQgdG8gYmUgY3JlYXRlZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGFzc2lnblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGd0IFF1ZXVlIGlkIC8gcXVldWUgb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyICBBcnJheSBvZiBwcm9taXNlIGlkcyBvciBkZXBlbmRlbmN5IG9iamVjdHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkICBJZiB0cnVlIDxiPkFERDwvYj4gYXJyYXkgdG8gcXVldWUgZGVwZW5kZW5jaWVzLCBJZiBmYWxzZSA8Yj5SRU1PVkU8L2I+IGFycmF5IGZyb20gcXVldWUgZGVwZW5kZW5jaWVzXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSBxdWV1ZVxuICovXG5hc3NpZ24gOiBmdW5jdGlvbih0Z3QsYXJyLGFkZCl7XG5cbiAgICBhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMTtcblxuICAgIHZhciBpZCxxO1xuICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGd0LnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgaWQgPSB0Z3QuaWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICBpZCA9IHRndDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKTtcbiAgICB9XG5cbiAgICAvL0lGIFRBUkdFVCBBTFJFQURZIExJU1RFRFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0ubW9kZWwgPT09ICdxdWV1ZScpe1xuICAgICAgICBxID0gQ29uZmlnLmxpc3RbaWRdO1xuXG4gICAgICAgIC8vPT4gQUREIFRPIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgaWYoYWRkKXtcbiAgICAgICAgICAgIHEuYWRkKGFycik7XG4gICAgICAgIH1cbiAgICAgICAgLy89PiBSRU1PVkUgRlJPTSBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBxLnJlbW92ZShhcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBBTkQgQUREIERFUEVOREVOQ0lFU1xuICAgIGVsc2UgaWYoYWRkKXtcbiAgICAgICAgcSA9IFF1ZXVlKGFycix7XG4gICAgICAgICAgICBpZCA6IGlkXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvL0VSUk9SOiBDQU4nVCBSRU1PVkUgRlJPTSBBIFFVRVVFIFRIQVQgRE9FUyBOT1QgRVhJU1RcbiAgICBlbHNle1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBkZXBlbmRlbmNpZXMgZnJvbSBhIHF1ZXVlIHRoYXQgZG9lcyBub3QgZXhpc3QuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHE7XG59LFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xuZGVmZXJyZWQgOiBEZWZlcnJlZCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbnF1ZXVlIDogUXVldWUsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5jYXN0IDogQ2FzdCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbmNvbmZpZyA6IENvbmZpZy5jb25maWdcblxufTtcbiJdfQ==
