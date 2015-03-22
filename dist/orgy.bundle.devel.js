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
 * Creates a new deferred object.
 * @memberof orgy
 * @function deferred
 *
 * @param {object} options List of options:
 *  - {string} <b>id</b>  Unique id of the object. Can be used with Orgy.get(id). Optional.
 *
 *  - {number} <b>timeout</b> Time in ms after which reject is called. Defaults to Orgy.config().timeout [5000].
 *  Note the timeout is only affected by dependencies and/or the resolver callback.
 *  Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
 *
 * @returns {object} deferred
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
 *
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
 * Resolves a deferred.
 *
 * @param {mixed} value
 * @returns {void}
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


_public.then = function(fn,rejector){

  switch(true){

    //An error was previously thrown, bail out
    case(this.state === 2):
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
        this.run_train(
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
*
* @param {string} id A unique id you give to the object
* @param {mixed}  data The value that the object is assigned
* @param {object} options Passable options
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9kZWZlcnJlZC5wcml2YXRlLmpzIiwic3JjL2RlZmVycmVkLnNjaGVtYS5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9xdWV1ZS5wcml2YXRlLmpzIiwic3JjL3F1ZXVlLnNjaGVtYS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2p0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsbnVsbCwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpLFxuICAgIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG4vKipcbiAqIENhc3RzIGEgdGhlbmFibGUgb2JqZWN0IGludG8gYW4gT3JneSBkZWZlcnJlZCBvYmplY3QuXG4gKlxuICogPiBUbyBxdWFsaWZ5IGFzIGEgPGI+dGhlbmFibGU8L2I+LCB0aGUgb2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogPlxuICogPiAtIGlkXG4gKiA+XG4gKiA+IC0gdGhlbigpXG4gKiA+XG4gKiA+IC0gZXJyb3IoKVxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gY2FzdFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogQSB0aGVuYWJsZSB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqICAtIHtzdHJpbmd9IDxiPmlkPC9iPiAgVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG4gKlxuICogIC0ge2Z1bmN0aW9ufSA8Yj50aGVuPC9iPlxuICpcbiAqICAtIHtmdW5jdGlvbn0gPGI+ZXJyb3I8L2I+XG4gKlxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1widGhlblwiLFwiZXJyb3JcIixcImlkXCJdO1xuICAgIGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG4gICAgICBpZighb2JqW3JlcXVpcmVkW2ldXSl7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYXN0IG1ldGhvZCBtaXNzaW5nIHByb3BlcnR5ICdcIiArIHJlcXVpcmVkW2ldICtcIidcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICBvcHRpb25zLmlkID0gb2JqLmlkO1xuXG4gICAgLy9NYWtlIHN1cmUgaWQgZG9lcyBub3QgY29uZmxpY3Qgd2l0aCBleGlzdGluZ1xuICAgIGlmKENvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJJZCBcIitvcHRpb25zLmlkK1wiIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIGlkLlwiKVxuICAgIH1cblxuICAgIC8vQ3JlYXRlIGEgZGVmZXJyZWRcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAvL0NyZWF0ZSByZXNvbHZlclxuICAgIHZhciByZXNvbHZlciA9IGZ1bmN0aW9uKCl7XG4gICAgICBkZWYucmVzb2x2ZS5jYWxsKGRlZixhcmd1bWVudHNbMF0pO1xuICAgIH07XG5cbiAgICAvL1NldCBSZXNvbHZlclxuICAgIG9iai50aGVuKHJlc29sdmVyKTtcblxuICAgIC8vUmVqZWN0IGRlZmVycmVkIG9uIC5lcnJvclxuICAgIHZhciBlcnIgPSBmdW5jdGlvbihlcnIpe1xuICAgICAgZGVmLnJlamVjdChlcnIpO1xuICAgIH07XG4gICAgb2JqLmVycm9yKGVycik7XG5cbiAgICAvL1JldHVybiBkZWZlcnJlZFxuICAgIHJldHVybiBkZWY7XG59O1xuIiwidmFyIF9wdWJsaWMgPSB7fTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIEEgZGlyZWN0b3J5IG9mIGFsbCBwcm9taXNlcywgZGVmZXJyZWRzLCBhbmQgcXVldWVzLlxuICogQHR5cGUgb2JqZWN0XG4gKi9cbl9wdWJsaWMubGlzdCA9IHt9O1xuXG5cbi8qKlxuICogaXRlcmF0b3IgZm9yIGlkc1xuICogQHR5cGUgaW50ZWdlclxuICovXG5fcHVibGljLmkgPSAwO1xuXG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiB2YWx1ZXMuXG4gKlxuICogQHR5cGUgb2JqZWN0XG4gKi9cbl9wdWJsaWMuc2V0dGluZ3MgPSB7XG5cbiAgICBkZWJ1Z19tb2RlIDogMVxuICAgIC8vc2V0IHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IG9mIHRoZSBjYWxsZWUgc2NyaXB0LFxuICAgIC8vYmVjYXVzZSBub2RlIGhhcyBubyBjb25zdGFudCBmb3IgdGhpc1xuICAgICxjd2QgOiBmYWxzZVxuICAgICxtb2RlIDogKGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzICsgJycgPT09ICdbb2JqZWN0IHByb2Nlc3NdJyl7XG4gICAgICAgICAgICAvLyBpcyBub2RlXG4gICAgICAgICAgICByZXR1cm4gXCJuYXRpdmVcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy8gbm90IG5vZGVcbiAgICAgICAgICAgIHJldHVybiBcImJyb3dzZXJcIjtcbiAgICAgICAgfVxuICAgIH0oKSlcbiAgICAvKipcbiAgICAgKiAtIG9uQWN0aXZhdGUgL3doZW4gZWFjaCBpbnN0YW5jZSBhY3RpdmF0ZWRcbiAgICAgKiAtIG9uU2V0dGxlICAgL3doZW4gZWFjaCBpbnN0YW5jZSBzZXR0bGVzXG4gICAgICpcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cbiAgICAsaG9va3MgOiB7XG4gICAgfVxuICAgICx0aW1lb3V0IDogNTAwMCAvL2RlZmF1bHQgdGltZW91dFxufTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3ByaXZhdGUgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogT3B0aW9ucyB5b3Ugd2lzaCB0byBwYXNzIHRvIHNldCB0aGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb25cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGNvbmZpZ1xuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogTGlzdCBvZiBvcHRpb25zOlxuXG4gIC0ge251bWJlcn0gPGI+dGltZW91dDwvYj5cblxuICAtIHtzdHJpbmd9IDxiPmN3ZDwvYj4gU2V0cyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LiBTZXJ2ZXIgc2lkZSBzY3JpcHRzIG9ubHkuXG5cbiAgLSB7Ym9vbGVhbn0gPGI+ZGVidWdfbW9kZTwvYj5cblxuICogQHJldHVybnMge29iamVjdH0gY29uZmlndXJhdGlvbiBzZXR0aW5nc1xuICovXG5fcHVibGljLmNvbmZpZyA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICBpZih0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jyl7XG4gICAgICAgIGZvcih2YXIgaSBpbiBvYmope1xuICAgICAgICAgIF9wdWJsaWMuc2V0dGluZ3NbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX3B1YmxpYy5zZXR0aW5ncztcbn07XG5cblxuLyoqXG4gKiBEZWJ1Z2dpbmcgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBtc2dcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHVibGljLmRlYnVnID0gZnVuY3Rpb24obXNnLGRlZil7XG5cbiAgICB2YXIgbXNncyA9IChtc2cgaW5zdGFuY2VvZiBBcnJheSkgPyBtc2cuam9pbihcIlxcblwiKSA6IFttc2ddO1xuXG4gICAgdmFyIGUgPSBuZXcgRXJyb3IobXNncyk7XG4gICAgY29uc29sZS5sb2coZS5zdGFjayk7XG5cblxuICAgIGlmKHRoaXMuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgICAvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgaWYoX3B1YmxpYy5zZXR0aW5ncy5tb2RlID09PSAnYnJvd3Nlcicpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBUYWtlIGFuIGFycmF5IG9mIHByb3RvdHlwZSBvYmplY3RzIGFuZCBhbiBhcnJheSBvZiBwcm9wZXJ0eSBvYmplY3RzLFxuICogbWVyZ2VzIGVhY2gsIGFuZCByZXR1cm5zIGEgc2hhbGxvdyBjb3B5LlxuICpcbiAqIEBwYXJhbSB7YXJyYXl9IHByb3RvT2JqQXJyIEFycmF5IG9mIHByb3RvdHlwZSBvYmplY3RzIHdoaWNoIGFyZSBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAqIEBwYXJhbSB7YXJyYXl9IHByb3BzT2JqQXJyIEFycmF5IG9mIGRlc2lyZWQgcHJvcGVydHkgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBvYmplY3RcbiAqL1xuX3B1YmxpYy5uYWl2ZV9jbG9uZXIgPSBmdW5jdGlvbihwcm90b09iakFycixwcm9wc09iakFycil7XG5cbiAgICBmdW5jdGlvbiBtZXJnZShkb25vcnMpe1xuICAgICAgdmFyIG8gPSB7fTtcbiAgICAgIGZvcih2YXIgYSBpbiBkb25vcnMpe1xuICAgICAgICAgIGZvcih2YXIgYiBpbiBkb25vcnNbYV0pe1xuICAgICAgICAgICAgICBpZihkb25vcnNbYV1bYl0gaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAgICAgICAgICAgICBvW2JdID0gZG9ub3JzW2FdW2JdLnNsaWNlKDApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIGRvbm9yc1thXVtiXSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgIG9bYl0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRvbm9yc1thXVtiXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgIG9bYl0gPSBkb25vcnNbYV1bYl07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbztcbiAgICB9XG5cbiAgICB2YXIgcHJvdG8gPSBtZXJnZShwcm90b09iakFyciksXG4gICAgICAgIHByb3BzID0gbWVyZ2UocHJvcHNPYmpBcnIpO1xuXG4gICAgLy9AdG9kbyBjb25zaWRlciBtYW51YWxseSBzZXR0aW5nIHRoZSBwcm90b3R5cGUgaW5zdGVhZFxuICAgIHZhciBmaW5hbE9iamVjdCA9IE9iamVjdC5jcmVhdGUocHJvdG8pO1xuICAgIGZvcih2YXIgaSBpbiBwcm9wcyl7XG4gICAgICBmaW5hbE9iamVjdFtpXSA9IHByb3BzW2ldO1xuICAgIH1cblxuICAgIHJldHVybiBmaW5hbE9iamVjdDtcbn07XG5cblxuX3B1YmxpYy5nZW5lcmF0ZV9pZCA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSArICctJyArICgrK3RoaXMuaSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcbnZhciBEZWZlcnJlZFNjaGVtYSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuc2NoZW1hLmpzJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBvYmplY3QuXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGRlZmVycmVkXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuICogIC0ge3N0cmluZ30gPGI+aWQ8L2I+ICBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC4gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuIE9wdGlvbmFsLlxuICpcbiAqICAtIHtudW1iZXJ9IDxiPnRpbWVvdXQ8L2I+IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC4gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS5cbiAqICBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suXG4gKiAgVGhlbixkb25lIGRlbGF5cyB3aWxsIG5vdCBmbGFnIGEgdGltZW91dCBiZWNhdXNlIHRoZXkgYXJlIGNhbGxlZCBhZnRlciB0aGUgaW5zdGFuY2UgaXMgY29uc2lkZXJlZCByZXNvbHZlZC5cbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYob3B0aW9ucy5pZCAmJiBDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG4gICAgICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQ3JlYXRlIGEgbmV3IGRlZmVycmVkIGNsYXNzIGluc3RhbmNlXG4gICAgICAgIF9vID0gX3ByaXZhdGUuZmFjdG9yeShbRGVmZXJyZWRTY2hlbWFdLFtvcHRpb25zXSk7XG5cbiAgICAgICAgLy9BQ1RJVkFURSBERUZFUlJFRFxuICAgICAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgRmlsZV9sb2FkZXIgPSByZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJyk7XG5cblxudmFyIF9wdWJsaWMgPSB7fTtcblxuXG4vKipcbiAqIEBwYXJhbSBhcnJheSBvcHRpb25zIFByb3RvdHlwZSBvYmplY3RzXG4qKi9cbl9wdWJsaWMuZmFjdG9yeSA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLG9wdGlvbnNPYmpBcnIpe1xuXG4gICAgLy9NZXJnZSBhcnJheSBvZiBvYmplY3RzIGludG8gYSBzaW5nbGUsIHNoYWxsb3cgY2xvbmVcbiAgICB2YXIgX28gPSBDb25maWcubmFpdmVfY2xvbmVyKHByb3RvT2JqQXJyLG9wdGlvbnNPYmpBcnIpO1xuXG4gICAgLy9pZiBubyBpZCwgZ2VuZXJhdGUgb25lXG4gICAgX28uaWQgPSAoIV9vLmlkKSA/IENvbmZpZy5nZW5lcmF0ZV9pZCgpIDogX28uaWQ7XG5cbiAgICByZXR1cm4gX287XG59O1xuXG5cbl9wdWJsaWMuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmope1xuXG4gICAgLy9NQUtFIFNVUkUgTkFNSU5HIENPTkZMSUNUIERPRVMgTk9UIEVYSVNUXG4gICAgaWYoQ29uZmlnLmxpc3Rbb2JqLmlkXSAmJiAhQ29uZmlnLmxpc3Rbb2JqLmlkXS5vdmVyd3JpdGFibGUpe1xuICAgICAgICBDb25maWcuZGVidWcoXCJUcmllZCBpbGxlZ2FsIG92ZXJ3cml0ZSBvZiBcIitvYmouaWQrXCIuXCIpO1xuICAgICAgICByZXR1cm4gQ29uZmlnLmxpc3Rbb2JqLmlkXTtcbiAgICB9XG5cbiAgICAvL1NBVkUgVE8gTUFTVEVSIExJU1RcbiAgICBDb25maWcubGlzdFtvYmouaWRdID0gb2JqO1xuXG4gICAgLy9BVVRPIFRJTUVPVVRcbiAgICBfcHVibGljLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cbiAgICAvL0NhbGwgaG9va1xuICAgIGlmKENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuX3B1YmxpYy5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG4gICAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gICAgaWYoZGVmLnRpbWVvdXRfaWQpe1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVmLnRpbWVvdXRfaWQpO1xuICAgIH1cblxuICAgIC8vU2V0IHN0YXRlIHRvIHJlc29sdmVkXG4gICAgX3B1YmxpYy5zZXRfc3RhdGUoZGVmLDEpO1xuXG4gICAgLy9DYWxsIGhvb2tcbiAgICBpZihDb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUpe1xuICAgICAgQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKGRlZik7XG4gICAgfVxuXG4gICAgLy9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cbiAgICBkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcbiAgICAgICAgZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG4gICAgICAgIC8vUnVuIGRvbmVcbiAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICxkZWYuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICxkZWYuY2Fib29zZVxuICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICApO1xuICAgIH0pO1xuXG4gICAgLy9SdW4gdGhlbiBxdWV1ZVxuICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICBkZWZcbiAgICAgICAgLGRlZi5jYWxsYmFja3MudGhlblxuICAgICAgICAsZGVmLnZhbHVlXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICk7XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIFJ1bnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIHNlcXVlbnRpYWxseSBhcyBhIHBhcnRpYWwgZnVuY3Rpb24uXG4gKiBFYWNoIGZ1bmN0aW9uJ3MgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBvZiBpdHMgcHJlZGVjZXNzb3IgZnVuY3Rpb24uXG4gKlxuICogQnkgZGVmYXVsdCwgZXhlY3V0aW9uIGNoYWluIGlzIHBhdXNlZCB3aGVuIGFueSBmdW5jdGlvblxuICogcmV0dXJucyBhbiB1bnJlc29sdmVkIGRlZmVycmVkLiAocGF1c2Vfb25fZGVmZXJyZWQpIFtPUFRJT05BTF1cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmICAvZGVmZXJyZWQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gb2JqICAvaXRpbmVyYXJ5XG4gKiAgICAgIHRyYWluICAgICAgIHthcnJheX1cbiAqICAgICAgaG9va3MgICAgICAge29iamVjdH1cbiAqICAgICAgICAgIG9uQmVmb3JlICAgICAgICB7YXJyYXl9XG4gKiAgICAgICAgICBvbkNvbXBsZXRlICAgICAge2FycmF5fVxuICogQHBhcmFtIHttaXhlZH0gcGFyYW0gL3BhcmFtIHRvIHBhc3MgdG8gZmlyc3QgY2FsbGJhY2tcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgIHBhdXNlX29uX2RlZmVycmVkICAge2Jvb2xlYW59XG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuICAgIC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuICAgIHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG4gICAgLy9vbkJlZm9yZSBldmVudFxuICAgIGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsb2JqLmhvb2tzLm9uQmVmb3JlXG4gICAgICAgICAgICAscGFyYW1cbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICB3aGlsZShvYmoudHJhaW4ubGVuZ3RoID4gMCl7XG5cbiAgICAgICAgLy9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuICAgICAgICB2YXIgbGFzdCA9IG9iai50cmFpbi5zaGlmdCgpO1xuICAgICAgICBkZWYuZXhlY3V0aW9uX2hpc3RvcnkucHVzaChsYXN0KTtcblxuICAgICAgICAvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuICAgICAgICByID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscik7XG5cbiAgICAgICAgLy9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG4gICAgICAgIC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcbiAgICAgICAgaWYob3B0aW9ucy5wYXVzZV9vbl9kZWZlcnJlZCl7XG5cbiAgICAgICAgICAgIC8vSWYgciBpcyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cbiAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyIHIgcmVzb2x2ZXNcbiAgICAgICAgICAgICAgICByLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXG4gICAgICAgICAgICAgICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAgICAgICAgICAgICAsb2JqXG4gICAgICAgICAgICAgICAgICAgICAgICAsclxuICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL3Rlcm1pbmF0ZSBleGVjdXRpb25cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vSWYgaXMgYW4gYXJyYXkgdGhhbiBjb250YWlucyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGVsc2UgaWYociBpbnN0YW5jZW9mIEFycmF5KXtcblxuICAgICAgICAgICAgICAgIHZhciB0aGVuYWJsZXMgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiByKXtcblxuICAgICAgICAgICAgICAgICAgICBpZihyW2ldLnRoZW4gJiYgcltpXS5zZXR0bGVkICE9PSAxKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhlbmFibGVzLnB1c2gocltpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IChmdW5jdGlvbih0LGRlZixvYmoscGFyYW0pe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9CYWlsIGlmIGFueSB0aGVuYWJsZXMgdW5zZXR0bGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiB0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRbaV0uc2V0dGxlZCAhPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG4gICAgICAgICAgICAgICAgICAgICAgICByW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9vbkNvbXBsZXRlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHVibGljLnJ1bl90cmFpbihkZWYsb2JqLmhvb2tzLm9uQ29tcGxldGUscix7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX0pO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcGFyYW0ge251bWJlcn0gaW50XG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5zZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYsaW50KXtcblxuICAgIGRlZi5zdGF0ZSA9IGludDtcblxuICAgIC8vSUYgUkVTT0xWRUQgT1IgUkVKRUNURUQsIFNFVFRMRVxuICAgIGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuICAgICAgICBkZWYuc2V0dGxlZCA9IDE7XG4gICAgfVxuXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG4gICAgICAgIF9wdWJsaWMuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5fcHVibGljLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZil7XG4gICAgcmV0dXJuIGRlZi5zdGF0ZTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBhdXRvbWF0aWMgdGltZW91dCBvbiBhIHByb21pc2Ugb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7aW50ZWdlcn0gdGltZW91dCAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbih0aW1lb3V0KXtcblxuICAgIHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgPyB0aGlzLnRpbWVvdXQgOiB0aW1lb3V0O1xuXG4gICAgLy9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG4gICAgaWYoIXRoaXMudHlwZSB8fCB0aGlzLnR5cGUgIT09ICd0aW1lcicpe1xuXG4gICAgICAgIC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG4gICAgICAgIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgIFwiQXV0byB0aW1lb3V0IHRoaXMudGltZW91dCBjYW5ub3QgYmUgdW5kZWZpbmVkLlwiXG4gICAgICAgICAgICAgICx0aGlzLmlkXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcbiAgICAgICAgICAgIC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aW1lb3V0X2lkID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IuY2FsbChzY29wZSk7XG4gICAgICAgIH0sIHRoaXMudGltZW91dCk7XG5cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgLy9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG4gICAgaWYodGhpcy5zdGF0ZSAhPT0gMSl7XG5cbiAgICAgICAgLy9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG4gICAgICAgIHZhciBtc2dzID0gW107XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGlmKG9iai5zdGF0ZSAhPT0gMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcbiAgICAgICAgICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiAgICAgICAgICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICAgICAgICAgIHZhciByID0gX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KHRoaXMsJ3Vwc3RyZWFtJyxmbik7XG4gICAgICAgICAgICBtc2dzLnB1c2goc2NvcGUuaWQgKyBcIjogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyIFwiXG4gICAgICAgICAgICAgICAgICAgICsgdGhpcy50aW1lb3V0ICsgXCJtc1wiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChcIkNhdXNlOlwiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5fcHVibGljLmVycm9yID0gZnVuY3Rpb24oY2Ipe1xuXG4gICAgLy9JRiBFUlJPUiBBTFJFQURZIFRIUk9XTiwgRVhFQ1VURSBDQiBJTU1FRElBVEVMWVxuICAgIGlmKHRoaXMuc3RhdGUgPT09IDIpe1xuICAgICAgICBjYigpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICB0aGlzLnJlamVjdF9xLnB1c2goY2IpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFNpZ25hbHMgYWxsIGRvd25zdHJlYW0gcHJvbWlzZXMgdGhhdCBfcHVibGljIHByb21pc2Ugb2JqZWN0J3NcbiAqIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICpcbiAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3JcbiAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnNpZ25hbF9kb3duc3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0KXtcblxuICAgIC8vTUFLRSBTVVJFIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRFxuICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgPT09IDEpe1xuXG4gICAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc3RhdGUgIT09IDEpe1xuICAgICAgICAgICAgLy90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgc3VjY2Vzc2Z1bGx5IHNldHRsZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgQ29uZmlnLmRlYnVnKHRhcmdldC5pZCArIFwiIHRyaWVkIHRvIHNldHRsZSBwcm9taXNlIFwiK1wiJ1wiK3RhcmdldC5kb3duc3RyZWFtW2ldLmlkK1wiJyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gc2V0dGxlZC5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcbiAgICAvL1NFVFRMRUQgVEhBVCBSRVNVTFQgQVMgQSBTSURFIEVGRkVDVCBUTyBBTk9USEVSIFNFVFRMRU1FTlRcbiAgICBmb3IgKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcbiAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG4gICAgICAgICAgICBfcHVibGljLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbi8qKlxuKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSwgYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWUgICAgICAgICAgVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAgICAgICAgICAgICAgVGhlIHRlc3QgY2FsbGJhY2sgdG8gYmUgYXBwbGllZCB0byBlYWNoIG9iamVjdFxuKiBAcGFyYW0ge2FycmF5fSBicmVhZGNydW1iICAgICAgICAgVGhlIGJyZWFkY3J1bWIgdGhyb3VnaCB0aGUgY2hhaW4gb2YgdGhlIGZpcnN0IG1hdGNoXG4qIEByZXR1cm5zIHttaXhlZH1cbiovXG5fcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cbiAgICBpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBicmVhZGNydW1iID0gW29iai5pZF07XG4gICAgfVxuXG4gICAgdmFyIHIxO1xuXG4gICAgZm9yKHZhciBpIGluIG9ialtwcm9wTmFtZV0pe1xuXG4gICAgICAgIC8vUlVOIFRFU1RcbiAgICAgICAgcjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuICAgICAgICBpZihyMSAhPT0gZmFsc2Upe1xuICAgICAgICAvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcbiAgICAgICAgICAgIC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuICAgICAgICAgICAgaWYoYnJlYWRjcnVtYi5pbmRleE9mKHIxKSAhPT0gLTEpe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICAgICAgICBcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICtwcm9wTmFtZStcIicgb2Ygb2JqZWN0IFwiXG4gICAgICAgICAgICAgICAgICAgICAgICArKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuICAgICAgICAgICAgICAgICAgICAsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhZGNydW1iLnB1c2gocjEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pKClcbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKTtcblxuICAgICAgICAgICAgaWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuICAgICAgICAgICAgICAgIHJldHVybiBfcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiBicmVhZGNydW1iO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGEgcHJvbWlzZSBkZXNjcmlwdGlvbiBpbnRvIGEgcHJvbWlzZS5cbiAqXG4gKiBAcGFyYW0ge3R5cGV9IG9ialxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuX3B1YmxpYy5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cbiAgICBvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuICAgIC8vQXV0b25hbWVcbiAgICBpZiAoIW9iai5pZCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG4gICAgICAgIG9iai5pZCA9IFwidGltZXItXCIgKyBvYmoudGltZW91dCArIFwiLVwiICsgKCsrQ29uZmlnLmkpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodHlwZW9mIG9iai51cmwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpO1xuICAgICAgICAvL1JFTU9WRSAuanMgRlJPTSBJRFxuICAgICAgICBpZiAob2JqLmlkLnNlYXJjaChcIi5qc1wiKSAhPT0gLTEpIHtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuc3BsaXQoXCIuXCIpO1xuICAgICAgICAgIG9iai5pZC5wb3AoKTtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1JldHVybiBpZiBhbHJlYWR5IGV4aXN0c1xuICAgIGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuICAgICAgLy9BIHByZXZpb3VzIHByb21pc2Ugb2YgdGhlIHNhbWUgaWQgZXhpc3RzLlxuICAgICAgLy9NYWtlIHN1cmUgdGhpcyBkZXBlbmRlbmN5IG9iamVjdCBkb2Vzbid0IGhhdmUgYVxuICAgICAgLy9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3JcbiAgICAgIGlmKG9iai5yZXNvbHZlcil7XG4gICAgICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgXCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG4gICAgICAgICAgLFwiRGV0ZWN0ZWQgcmUtaW5pdCBvZiAnXCIgKyBvYmouaWQgKyBcIicuXCJcbiAgICAgICAgICAsXCJBdHRlbXB0ZWQ6XCJcbiAgICAgICAgICAsb2JqXG4gICAgICAgICAgLFwiRXhpc3Rpbmc6XCJcbiAgICAgICAgICAsQ29uZmlnLmxpc3Rbb2JqLmlkXVxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2VcbiAgICB2YXIgZGVmO1xuICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAvL0V2ZW50XG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICdldmVudCcpOlxuICAgICAgICAgICAgZGVmID0gX3B1YmxpYy53cmFwX2V2ZW50KG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcbiAgICAgICAgICAgIHZhciBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKTtcbiAgICAgICAgICAgIGRlZiA9IFF1ZXVlKG9iai5kZXBlbmRlbmNpZXMsb2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vQWxyZWFkeSBhIHRoZW5hYmxlXG4gICAgICAgIGNhc2UodHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nKTpcblxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgICAgICAgLy9SZWZlcmVuY2UgdG8gYW4gZXhpc3RpbmcgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBvYmouaWQgPT09ICdzdHJpbmcnKTpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMuZGVmZXJyZWQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQgOiBvYmouaWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmKG9iai50aGVuKXtcbiAgICAgICAgICAgICAgICAgICAgICBvYmoudGhlbihmdW5jdGlvbihyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHIpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgLy9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuICAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5wcm9taXNlID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgICAgICAgaWYob2JqLnNjb3BlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iai5wcm9taXNlLmNhbGwob2JqLnNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIC8vT2JqZWN0IGlzIGEgdGhlbmFibGVcbiAgICAgICAgICAgICAgICBjYXNlKG9iai50aGVuKTpcbiAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9DaGVjayBpZiBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgICBpZih0eXBlb2YgZGVmICE9PSAnb2JqZWN0JyB8fCAhZGVmLnRoZW4pe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfdGltZXIob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vTG9hZCBmaWxlXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuICAgICAgICAgICAgLy9Jbmhlcml0IHBhcmVudCdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICAgIGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG4gICAgICAgICAgICAgIG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfeGhyKG9iaik7XG4gICAgfVxuXG4gICAgLy9JbmRleCBwcm9taXNlIGJ5IGlkIGZvciBmdXR1cmUgcmVmZXJlbmNpbmdcbiAgICBDb25maWcubGlzdFtvYmouaWRdID0gZGVmO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBAdG9kbzogcmVkbyB0aGlzXG4gKlxuICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cbiAqXG4gKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3B1YmxpYy53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQoe1xuICAgICAgICBpZCA6IG9iai5pZFxuICAgIH0pO1xuXG5cbiAgICBpZih0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblxuICAgICAgICBpZih0eXBlb2YgJCAhPT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICB2YXIgbXNnID0gJ3dpbmRvdyBhbmQgZG9jdW1lbnQgYmFzZWQgZXZlbnRzIGRlcGVuZCBvbiBqUXVlcnknO1xuICAgICAgICAgICAgZGVmLnJlamVjdChtc2cpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvL0ZvciBub3csIGRlcGVuZCBvbiBqcXVlcnkgZm9yIElFOCBET01Db250ZW50TG9hZGVkIHBvbHlmaWxsXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSl7XG4gICAgICAgICAgICAgICAgY2FzZShvYmouaWQgPT09ICdyZWFkeScgfHwgb2JqLmlkID09PSAnRE9NQ29udGVudExvYWRlZCcpOlxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlKG9iai5pZCA9PT0gJ2xvYWQnKTpcbiAgICAgICAgICAgICAgICAgICAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24ob2JqLmlkLFwiYm9keVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG5fcHVibGljLndyYXBfdGltZXIgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuICAgIHZhciBkZWYgPSBEZWZlcnJlZCgpO1xuXG4gICAgKGZ1bmN0aW9uKGRlZil7XG5cbiAgICAgICAgdmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgZGVmLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN0YXJ0IDogX3N0YXJ0XG4gICAgICAgICAgICAgICAgLGVuZCA6IF9lbmRcbiAgICAgICAgICAgICAgICAsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcbiAgICAgICAgICAgICAgICAsdGltZW91dCA6IG9iai50aW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxvYmoudGltZW91dCk7XG5cbiAgICB9KGRlZikpO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgZGVwZW5kcyBvbiB0aGUgbG9hZGluZyBvZiBhIGZpbGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlcFxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wdWJsaWMud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgaWYoIWRlcFtyZXF1aXJlZFtpXV0pe1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICBcIkZpbGUgcmVxdWVzdHMgY29udmVydGVkIHRvIHByb21pc2VzIHJlcXVpcmU6IFwiICsgcmVxdWlyZWRbaV1cbiAgICAgICAgICAsXCJNYWtlIHN1cmUgeW91IHdlcmVuJ3QgZXhwZWN0aW5nIGRlcGVuZGVuY3kgdG8gYWxyZWFkeSBoYXZlIGJlZW4gcmVzb2x2ZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAsZGVwXG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vSUYgUFJPTUlTRSBGT1IgVEhJUyBVUkwgQUxSRUFEWSBFWElTVFMsIFJFVFVSTiBJVFxuICAgIGlmKENvbmZpZy5saXN0W2RlcC5pZF0pe1xuICAgICAgcmV0dXJuIENvbmZpZy5saXN0W2RlcC5pZF07XG4gICAgfVxuXG4gICAgLy9DT05WRVJUIFRPIERFRkVSUkVEOlxuICAgIHZhciBkZWYgPSBEZWZlcnJlZChkZXApO1xuXG4gICAgaWYodHlwZW9mIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cbi8qKlxuKiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG4qIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG4qXG4qIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2VcbiogaW4gaXRzIHVwc3RyZWFtLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4qIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG4qIEByZXR1cm5zIHt2b2lkfVxuKi9cbl9wdWJsaWMucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCl7XG5cbiAgICBpZih0YXJnZXQuaGFsdF9yZXNvbHV0aW9uID09PSAxKSByZXR1cm47XG5cbiAgIC8vTUFLRSBTVVJFIFRIRSBTSUdOQUwgV0FTIEZST00gQSBQUk9NSVNFIEJFSU5HIExJU1RFTkVEIFRPXG4gICAvL0JVVCBBTExPVyBTRUxGIFNUQVRVUyBDSEVDS1xuICAgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuICAgICAgIHJldHVybiBDb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcbiAgIH1cbiAgIC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuICAgZWxzZXtcbiAgICAgICB2YXIgc3RhdHVzID0gMTtcbiAgICAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LnVwc3RyZWFtKXtcbiAgICAgICAgICAgLy9TRVRTIFNUQVRVUyBUTyAwIElGIEFOWSBPQlNFUlZJTkcgSEFWRSBGQUlMRUQsIEJVVCBOT1QgSUYgUEVORElORyBPUiBSRVNPTFZFRFxuICAgICAgICAgICBpZih0YXJnZXQudXBzdHJlYW1baV0uc3RhdGUgIT09IDEpIHtcbiAgICAgICAgICAgICAgIHN0YXR1cyA9IHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZTtcbiAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICB9XG4gICAgICAgfVxuICAgfVxuXG4gICAvL1JFU09MVkUgUVVFVUUgSUYgVVBTVFJFQU0gRklOSVNIRURcbiAgIGlmKHN0YXR1cyA9PT0gMSl7XG5cbiAgICAgICAgLy9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcbiAgICAgICAgLy9SRVBPUlRTIERVUExJQ0FURVNcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh0YXJnZXQuZGVwZW5kZW5jaWVzW2ldLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldC5yZXNvbHZlLmNhbGwodGFyZ2V0LHZhbHVlcyk7XG4gICB9XG5cbiAgIGlmKHN0YXR1cyA9PT0gMil7XG4gICAgICAgdmFyIGVyciA9IFtcbiAgICAgICAgICAgdGFyZ2V0LmlkK1wiIGRlcGVuZGVuY3kgJ1wiK3RhcmdldC51cHN0cmVhbVtpXS5pZCArIFwiJyB3YXMgcmVqZWN0ZWQuXCJcbiAgICAgICAgICAgLHRhcmdldC51cHN0cmVhbVtpXS5hcmd1bWVudHNcbiAgICAgICBdO1xuICAgICAgIHRhcmdldC5yZWplY3QuYXBwbHkodGFyZ2V0LGVycik7XG4gICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCIvKipcbiAqIERlZmF1bHQgcHJvcGVydGllcyBmb3IgYWxsIGRlZmVycmVkIG9iamVjdHMuXG4gKlxuICovXG52YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHVibGljID0ge307XG5cbl9wdWJsaWMuaXNfb3JneSA9IHRydWU7XG5cbl9wdWJsaWMuaWQgPSBudWxsO1xuXG4vL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG5fcHVibGljLnNldHRsZWQgPSAwO1xuXG4vKipcbiAqIFNUQVRFIENPREVTOlxuICogLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAtMSAgID0+IFNFVFRMSU5HIFtFWEVDVVRJTkcgQ0FMTEJBQ0tTXVxuICogIDAgICA9PiBQRU5ESU5HXG4gKiAgMSAgID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG4gKiAgMiAgID0+IFJFSkVDVEVEXG4gKi9cbl9wdWJsaWMuc3RhdGUgPSAwO1xuXG5fcHVibGljLnZhbHVlID0gW107XG5cbi8vVGhlIG1vc3QgcmVjZW50IHZhbHVlIGdlbmVyYXRlZCBieSB0aGUgdGhlbi0+ZG9uZSBjaGFpbi5cbl9wdWJsaWMuY2Fib29zZSA9IG51bGw7XG5cbl9wdWJsaWMubW9kZWwgPSBcImRlZmVycmVkXCI7XG5cbl9wdWJsaWMuZG9uZV9maXJlZCA9IDA7XG5cbl9wdWJsaWMudGltZW91dF9pZCA9IG51bGw7XG5cbl9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzID0ge1xuICByZXNvbHZlIDogMFxuICAsdGhlbiA6IDBcbiAgLGRvbmUgOiAwXG4gICxyZWplY3QgOiAwXG59O1xuXG4vKipcbiAqIFNlbGYgZXhlY3V0aW5nIGZ1bmN0aW9uIHRvIGluaXRpYWxpemUgY2FsbGJhY2sgZXZlbnRcbiAqIGxpc3QuXG4gKlxuICogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eU5hbWVzIGFzXG4gKiBfcHVibGljLmNhbGxiYWNrX3N0YXRlczogYWRkaW5nIGJvaWxlcnBsYXRlXG4gKiBwcm9wZXJ0aWVzIGZvciBlYWNoXG4gKlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5jYWxsYmFja3MgPSAoZnVuY3Rpb24oKXtcblxuICB2YXIgbyA9IHt9O1xuXG4gIGZvcih2YXIgaSBpbiBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyl7XG4gICAgb1tpXSA9IHtcbiAgICAgIHRyYWluIDogW11cbiAgICAgICxob29rcyA6IHtcbiAgICAgICAgb25CZWZvcmUgOiB7XG4gICAgICAgICAgdHJhaW4gOiBbXVxuICAgICAgICB9XG4gICAgICAgICxvbkNvbXBsZXRlIDoge1xuICAgICAgICAgIHRyYWluIDogW11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gbztcbn0pKCk7XG5cbi8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuX3B1YmxpYy5kb3duc3RyZWFtID0ge307XG5cbl9wdWJsaWMuZXhlY3V0aW9uX2hpc3RvcnkgPSBbXTtcblxuLy9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cbl9wdWJsaWMub3ZlcndyaXRhYmxlID0gMDtcblxuXG4vKipcbiAqIERlZmF1bHQgdGltZW91dCBmb3IgYSBkZWZlcnJlZFxuICogQHR5cGUgbnVtYmVyXG4gKi9cbl9wdWJsaWMudGltZW91dCA9IENvbmZpZy5zZXR0aW5ncy50aW1lb3V0O1xuXG4vKipcbiAqIFJFTU9URVxuICpcbiAqIFJFTU9URSA9PSAxICA9PiAgW0RFRkFVTFRdIE1ha2UgaHR0cCByZXF1ZXN0IGZvciBmaWxlXG4gKlxuICogUkVNT1RFID09IDAgID0+ICBSZWFkIGZpbGUgZGlyZWN0bHkgZnJvbSB0aGUgZmlsZXN5c3RlbVxuICpcbiAqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG4gKiBGSUxFU1lTVEVNIEFDQ0VTU1xuICovXG5fcHVibGljLnJlbW90ZSA9IDE7XG5cbi8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxuX3B1YmxpYy5saXN0ID0gMTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogUmVzb2x2ZXMgYSBkZWZlcnJlZC5cbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWx1ZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMucmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICB0aGlzLmlkICsgXCIgY2FuJ3QgcmVzb2x2ZS5cIlxuICAgICAgLFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG4gICAgXSk7XG4gIH1cblxuICAvL1NFVCBTVEFURSBUTyBTRVRUTEVNRU5UIElOIFBST0dSRVNTXG4gIF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuICAvL1NFVCBWQUxVRVxuICB0aGlzLnZhbHVlID0gdmFsdWU7XG5cbiAgLy9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcbiAgLy9FVkVOIElGIFRIRVJFIElTIE5PIFJFU09MVkVSLCBTRVQgSVQgVE8gRklSRUQgV0hFTiBDQUxMRURcbiAgaWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG4gICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cbiAgICAvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG4gICAgdHJ5e1xuICAgICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVzb2x2ZXIodmFsdWUsdGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY2F0Y2goZSl7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG4gIH1cbiAgZWxzZXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cbiAgICAvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3NcbiAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuICAgICAgX3ByaXZhdGUuc2V0dGxlKHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgLy9SdW4gcmVzb2x2ZVxuICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgdGhpc1xuICAgICx0aGlzLmNhbGxiYWNrcy5yZXNvbHZlXG4gICAgLHRoaXMudmFsdWVcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgLy9yZXNvbHZlciBpcyBleHBlY3RlZCB0byBjYWxsIHJlc29sdmUgYWdhaW5cbiAgLy9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbl9wdWJsaWMucmVqZWN0ID0gZnVuY3Rpb24oZXJyKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZighKGVyciBpbnN0YW5jZW9mIEFycmF5KSl7XG4gICAgZXJyID0gW2Vycl07XG4gIH1cblxuICB2YXIgbXNnID0gXCJSZWplY3RlZCBcIit0aGlzLm1vZGVsK1wiOiAnXCIrdGhpcy5pZCtcIicuXCJcblxuICBpZihDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgZXJyLnVuc2hpZnQobXNnKTtcbiAgICBDb25maWcuZGVidWcoZXJyLHRoaXMpO1xuICB9XG4gIGVsc2V7XG4gICAgbXNnID0gbXNnICsgXCIgVHVybiBvbiBkZWJ1ZyBtb2RlIGZvciBtb3JlIGluZm8uXCI7XG4gICAgY29uc29sZS53YXJuKG1zZyk7XG4gIH1cblxuICAvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcbiAgaWYodGhpcy50aW1lb3V0X2lkKXtcbiAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgfVxuXG4gIC8vU2V0IHN0YXRlIHRvIHJlamVjdGVkXG4gIF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLDIpO1xuXG4gIC8vRXhlY3V0ZSByZWplY3Rpb24gcXVldWVcbiAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgIHRoaXNcbiAgICAsdGhpcy5jYWxsYmFja3MucmVqZWN0XG4gICAgLGVyclxuICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuX3B1YmxpYy50aGVuID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG4gIHN3aXRjaCh0cnVlKXtcblxuICAgIC8vQW4gZXJyb3Igd2FzIHByZXZpb3VzbHkgdGhyb3duLCBiYWlsIG91dFxuICAgIGNhc2UodGhpcy5zdGF0ZSA9PT0gMik6XG4gICAgICBicmVhaztcblxuICAgIC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuICAgIGNhc2UodGhpcy5kb25lX2ZpcmVkID09PSAxKTpcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG4gICAgZGVmYXVsdDpcblxuICAgICAgLy9QdXNoIGNhbGxiYWNrIHRvIHRoZW4gcXVldWVcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cbiAgICAgIC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcbiAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuICAgICAgICB0aGlzLnJ1bl90cmFpbihcbiAgICAgICAgICB0aGlzXG4gICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnRoZW5cbiAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICBlbHNle31cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG5fcHVibGljLmRvbmUgPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbiAgaWYodGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5sZW5ndGggPT09IDBcbiAgICAgJiYgdGhpcy5kb25lX2ZpcmVkID09PSAwKXtcbiAgICAgIGlmKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyl7XG5cbiAgICAgICAgLy93cmFwIGNhbGxiYWNrIHdpdGggc29tZSBvdGhlciBjb21tYW5kc1xuICAgICAgICB2YXIgZm4yID0gZnVuY3Rpb24ocixkZWZlcnJlZCxsYXN0KXtcblxuICAgICAgICAgIC8vRG9uZSBjYW4gb25seSBiZSBjYWxsZWQgb25jZSwgc28gbm90ZSB0aGF0IGl0IGhhcyBiZWVuXG4gICAgICAgICAgZGVmZXJyZWQuZG9uZV9maXJlZCA9IDE7XG5cbiAgICAgICAgICBmbihyLGRlZmVycmVkLGxhc3QpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ucHVzaChmbjIpO1xuXG4gICAgICAgIC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZSBvbkNvbXBsZXRlXG4gICAgICAgIGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0Lmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChyZWplY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICAvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcbiAgICAgICAgaWYodGhpcy5zZXR0bGVkID09PSAxKXtcbiAgICAgICAgICBpZih0aGlzLnN0YXRlID09PSAxKXtcbiAgICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgdGhpc1xuICAgICAgICAgICAgICAsdGhpcy5jYWxsYmFja3MuZG9uZVxuICAgICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcbiAgICAgICAgZWxzZXt9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiZG9uZSgpIG11c3QgYmUgcGFzc2VkIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBDb25maWcuZGVidWcoXCJkb25lKCkgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UuXCIpO1xuICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wdWJsaWMgPSB7fSxcbiAgICBfcHJpdmF0ZSA9IHt9O1xuXG5fcHVibGljLmJyb3dzZXIgPSB7fSxcbl9wdWJsaWMubmF0aXZlID0ge30sXG5fcHJpdmF0ZS5uYXRpdmUgPSB7fTtcblxuLy9Ccm93c2VyIGxvYWRcblxuX3B1YmxpYy5icm93c2VyLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG4gIHZhciBoZWFkID0gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblxuICBlbGVtLnNldEF0dHJpYnV0ZShcImhyZWZcIixwYXRoKTtcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsXCJ0ZXh0L2Nzc1wiKTtcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJyZWxcIixcInN0eWxlc2hlZXRcIik7XG5cbiAgaWYoZWxlbS5vbmxvYWQpe1xuICAgIChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICBlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcbiAgICAgICB9O1xuXG4gICAgICAgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KFwiRmFpbGVkIHRvIGxvYWQgcGF0aDogXCIgKyBwYXRoKTtcbiAgICAgICB9O1xuXG4gICAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuICAgIGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gIH1cbiAgZWxzZXtcbiAgICAvL0FERCBlbGVtIEJVVCBNQUtFIFhIUiBSRVFVRVNUIFRPIENIRUNLIEZJTEUgUkVDRUlWRURcbiAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuICAgIGNvbnNvbGUud2FybihcIk5vIG9ubG9hZCBhdmFpbGFibGUgZm9yIGxpbmsgdGFnLCBhdXRvcmVzb2x2aW5nLlwiKTtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuICB9XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gIGVsZW0udHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuICBlbGVtLnNldEF0dHJpYnV0ZShcInNyY1wiLHBhdGgpO1xuXG4gIChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuICAgICAgZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuICAgICAgICBpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgICAgICB8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgodHlwZW9mIGVsZW0udmFsdWUgIT09ICd1bmRlZmluZWQnKSA/IGVsZW0udmFsdWUgOiBlbGVtKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG4gICAgICB9O1xuICB9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG4gIHRoaXMuaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbn1cblxuX3B1YmxpYy5icm93c2VyLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgdGhpcy5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLmJyb3dzZXIuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsb3B0aW9ucyl7XG4gIHZhciByLFxuICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxLm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXG4gIChmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgaWYocmVxLnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICByID0gcmVxLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgICBpZihvcHRpb25zLnR5cGUgJiYgb3B0aW9ucy50eXBlID09PSAnanNvbicpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICByID0gSlNPTi5wYXJzZShyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICBfcHVibGljLmRlYnVnKFtcbiAgICAgICAgICAgICAgICBcIkNvdWxkIG5vdCBkZWNvZGUgSlNPTlwiXG4gICAgICAgICAgICAgICAgLHBhdGhcbiAgICAgICAgICAgICAgICAsclxuICAgICAgICAgICAgICBdLGRlZmVycmVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9KHBhdGgsZGVmZXJyZWQpKTtcblxuICByZXEuc2VuZChudWxsKTtcbn1cblxuXG5cbi8vTmF0aXZlIGxvYWRcblxuX3B1YmxpYy5uYXRpdmUuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wdWJsaWMuYnJvd3Nlci5jc3MocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMubmF0aXZlLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAvL2xvY2FsIHBhY2thZ2VcbiAgaWYocGF0aFswXT09PScuJyl7XG4gICAgcGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCxkZWZlcnJlZCk7XG4gICAgdmFyIHIgPSByZXF1aXJlKHBhdGgpO1xuICAgIC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuICAgIGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICB9XG4gIH1cbiAgLy9yZW1vdGUgc2NyaXB0XG4gIGVsc2V7XG4gICAgLy9DaGVjayB0aGF0IHdlIGhhdmUgY29uZmlndXJlZCB0aGUgZW52aXJvbm1lbnQgdG8gYWxsb3cgdGhpcyxcbiAgICAvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuICAgIGlmKCFDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7X1xuICAgICAgQ29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIik7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHZhciBWbSA9IHJlcXVpcmUoJ3ZtJyk7XG4gICAgICAgIHIgPSBWbS5ydW5JblRoaXNDb250ZXh0KGRhdGEpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbl9wdWJsaWMubmF0aXZlLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgX3B1YmxpYy5uYXRpdmUuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5uYXRpdmUuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAoZnVuY3Rpb24oZGVmZXJyZWQpe1xuICAgIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihyKXtcbiAgICAgIGlmKGRlZmVycmVkLnR5cGUgPT09ICdqc29uJyl7XG4gICAgICAgIHIgPSBKU09OLnBhcnNlKHIpO1xuICAgICAgfVxuICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICB9KVxuICB9KShkZWZlcnJlZClcbn1cblxuX3ByaXZhdGUubmF0aXZlLmdldCA9IGZ1bmN0aW9uIChwYXRoLGRlZmVycmVkLGNhbGxiYWNrKXtcbiAgcGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCk7XG4gIGlmKHBhdGhbMF0gPT09ICcuJyl7XG4gICAgLy9maWxlIHN5c3RlbVxuICAgIHZhciBGcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgRnMucmVhZEZpbGUocGF0aCwgXCJ1dGYtOFwiLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcbiAgfVxuICBlbHNle1xuICAgIC8vaHR0cFxuICAgIHZhciByZXF1ZXN0ID0gcmVxdWlyZSgncmVxdWVzdCcpO1xuICAgIHJlcXVlc3QocGF0aCxmdW5jdGlvbihlcnJvcixyZXNwb25zZSxib2R5KXtcbiAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApIHtcbiAgICAgICAgY2FsbGJhY2soYm9keSk7XG4gICAgICB9XG4gICAgICBlbHNle1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9KVxuICB9XG59XG5cbl9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGggPSBmdW5jdGlvbihwKXtcbiAgcCA9IChwWzBdICE9PSAnLycgJiYgcFswXSAhPT0gJy4nKVxuICA/ICgocFswXS5pbmRleE9mKFwiaHR0cFwiKSE9PTApID8gJy4vJyArIHAgOiBwKSA6IHA7XG4gIHJldHVybiBwO1xufVxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgRGVmZXJyZWRTY2hlbWEgPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpO1xudmFyIFF1ZXVlU2NoZW1hID0gcmVxdWlyZSgnLi9xdWV1ZS5zY2hlbWEuanMnKTtcbnZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG4gKiBpcyByZXNvbHZlZC5cbiAqXG4gKiAjIyMgUXVldWUgdXNhZ2UgZXhhbXBsZTpcblxuYGBgXG52YXIgcSA9IE9yZ3kucXVldWUoW1xuICB7XG4gICAgY29tbWVudCA6IFwiVGhpcyBpcyBhIG5lc3RlZCBxdWV1ZSBjcmVhdGVkIG9uIHRoZSBmbHkuXCJcbiAgICAsdHlwZSA6IFwianNvblwiXG4gICAgLHVybCA6IFwiL2FwaS9qc29uL3NvbW51bXNcIlxuICAgICxyZXNvbHZlciA6IGZ1bmN0aW9uKHIsZGVmZXJyZWQpe1xuICAgICAgLy9GaWx0ZXIgb3V0IGV2ZW4gbnVtYmVyc1xuICAgICAgdmFyIG9kZCA9IGFyci5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHJldHVybiAwICE9IHZhbCAlIDI7XG4gICAgICB9KTtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUob2RkKTtcbiAgICB9XG4gIH1cbl0se1xuICBpZCA6IFwicTFcIixcbiAgcmVzb2x2ZXIgOiBmdW5jdGlvbihyLGRlZmVycmVkKXtcbiAgICB2YXIgcHJpbWVzID0gclswXS5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG4gICAgICBoaWdoID0gTWF0aC5mbG9vcihNYXRoLnNxcnQodmFsKSkgKyAxO1xuICAgICAgZm9yICh2YXIgZGl2ID0gMjsgZGl2IDw9IGhpZ2g7IGRpdisrKSB7XG4gICAgICAgIGlmICh2YWx1ZSAlIGRpdiA9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKHByaW1lcyk7XG4gIH0pXG59KTtcblxuYGBgXG5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIHF1ZXVlXG4gKlxuICogQHBhcmFtIHthcnJheX0gZGVwcyBBcnJheSBvZiBkZXBlbmRlbmNpZXMgdGhhdCBtdXN0IGJlIHJlc29sdmVkIGJlZm9yZSA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIGNhbGxlZC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBMaXN0IG9mIG9wdGlvbnM6XG4gKiAgLSB7c3RyaW5nfSA8Yj5pZDwvYj4gVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLiBPcHRpb25hbC5cbiAqXG4gKiAgLSB7bnVtYmVyfSA8Yj50aW1lb3V0PC9iPlxuICogIFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC4gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS5cbiAqXG4gKiAgLSB7ZnVuY3Rpb24ocmVzdWx0LGRlZmVycmVkKX0gPGI+cmVzb2x2ZXI8L2I+XG4gKiAgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuIEFyZzEgaXMgYW4gYXJyYXkgb2YgdGhlIGRlcGVuZGVuY2llcycgcmVzb2x2ZWQgdmFsdWVzLiBBcmcyIGlzIHRoZSBkZWZlcnJlZCBvYmplY3QuIFRoZSBxdWV1ZSB3aWxsIG9ubHkgcmVzb2x2ZSB3aGVuIEFyZzIucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnLnRpbWVvdXQuXG4gKlxuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG4gIHZhciBfbztcbiAgaWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy9ET0VTIE5PVCBBTFJFQURZIEVYSVNUXG4gIGlmKCFDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cbiAgICAvL1Bhc3MgYXJyYXkgb2YgcHJvdG90eXBlcyB0byBxdWV1ZSBmYWN0b3J5XG4gICAgdmFyIF9vID0gX3ByaXZhdGUuZmFjdG9yeShbRGVmZXJyZWRTY2hlbWEsUXVldWVTY2hlbWFdLFtvcHRpb25zXSk7XG5cbiAgICAvL0FjdGl2YXRlIHF1ZXVlXG4gICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyxvcHRpb25zLGRlcHMpO1xuXG4gIH1cbiAgLy9BTFJFQURZIEVYSVNUU1xuICBlbHNlIHtcblxuICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cbiAgICBpZihfby5tb2RlbCAhPT0gJ3F1ZXVlJyl7XG4gICAgLy9NQVRDSCBGT1VORCBCVVQgTk9UIEEgUVVFVUUsIFVQR1JBREUgVE8gT05FXG5cbiAgICAgIG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMTtcblxuICAgICAgX28gPSBfcHJpdmF0ZS51cGdyYWRlKF9vLG9wdGlvbnMsZGVwcyk7XG4gICAgfVxuICAgIGVsc2V7XG5cbiAgICAgIC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG4gICAgICBmb3IodmFyIGkgaW4gb3B0aW9ucyl7XG4gICAgICAgIF9vW2ldID0gb3B0aW9uc1tpXTtcbiAgICAgIH1cblxuICAgICAgLy9BREQgQURESVRJT05BTCBERVBFTkRFTkNJRVMgSUYgTk9UIFJFU09MVkVEXG4gICAgICBpZihkZXBzLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHJpdmF0ZS50cGwuYWRkLmNhbGwoX28sZGVwcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvL1JFU1VNRSBSRVNPTFVUSU9OIFVOTEVTUyBTUEVDSUZJRUQgT1RIRVJXSVNFXG4gICAgX28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID9cbiAgICBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDA7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cblxuLyoqXG4gKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZVxuICovXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG4gICAgLy9BQ1RJVkFURSBBUyBBIERFRkVSUkVEXG4gICAgLy92YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyk7XG4gICAgbyA9IF9wcm90by5hY3RpdmF0ZShvKTtcblxuICAgIC8vQHRvZG8gcmV0aGluayB0aGlzXG4gICAgLy9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG4gICAgLy9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG4gICAgLy9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcbiAgICAvL3JlbW90ZSBzb3VyY2UgaGVyZS5cbiAgICAvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuICAgIC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG4gICAgLy90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cbiAgICBvLnN0YXRlID0gLTE7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgIC8vUmVzdG9yZSBzdGF0ZVxuICAgICAgby5zdGF0ZSA9IDA7XG5cbiAgICAgIC8vQUREIERFUEVOREVOQ0lFUyBUTyBRVUVVRVxuICAgICAgUXVldWVTY2hlbWEuYWRkLmNhbGwobyxkZXBzKTtcblxuICAgICAgLy9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG4gICAgICBzZWxmLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cbiAgICAgIC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG4gICAgICBpZihvLmFzc2lnbil7XG4gICAgICAgICAgZm9yKHZhciBhIGluIG8uYXNzaWduKXtcbiAgICAgICAgICAgICAgc2VsZi5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9LDEpO1xuXG4gICAgcmV0dXJuIG87XG59O1xuXG5cbi8qKlxuKiBVcGdyYWRlcyBhIHByb21pc2Ugb2JqZWN0IHRvIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiovXG5fcHVibGljLnVwZ3JhZGUgPSBmdW5jdGlvbihvYmosb3B0aW9ucyxkZXBzKXtcblxuICAgIGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG4gICAgfVxuXG4gICAvL0dFVCBBIE5FVyBRVUVVRSBPQkpFQ1QgQU5EIE1FUkdFIElOXG4gICAgdmFyIF9vID0gQ29uZmlnLm5haXZlX2Nsb25lcihbXG4gICAgICAgIFF1ZXVlU2NoZW1hXG4gICAgICAgICxvcHRpb25zXG4gICAgXSk7XG5cbiAgICBmb3IodmFyIGkgaW4gX28pe1xuICAgICAgIG9ialtpXSA9IF9vW2ldO1xuICAgIH1cblxuICAgIC8vZGVsZXRlIF9vO1xuXG4gICAgLy9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG4gICAgb2JqID0gdGhpcy5hY3RpdmF0ZShvYmosb3B0aW9ucyxkZXBzKTtcblxuICAgIC8vUkVUVVJOIFFVRVVFIE9CSkVDVFxuICAgIHJldHVybiBvYmo7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuc2NoZW1hLmpzJyk7XG5cbi8vRXh0ZW5kIGRlZmVycmVkIHNjaGVtYVxudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cbl9wdWJsaWMubW9kZWwgPSAncXVldWUnO1xuXG5cbi8vU0VUIFRSVUUgQUZURVIgUkVTT0xWRVIgRklSRURcbl9wdWJsaWMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuXG5cbi8vUFJFVkVOVFMgQSBRVUVVRSBGUk9NIFJFU09MVklORyBFVkVOIElGIEFMTCBERVBFTkRFTkNJRVMgTUVUXG4vL1BVUlBPU0U6IFBSRVZFTlRTIFFVRVVFUyBDUkVBVEVEIEJZIEFTU0lHTk1FTlQgRlJPTSBSRVNPTFZJTkdcbi8vQkVGT1JFIFRIRVkgQVJFIEZPUk1BTExZIElOU1RBTlRJQVRFRFxuX3B1YmxpYy5oYWx0X3Jlc29sdXRpb24gPSAwO1xuXG5cbi8vVVNFRCBUTyBDSEVDSyBTVEFURSwgRU5TVVJFUyBPTkUgQ09QWVxuX3B1YmxpYy51cHN0cmVhbSA9IHt9O1xuXG5cbi8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG5fcHVibGljLmRlcGVuZGVuY2llcyA9IFtdO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIFFVRVVFIElOU1RBTkNFIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuKiBBZGQgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gYSBxdWV1ZSdzIHVwc3RyZWFtIGFycmF5LlxuKlxuKiBUaGUgcXVldWUgd2lsbCByZXNvbHZlIG9uY2UgYWxsIHRoZSBwcm9taXNlcyBpbiBpdHNcbiogdXBzdHJlYW0gYXJyYXkgYXJlIHJlc29sdmVkLlxuKlxuKiBXaGVuIF9wdWJsaWMuY29uZmlnLmRlYnVnID09IDEsIG1ldGhvZCB3aWxsIHRlc3QgZWFjaFxuKiBkZXBlbmRlbmN5IGlzIG5vdCBwcmV2aW91c2x5IHNjaGVkdWxlZCB0byByZXNvbHZlXG4qIGRvd25zdHJlYW0gZnJvbSB0aGUgdGFyZ2V0LCBpbiB3aGljaFxuKiBjYXNlIGl0IHdvdWxkIG5ldmVyIHJlc29sdmUgYmVjYXVzZSBpdHMgdXBzdHJlYW0gZGVwZW5kcyBvbiBpdC5cbipcbiogQHBhcmFtIHthcnJheX0gYXJyICAvYXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRvIGFkZFxuKiBAcmV0dXJucyB7YXJyYXl9IHVwc3RyZWFtXG4qL1xuX3B1YmxpYy5hZGQgPSBmdW5jdGlvbihhcnIpe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG4gICB0cnl7XG4gICAgICAgaWYoYXJyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXMudXBzdHJlYW07XG4gICB9XG4gICBjYXRjaChlcnIpe1xuICAgICAgIENvbmZpZy5kZWJ1ZyhlcnIpO1xuICAgfVxuXG4gICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG4gICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICBcIkNhbm5vdCBhZGQgZGVwZW5kZW5jeSBsaXN0IHRvIHF1ZXVlIGlkOidcIit0aGlzLmlkXG4gICAgICAgICtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIlxuICAgICAgXSxhcnIsdGhpcyk7XG4gICB9XG5cbiAgIGZvcih2YXIgYSBpbiBhcnIpe1xuXG4gICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgIC8vQ0hFQ0sgSUYgRVhJU1RTXG4gICAgICAgICAgIGNhc2UodHlwZW9mIENvbmZpZy5saXN0W2FyclthXVsnaWQnXV0gPT09ICdvYmplY3QnKTpcbiAgICAgICAgICAgICAgIGFyclthXSA9IENvbmZpZy5saXN0W2FyclthXVsnaWQnXV07XG4gICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAvL0lGIE5PVCwgQVRURU1QVCBUTyBDT05WRVJUIElUIFRPIEFOIE9SR1kgUFJPTUlTRVxuICAgICAgICAgICBjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcbiAgICAgICAgICAgICAgIGFyclthXSA9IF9wcml2YXRlLmNvbnZlcnRfdG9fcHJvbWlzZShhcnJbYV0se1xuICAgICAgICAgICAgICAgICBwYXJlbnQgOiB0aGlzXG4gICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgIC8vUkVGIElTIEEgUFJPTUlTRS5cbiAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJPYmplY3QgY291bGQgbm90IGJlIGNvbnZlcnRlZCB0byBwcm9taXNlLlwiKTtcbiAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYXJyW2FdKTtcbiAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgfVxuXG4gICAgICAgLy9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuICAgICAgIGZvcih2YXIgYiBpbiB0aGlzLmRvd25zdHJlYW0pe1xuICAgICAgICAgICBpZihiID09PSBhcnJbYV0uaWQpe1xuICAgICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgICBcIkVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICdcIlxuICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIHRvIHF1ZXVlXCIrXCIgJ1wiXG4gICAgICAgICAgICAgICAgK3RoaXMuaWQrXCInLlxcbiBQcm9taXNlIG9iamVjdCBmb3IgJ1wiXG4gICAgICAgICAgICAgICAgK2FyclthXS5pZCtcIicgaXMgc2NoZWR1bGVkIHRvIHJlc29sdmUgZG93bnN0cmVhbSBmcm9tIHF1ZXVlICdcIlxuICAgICAgICAgICAgICAgICt0aGlzLmlkK1wiJyBzbyBpdCBjYW4ndCBiZSBhZGRlZCB1cHN0cmVhbS5cIlxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICx0aGlzKTtcbiAgICAgICAgICAgfVxuICAgICAgIH1cblxuICAgICAgIC8vQUREIFRPIFVQU1RSRUFNLCBET1dOU1RSRUFNLCBERVBFTkRFTkNJRVNcbiAgICAgICB0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0gPSBhcnJbYV07XG4gICAgICAgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKTtcbiAgIH1cblxuICAgcmV0dXJuIHRoaXMudXBzdHJlYW07XG59O1xuXG5cbi8qKlxuKiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7YXJyYXl9IGFyclxuKiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG4qL1xuX3B1YmxpYy5yZW1vdmUgPSBmdW5jdGlvbihhcnIpe1xuXG4gIC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBSRU1PVkFMXG4gIGlmKHRoaXMuc3RhdGUgIT09IDApe1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgbGlzdCBmcm9tIHF1ZXVlIGlkOidcIit0aGlzLmlkK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiKTtcbiAgfVxuXG4gIGZvcih2YXIgYSBpbiBhcnIpe1xuICAgICBpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuICAgICAgICBkZWxldGUgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdO1xuICAgICAgICBkZWxldGUgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF07XG4gICAgIH1cbiAgfVxufTtcblxuXG4vKipcbiogUmVzZXRzIGFuIGV4aXN0aW5nLHNldHRsZWQgcXVldWUgYmFjayB0byBPcmd5aW5nIHN0YXRlLlxuKiBDbGVhcnMgb3V0IHRoZSBkb3duc3RyZWFtLlxuKiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHJldHVybnMge19wcml2YXRlLnRwbHxCb29sZWFufVxuKi9cbl9wdWJsaWMucmVzZXQgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLnNldHRsZWQgIT09IDEgfHwgdGhpcy5zdGF0ZSAhPT0gMSl7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbiBvbmx5IHJlc2V0IGEgcXVldWUgc2V0dGxlZCB3aXRob3V0IGVycm9ycy5cIik7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB0aGlzLnNldHRsZWQgPSAwO1xuICB0aGlzLnN0YXRlID0gMDtcbiAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDA7XG4gIHRoaXMuZG9uZV9maXJlZCA9IDA7XG5cbiAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gIH1cblxuICAvL0NMRUFSIE9VVCBUSEUgRE9XTlNUUkVBTVxuICB0aGlzLmRvd25zdHJlYW0gPSB7fTtcbiAgdGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuICAvL1NFVCBORVcgQVVUTyBUSU1FT1VUXG4gIF9wcml2YXRlLmF1dG9fdGltZW91dC5jYWxsKHRoaXMsb3B0aW9ucy50aW1lb3V0KTtcblxuICAvL1BPSU5UTEVTUyAtIFdJTEwgSlVTVCBJTU1FRElBVEVMWSBSRVNPTFZFIFNFTEZcbiAgLy90aGlzLmNoZWNrX3NlbGYoKVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogQ2F1YWVzIGEgcXVldWUgdG8gbG9vayBvdmVyIGl0cyBkZXBlbmRlbmNpZXMgYW5kIHNlZSBpZiBpdFxuKiBjYW4gYmUgcmVzb2x2ZWQuXG4qXG4qIFRoaXMgaXMgZG9uZSBhdXRvbWF0aWNhbGx5IGJ5IGVhY2ggZGVwZW5kZW5jeSB0aGF0IGxvYWRzLFxuKiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcbipcbiogLWRlYnVnZ2luZ1xuKlxuKiAtdGhlIHF1ZXVlIGhhcyBiZWVuIHJlc2V0IGFuZCBubyBuZXdcbiogZGVwZW5kZW5jaWVzIHdlcmUgc2luY2UgYWRkZWQuXG4qXG4qIEByZXR1cm5zIHtpbnR9IFN0YXRlIG9mIHRoZSBxdWV1ZS5cbiovXG5fcHVibGljLmNoZWNrX3NlbGYgPSBmdW5jdGlvbigpe1xuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcbiAgX3ByaXZhdGUucmVjZWl2ZV9zaWduYWwodGhpcyx0aGlzLmlkKTtcbiAgcmV0dXJuIHRoaXMuc3RhdGU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKSxcbiAgICBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKSxcbiAgICBDYXN0ID0gcmVxdWlyZSgnLi9jYXN0LmpzJyksXG4gICAgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbi8qKlxuICogQG5hbWVzcGFjZSBvcmd5XG4gKi9cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgZnJvbSBhIHZhbHVlIGFuZCBhbiBpZCBhbmQgYXV0b21hdGljYWxseVxuKiByZXNvbHZlcyBpdC5cbipcbiogQG1lbWJlcm9mIG9yZ3lcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH0gIGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBQYXNzYWJsZSBvcHRpb25zXG4qIEByZXR1cm5zIHtvYmplY3R9IHJlc29sdmVkIGRlZmVycmVkXG4qL1xuZGVmaW5lIDogZnVuY3Rpb24oaWQsZGF0YSxvcHRpb25zKXtcblxuICAgIHZhciBkZWY7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsO1xuICAgIG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGw7XG5cbiAgICAvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcbiAgICBpZih0eXBlb2YgaWQgIT09ICdzdHJpbmcnKXtcbiAgICAgIENvbmZpZy5kZWJ1ZyhcIk11c3Qgc2V0IGlkIHdoZW4gZGVmaW5pbmcgYW4gaW5zdGFuY2UuXCIpO1xuICAgIH1cblxuICAgIC8vQ2hlY2sgbm8gZXhpc3RpbmcgaW5zdGFuY2UgZGVmaW5lZCB3aXRoIHNhbWUgaWRcbiAgICBpZihDb25maWcubGlzdFtpZF0gJiYgQ29uZmlnLmxpc3RbaWRdLnNldHRsZWQgPT09IDEpe1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbid0IGRlZmluZSBcIiArIGlkICsgXCIuIEFscmVhZHkgcmVzb2x2ZWQuXCIpO1xuICAgIH1cblxuICAgIG9wdGlvbnMuaWQgPSBpZDtcblxuICAgIGlmKG9wdGlvbnMuZGVwZW5kZW5jaWVzICE9PSBudWxsXG4gICAgICAmJiBvcHRpb25zLmRlcGVuZGVuY2llcyBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIC8vRGVmaW5lIGFzIGEgcXVldWUgLSBjYW4ndCBhdXRvcmVzb2x2ZSBiZWNhdXNlIHdlIGhhdmUgZGVwc1xuICAgICAgdmFyIGRlcHMgPSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlbGV0ZSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlZiA9IFF1ZXVlKGRlcHMsb3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAvL0RlZmluZSBhcyBhIGRlZmVycmVkXG4gICAgICBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuICAgICAgLy9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG4gICAgICBpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG4gICAgICAgICYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgICAgIHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcbiAgICAgICAgLy9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuICAgICAgICBkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcbiAgICAgICAgZGVmLnJlc29sdmUoZGF0YSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn0sXG5cblxuLyoqXG4gKiBHZXRzIGFuIGV4aXNpdGluZyBkZWZlcnJlZCAvIHF1ZXVlIG9iamVjdCBmcm9tIGdsb2JhbCBzdG9yZS5cbiAqIFJldHVybnMgbnVsbCBpZiBub25lIGZvdW5kLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIElkIG9mIGRlZmVycmVkIG9yIHF1ZXVlIG9iamVjdC5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIHwgcXVldWUgfCBudWxsXG4gKi9cbmdldCA6IGZ1bmN0aW9uKGlkKXtcbiAgaWYoQ29uZmlnLmxpc3RbaWRdKXtcbiAgICByZXR1cm4gQ29uZmlnLmxpc3RbaWRdO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn0sXG5cblxuLyoqXG4gKiBBZGQvcmVtb3ZlIGFuIHVwc3RyZWFtIGRlcGVuZGVuY3kgdG8vZnJvbSBhIHF1ZXVlLlxuICpcbiAqIENhbiB1c2UgYSBxdWV1ZSBpZCwgZXZlbiBmb3IgYSBxdWV1ZSB0aGF0IGlzIHlldCB0byBiZSBjcmVhdGVkLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKlxuICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSB0Z3QgUXVldWUgaWQgLyBxdWV1ZSBvYmplY3RcbiAqIEBwYXJhbSB7YXJyYXl9ICBhcnIgIEFycmF5IG9mIHByb21pc2UgaWRzIG9yIGRlcGVuZGVuY3kgb2JqZWN0c1xuICogQHBhcmFtIHtib29sZWFufSBhZGQgIElmIHRydWUgPGI+QUREPC9iPiBhcnJheSB0byBxdWV1ZSBkZXBlbmRlbmNpZXMsIElmIGZhbHNlIDxiPlJFTU9WRTwvYj4gYXJyYXkgZnJvbSBxdWV1ZSBkZXBlbmRlbmNpZXNcbiAqXG4gKiBAcmV0dXJuIHtvYmplY3R9IHF1ZXVlXG4gKi9cbmFzc2lnbiA6IGZ1bmN0aW9uKHRndCxhcnIsYWRkKXtcblxuICAgIGFkZCA9ICh0eXBlb2YgYWRkID09PSBcImJvb2xlYW5cIikgPyBhZGQgOiAxO1xuXG4gICAgdmFyIGlkLHE7XG4gICAgc3dpdGNoKHRydWUpe1xuICAgICAgICBjYXNlKHR5cGVvZiB0Z3QgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0Z3QudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG4gICAgICAgICAgICBpZCA9IHRndC5pZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlKHR5cGVvZiB0Z3QgPT09ICdzdHJpbmcnKTpcbiAgICAgICAgICAgIGlkID0gdGd0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQXNzaWduIHRhcmdldCBtdXN0IGJlIGEgcXVldWUgb2JqZWN0IG9yIHRoZSBpZCBvZiBhIHF1ZXVlLlwiLHRoaXMpO1xuICAgIH1cblxuICAgIC8vSUYgVEFSR0VUIEFMUkVBRFkgTElTVEVEXG4gICAgaWYoQ29uZmlnLmxpc3RbaWRdICYmIENvbmZpZy5saXN0W2lkXS5tb2RlbCA9PT0gJ3F1ZXVlJyl7XG4gICAgICAgIHEgPSBDb25maWcubGlzdFtpZF07XG5cbiAgICAgICAgLy89PiBBREQgVE8gUVVFVUUnUyBVUFNUUkVBTVxuICAgICAgICBpZihhZGQpe1xuICAgICAgICAgICAgcS5hZGQoYXJyKTtcbiAgICAgICAgfVxuICAgICAgICAvLz0+IFJFTU9WRSBGUk9NIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHEucmVtb3ZlKGFycik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy9DUkVBVEUgTkVXIFFVRVVFIEFORCBBREQgREVQRU5ERU5DSUVTXG4gICAgZWxzZSBpZihhZGQpe1xuICAgICAgICBxID0gUXVldWUoYXJyLHtcbiAgICAgICAgICAgIGlkIDogaWRcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vRVJST1I6IENBTidUIFJFTU9WRSBGUk9NIEEgUVVFVUUgVEhBVCBET0VTIE5PVCBFWElTVFxuICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGRlcGVuZGVuY2llcyBmcm9tIGEgcXVldWUgdGhhdCBkb2VzIG5vdCBleGlzdC5cIix0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcTtcbn0sXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5kZWZlcnJlZCA6IERlZmVycmVkLFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xucXVldWUgOiBRdWV1ZSxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbmNhc3QgOiBDYXN0LFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xuY29uZmlnIDogQ29uZmlnLmNvbmZpZ1xuXG59O1xuIl19
