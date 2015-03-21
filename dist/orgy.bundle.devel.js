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
 * > - then()
 * > 
 * > - error()
 * >
 * > If the casted object has an id or url property set, the id or url
 * [in that order] will become the id of the returned deferred object.
 * 
 * @memberof orgy
 * @function cast
 * 
 * @param {object} obj A thenable
 * @returns {object} deferred
 */
module.exports = function(obj){

    var required = ["then","error"];
    for(var i in required){
        if(!obj[required[i]]){
            return Config.debug("Castable objects require the following properties: "
                + required[i]);
        }
    }

    var options = {};
    if(obj.id){
        options.id = obj.id;
    }
    else if(obj.url){
        options.id = obj.url;
    }
    else{
      //if no id, use backtrace origin
      if(!options.id){
        options.id = Config.generate_id();
      }
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
 *  - {number} <b>timeout</b>
 *  - {string} <b>cwd</b> Sets current working directory. Server side scripts only.
 *  - {boolean} <b>debug_mode</b>
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

    var msgs;
    if(msg instanceof Array){
        msgs = msg.join("\n");
    }

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
 * Makes a shallow copy of an array.
 * Makes a copy of an object so long as it is JSON
 *
 * @param {array} donors /array of donor objects,
 *                overwritten from right to left
 * @returns {object}
 */
_public.naive_cloner = function(donors){
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
};


_public.generate_id = function(){
  return new Date().getTime() + '-' + (++this.i);  
}


module.exports = _public;

}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
var Config = require('./config.js');
var _private = require('./deferred.private.js');

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
        //CREATE NEW INSTANCE OF DEFERRED CLASS
        _o = _private.factory(options);

        //ACTIVATE DEFERRED
        _o = _private.activate(_o);
    }

    return _o;
};
},{"./config.js":4,"./deferred.private.js":6}],6:[function(require,module,exports){
var Config = require('./config.js');
var File_loader = require('./file_loader.js');


var _public = {};


_public.factory = function(options){

    var DeferredSchema = require('./deferred.schema.js');
    var _o = Config.naive_cloner([
      DeferredSchema
      ,options
    ]);

    //if no id, use backtrace origin
    if(!options.id){
      _o.id = Config.generate_id();
    }

    return _o;
};


_public.activate = function(obj){

    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if(Config.list[obj.id] && !Config.list[obj.id].overwritable){
        Config.debug("Tried to overwrite "+obj.id+" without overwrite permissions.");
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

},{"./config.js":4,"./deferred.js":5,"./deferred.schema.js":7,"./file_loader.js":8,"./queue.js":9}],7:[function(require,module,exports){
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
    msg = msg + "\n Turn debug mode on for more info.";
    console.log(msg);
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
(function (process){
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
    var pathInfo = _private.native.prepare_path(path,deferred);

    var r = require(pathInfo.path);

    //Change back to original working dir
    if(pathInfo.dirchanged) process.chdir(pathInfo.owd);

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
  _private.native.get(path,deferred,function(r){
    deferred.resolve(r);
  })
}

_private.native.get = function (path,deferred,callback){
  if(path[0] === '.'){

    var pathInfo = _private.native.prepare_path(path,deferred);

    //file system
    var Fs = require('fs');
    Fs.readFile(pathInfo.path, function (err, data) {
      if (err) throw err;
      callback(data);
    });

    //Change back to original working dir
    if(pathInfo.dirchanged) process.chdir(pathInfo.owd);
  }
  else{
    //http
    var Http = require('http');
    Http.get({ path : path}, function (res) {
      var data = '';
      res.on('data', function (buf) {
          data += buf;
      });
      res.on('end', function () {
          callback(data);
      });
    });
  }
}

_private.native.prepare_path = function(path,deferred){
  var owd = process.cwd(), //keep track of starting point so we can return
      cwd = (deferred.cwd) ? deferred.cwd :
            ((Config.settings.cwd) ? Config.settings.cwd : false)
  ,dirchanged = false;

  if(cwd){
    process.chdir(cwd);
    dirchanged = true;
  }
  else{
    cwd = owd;
  }

  return {
    owd : owd
    ,path : cwd+'/'+path
    ,dirchanged : dirchanged
  };
}
module.exports = _public;

}).call(this,require('_process'))

},{"./config.js":4,"_process":2,"fs":1,"http":1,"vm":1}],9:[function(require,module,exports){
var Config = require('./config.js');
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

    //CREATE NEW QUEUE OBJECT
    var _o = _private.factory(options);

    //ACTIVATE QUEUE
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
},{"./config.js":4,"./queue.private.js":10}],10:[function(require,module,exports){
var Config = require('./config.js');
var QueueSchema = require('./queue.schema.js');
var _proto = require('./deferred.private.js');
var _public = Object.create(_proto,{});


_public.factory = function(options){

  //CREATE A NEW QUEUE OBJECT
  var _o = Config.naive_cloner([
    QueueSchema
    ,options
  ]);

  //if no id, use backtrace origin
  if(!options.id){
    _o.id = Config.generate_id();
  }

  return _o;
};


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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9jYXN0LmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9kZWZlcnJlZC5qcyIsInNyYy9kZWZlcnJlZC5wcml2YXRlLmpzIiwic3JjL2RlZmVycmVkLnNjaGVtYS5qcyIsInNyYy9maWxlX2xvYWRlci5qcyIsInNyYy9xdWV1ZS5qcyIsInNyYy9xdWV1ZS5wcml2YXRlLmpzIiwic3JjL3F1ZXVlLnNjaGVtYS5qcyIsInNyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3p0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsbnVsbCwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpLFxuICAgIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG5cbi8qKlxuICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cbiAqXG4gKiA+IFRvIHF1YWxpZnkgYXMgYSA8Yj50aGVuYWJsZTwvYj4sIHRoZSBvYmplY3QgdG8gYmUgY2FzdGVkIG11c3QgaGF2ZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gKiA+XG4gKiA+IC0gdGhlbigpXG4gKiA+IFxuICogPiAtIGVycm9yKClcbiAqID5cbiAqID4gSWYgdGhlIGNhc3RlZCBvYmplY3QgaGFzIGFuIGlkIG9yIHVybCBwcm9wZXJ0eSBzZXQsIHRoZSBpZCBvciB1cmxcbiAqIFtpbiB0aGF0IG9yZGVyXSB3aWxsIGJlY29tZSB0aGUgaWQgb2YgdGhlIHJldHVybmVkIGRlZmVycmVkIG9iamVjdC5cbiAqIFxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBjYXN0XG4gKiBcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogQSB0aGVuYWJsZVxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1widGhlblwiLFwiZXJyb3JcIl07XG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKXtcbiAgICAgICAgaWYoIW9ialtyZXF1aXJlZFtpXV0pe1xuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhc3RhYmxlIG9iamVjdHMgcmVxdWlyZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6IFwiXG4gICAgICAgICAgICAgICAgKyByZXF1aXJlZFtpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIGlmKG9iai5pZCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBvYmouaWQ7XG4gICAgfVxuICAgIGVsc2UgaWYob2JqLnVybCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBvYmoudXJsO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgICAgIGlmKCFvcHRpb25zLmlkKXtcbiAgICAgICAgb3B0aW9ucy5pZCA9IENvbmZpZy5nZW5lcmF0ZV9pZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vQ3JlYXRlIGEgZGVmZXJyZWRcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAvL0NyZWF0ZSByZXNvbHZlclxuICAgIHZhciByZXNvbHZlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSk7XG4gICAgfTtcblxuICAgIC8vU2V0IFJlc29sdmVyXG4gICAgb2JqLnRoZW4ocmVzb2x2ZXIpO1xuXG4gICAgLy9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG4gICAgdmFyIGVyciA9IGZ1bmN0aW9uKGVycil7XG4gICAgICBkZWYucmVqZWN0KGVycik7XG4gICAgfTtcbiAgICBvYmouZXJyb3IoZXJyKTtcblxuICAgIC8vUmV0dXJuIGRlZmVycmVkXG4gICAgcmV0dXJuIGRlZjtcbn07XG4iLCJ2YXIgX3B1YmxpYyA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQSBkaXJlY3Rvcnkgb2YgYWxsIHByb21pc2VzLCBkZWZlcnJlZHMsIGFuZCBxdWV1ZXMuXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5saXN0ID0ge307XG5cblxuLyoqXG4gKiBpdGVyYXRvciBmb3IgaWRzXG4gKiBAdHlwZSBpbnRlZ2VyXG4gKi9cbl9wdWJsaWMuaSA9IDA7XG5cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cbiAqXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5zZXR0aW5ncyA9IHtcblxuICAgIGRlYnVnX21vZGUgOiAxXG4gICAgLy9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG4gICAgLy9iZWNhdXNlIG5vZGUgaGFzIG5vIGNvbnN0YW50IGZvciB0aGlzXG4gICAgLGN3ZCA6IGZhbHNlXG4gICAgLG1vZGUgOiAoZnVuY3Rpb24oKXtcbiAgICAgICAgaWYodHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MgKyAnJyA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKXtcbiAgICAgICAgICAgIC8vIGlzIG5vZGVcbiAgICAgICAgICAgIHJldHVybiBcIm5hdGl2ZVwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvLyBub3Qgbm9kZVxuICAgICAgICAgICAgcmV0dXJuIFwiYnJvd3NlclwiO1xuICAgICAgICB9XG4gICAgfSgpKVxuICAgIC8qKlxuICAgICAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuICAgICAqIC0gb25TZXR0bGUgICAvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcbiAgICAgKlxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuICAgICxob29rcyA6IHtcbiAgICB9XG4gICAgLHRpbWVvdXQgOiA1MDAwIC8vZGVmYXVsdCB0aW1lb3V0XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBPcHRpb25zIHlvdSB3aXNoIHRvIHBhc3MgdG8gc2V0IHRoZSBnbG9iYWwgY29uZmlndXJhdGlvblxuICogXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGNvbmZpZ1xuICogXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIExpc3Qgb2Ygb3B0aW9uczogXG4gKiAgLSB7bnVtYmVyfSA8Yj50aW1lb3V0PC9iPlxuICogIC0ge3N0cmluZ30gPGI+Y3dkPC9iPiBTZXRzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuIFNlcnZlciBzaWRlIHNjcmlwdHMgb25seS5cbiAqICAtIHtib29sZWFufSA8Yj5kZWJ1Z19tb2RlPC9iPlxuICogQHJldHVybnMge29iamVjdH0gY29uZmlndXJhdGlvbiBzZXR0aW5nc1xuICovXG5fcHVibGljLmNvbmZpZyA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICBpZih0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jyl7XG4gICAgICAgIGZvcih2YXIgaSBpbiBvYmope1xuICAgICAgICAgIF9wdWJsaWMuc2V0dGluZ3NbaV0gPSBvYmpbaV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX3B1YmxpYy5zZXR0aW5ncztcbn07XG5cblxuLyoqXG4gKiBEZWJ1Z2dpbmcgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBtc2dcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHVibGljLmRlYnVnID0gZnVuY3Rpb24obXNnLGRlZil7XG5cbiAgICB2YXIgbXNncztcbiAgICBpZihtc2cgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAgIG1zZ3MgPSBtc2cuam9pbihcIlxcblwiKTtcbiAgICB9XG5cbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtc2dzKTtcbiAgICBjb25zb2xlLmxvZyhlLnN0YWNrKTtcblxuXG4gICAgaWYodGhpcy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICAgIC8vdHVybiBvZmYgZGVidWdfbW9kZSB0byBhdm9pZCBoaXR0aW5nIGRlYnVnZ2VyXG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG5cbiAgICBpZihfcHVibGljLnNldHRpbmdzLm1vZGUgPT09ICdicm93c2VyJyl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgcHJvY2Vzcy5leGl0KCk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIE1ha2VzIGEgc2hhbGxvdyBjb3B5IG9mIGFuIGFycmF5LlxuICogTWFrZXMgYSBjb3B5IG9mIGFuIG9iamVjdCBzbyBsb25nIGFzIGl0IGlzIEpTT05cbiAqXG4gKiBAcGFyYW0ge2FycmF5fSBkb25vcnMgL2FycmF5IG9mIGRvbm9yIG9iamVjdHMsXG4gKiAgICAgICAgICAgICAgICBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMubmFpdmVfY2xvbmVyID0gZnVuY3Rpb24oZG9ub3JzKXtcbiAgICB2YXIgbyA9IHt9O1xuICAgIGZvcih2YXIgYSBpbiBkb25vcnMpe1xuICAgICAgICBmb3IodmFyIGIgaW4gZG9ub3JzW2FdKXtcbiAgICAgICAgICAgIGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgICAgICAgICAgICBvW2JdID0gZG9ub3JzW2FdW2JdLnNsaWNlKDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZih0eXBlb2YgZG9ub3JzW2FdW2JdID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBvW2JdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkb25vcnNbYV1bYl0pKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIG9bYl0gPSBkb25vcnNbYV1bYl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG87XG59O1xuXG5cbl9wdWJsaWMuZ2VuZXJhdGVfaWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnLScgKyAoKyt0aGlzLmkpOyAgXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIG9iamVjdC5cbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gZGVmZXJyZWRcbiAqIFxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuICogIC0ge3N0cmluZ30gPGI+aWQ8L2I+ICBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC4gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuIE9wdGlvbmFsLlxuICogIFxuICogIC0ge251bWJlcn0gPGI+dGltZW91dDwvYj4gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLiBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQgWzUwMDBdLiBcbiAqICBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suIFxuICogIFRoZW4sZG9uZSBkZWxheXMgd2lsbCBub3QgZmxhZyBhIHRpbWVvdXQgYmVjYXVzZSB0aGV5IGFyZSBjYWxsZWQgYWZ0ZXIgdGhlIGluc3RhbmNlIGlzIGNvbnNpZGVyZWQgcmVzb2x2ZWQuXG4gKiAgXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYob3B0aW9ucy5pZCAmJiBDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG4gICAgICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBERUZFUlJFRCBDTEFTU1xuICAgICAgICBfbyA9IF9wcml2YXRlLmZhY3Rvcnkob3B0aW9ucyk7XG5cbiAgICAgICAgLy9BQ1RJVkFURSBERUZFUlJFRFxuICAgICAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59OyIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIEZpbGVfbG9hZGVyID0gcmVxdWlyZSgnLi9maWxlX2xvYWRlci5qcycpO1xuXG5cbnZhciBfcHVibGljID0ge307XG5cblxuX3B1YmxpYy5mYWN0b3J5ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgICB2YXIgRGVmZXJyZWRTY2hlbWEgPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpO1xuICAgIHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIoW1xuICAgICAgRGVmZXJyZWRTY2hlbWFcbiAgICAgICxvcHRpb25zXG4gICAgXSk7XG5cbiAgICAvL2lmIG5vIGlkLCB1c2UgYmFja3RyYWNlIG9yaWdpblxuICAgIGlmKCFvcHRpb25zLmlkKXtcbiAgICAgIF9vLmlkID0gQ29uZmlnLmdlbmVyYXRlX2lkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9vO1xufTtcblxuXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuICAgIGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgIUNvbmZpZy5saXN0W29iai5pZF0ub3ZlcndyaXRhYmxlKXtcbiAgICAgICAgQ29uZmlnLmRlYnVnKFwiVHJpZWQgdG8gb3ZlcndyaXRlIFwiK29iai5pZCtcIiB3aXRob3V0IG92ZXJ3cml0ZSBwZXJtaXNzaW9ucy5cIik7XG4gICAgICAgIHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuICAgIH1cblxuICAgIC8vU0FWRSBUTyBNQVNURVIgTElTVFxuICAgIENvbmZpZy5saXN0W29iai5pZF0gPSBvYmo7XG5cbiAgICAvL0FVVE8gVElNRU9VVFxuICAgIF9wdWJsaWMuYXV0b190aW1lb3V0LmNhbGwob2JqKTtcblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uQWN0aXZhdGUpe1xuICAgICAgQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uQWN0aXZhdGUob2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5fcHVibGljLnNldHRsZSA9IGZ1bmN0aW9uKGRlZil7XG5cbiAgICAvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcbiAgICBpZihkZWYudGltZW91dF9pZCl7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWYudGltZW91dF9pZCk7XG4gICAgfVxuXG5cbiAgICAvL1NldCBzdGF0ZSB0byByZXNvbHZlZFxuICAgIF9wdWJsaWMuc2V0X3N0YXRlKGRlZiwxKTtcblxuXG4gICAgLy9DYWxsIGhvb2tcbiAgICBpZihDb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUpe1xuICAgICAgQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKGRlZik7XG4gICAgfVxuXG5cbiAgICAvL0FkZCBkb25lIGFzIGEgY2FsbGJhY2sgdG8gdGhlbiBjaGFpbiBjb21wbGV0aW9uLlxuICAgIGRlZi5jYWxsYmFja3MudGhlbi5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oZDIsaXRpbmVyYXJ5LGxhc3Qpe1xuICAgICAgICBkZWYuY2Fib29zZSA9IGxhc3Q7XG5cbiAgICAgICAgLy9SdW4gZG9uZVxuICAgICAgICBfcHVibGljLnJ1bl90cmFpbihcbiAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgLGRlZi5jYWxsYmFja3MuZG9uZVxuICAgICAgICAgICAgLGRlZi5jYWJvb3NlXG4gICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICk7XG5cbiAgICB9KTtcblxuXG4gICAgLy9SdW4gdGhlbiBxdWV1ZVxuICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICBkZWZcbiAgICAgICAgLGRlZi5jYWxsYmFja3MudGhlblxuICAgICAgICAsZGVmLnZhbHVlXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICk7XG5cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBmdW5jdGlvbnMgc2VxdWVudGlhbGx5IGFzIGEgcGFydGlhbCBmdW5jdGlvbi5cbiAqIEVhY2ggZnVuY3Rpb24ncyBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IG9mIGl0cyBwcmVkZWNlc3NvciBmdW5jdGlvbi5cbiAqXG4gKiBCeSBkZWZhdWx0LCBleGVjdXRpb24gY2hhaW4gaXMgcGF1c2VkIHdoZW4gYW55IGZ1bmN0aW9uXG4gKiByZXR1cm5zIGFuIHVucmVzb2x2ZWQgZGVmZXJyZWQuIChwYXVzZV9vbl9kZWZlcnJlZCkgW09QVElPTkFMXVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWYgIC9kZWZlcnJlZCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC9pdGluZXJhcnlcbiAqICAgICAgdHJhaW4gICAgICAge2FycmF5fVxuICogICAgICBob29rcyAgICAgICB7b2JqZWN0fVxuICogICAgICAgICAgb25CZWZvcmUgICAgICAgIHthcnJheX1cbiAqICAgICAgICAgIG9uQ29tcGxldGUgICAgICB7YXJyYXl9XG4gKiBAcGFyYW0ge21peGVkfSBwYXJhbSAvcGFyYW0gdG8gcGFzcyB0byBmaXJzdCBjYWxsYmFja1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqICAgICAgcGF1c2Vfb25fZGVmZXJyZWQgICB7Ym9vbGVhbn1cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5ydW5fdHJhaW4gPSBmdW5jdGlvbihkZWYsb2JqLHBhcmFtLG9wdGlvbnMpe1xuXG4gICAgLy9hbGxvdyBwcmV2aW91cyByZXR1cm4gdmFsdWVzIHRvIGJlIHBhc3NlZCBkb3duIGNoYWluXG4gICAgdmFyIHIgPSBwYXJhbSB8fCBkZWYuY2Fib29zZSB8fCBkZWYudmFsdWU7XG5cbiAgICAvL29uQmVmb3JlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkJlZm9yZS50cmFpbi5sZW5ndGggPiAwKXtcbiAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICxvYmouaG9va3Mub25CZWZvcmVcbiAgICAgICAgICAgICxwYXJhbVxuICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHdoaWxlKG9iai50cmFpbi5sZW5ndGggPiAwKXtcblxuICAgICAgICAvL3JlbW92ZSBmbiB0byBleGVjdXRlXG4gICAgICAgIHZhciBsYXN0ID0gb2JqLnRyYWluLnNoaWZ0KCk7XG4gICAgICAgIGRlZi5leGVjdXRpb25faGlzdG9yeS5wdXNoKGxhc3QpO1xuXG4gICAgICAgIC8vZGVmLmNhYm9vc2UgbmVlZGVkIGZvciB0aGVuIGNoYWluIGRlY2xhcmVkIGFmdGVyIHJlc29sdmVkIGluc3RhbmNlXG4gICAgICAgIHIgPSBkZWYuY2Fib29zZSA9IGxhc3QuY2FsbChkZWYsZGVmLnZhbHVlLGRlZixyKTtcblxuICAgICAgICAvL2lmIHJlc3VsdCBpcyBhbiB0aGVuYWJsZSwgaGFsdCBleGVjdXRpb25cbiAgICAgICAgLy9hbmQgcnVuIHVuZmlyZWQgYXJyIHdoZW4gdGhlbmFibGUgc2V0dGxlc1xuICAgICAgICBpZihvcHRpb25zLnBhdXNlX29uX2RlZmVycmVkKXtcblxuICAgICAgICAgICAgLy9JZiByIGlzIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuICAgICAgICAgICAgaWYociAmJiByLnRoZW4gJiYgci5zZXR0bGVkICE9PSAxKXtcblxuICAgICAgICAgICAgICAgIC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXIgciByZXNvbHZlc1xuICAgICAgICAgICAgICAgIHIuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgICAgICAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICxyXG4gICAgICAgICAgICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9JZiBpcyBhbiBhcnJheSB0aGFuIGNvbnRhaW5zIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuICAgICAgICAgICAgZWxzZSBpZihyIGluc3RhbmNlb2YgQXJyYXkpe1xuXG4gICAgICAgICAgICAgICAgdmFyIHRoZW5hYmxlcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHIpe1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHJbaV0udGhlbiAmJiByW2ldLnNldHRsZWQgIT09IDEpe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVuYWJsZXMucHVzaChyW2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gKGZ1bmN0aW9uKHQsZGVmLG9iaixwYXJhbSl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0JhaWwgaWYgYW55IHRoZW5hYmxlcyB1bnNldHRsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodFtpXS5zZXR0bGVkICE9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcHVibGljLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLG9ialxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSh0aGVuYWJsZXMsZGVmLG9iaixwYXJhbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxsIHRoZW5hYmxlcyBmb3VuZCBpbiByIHJlc29sdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbaV0uY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZuKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy90ZXJtaW5hdGUgZXhlY3V0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL29uQ29tcGxldGUgZXZlbnRcbiAgICBpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wdWJsaWMucnVuX3RyYWluKGRlZixvYmouaG9va3Mub25Db21wbGV0ZSxyLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfSk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEBwYXJhbSB7bnVtYmVyfSBpbnRcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZixpbnQpe1xuXG4gICAgZGVmLnN0YXRlID0gaW50O1xuXG4gICAgLy9JRiBSRVNPTFZFRCBPUiBSRUpFQ1RFRCwgU0VUVExFXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG4gICAgICAgIGRlZi5zZXR0bGVkID0gMTtcbiAgICB9XG5cbiAgICBpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcbiAgICAgICAgX3B1YmxpYy5zaWduYWxfZG93bnN0cmVhbShkZWYpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBHZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbl9wdWJsaWMuZ2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmKXtcbiAgICByZXR1cm4gZGVmLnN0YXRlO1xufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIGF1dG9tYXRpYyB0aW1lb3V0IG9uIGEgcHJvbWlzZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtpbnRlZ2VyfSB0aW1lb3V0IChvcHRpb25hbClcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHVibGljLmF1dG9fdGltZW91dCA9IGZ1bmN0aW9uKHRpbWVvdXQpe1xuXG4gICAgdGhpcy50aW1lb3V0ID0gKHR5cGVvZiB0aW1lb3V0ID09PSAndW5kZWZpbmVkJylcbiAgICA/IHRoaXMudGltZW91dCA6IHRpbWVvdXQ7XG5cbiAgICAvL0FVVE8gUkVKRUNUIE9OIHRpbWVvdXRcbiAgICBpZighdGhpcy50eXBlIHx8IHRoaXMudHlwZSAhPT0gJ3RpbWVyJyl7XG5cbiAgICAgICAgLy9ERUxFVEUgUFJFVklPVVMgVElNRU9VVCBJRiBFWElTVFNcbiAgICAgICAgaWYodGhpcy50aW1lb3V0X2lkKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIHRoaXMudGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgXCJBdXRvIHRpbWVvdXQgdGhpcy50aW1lb3V0IGNhbm5vdCBiZSB1bmRlZmluZWQuXCJcbiAgICAgICAgICAgICAgLHRoaXMuaWRcbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMudGltZW91dCA9PT0gLTEpe1xuICAgICAgICAgICAgLy9OTyBBVVRPIFRJTUVPVVQgU0VUXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcblxuICAgICAgICB0aGlzLnRpbWVvdXRfaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfcHVibGljLmF1dG9fdGltZW91dF9jYi5jYWxsKHNjb3BlKTtcbiAgICAgICAgfSwgdGhpcy50aW1lb3V0KTtcblxuICAgIH1cbiAgICBlbHNle1xuICAgICAgICAvL0B0b2RvIFdIRU4gQSBUSU1FUiwgQUREIERVUkFUSU9OIFRPIEFMTCBVUFNUUkVBTSBBTkQgTEFURVJBTD9cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgYXV0b3RpbWVvdXQuIERlY2xhcmF0aW9uIGhlcmUgYXZvaWRzIG1lbW9yeSBsZWFrLlxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLmF1dG9fdGltZW91dF9jYiA9IGZ1bmN0aW9uKCl7XG5cbiAgICBpZih0aGlzLnN0YXRlICE9PSAxKXtcblxuICAgICAgICAvL0dFVCBUSEUgVVBTVFJFQU0gRVJST1IgSURcbiAgICAgICAgdmFyIG1zZ3MgPSBbXTtcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcblxuICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgaWYob2JqLnN0YXRlICE9PSAxKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LFxuICAgICAgICAgKiBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuICAgICAgICAgKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYoQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuICAgICAgICAgICAgdmFyIHIgPSBfcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkodGhpcywndXBzdHJlYW0nLGZuKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChzY29wZS5pZCArIFwiOiByZWplY3RlZCBieSBhdXRvIHRpbWVvdXQgYWZ0ZXIgXCJcbiAgICAgICAgICAgICAgICAgICAgKyB0aGlzLnRpbWVvdXQgKyBcIm1zXCIpO1xuICAgICAgICAgICAgbXNncy5wdXNoKFwiQ2F1c2U6XCIpO1xuICAgICAgICAgICAgbXNncy5wdXNoKHIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVqZWN0LmNhbGwodGhpcyxtc2dzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVqZWN0LmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbl9wdWJsaWMuZXJyb3IgPSBmdW5jdGlvbihjYil7XG5cbiAgICAvL0lGIEVSUk9SIEFMUkVBRFkgVEhST1dOLCBFWEVDVVRFIENCIElNTUVESUFURUxZXG4gICAgaWYodGhpcy5zdGF0ZSA9PT0gMil7XG4gICAgICAgIGNiKCk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHRoaXMucmVqZWN0X3EucHVzaChjYik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU2lnbmFscyBhbGwgZG93bnN0cmVhbSBwcm9taXNlcyB0aGF0IF9wdWJsaWMgcHJvbWlzZSBvYmplY3Qnc1xuICogc3RhdGUgaGFzIGNoYW5nZWQuXG4gKlxuICogQHRvZG8gU2luY2UgdGhlIHNhbWUgcXVldWUgbWF5IGhhdmUgYmVlbiBhc3NpZ25lZCB0d2ljZSBkaXJlY3RseSBvclxuICogaW5kaXJlY3RseSB2aWEgc2hhcmVkIGRlcGVuZGVuY2llcywgbWFrZSBzdXJlIG5vdCB0byBkb3VibGUgcmVzb2x2ZVxuICogLSB3aGljaCB0aHJvd3MgYW4gZXJyb3IuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBkZWZlcnJlZC9xdWV1ZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMuc2lnbmFsX2Rvd25zdHJlYW0gPSBmdW5jdGlvbih0YXJnZXQpe1xuXG4gICAgLy9NQUtFIFNVUkUgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVEXG4gICAgZm9yKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcbiAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCA9PT0gMSl7XG5cbiAgICAgICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zdGF0ZSAhPT0gMSl7XG4gICAgICAgICAgICAvL3RyaWVkIHRvIHNldHRsZSBhIHJlamVjdGVkIGRvd25zdHJlYW1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy90cmllZCB0byBzZXR0bGUgYSBzdWNjZXNzZnVsbHkgc2V0dGxlZCBkb3duc3RyZWFtXG4gICAgICAgICAgICBDb25maWcuZGVidWcodGFyZ2V0LmlkICsgXCIgdHJpZWQgdG8gc2V0dGxlIHByb21pc2UgXCIrXCInXCIrdGFyZ2V0LmRvd25zdHJlYW1baV0uaWQrXCInIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBzZXR0bGVkLlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL05PVyBUSEFUIFdFIEtOT1cgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVELCBXRSBDQU4gSUdOT1JFIEFOWVxuICAgIC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuICAgIGZvciAodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuICAgICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkICE9PSAxKXtcbiAgICAgICAgICAgIF9wdWJsaWMucmVjZWl2ZV9zaWduYWwodGFyZ2V0LmRvd25zdHJlYW1baV0sdGFyZ2V0LmlkKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4qIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LCBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7c3RyaW5nfSBwcm9wTmFtZSAgICAgICAgICBUaGUgcHJvcGVydHkgbmFtZSBvZiB0aGUgYXJyYXkgdG8gYnViYmxlIHVwXG4qIEBwYXJhbSB7ZnVuY3Rpb259IGZuICAgICAgICAgICAgICBUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG4qIEBwYXJhbSB7YXJyYXl9IGJyZWFkY3J1bWIgICAgICAgICBUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcbiogQHJldHVybnMge21peGVkfVxuKi9cbl9wdWJsaWMuc2VhcmNoX29ial9yZWN1cnNpdmVseSA9IGZ1bmN0aW9uKG9iaixwcm9wTmFtZSxmbixicmVhZGNydW1iKXtcblxuICAgIGlmKHR5cGVvZiBicmVhZGNydW1iID09PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIGJyZWFkY3J1bWIgPSBbb2JqLmlkXTtcbiAgICB9XG5cbiAgICB2YXIgcjE7XG5cbiAgICBmb3IodmFyIGkgaW4gb2JqW3Byb3BOYW1lXSl7XG5cbiAgICAgICAgLy9SVU4gVEVTVFxuICAgICAgICByMSA9IGZuKG9ialtwcm9wTmFtZV1baV0pO1xuXG4gICAgICAgIGlmKHIxICE9PSBmYWxzZSl7XG4gICAgICAgIC8vTUFUQ0ggUkVUVVJORUQuIFJFQ1VSU0UgSU5UTyBNQVRDSCBJRiBIQVMgUFJPUEVSVFkgT0YgU0FNRSBOQU1FIFRPIFNFQVJDSFxuICAgICAgICAgICAgLy9DSEVDSyBUSEFUIFdFIEFSRU4nVCBDQVVHSFQgSU4gQSBDSVJDVUxBUiBMT09QXG4gICAgICAgICAgICBpZihicmVhZGNydW1iLmluZGV4T2YocjEpICE9PSAtMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2lyY3VsYXIgY29uZGl0aW9uIGluIHJlY3Vyc2l2ZSBzZWFyY2ggb2Ygb2JqIHByb3BlcnR5ICdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgK3Byb3BOYW1lK1wiJyBvZiBvYmplY3QgXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICsoKHR5cGVvZiBvYmouaWQgIT09ICd1bmRlZmluZWQnKSA/IFwiJ1wiK29iai5pZCtcIidcIiA6ICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgK1wiLiBPZmZlbmRpbmcgdmFsdWU6IFwiK3IxXG4gICAgICAgICAgICAgICAgICAgICwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFkY3J1bWIucHVzaChyMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnJlYWRjcnVtYi5qb2luKFwiIFtkZXBlbmRzIG9uXT0+IFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSkoKVxuICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhZGNydW1iLnB1c2gocjEpO1xuXG4gICAgICAgICAgICBpZihvYmpbcHJvcE5hbWVdW2ldW3Byb3BOYW1lXSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9wdWJsaWMuc2VhcmNoX29ial9yZWN1cnNpdmVseShvYmpbcHJvcE5hbWVdW2ldLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIGJyZWFkY3J1bWI7XG59O1xuXG5cbi8qKlxuICogQ29udmVydHMgYSBwcm9taXNlIGRlc2NyaXB0aW9uIGludG8gYSBwcm9taXNlLlxuICpcbiAqIEBwYXJhbSB7dHlwZX0gb2JqXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5fcHVibGljLmNvbnZlcnRfdG9fcHJvbWlzZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zKXtcblxuICAgIG9iai5pZCA9IG9iai5pZCB8fCBvcHRpb25zLmlkO1xuXG4gICAgLy9BdXRvbmFtZVxuICAgIGlmICghb2JqLmlkKSB7XG4gICAgICBpZiAob2JqLnR5cGUgPT09ICd0aW1lcicpIHtcbiAgICAgICAgb2JqLmlkID0gXCJ0aW1lci1cIiArIG9iai50aW1lb3V0ICsgXCItXCIgKyAoKytDb25maWcuaSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqLnVybCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb2JqLmlkID0gb2JqLnVybC5zcGxpdChcIi9cIikucG9wKCk7XG4gICAgICAgIC8vUkVNT1ZFIC5qcyBGUk9NIElEXG4gICAgICAgIGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5zcGxpdChcIi5cIik7XG4gICAgICAgICAgb2JqLmlkLnBvcCgpO1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5qb2luKFwiLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vUmV0dXJuIGlmIGFscmVhZHkgZXhpc3RzXG4gICAgaWYoQ29uZmlnLmxpc3Rbb2JqLmlkXSAmJiBvYmoudHlwZSAhPT0gJ3RpbWVyJyl7XG4gICAgICAvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG4gICAgICAvL01ha2Ugc3VyZSB0aGlzIGRlcGVuZGVuY3kgb2JqZWN0IGRvZXNuJ3QgaGF2ZSBhXG4gICAgICAvL3Jlc29sdmVyIC0gaWYgaXQgZG9lcyBlcnJvclxuICAgICAgaWYob2JqLnJlc29sdmVyKXtcbiAgICAgICAgQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICBcIllvdSBjYW4ndCBzZXQgYSByZXNvbHZlciBvbiBhIHF1ZXVlIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZC4gWW91IGNhbiBvbmx5IHJlZmVyZW5jZSB0aGUgb3JpZ2luYWwuXCJcbiAgICAgICAgICAsXCJEZXRlY3RlZCByZS1pbml0IG9mICdcIiArIG9iai5pZCArIFwiJy5cIlxuICAgICAgICAgICxcIkF0dGVtcHRlZDpcIlxuICAgICAgICAgICxvYmpcbiAgICAgICAgICAsXCJFeGlzdGluZzpcIlxuICAgICAgICAgICxDb25maWcubGlzdFtvYmouaWRdXG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5saXN0W29iai5pZF07XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvL0NvbnZlcnQgZGVwZW5kZW5jeSB0byBhbiBpbnN0YW5jZVxuICAgIHZhciBkZWY7XG4gICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgIC8vRXZlbnRcbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ2V2ZW50Jyk6XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfZXZlbnQob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICdxdWV1ZScpOlxuICAgICAgICAgICAgdmFyIFF1ZXVlID0gcmVxdWlyZSgnLi9xdWV1ZS5qcycpO1xuICAgICAgICAgICAgZGVmID0gUXVldWUob2JqLmRlcGVuZGVuY2llcyxvYmopO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgLy9BbHJlYWR5IGEgdGhlbmFibGVcbiAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAgICAgICAgICAgICAvL1JlZmVyZW5jZSB0byBhbiBleGlzdGluZyBpbnN0YW5jZVxuICAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5pZCA9PT0gJ3N0cmluZycpOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCInXCIrb2JqLmlkICtcIic6IGRpZCBub3QgZXhpc3QuIEF1dG8gY3JlYXRpbmcgbmV3IGRlZmVycmVkLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmID0gX3B1YmxpYy5kZWZlcnJlZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZCA6IG9iai5pZFxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvL0lmIG9iamVjdCB3YXMgYSB0aGVuYWJsZSwgcmVzb2x2ZSB0aGUgbmV3IGRlZmVycmVkIHdoZW4gdGhlbiBjYWxsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYob2JqLnRoZW4pe1xuICAgICAgICAgICAgICAgICAgICAgIG9iai50aGVuKGZ1bmN0aW9uKHIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUocik7XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAvL09CSkVDVCBQUk9QRVJUWSAucHJvbWlzZSBFWFBFQ1RFRCBUTyBSRVRVUk4gQSBQUk9NSVNFXG4gICAgICAgICAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLnByb21pc2UgPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgICAgICAgICBpZihvYmouc2NvcGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UuY2FsbChvYmouc2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYgPSBvYmoucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgLy9PYmplY3QgaXMgYSB0aGVuYWJsZVxuICAgICAgICAgICAgICAgIGNhc2Uob2JqLnRoZW4pOlxuICAgICAgICAgICAgICAgICAgICBkZWYgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcbiAgICAgICAgICAgIGlmKHR5cGVvZiBkZWYgIT09ICdvYmplY3QnIHx8ICFkZWYudGhlbil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkRlcGVuZGVuY3kgbGFiZWxlZCBhcyBhIHByb21pc2UgZGlkIG5vdCByZXR1cm4gYSBwcm9taXNlLlwiLG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAndGltZXInKTpcbiAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMud3JhcF90aW1lcihvYmopO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgLy9Mb2FkIGZpbGVcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIG9iai50eXBlID0gb2JqLnR5cGUgfHwgXCJkZWZhdWx0XCI7XG4gICAgICAgICAgICAvL0luaGVyaXQgcGFyZW50J3MgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgICAgaWYob3B0aW9ucy5wYXJlbnQgJiYgb3B0aW9ucy5wYXJlbnQuY3dkKXtcbiAgICAgICAgICAgICAgb2JqLmN3ZCA9IG9wdGlvbnMucGFyZW50LmN3ZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMud3JhcF94aHIob2JqKTtcbiAgICB9XG5cbiAgICAvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuICAgIENvbmZpZy5saXN0W29iai5pZF0gPSBkZWY7XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIEB0b2RvOiByZWRvIHRoaXNcbiAqXG4gKiBDb252ZXJ0cyBhIHJlZmVyZW5jZSB0byBhIERPTSBldmVudCB0byBhIHByb21pc2UuXG4gKiBSZXNvbHZlZCBvbiBmaXJzdCBldmVudCB0cmlnZ2VyLlxuICpcbiAqIEB0b2RvIHJlbW92ZSBqcXVlcnkgZGVwZW5kZW5jeVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuICovXG5fcHVibGljLndyYXBfZXZlbnQgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuICAgIHZhciBkZWYgPSBEZWZlcnJlZCh7XG4gICAgICAgIGlkIDogb2JqLmlkXG4gICAgfSk7XG5cblxuICAgIGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpe1xuXG4gICAgICAgIGlmKHR5cGVvZiAkICE9PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgIHZhciBtc2cgPSAnd2luZG93IGFuZCBkb2N1bWVudCBiYXNlZCBldmVudHMgZGVwZW5kIG9uIGpRdWVyeSc7XG4gICAgICAgICAgICBkZWYucmVqZWN0KG1zZyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vRm9yIG5vdywgZGVwZW5kIG9uIGpxdWVyeSBmb3IgSUU4IERPTUNvbnRlbnRMb2FkZWQgcG9seWZpbGxcbiAgICAgICAgICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgICAgICAgICBjYXNlKG9iai5pZCA9PT0gJ3JlYWR5JyB8fCBvYmouaWQgPT09ICdET01Db250ZW50TG9hZGVkJyk6XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2Uob2JqLmlkID09PSAnbG9hZCcpOlxuICAgICAgICAgICAgICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vbihvYmouaWQsXCJib2R5XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbl9wdWJsaWMud3JhcF90aW1lciA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG4gICAgdmFyIGRlZiA9IERlZmVycmVkKCk7XG5cbiAgICAoZnVuY3Rpb24oZGVmKXtcblxuICAgICAgICB2YXIgX3N0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBfZW5kID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICBkZWYucmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgc3RhcnQgOiBfc3RhcnRcbiAgICAgICAgICAgICAgICAsZW5kIDogX2VuZFxuICAgICAgICAgICAgICAgICxlbGFwc2VkIDogX2VuZCAtIF9zdGFydFxuICAgICAgICAgICAgICAgICx0aW1lb3V0IDogb2JqLnRpbWVvdXRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LG9iai50aW1lb3V0KTtcblxuICAgIH0oZGVmKSk7XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVwXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3B1YmxpYy53cmFwX3hociA9IGZ1bmN0aW9uKGRlcCl7XG5cbiAgICB2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cbiAgICB2YXIgcmVxdWlyZWQgPSBbXCJpZFwiLFwidXJsXCJdO1xuICAgIGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG4gICAgICAgIGlmKCFkZXBbcmVxdWlyZWRbaV1dKXtcbiAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICAgIFwiRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogXCIgKyByZXF1aXJlZFtpXVxuICAgICAgICAgICAgICAgICxcIk1ha2Ugc3VyZSB5b3Ugd2VyZW4ndCBleHBlY3RpbmcgZGVwZW5kZW5jeSB0byBhbHJlYWR5IGhhdmUgYmVlbiByZXNvbHZlZCB1cHN0cmVhbS5cIlxuICAgICAgICAgICAgICAgICxkZXBcbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG4gICAgaWYoQ29uZmlnLmxpc3RbZGVwLmlkXSl7XG4gICAgICByZXR1cm4gQ29uZmlnLmxpc3RbZGVwLmlkXTtcbiAgICB9XG5cbiAgICAvL0NPTlZFUlQgVE8gREVGRVJSRUQ6XG4gICAgdmFyIGRlZiA9IERlZmVycmVkKGRlcCk7XG5cbiAgICBpZih0eXBlb2YgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXShkZXAudXJsLGRlZixkZXApO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdWydkZWZhdWx0J10oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuLyoqXG4qIEEgXCJzaWduYWxcIiBoZXJlIGNhdXNlcyBhIHF1ZXVlIHRvIGxvb2sgdGhyb3VnaCBlYWNoIGl0ZW1cbiogaW4gaXRzIHVwc3RyZWFtIGFuZCBjaGVjayB0byBzZWUgaWYgYWxsIGFyZSByZXNvbHZlZC5cbipcbiogU2lnbmFscyBjYW4gb25seSBiZSByZWNlaXZlZCBieSBhIHF1ZXVlIGl0c2VsZiBvciBhbiBpbnN0YW5jZVxuKiBpbiBpdHMgdXBzdHJlYW0uXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcbiogQHBhcmFtIHtzdHJpbmd9IGZyb21faWRcbiogQHJldHVybnMge3ZvaWR9XG4qL1xuX3B1YmxpYy5yZWNlaXZlX3NpZ25hbCA9IGZ1bmN0aW9uKHRhcmdldCxmcm9tX2lkKXtcblxuICAgIGlmKHRhcmdldC5oYWx0X3Jlc29sdXRpb24gPT09IDEpIHJldHVybjtcblxuICAgLy9NQUtFIFNVUkUgVEhFIFNJR05BTCBXQVMgRlJPTSBBIFBST01JU0UgQkVJTkcgTElTVEVORUQgVE9cbiAgIC8vQlVUIEFMTE9XIFNFTEYgU1RBVFVTIENIRUNLXG4gICBpZihmcm9tX2lkICE9PSB0YXJnZXQuaWQgJiYgIXRhcmdldC51cHN0cmVhbVtmcm9tX2lkXSl7XG4gICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1Zyhmcm9tX2lkICsgXCIgY2FuJ3Qgc2lnbmFsIFwiICsgdGFyZ2V0LmlkICsgXCIgYmVjYXVzZSBub3QgaW4gdXBzdHJlYW0uXCIpO1xuICAgfVxuICAgLy9SVU4gVEhST1VHSCBRVUVVRSBPRiBPQlNFUlZJTkcgUFJPTUlTRVMgVE8gU0VFIElGIEFMTCBET05FXG4gICBlbHNle1xuICAgICAgIHZhciBzdGF0dXMgPSAxO1xuICAgICAgIGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuICAgICAgICAgICAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG4gICAgICAgICAgIGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuICAgICAgICAgICAgICAgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgIH1cbiAgICAgICB9XG4gICB9XG5cbiAgIC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuICAgaWYoc3RhdHVzID09PSAxKXtcblxuICAgICAgICAvL0dFVCBSRVRVUk4gVkFMVUVTIFBFUiBERVBFTkRFTkNJRVMsIFdISUNIIFNBVkVTIE9SREVSIEFORFxuICAgICAgICAvL1JFUE9SVFMgRFVQTElDQVRFU1xuICAgICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZGVwZW5kZW5jaWVzKXtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFyZ2V0LnJlc29sdmUuY2FsbCh0YXJnZXQsdmFsdWVzKTtcbiAgIH1cblxuICAgaWYoc3RhdHVzID09PSAyKXtcbiAgICAgICB2YXIgZXJyID0gW1xuICAgICAgICAgICB0YXJnZXQuaWQrXCIgZGVwZW5kZW5jeSAnXCIrdGFyZ2V0LnVwc3RyZWFtW2ldLmlkICsgXCInIHdhcyByZWplY3RlZC5cIlxuICAgICAgICAgICAsdGFyZ2V0LnVwc3RyZWFtW2ldLmFyZ3VtZW50c1xuICAgICAgIF07XG4gICAgICAgdGFyZ2V0LnJlamVjdC5hcHBseSh0YXJnZXQsZXJyKTtcbiAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsIi8qKlxuICogRGVmYXVsdCBwcm9wZXJ0aWVzIGZvciBhbGwgZGVmZXJyZWQgb2JqZWN0cy5cbiAqXG4gKi9cbnZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wdWJsaWMgPSB7fTtcblxuX3B1YmxpYy5pc19vcmd5ID0gdHJ1ZTtcblxuX3B1YmxpYy5pZCA9IG51bGw7XG5cbi8vQSBDT1VOVEVSIEZPUiBBVVQwLUdFTkVSQVRFRCBQUk9NSVNFIElEJ1Ncbl9wdWJsaWMuc2V0dGxlZCA9IDA7XG5cbi8qKlxuICogU1RBVEUgQ09ERVM6XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS1cbiAqIC0xICAgPT4gU0VUVExJTkcgW0VYRUNVVElORyBDQUxMQkFDS1NdXG4gKiAgMCAgID0+IFBFTkRJTkdcbiAqICAxICAgPT4gUkVTT0xWRUQgLyBGVUxGSUxMRURcbiAqICAyICAgPT4gUkVKRUNURURcbiAqL1xuX3B1YmxpYy5zdGF0ZSA9IDA7XG5cbl9wdWJsaWMudmFsdWUgPSBbXTtcblxuLy9UaGUgbW9zdCByZWNlbnQgdmFsdWUgZ2VuZXJhdGVkIGJ5IHRoZSB0aGVuLT5kb25lIGNoYWluLlxuX3B1YmxpYy5jYWJvb3NlID0gbnVsbDtcblxuX3B1YmxpYy5tb2RlbCA9IFwiZGVmZXJyZWRcIjtcblxuX3B1YmxpYy5kb25lX2ZpcmVkID0gMDtcblxuX3B1YmxpYy50aW1lb3V0X2lkID0gbnVsbDtcblxuX3B1YmxpYy5jYWxsYmFja19zdGF0ZXMgPSB7XG4gIHJlc29sdmUgOiAwXG4gICx0aGVuIDogMFxuICAsZG9uZSA6IDBcbiAgLHJlamVjdCA6IDBcbn07XG5cbi8qKlxuICogU2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBjYWxsYmFjayBldmVudFxuICogbGlzdC5cbiAqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIHByb3BlcnR5TmFtZXMgYXNcbiAqIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzOiBhZGRpbmcgYm9pbGVycGxhdGVcbiAqIHByb3BlcnRpZXMgZm9yIGVhY2hcbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5fcHVibGljLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG4gIHZhciBvID0ge307XG5cbiAgZm9yKHZhciBpIGluIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzKXtcbiAgICBvW2ldID0ge1xuICAgICAgdHJhaW4gOiBbXVxuICAgICAgLGhvb2tzIDoge1xuICAgICAgICBvbkJlZm9yZSA6IHtcbiAgICAgICAgICB0cmFpbiA6IFtdXG4gICAgICAgIH1cbiAgICAgICAgLG9uQ29tcGxldGUgOiB7XG4gICAgICAgICAgdHJhaW4gOiBbXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBvO1xufSkoKTtcblxuLy9QUk9NSVNFIEhBUyBPQlNFUlZFUlMgQlVUIERPRVMgTk9UIE9CU0VSVkUgT1RIRVJTXG5fcHVibGljLmRvd25zdHJlYW0gPSB7fTtcblxuX3B1YmxpYy5leGVjdXRpb25faGlzdG9yeSA9IFtdO1xuXG4vL1dIRU4gVFJVRSwgQUxMT1dTIFJFLUlOSVQgW0ZPUiBVUEdSQURFUyBUTyBBIFFVRVVFXVxuX3B1YmxpYy5vdmVyd3JpdGFibGUgPSAwO1xuXG5cbi8qKlxuICogRGVmYXVsdCB0aW1lb3V0IGZvciBhIGRlZmVycmVkXG4gKiBAdHlwZSBudW1iZXJcbiAqL1xuX3B1YmxpYy50aW1lb3V0ID0gQ29uZmlnLnNldHRpbmdzLnRpbWVvdXQ7XG5cbi8qKlxuICogUkVNT1RFXG4gKlxuICogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcbiAqXG4gKiBSRU1PVEUgPT0gMCAgPT4gIFJlYWQgZmlsZSBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtXG4gKlxuICogT05MWSBBUFBMSUVTIFRPIFNDUklQVFMgUlVOIFVOREVSIE5PREUgQVMgQlJPV1NFUiBIQVMgTk9cbiAqIEZJTEVTWVNURU0gQUNDRVNTXG4gKi9cbl9wdWJsaWMucmVtb3RlID0gMTtcblxuLy9BRERTIFRPIE1BU1RFUiBMSVNULiBBTFdBWVMgVFJVRSBVTkxFU1MgVVBHUkFESU5HIEEgUFJPTUlTRSBUTyBBIFFVRVVFXG5fcHVibGljLmxpc3QgPSAxO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGRlZmVycmVkLlxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbHVlXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG4gIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSl7XG4gICAgQ29uZmlnLmRlYnVnKFtcbiAgICAgIHRoaXMuaWQgKyBcIiBjYW4ndCByZXNvbHZlLlwiXG4gICAgICAsXCJPbmx5IHVuc2V0dGxlZCBkZWZlcnJlZHMgYXJlIHJlc29sdmFibGUuXCJcbiAgICBdKTtcbiAgfVxuXG4gIC8vU0VUIFNUQVRFIFRPIFNFVFRMRU1FTlQgSU4gUFJPR1JFU1NcbiAgX3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsLTEpO1xuXG4gIC8vU0VUIFZBTFVFXG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcblxuICAvL1JVTiBSRVNPTFZFUiBCRUZPUkUgUFJPQ0VFRElOR1xuICAvL0VWRU4gSUYgVEhFUkUgSVMgTk8gUkVTT0xWRVIsIFNFVCBJVCBUTyBGSVJFRCBXSEVOIENBTExFRFxuICBpZighdGhpcy5yZXNvbHZlcl9maXJlZCAmJiB0eXBlb2YgdGhpcy5yZXNvbHZlciA9PT0gJ2Z1bmN0aW9uJyl7XG5cbiAgICB0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuICAgIC8vQWRkIHJlc29sdmVyIHRvIHJlc29sdmUgdHJhaW5cbiAgICB0cnl7XG4gICAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5yZXNvbHZlcih2YWx1ZSx0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjYXRjaChlKXtcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cbiAgfVxuICBlbHNle1xuXG4gICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cbiAgICAvL0FkZCBzZXR0bGUgdG8gcmVzb2x2ZSB0cmFpblxuICAgIC8vQWx3YXlzIHNldHRsZSBiZWZvcmUgYWxsIG90aGVyIGNvbXBsZXRlIGNhbGxiYWNrc1xuICAgIHRoaXMuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi51bnNoaWZ0KGZ1bmN0aW9uKCl7XG4gICAgICBfcHJpdmF0ZS5zZXR0bGUodGhpcyk7XG4gICAgfSk7XG4gIH1cblxuICAvL1J1biByZXNvbHZlXG4gIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICB0aGlzXG4gICAgLHRoaXMuY2FsbGJhY2tzLnJlc29sdmVcbiAgICAsdGhpcy52YWx1ZVxuICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgKTtcblxuICAvL3Jlc29sdmVyIGlzIGV4cGVjdGVkIHRvIGNhbGwgcmVzb2x2ZSBhZ2FpblxuICAvL2FuZCB0aGF0IHdpbGwgZ2V0IHVzIHBhc3QgdGhpcyBwb2ludFxuICByZXR1cm4gdGhpcztcbn07XG5cblxuX3B1YmxpYy5yZWplY3QgPSBmdW5jdGlvbihlcnIpe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG4gIGlmKCEoZXJyIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICBlcnIgPSBbZXJyXTtcbiAgfVxuXG4gIHZhciBtc2cgPSBcIlJlamVjdGVkIFwiK3RoaXMubW9kZWwrXCI6ICdcIit0aGlzLmlkK1wiJy5cIlxuXG4gIGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICBlcnIudW5zaGlmdChtc2cpO1xuICAgIENvbmZpZy5kZWJ1ZyhlcnIsdGhpcyk7XG4gIH1cbiAgZWxzZXtcbiAgICBtc2cgPSBtc2cgKyBcIlxcbiBUdXJuIGRlYnVnIG1vZGUgb24gZm9yIG1vcmUgaW5mby5cIjtcbiAgICBjb25zb2xlLmxvZyhtc2cpO1xuICB9XG5cbiAgLy9SZW1vdmUgYXV0byB0aW1lb3V0IHRpbWVyXG4gIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gIH1cblxuICAvL1NldCBzdGF0ZSB0byByZWplY3RlZFxuICBfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywyKTtcblxuICAvL0V4ZWN1dGUgcmVqZWN0aW9uIHF1ZXVlXG4gIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICB0aGlzXG4gICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICxlcnJcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbl9wdWJsaWMudGhlbiA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAvL0FuIGVycm9yIHdhcyBwcmV2aW91c2x5IHRocm93biwgYmFpbCBvdXRcbiAgICBjYXNlKHRoaXMuc3RhdGUgPT09IDIpOlxuICAgICAgYnJlYWs7XG5cbiAgICAvL0V4ZWN1dGlvbiBjaGFpbiBhbHJlYWR5IGZpbmlzaGVkLiBCYWlsIG91dC5cbiAgICBjYXNlKHRoaXMuZG9uZV9maXJlZCA9PT0gMSk6XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKHRoaXMuaWQrXCIgY2FuJ3QgYXR0YWNoIC50aGVuKCkgYmVjYXVzZSAuZG9uZSgpIGhhcyBhbHJlYWR5IGZpcmVkLCBhbmQgdGhhdCBtZWFucyB0aGUgZXhlY3V0aW9uIGNoYWluIGlzIGNvbXBsZXRlLlwiKTtcblxuICAgIGRlZmF1bHQ6XG5cbiAgICAgIC8vUHVzaCBjYWxsYmFjayB0byB0aGVuIHF1ZXVlXG4gICAgICB0aGlzLmNhbGxiYWNrcy50aGVuLnRyYWluLnB1c2goZm4pO1xuXG4gICAgICAvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWVcbiAgICAgIGlmKHR5cGVvZiByZWplY3RvciA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG4gICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEgJiYgdGhpcy5zdGF0ZSA9PT0gMSAmJiAhdGhpcy5kb25lX2ZpcmVkKXtcbiAgICAgICAgdGhpcy5ydW5fdHJhaW4oXG4gICAgICAgICAgdGhpc1xuICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy50aGVuXG4gICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgLy9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuICAgICAgZWxzZXt9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuX3B1YmxpYy5kb25lID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG4gIGlmKHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ubGVuZ3RoID09PSAwXG4gICAgICYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCl7XG4gICAgICBpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpe1xuXG4gICAgICAgIC8vd3JhcCBjYWxsYmFjayB3aXRoIHNvbWUgb3RoZXIgY29tbWFuZHNcbiAgICAgICAgdmFyIGZuMiA9IGZ1bmN0aW9uKHIsZGVmZXJyZWQsbGFzdCl7XG5cbiAgICAgICAgICAvL0RvbmUgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UsIHNvIG5vdGUgdGhhdCBpdCBoYXMgYmVlblxuICAgICAgICAgIGRlZmVycmVkLmRvbmVfZmlyZWQgPSAxO1xuXG4gICAgICAgICAgZm4ocixkZWZlcnJlZCxsYXN0KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLnB1c2goZm4yKTtcblxuICAgICAgICAvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWUgb25Db21wbGV0ZVxuICAgICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnJlamVjdC5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG4gICAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSl7XG4gICAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gMSl7XG4gICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgICB0aGlzXG4gICAgICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy5yZWplY3RcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICAgIGVsc2V7fVxuICAgIH1cbiAgICBlbHNle1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gIH1cbiAgZWxzZXtcbiAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiZG9uZSgpIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLlwiKTtcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHVibGljID0ge30sXG4gICAgX3ByaXZhdGUgPSB7fTtcblxuX3B1YmxpYy5icm93c2VyID0ge30sXG5fcHVibGljLm5hdGl2ZSA9IHt9LFxuX3ByaXZhdGUubmF0aXZlID0ge307XG5cbi8vQnJvd3NlciBsb2FkXG5cbl9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuICB2YXIgaGVhZCA9ICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG4gIGlmKGVsZW0ub25sb2FkKXtcbiAgICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG4gICAgICAgfTtcblxuICAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChcIkZhaWxlZCB0byBsb2FkIHBhdGg6IFwiICsgcGF0aCk7XG4gICAgICAgfTtcblxuICAgIH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuICB9XG4gIGVsc2V7XG4gICAgLy9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG4gICAgaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbiAgICBjb25zb2xlLndhcm4oXCJObyBvbmxvYWQgYXZhaWxhYmxlIGZvciBsaW5rIHRhZywgYXV0b3Jlc29sdmluZy5cIik7XG4gICAgZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcbiAgfVxufVxuXG5fcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cbiAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICBlbGVtLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgIGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcbiAgICAgICAgaWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICAgICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgfTtcbiAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuICB0aGlzLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIHRoaXMuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuICB2YXIgcixcbiAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuICAoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgIGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgciA9IHJlcS5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgaWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgciA9IEpTT04ucGFyc2Uocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgX3B1YmxpYy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuICAgICAgICAgICAgICAgICxwYXRoXG4gICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgXSxkZWZlcnJlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfShwYXRoLGRlZmVycmVkKSk7XG5cbiAgcmVxLnNlbmQobnVsbCk7XG59XG5cblxuXG4vL05hdGl2ZSBsb2FkXG5cbl9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLmJyb3dzZXIuY3NzKHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgLy9sb2NhbCBwYWNrYWdlXG4gIGlmKHBhdGhbMF09PT0nLicpe1xuICAgIHZhciBwYXRoSW5mbyA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCxkZWZlcnJlZCk7XG5cbiAgICB2YXIgciA9IHJlcXVpcmUocGF0aEluZm8ucGF0aCk7XG5cbiAgICAvL0NoYW5nZSBiYWNrIHRvIG9yaWdpbmFsIHdvcmtpbmcgZGlyXG4gICAgaWYocGF0aEluZm8uZGlyY2hhbmdlZCkgcHJvY2Vzcy5jaGRpcihwYXRoSW5mby5vd2QpO1xuXG4gICAgLy9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG4gICAgaWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICB8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgIH1cbiAgfVxuICAvL3JlbW90ZSBzY3JpcHRcbiAgZWxzZXtcblxuICAgIC8vQ2hlY2sgdGhhdCB3ZSBoYXZlIGNvbmZpZ3VyZWQgdGhlIGVudmlyb25tZW50IHRvIGFsbG93IHRoaXMsXG4gICAgLy9hcyBpdCByZXByZXNlbnRzIGEgc2VjdXJpdHkgdGhyZWF0IGFuZCBzaG91bGQgb25seSBiZSB1c2VkIGZvciBkZWJ1Z2dpbmdcbiAgICBpZighQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe19cbiAgICAgIENvbmZpZy5kZWJ1ZyhcIlNldCBjb25maWcuZGVidWdfbW9kZT0xIHRvIHJ1biByZW1vdGUgc2NyaXB0cyBvdXRzaWRlIG9mIGRlYnVnIG1vZGUuXCIpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICB2YXIgVm0gPSByZXF1aXJlKCd2bScpO1xuICAgICAgICByID0gVm0ucnVuSW5UaGlzQ29udGV4dChkYXRhKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5fcHVibGljLm5hdGl2ZS5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMubmF0aXZlLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKHIpe1xuICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gIH0pXG59XG5cbl9wcml2YXRlLm5hdGl2ZS5nZXQgPSBmdW5jdGlvbiAocGF0aCxkZWZlcnJlZCxjYWxsYmFjayl7XG4gIGlmKHBhdGhbMF0gPT09ICcuJyl7XG5cbiAgICB2YXIgcGF0aEluZm8gPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgsZGVmZXJyZWQpO1xuXG4gICAgLy9maWxlIHN5c3RlbVxuICAgIHZhciBGcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgRnMucmVhZEZpbGUocGF0aEluZm8ucGF0aCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgfSk7XG5cbiAgICAvL0NoYW5nZSBiYWNrIHRvIG9yaWdpbmFsIHdvcmtpbmcgZGlyXG4gICAgaWYocGF0aEluZm8uZGlyY2hhbmdlZCkgcHJvY2Vzcy5jaGRpcihwYXRoSW5mby5vd2QpO1xuICB9XG4gIGVsc2V7XG4gICAgLy9odHRwXG4gICAgdmFyIEh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG4gICAgSHR0cC5nZXQoeyBwYXRoIDogcGF0aH0sIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgIHZhciBkYXRhID0gJyc7XG4gICAgICByZXMub24oJ2RhdGEnLCBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgICAgZGF0YSArPSBidWY7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICB2YXIgb3dkID0gcHJvY2Vzcy5jd2QoKSwgLy9rZWVwIHRyYWNrIG9mIHN0YXJ0aW5nIHBvaW50IHNvIHdlIGNhbiByZXR1cm5cbiAgICAgIGN3ZCA9IChkZWZlcnJlZC5jd2QpID8gZGVmZXJyZWQuY3dkIDpcbiAgICAgICAgICAgICgoQ29uZmlnLnNldHRpbmdzLmN3ZCkgPyBDb25maWcuc2V0dGluZ3MuY3dkIDogZmFsc2UpXG4gICxkaXJjaGFuZ2VkID0gZmFsc2U7XG5cbiAgaWYoY3dkKXtcbiAgICBwcm9jZXNzLmNoZGlyKGN3ZCk7XG4gICAgZGlyY2hhbmdlZCA9IHRydWU7XG4gIH1cbiAgZWxzZXtcbiAgICBjd2QgPSBvd2Q7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG93ZCA6IG93ZFxuICAgICxwYXRoIDogY3dkKycvJytwYXRoXG4gICAgLGRpcmNoYW5nZWQgOiBkaXJjaGFuZ2VkXG4gIH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG4gKiBpcyByZXNvbHZlZC5cbiAqIFxuICogIyMjIFF1ZXVlIHVzYWdlIGV4YW1wbGU6XG5cbmBgYFxudmFyIHEgPSBPcmd5LnF1ZXVlKFtcbiAge1xuICAgIGNvbW1lbnQgOiBcIlRoaXMgaXMgYSBuZXN0ZWQgcXVldWUgY3JlYXRlZCBvbiB0aGUgZmx5LlwiXG4gICAgLHR5cGUgOiBcImpzb25cIlxuICAgICx1cmwgOiBcIi9hcGkvanNvbi9zb21udW1zXCJcbiAgICAscmVzb2x2ZXIgOiBmdW5jdGlvbihyLGRlZmVycmVkKXtcbiAgICAgIC8vRmlsdGVyIG91dCBldmVuIG51bWJlcnNcbiAgICAgIHZhciBvZGQgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICByZXR1cm4gMCAhPSB2YWwgJSAyO1xuICAgICAgfSk7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKG9kZCk7XG4gICAgfVxuICB9XG5dLHtcbiAgaWQgOiBcInExXCIsXG4gIHJlc29sdmVyIDogZnVuY3Rpb24ocixkZWZlcnJlZCl7XG4gICAgdmFyIHByaW1lcyA9IHJbMF0uZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgaGlnaCA9IE1hdGguZmxvb3IoTWF0aC5zcXJ0KHZhbCkpICsgMTtcbiAgICAgIGZvciAodmFyIGRpdiA9IDI7IGRpdiA8PSBoaWdoOyBkaXYrKykge1xuICAgICAgICBpZiAodmFsdWUgJSBkaXYgPT0gMCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGRlZmVycmVkLnJlc29sdmUocHJpbWVzKTtcbiAgfSlcbn0pO1xuXG5gYGBcblxuICogXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIHF1ZXVlXG4gKiBcbiAqIEBwYXJhbSB7YXJyYXl9IGRlcHMgQXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRoYXQgbXVzdCBiZSByZXNvbHZlZCBiZWZvcmUgPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBjYWxsZWQuIFxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgIExpc3Qgb2Ygb3B0aW9uczpcbiAqICAtIHtzdHJpbmd9IDxiPmlkPC9iPiBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC4gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuIE9wdGlvbmFsLlxuICogIFxuICogIC0ge251bWJlcn0gPGI+dGltZW91dDwvYj4gXG4gKiAgVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLiBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQgWzUwMDBdLiBcbiAqICBcbiAqICAtIHtmdW5jdGlvbihyZXN1bHQsZGVmZXJyZWQpfSA8Yj5yZXNvbHZlcjwvYj4gXG4gKiAgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuIEFyZzEgaXMgYW4gYXJyYXkgb2YgdGhlIGRlcGVuZGVuY2llcycgcmVzb2x2ZWQgdmFsdWVzLiBBcmcyIGlzIHRoZSBkZWZlcnJlZCBvYmplY3QuIFRoZSBxdWV1ZSB3aWxsIG9ubHkgcmVzb2x2ZSB3aGVuIEFyZzIucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnLnRpbWVvdXQuXG4gKlxuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG4gIHZhciBfbztcbiAgaWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy9ET0VTIE5PVCBBTFJFQURZIEVYSVNUXG4gIGlmKCFDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cbiAgICAvL0NSRUFURSBORVcgUVVFVUUgT0JKRUNUXG4gICAgdmFyIF9vID0gX3ByaXZhdGUuZmFjdG9yeShvcHRpb25zKTtcblxuICAgIC8vQUNUSVZBVEUgUVVFVUVcbiAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cbiAgfVxuICAvL0FMUkVBRFkgRVhJU1RTXG4gIGVsc2Uge1xuXG4gICAgX28gPSBDb25maWcubGlzdFtvcHRpb25zLmlkXTtcblxuICAgIGlmKF9vLm1vZGVsICE9PSAncXVldWUnKXtcbiAgICAvL01BVENIIEZPVU5EIEJVVCBOT1QgQSBRVUVVRSwgVVBHUkFERSBUTyBPTkVcblxuICAgICAgb3B0aW9ucy5vdmVyd3JpdGFibGUgPSAxO1xuXG4gICAgICBfbyA9IF9wcml2YXRlLnVwZ3JhZGUoX28sb3B0aW9ucyxkZXBzKTtcbiAgICB9XG4gICAgZWxzZXtcblxuICAgICAgLy9PVkVSV1JJVEUgQU5ZIEVYSVNUSU5HIE9QVElPTlNcbiAgICAgIGZvcih2YXIgaSBpbiBvcHRpb25zKXtcbiAgICAgICAgX29baV0gPSBvcHRpb25zW2ldO1xuICAgICAgfVxuXG4gICAgICAvL0FERCBBRERJVElPTkFMIERFUEVOREVOQ0lFUyBJRiBOT1QgUkVTT0xWRURcbiAgICAgIGlmKGRlcHMubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wcml2YXRlLnRwbC5hZGQuY2FsbChfbyxkZXBzKTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8vUkVTVU1FIFJFU09MVVRJT04gVU5MRVNTIFNQRUNJRklFRCBPVEhFUldJU0VcbiAgICBfby5oYWx0X3Jlc29sdXRpb24gPSAodHlwZW9mIG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uICE9PSAndW5kZWZpbmVkJykgP1xuICAgIG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uIDogMDtcbiAgfVxuXG4gIHJldHVybiBfbztcbn07IiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cblxuX3B1YmxpYy5mYWN0b3J5ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgLy9DUkVBVEUgQSBORVcgUVVFVUUgT0JKRUNUXG4gIHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIoW1xuICAgIFF1ZXVlU2NoZW1hXG4gICAgLG9wdGlvbnNcbiAgXSk7XG5cbiAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgaWYoIW9wdGlvbnMuaWQpe1xuICAgIF9vLmlkID0gQ29uZmlnLmdlbmVyYXRlX2lkKCk7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuXG5cbi8qKlxuICogQWN0aXZhdGVzIGEgcXVldWUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHthcnJheX0gZGVwc1xuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xuX3B1YmxpYy5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG8sb3B0aW9ucyxkZXBzKXtcblxuICAgIC8vQUNUSVZBVEUgQVMgQSBERUZFUlJFRFxuICAgIC8vdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpO1xuICAgIG8gPSBfcHJvdG8uYWN0aXZhdGUobyk7XG5cbiAgICAvL0B0b2RvIHJldGhpbmsgdGhpc1xuICAgIC8vVGhpcyB0aW1lb3V0IGdpdmVzIGRlZmluZWQgcHJvbWlzZXMgdGhhdCBhcmUgZGVmaW5lZFxuICAgIC8vZnVydGhlciBkb3duIHRoZSBzYW1lIHNjcmlwdCBhIGNoYW5jZSB0byBkZWZpbmUgdGhlbXNlbHZlc1xuICAgIC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG4gICAgLy9yZW1vdGUgc291cmNlIGhlcmUuXG4gICAgLy9UaGlzIGlzIGltcG9ydGFudCBpbiB0aGUgY2FzZSBvZiBjb21waWxlZCBqcyBmaWxlcyB0aGF0IGNvbnRhaW5cbiAgICAvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuICAgIC8vdGVtcG9yYXJpbHkgY2hhbmdlIHN0YXRlIHRvIHByZXZlbnQgb3V0c2lkZSByZXNvbHV0aW9uXG4gICAgby5zdGF0ZSA9IC0xO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAvL1Jlc3RvcmUgc3RhdGVcbiAgICAgIG8uc3RhdGUgPSAwO1xuXG4gICAgICAvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcbiAgICAgIFF1ZXVlU2NoZW1hLmFkZC5jYWxsKG8sZGVwcyk7XG5cbiAgICAgIC8vU0VFIElGIENBTiBCRSBJTU1FRElBVEVMWSBSRVNPTFZFRCBCWSBDSEVDS0lORyBVUFNUUkVBTVxuICAgICAgc2VsZi5yZWNlaXZlX3NpZ25hbChvLG8uaWQpO1xuXG4gICAgICAvL0FTU0lHTiBUSElTIFFVRVVFIFVQU1RSRUFNIFRPIE9USEVSIFFVRVVFU1xuICAgICAgaWYoby5hc3NpZ24pe1xuICAgICAgICAgIGZvcih2YXIgYSBpbiBvLmFzc2lnbil7XG4gICAgICAgICAgICAgIHNlbGYuYXNzaWduKG8uYXNzaWduW2FdLFtvXSx0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfSwxKTtcblxuICAgIHJldHVybiBvO1xufTtcblxuXG4vKipcbiogVXBncmFkZXMgYSBwcm9taXNlIG9iamVjdCB0byBhIHF1ZXVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4qIEBwYXJhbSB7YXJyYXl9IGRlcHMgXFxkZXBlbmRlbmNpZXNcbiogQHJldHVybnMge29iamVjdH0gcXVldWUgb2JqZWN0XG4qL1xuX3B1YmxpYy51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cbiAgICBpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoJ0NhbiBvbmx5IHVwZ3JhZGUgdW5zZXR0bGVkIHByb21pc2Ugb3IgZGVmZXJyZWQgaW50byBhIHF1ZXVlLicpO1xuICAgIH1cblxuICAgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuICAgIHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIoW1xuICAgICAgICBRdWV1ZVNjaGVtYVxuICAgICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgZm9yKHZhciBpIGluIF9vKXtcbiAgICAgICBvYmpbaV0gPSBfb1tpXTtcbiAgICB9XG5cbiAgICAvL2RlbGV0ZSBfbztcblxuICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBRVUVVRVxuICAgIG9iaiA9IHRoaXMuYWN0aXZhdGUob2JqLG9wdGlvbnMsZGVwcyk7XG5cbiAgICAvL1JFVFVSTiBRVUVVRSBPQkpFQ1RcbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJvdG8gPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpO1xuXG4vL0V4dGVuZCBkZWZlcnJlZCBzY2hlbWFcbnZhciBfcHVibGljID0gT2JqZWN0LmNyZWF0ZShfcHJvdG8se30pO1xuXG5fcHVibGljLm1vZGVsID0gJ3F1ZXVlJztcblxuXG4vL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG5fcHVibGljLnJlc29sdmVyX2ZpcmVkID0gMDtcblxuXG4vL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuLy9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG4vL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcbl9wdWJsaWMuaGFsdF9yZXNvbHV0aW9uID0gMDtcblxuXG4vL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcbl9wdWJsaWMudXBzdHJlYW0gPSB7fTtcblxuXG4vL1VTRUQgUkVUVVJOIFZBTFVFUywgRU5TVVJFUyBPUkRFUlxuX3B1YmxpYy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiogQWRkIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIGEgcXVldWUncyB1cHN0cmVhbSBhcnJheS5cbipcbiogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG4qIHVwc3RyZWFtIGFycmF5IGFyZSByZXNvbHZlZC5cbipcbiogV2hlbiBfcHVibGljLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcbiogZGVwZW5kZW5jeSBpcyBub3QgcHJldmlvdXNseSBzY2hlZHVsZWQgdG8gcmVzb2x2ZVxuKiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcbiogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG4qXG4qIEBwYXJhbSB7YXJyYXl9IGFyciAgL2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcbiogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuKi9cbl9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL3F1ZXVlLnByaXZhdGUuanMnKTtcblxuICAgdHJ5e1xuICAgICAgIGlmKGFyci5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLnVwc3RyZWFtO1xuICAgfVxuICAgY2F0Y2goZXJyKXtcbiAgICAgICBDb25maWcuZGVidWcoZXJyKTtcbiAgIH1cblxuICAgLy9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFRPIEFERFxuICAgaWYodGhpcy5zdGF0ZSAhPT0gMCl7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgXCJDYW5ub3QgYWRkIGRlcGVuZGVuY3kgbGlzdCB0byBxdWV1ZSBpZDonXCIrdGhpcy5pZFxuICAgICAgICArXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCJcbiAgICAgIF0sYXJyLHRoaXMpO1xuICAgfVxuXG4gICBmb3IodmFyIGEgaW4gYXJyKXtcblxuICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAvL0NIRUNLIElGIEVYSVNUU1xuICAgICAgICAgICBjYXNlKHR5cGVvZiBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dID09PSAnb2JqZWN0Jyk6XG4gICAgICAgICAgICAgICBhcnJbYV0gPSBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dO1xuICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgLy9JRiBOT1QsIEFUVEVNUFQgVE8gQ09OVkVSVCBJVCBUTyBBTiBPUkdZIFBST01JU0VcbiAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdID09PSAnb2JqZWN0JyAmJiAoIWFyclthXS5pc19vcmd5KSk6XG4gICAgICAgICAgICAgICBhcnJbYV0gPSBfcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcbiAgICAgICAgICAgICAgICAgcGFyZW50IDogdGhpc1xuICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAvL1JFRiBJUyBBIFBST01JU0UuXG4gICAgICAgICAgIGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIik7XG4gICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGFyclthXSk7XG4gICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgIH1cblxuICAgICAgIC8vbXVzdCBjaGVjayB0aGUgdGFyZ2V0IHRvIHNlZSBpZiB0aGUgZGVwZW5kZW5jeSBleGlzdHMgaW4gaXRzIGRvd25zdHJlYW1cbiAgICAgICBmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcbiAgICAgICAgICAgaWYoYiA9PT0gYXJyW2FdLmlkKXtcbiAgICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcbiAgICAgICAgICAgICAgICArYXJyW2FdLmlkK1wiJyB0byBxdWV1ZVwiK1wiICdcIlxuICAgICAgICAgICAgICAgICt0aGlzLmlkK1wiJy5cXG4gUHJvbWlzZSBvYmplY3QgZm9yICdcIlxuICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcbiAgICAgICAgICAgICAgICArdGhpcy5pZCtcIicgc28gaXQgY2FuJ3QgYmUgYWRkZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAsdGhpcyk7XG4gICAgICAgICAgIH1cbiAgICAgICB9XG5cbiAgICAgICAvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG4gICAgICAgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuICAgICAgIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdID0gdGhpcztcbiAgICAgICB0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG4gICB9XG5cbiAgIHJldHVybiB0aGlzLnVwc3RyZWFtO1xufTtcblxuXG4vKipcbiogUmVtb3ZlIGxpc3QgZnJvbSBhIHF1ZXVlLlxuKlxuKiBAcGFyYW0ge2FycmF5fSBhcnJcbiogQHJldHVybnMge2FycmF5fSBhcnJheSBvZiBsaXN0IHRoZSBxdWV1ZSBpcyB1cHN0cmVhbVxuKi9cbl9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKXtcblxuICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG4gIH1cblxuICBmb3IodmFyIGEgaW4gYXJyKXtcbiAgICAgaWYodGhpcy51cHN0cmVhbVthcnJbYV0uaWRdKXtcbiAgICAgICAgZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcbiAgICAgICAgZGVsZXRlIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdO1xuICAgICB9XG4gIH1cbn07XG5cblxuLyoqXG4qIFJlc2V0cyBhbiBleGlzdGluZyxzZXR0bGVkIHF1ZXVlIGJhY2sgdG8gT3JneWluZyBzdGF0ZS5cbiogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cbiogRmFpbHMgaWYgbm90IHNldHRsZWQuXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4qIEByZXR1cm5zIHtfcHJpdmF0ZS50cGx8Qm9vbGVhbn1cbiovXG5fcHVibGljLnJlc2V0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbiAgaWYodGhpcy5zZXR0bGVkICE9PSAxIHx8IHRoaXMuc3RhdGUgIT09IDEpe1xuICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdGhpcy5zZXR0bGVkID0gMDtcbiAgdGhpcy5zdGF0ZSA9IDA7XG4gIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuICB0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG4gIC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICB9XG5cbiAgLy9DTEVBUiBPVVQgVEhFIERPV05TVFJFQU1cbiAgdGhpcy5kb3duc3RyZWFtID0ge307XG4gIHRoaXMuZGVwZW5kZW5jaWVzID0gW107XG5cbiAgLy9TRVQgTkVXIEFVVE8gVElNRU9VVFxuICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cbiAgLy9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG4gIC8vdGhpcy5jaGVja19zZWxmKClcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcbiogY2FuIGJlIHJlc29sdmVkLlxuKlxuKiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2Fkcyxcbiogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG4qXG4qIC1kZWJ1Z2dpbmdcbipcbiogLXRoZSBxdWV1ZSBoYXMgYmVlbiByZXNldCBhbmQgbm8gbmV3XG4qIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuKlxuKiBAcmV0dXJucyB7aW50fSBTdGF0ZSBvZiB0aGUgcXVldWUuXG4qL1xuX3B1YmxpYy5jaGVja19zZWxmID0gZnVuY3Rpb24oKXtcbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG4gIF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG4gIHJldHVybiB0aGlzLnN0YXRlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyksXG4gICAgQ2FzdCA9IHJlcXVpcmUoJy4vY2FzdC5qcycpLFxuICAgIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5IFxuKiBcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH0gIGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBQYXNzYWJsZSBvcHRpb25zXG4qIEByZXR1cm5zIHtvYmplY3R9IHJlc29sdmVkIGRlZmVycmVkXG4qL1xuZGVmaW5lIDogZnVuY3Rpb24oaWQsZGF0YSxvcHRpb25zKXtcblxuICAgIHZhciBkZWY7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsO1xuICAgIG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGw7XG5cbiAgICAvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcbiAgICBpZih0eXBlb2YgaWQgIT09ICdzdHJpbmcnKXtcbiAgICAgIENvbmZpZy5kZWJ1ZyhcIk11c3Qgc2V0IGlkIHdoZW4gZGVmaW5pbmcgYW4gaW5zdGFuY2UuXCIpO1xuICAgIH1cblxuICAgIC8vQ2hlY2sgbm8gZXhpc3RpbmcgaW5zdGFuY2UgZGVmaW5lZCB3aXRoIHNhbWUgaWRcbiAgICBpZihDb25maWcubGlzdFtpZF0gJiYgQ29uZmlnLmxpc3RbaWRdLnNldHRsZWQgPT09IDEpe1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbid0IGRlZmluZSBcIiArIGlkICsgXCIuIEFscmVhZHkgcmVzb2x2ZWQuXCIpO1xuICAgIH1cblxuICAgIG9wdGlvbnMuaWQgPSBpZDtcblxuICAgIGlmKG9wdGlvbnMuZGVwZW5kZW5jaWVzICE9PSBudWxsXG4gICAgICAmJiBvcHRpb25zLmRlcGVuZGVuY2llcyBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIC8vRGVmaW5lIGFzIGEgcXVldWUgLSBjYW4ndCBhdXRvcmVzb2x2ZSBiZWNhdXNlIHdlIGhhdmUgZGVwc1xuICAgICAgdmFyIGRlcHMgPSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlbGV0ZSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlZiA9IFF1ZXVlKGRlcHMsb3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAvL0RlZmluZSBhcyBhIGRlZmVycmVkXG4gICAgICBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuICAgICAgLy9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG4gICAgICBpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG4gICAgICAgICYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgICAgIHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcbiAgICAgICAgLy9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuICAgICAgICBkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcbiAgICAgICAgZGVmLnJlc29sdmUoZGF0YSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn0sXG5cblxuLyoqXG4gKiBHZXRzIGFuIGV4aXNpdGluZyBkZWZlcnJlZCAvIHF1ZXVlIG9iamVjdCBmcm9tIGdsb2JhbCBzdG9yZS5cbiAqIFJldHVybnMgbnVsbCBpZiBub25lIGZvdW5kLlxuICogXG4gKiBAbWVtYmVyb2Ygb3JneSBcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGlkIElkIG9mIGRlZmVycmVkIG9yIHF1ZXVlIG9iamVjdC5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIHwgcXVldWUgfCBudWxsXG4gKi9cbmdldCA6IGZ1bmN0aW9uKGlkKXtcbiAgaWYoQ29uZmlnLmxpc3RbaWRdKXtcbiAgICByZXR1cm4gQ29uZmlnLmxpc3RbaWRdO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn0sXG5cblxuLyoqXG4gKiBBZGQvcmVtb3ZlIGFuIHVwc3RyZWFtIGRlcGVuZGVuY3kgdG8vZnJvbSBhIHF1ZXVlLlxuICpcbiAqIENhbiB1c2UgYSBxdWV1ZSBpZCwgZXZlbiBmb3IgYSBxdWV1ZSB0aGF0IGlzIHlldCB0byBiZSBjcmVhdGVkLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5IFxuICogXG4gKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHRndCBRdWV1ZSBpZCAvIHF1ZXVlIG9iamVjdFxuICogQHBhcmFtIHthcnJheX0gIGFyciAgQXJyYXkgb2YgcHJvbWlzZSBpZHMgb3IgZGVwZW5kZW5jeSBvYmplY3RzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGFkZCAgSWYgdHJ1ZSA8Yj5BREQ8L2I+IGFycmF5IHRvIHF1ZXVlIGRlcGVuZGVuY2llcywgSWYgZmFsc2UgPGI+UkVNT1ZFPC9iPiBhcnJheSBmcm9tIHF1ZXVlIGRlcGVuZGVuY2llc1xuICpcbiAqIEByZXR1cm4ge29iamVjdH0gcXVldWVcbiAqL1xuYXNzaWduIDogZnVuY3Rpb24odGd0LGFycixhZGQpe1xuXG4gICAgYWRkID0gKHR5cGVvZiBhZGQgPT09IFwiYm9vbGVhblwiKSA/IGFkZCA6IDE7XG5cbiAgICB2YXIgaWQscTtcbiAgICBzd2l0Y2godHJ1ZSl7XG4gICAgICAgIGNhc2UodHlwZW9mIHRndCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRndC50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgIGlkID0gdGd0LmlkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UodHlwZW9mIHRndCA9PT0gJ3N0cmluZycpOlxuICAgICAgICAgICAgaWQgPSB0Z3Q7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJBc3NpZ24gdGFyZ2V0IG11c3QgYmUgYSBxdWV1ZSBvYmplY3Qgb3IgdGhlIGlkIG9mIGEgcXVldWUuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgLy9JRiBUQVJHRVQgQUxSRUFEWSBMSVNURURcbiAgICBpZihDb25maWcubGlzdFtpZF0gJiYgQ29uZmlnLmxpc3RbaWRdLm1vZGVsID09PSAncXVldWUnKXtcbiAgICAgICAgcSA9IENvbmZpZy5saXN0W2lkXTtcblxuICAgICAgICAvLz0+IEFERCBUTyBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGlmKGFkZCl7XG4gICAgICAgICAgICBxLmFkZChhcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vPT4gUkVNT1ZFIEZST00gUVVFVUUnUyBVUFNUUkVBTVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcS5yZW1vdmUoYXJyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvL0NSRUFURSBORVcgUVVFVUUgQU5EIEFERCBERVBFTkRFTkNJRVNcbiAgICBlbHNlIGlmKGFkZCl7XG4gICAgICAgIHEgPSBRdWV1ZShhcnIse1xuICAgICAgICAgICAgaWQgOiBpZFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy9FUlJPUjogQ0FOJ1QgUkVNT1ZFIEZST00gQSBRVUVVRSBUSEFUIERPRVMgTk9UIEVYSVNUXG4gICAgZWxzZXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgZGVwZW5kZW5jaWVzIGZyb20gYSBxdWV1ZSB0aGF0IGRvZXMgbm90IGV4aXN0LlwiLHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiBxO1xufSxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS4gXG4qIEBpZ25vcmVcbiovXG5kZWZlcnJlZCA6IERlZmVycmVkLFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLiBcbiogQGlnbm9yZVxuKi9cbnF1ZXVlIDogUXVldWUsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuIFxuKiBAaWdub3JlXG4qL1xuY2FzdCA6IENhc3QsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuIFxuKiBAaWdub3JlXG4qL1xuY29uZmlnIDogQ29uZmlnLmNvbmZpZ1xuXG59O1xuIl19
