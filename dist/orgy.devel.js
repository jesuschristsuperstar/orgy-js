(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Orgy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/src/main.js":[function(require,module,exports){
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

},{"./cast.js":3,"./config.js":4,"./deferred.js":5,"./queue.js":9}],1:[function(require,module,exports){

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

},{"./config.js":4,"./deferred.private.js":6,"./deferred.schema.js":7,"./queue.private.js":10}]},{},[])("/src/main.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9tYWluLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2Nhc3QuanMiLCJzcmMvY29uZmlnLmpzIiwic3JjL2RlZmVycmVkLmpzIiwic3JjL2RlZmVycmVkLnByaXZhdGUuanMiLCJzcmMvZGVmZXJyZWQuc2NoZW1hLmpzIiwic3JjL2ZpbGVfbG9hZGVyLmpzIiwic3JjL3F1ZXVlLmpzIiwic3JjL3F1ZXVlLnByaXZhdGUuanMiLCJzcmMvcXVldWUuc2NoZW1hLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpLFxuICAgIFF1ZXVlID0gcmVxdWlyZSgnLi9xdWV1ZS5qcycpLFxuICAgIENhc3QgPSByZXF1aXJlKCcuL2Nhc3QuanMnKSxcbiAgICBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIG9yZ3lcbiAqL1xuXG4vKipcbiogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBmcm9tIGEgdmFsdWUgYW5kIGFuIGlkIGFuZCBhdXRvbWF0aWNhbGx5XG4qIHJlc29sdmVzIGl0LlxuKlxuKiBAbWVtYmVyb2Ygb3JneVxuKiBAZnVuY3Rpb24gZGVmaW5lXG4qXG4qIEBwYXJhbSB7c3RyaW5nfSBpZCBBIHVuaXF1ZSBpZCB5b3UgZ2l2ZSB0byB0aGUgb2JqZWN0XG4qIEBwYXJhbSB7bWl4ZWR9ICBkYXRhIFRoZSB2YWx1ZSB0aGF0IHRoZSBvYmplY3QgaXMgYXNzaWduZWRcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgXG4tIDxiPmRlcGVuZGVuY2llczwvYj4ge2FycmF5fVxuLSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPmFzc2lnbmVkVmFsdWU8L2k+LDxpPmRlZmVycmVkPC9pPn1cbiogQHJldHVybnMge29iamVjdH0gcmVzb2x2ZWQgZGVmZXJyZWRcbiovXG5kZWZpbmUgOiBmdW5jdGlvbihpZCxkYXRhLG9wdGlvbnMpe1xuXG4gICAgdmFyIGRlZjtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmRlcGVuZGVuY2llcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzIHx8IG51bGw7XG4gICAgb3B0aW9ucy5yZXNvbHZlciA9IG9wdGlvbnMucmVzb2x2ZXIgfHwgbnVsbDtcblxuICAgIC8vdGVzdCBmb3IgYSB2YWxpZCBpZFxuICAgIGlmKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpe1xuICAgICAgQ29uZmlnLmRlYnVnKFwiTXVzdCBzZXQgaWQgd2hlbiBkZWZpbmluZyBhbiBpbnN0YW5jZS5cIik7XG4gICAgfVxuXG4gICAgLy9DaGVjayBubyBleGlzdGluZyBpbnN0YW5jZSBkZWZpbmVkIHdpdGggc2FtZSBpZFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0uc2V0dGxlZCA9PT0gMSl7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2FuJ3QgZGVmaW5lIFwiICsgaWQgKyBcIi4gQWxyZWFkeSByZXNvbHZlZC5cIik7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5pZCA9IGlkO1xuXG4gICAgaWYob3B0aW9ucy5kZXBlbmRlbmNpZXMgIT09IG51bGxcbiAgICAgICYmIG9wdGlvbnMuZGVwZW5kZW5jaWVzIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgLy9EZWZpbmUgYXMgYSBxdWV1ZSAtIGNhbid0IGF1dG9yZXNvbHZlIGJlY2F1c2Ugd2UgaGF2ZSBkZXBzXG4gICAgICB2YXIgZGVwcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuICAgICAgZGVsZXRlIG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuICAgICAgZGVmID0gUXVldWUoZGVwcyxvcHRpb25zKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIC8vRGVmaW5lIGFzIGEgZGVmZXJyZWRcbiAgICAgIGRlZiA9IERlZmVycmVkKG9wdGlvbnMpO1xuXG4gICAgICAvL1RyeSB0byBpbW1lZGlhdGVseSBzZXR0bGUgW2RlZmluZV1cbiAgICAgIGlmKG9wdGlvbnMucmVzb2x2ZXIgPT09IG51bGxcbiAgICAgICAgJiYgKHR5cGVvZiBvcHRpb25zLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICAgICAgfHwgb3B0aW9ucy5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSkpe1xuICAgICAgICAvL3ByZXZlbnQgZnV0dXJlIGF1dG9yZXNvdmUgYXR0ZW1wdHMgW2kuZS4gZnJvbSB4aHIgcmVzcG9uc2VdXG4gICAgICAgIGRlZi5hdXRvcmVzb2x2ZSA9IGZhbHNlO1xuICAgICAgICBkZWYucmVzb2x2ZShkYXRhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufSxcblxuXG4vKipcbiAqIEdldHMgYW4gZXhpc2l0aW5nIGRlZmVycmVkIC8gcXVldWUgb2JqZWN0IGZyb20gZ2xvYmFsIHN0b3JlLlxuICogUmV0dXJucyBudWxsIGlmIG5vbmUgZm91bmQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBnZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgSWQgb2YgZGVmZXJyZWQgb3IgcXVldWUgb2JqZWN0LlxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgfCBxdWV1ZSB8IG51bGxcbiAqL1xuZ2V0IDogZnVuY3Rpb24oaWQpe1xuICBpZihDb25maWcubGlzdFtpZF0pe1xuICAgIHJldHVybiBDb25maWcubGlzdFtpZF07XG4gIH1cbiAgZWxzZXtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufSxcblxuXG4vKipcbiAqIEFkZC9yZW1vdmUgYW4gdXBzdHJlYW0gZGVwZW5kZW5jeSB0by9mcm9tIGEgcXVldWUuXG4gKlxuICogQ2FuIHVzZSBhIHF1ZXVlIGlkLCBldmVuIGZvciBhIHF1ZXVlIHRoYXQgaXMgeWV0IHRvIGJlIGNyZWF0ZWQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBhc3NpZ25cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHRndCBRdWV1ZSBpZCAvIHF1ZXVlIG9iamVjdFxuICogQHBhcmFtIHthcnJheX0gIGFyciAgQXJyYXkgb2YgcHJvbWlzZSBpZHMgb3IgZGVwZW5kZW5jeSBvYmplY3RzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGFkZCAgSWYgdHJ1ZSA8Yj5BREQ8L2I+IGFycmF5IHRvIHF1ZXVlIGRlcGVuZGVuY2llcywgSWYgZmFsc2UgPGI+UkVNT1ZFPC9iPiBhcnJheSBmcm9tIHF1ZXVlIGRlcGVuZGVuY2llc1xuICpcbiAqIEByZXR1cm4ge29iamVjdH0gcXVldWVcbiAqL1xuYXNzaWduIDogZnVuY3Rpb24odGd0LGFycixhZGQpe1xuXG4gICAgYWRkID0gKHR5cGVvZiBhZGQgPT09IFwiYm9vbGVhblwiKSA/IGFkZCA6IDE7XG5cbiAgICB2YXIgaWQscTtcbiAgICBzd2l0Y2godHJ1ZSl7XG4gICAgICAgIGNhc2UodHlwZW9mIHRndCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRndC50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgIGlkID0gdGd0LmlkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UodHlwZW9mIHRndCA9PT0gJ3N0cmluZycpOlxuICAgICAgICAgICAgaWQgPSB0Z3Q7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJBc3NpZ24gdGFyZ2V0IG11c3QgYmUgYSBxdWV1ZSBvYmplY3Qgb3IgdGhlIGlkIG9mIGEgcXVldWUuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgLy9JRiBUQVJHRVQgQUxSRUFEWSBMSVNURURcbiAgICBpZihDb25maWcubGlzdFtpZF0gJiYgQ29uZmlnLmxpc3RbaWRdLm1vZGVsID09PSAncXVldWUnKXtcbiAgICAgICAgcSA9IENvbmZpZy5saXN0W2lkXTtcblxuICAgICAgICAvLz0+IEFERCBUTyBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGlmKGFkZCl7XG4gICAgICAgICAgICBxLmFkZChhcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vPT4gUkVNT1ZFIEZST00gUVVFVUUnUyBVUFNUUkVBTVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcS5yZW1vdmUoYXJyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvL0NSRUFURSBORVcgUVVFVUUgQU5EIEFERCBERVBFTkRFTkNJRVNcbiAgICBlbHNlIGlmKGFkZCl7XG4gICAgICAgIHEgPSBRdWV1ZShhcnIse1xuICAgICAgICAgICAgaWQgOiBpZFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy9FUlJPUjogQ0FOJ1QgUkVNT1ZFIEZST00gQSBRVUVVRSBUSEFUIERPRVMgTk9UIEVYSVNUXG4gICAgZWxzZXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgZGVwZW5kZW5jaWVzIGZyb20gYSBxdWV1ZSB0aGF0IGRvZXMgbm90IGV4aXN0LlwiLHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiBxO1xufSxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbmRlZmVycmVkIDogRGVmZXJyZWQsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5xdWV1ZSA6IFF1ZXVlLFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xuY2FzdCA6IENhc3QsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5jb25maWcgOiBDb25maWcuY29uZmlnXG5cbn07XG4iLG51bGwsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcbiAgICBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcblxuLyoqXG4gKiBDYXN0cyBhIHRoZW5hYmxlIG9iamVjdCBpbnRvIGFuIE9yZ3kgZGVmZXJyZWQgb2JqZWN0LlxuICpcbiAqID4gVG8gcXVhbGlmeSBhcyBhIDxiPnRoZW5hYmxlPC9iPiwgdGhlIG9iamVjdCB0byBiZSBjYXN0ZWQgbXVzdCBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqID5cbiAqID4gLSBpZFxuICogPlxuICogPiAtIHRoZW4oKVxuICogPlxuICogPiAtIGVycm9yKClcbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGNhc3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIEEgdGhlbmFibGUgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gKiAgLSB7c3RyaW5nfSA8Yj5pZDwvYj4gIFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuICpcbiAqICAtIHtmdW5jdGlvbn0gPGI+dGhlbjwvYj5cbiAqXG4gKiAgLSB7ZnVuY3Rpb259IDxiPmVycm9yPC9iPlxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCIsXCJpZFwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgaWYoIW9ialtyZXF1aXJlZFtpXV0pe1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2FzdCBtZXRob2QgbWlzc2luZyBwcm9wZXJ0eSAnXCIgKyByZXF1aXJlZFtpXSArXCInXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgb3B0aW9ucy5pZCA9IG9iai5pZDtcblxuICAgIC8vTWFrZSBzdXJlIGlkIGRvZXMgbm90IGNvbmZsaWN0IHdpdGggZXhpc3RpbmdcbiAgICBpZihDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiSWQgXCIrb3B0aW9ucy5pZCtcIiBjb25mbGljdHMgd2l0aCBleGlzdGluZyBpZC5cIilcbiAgICB9XG5cbiAgICAvL0NyZWF0ZSBhIGRlZmVycmVkXG4gICAgdmFyIGRlZiA9IERlZmVycmVkKG9wdGlvbnMpO1xuXG4gICAgLy9DcmVhdGUgcmVzb2x2ZXJcbiAgICB2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpe1xuICAgICAgZGVmLnJlc29sdmUuY2FsbChkZWYsYXJndW1lbnRzWzBdKTtcbiAgICB9O1xuXG4gICAgLy9TZXQgUmVzb2x2ZXJcbiAgICBvYmoudGhlbihyZXNvbHZlcik7XG5cbiAgICAvL1JlamVjdCBkZWZlcnJlZCBvbiAuZXJyb3JcbiAgICB2YXIgZXJyID0gZnVuY3Rpb24oZXJyKXtcbiAgICAgIGRlZi5yZWplY3QoZXJyKTtcbiAgICB9O1xuICAgIG9iai5lcnJvcihlcnIpO1xuXG4gICAgLy9SZXR1cm4gZGVmZXJyZWRcbiAgICByZXR1cm4gZGVmO1xufTtcbiIsInZhciBfcHVibGljID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLmxpc3QgPSB7fTtcblxuXG4vKipcbiAqIGl0ZXJhdG9yIGZvciBpZHNcbiAqIEB0eXBlIGludGVnZXJcbiAqL1xuX3B1YmxpYy5pID0gMDtcblxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gdmFsdWVzLlxuICpcbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLnNldHRpbmdzID0ge1xuXG4gICAgZGVidWdfbW9kZSA6IDFcbiAgICAvL3NldCB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgY2FsbGVlIHNjcmlwdCxcbiAgICAvL2JlY2F1c2Ugbm9kZSBoYXMgbm8gY29uc3RhbnQgZm9yIHRoaXNcbiAgICAsY3dkIDogZmFsc2VcbiAgICAsbW9kZSA6IChmdW5jdGlvbigpe1xuICAgICAgICBpZih0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2VzcyArICcnID09PSAnW29iamVjdCBwcm9jZXNzXScpe1xuICAgICAgICAgICAgLy8gaXMgbm9kZVxuICAgICAgICAgICAgcmV0dXJuIFwibmF0aXZlXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vIG5vdCBub2RlXG4gICAgICAgICAgICByZXR1cm4gXCJicm93c2VyXCI7XG4gICAgICAgIH1cbiAgICB9KCkpXG4gICAgLyoqXG4gICAgICogLSBvbkFjdGl2YXRlIC93aGVuIGVhY2ggaW5zdGFuY2UgYWN0aXZhdGVkXG4gICAgICogLSBvblNldHRsZSAgIC93aGVuIGVhY2ggaW5zdGFuY2Ugc2V0dGxlc1xuICAgICAqXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICovXG4gICAgLGhvb2tzIDoge1xuICAgIH1cbiAgICAsdGltZW91dCA6IDUwMDAgLy9kZWZhdWx0IHRpbWVvdXRcbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIE9wdGlvbnMgeW91IHdpc2ggdG8gcGFzcyB0byBzZXQgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBjb25maWdcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIExpc3Qgb2Ygb3B0aW9uczpcblxuICAtIHtudW1iZXJ9IDxiPnRpbWVvdXQ8L2I+XG5cbiAgLSB7c3RyaW5nfSA8Yj5jd2Q8L2I+IFNldHMgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS4gU2VydmVyIHNpZGUgc2NyaXB0cyBvbmx5LlxuXG4gIC0ge2Jvb2xlYW59IDxiPmRlYnVnX21vZGU8L2I+XG5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3NcbiAqL1xuX3B1YmxpYy5jb25maWcgPSBmdW5jdGlvbihvYmope1xuXG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpe1xuICAgICAgICBmb3IodmFyIGkgaW4gb2JqKXtcbiAgICAgICAgICBfcHVibGljLnNldHRpbmdzW2ldID0gb2JqW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9wdWJsaWMuc2V0dGluZ3M7XG59O1xuXG5cbi8qKlxuICogRGVidWdnaW5nIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gbXNnXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5kZWJ1ZyA9IGZ1bmN0aW9uKG1zZyxkZWYpe1xuXG4gICAgdmFyIG1zZ3MgPSAobXNnIGluc3RhbmNlb2YgQXJyYXkpID8gbXNnLmpvaW4oXCJcXG5cIikgOiBbbXNnXTtcblxuICAgIHZhciBlID0gbmV3IEVycm9yKG1zZ3MpO1xuICAgIGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXG5cbiAgICBpZih0aGlzLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuICAgICAgLy90dXJuIG9mZiBkZWJ1Z19tb2RlIHRvIGF2b2lkIGhpdHRpbmcgZGVidWdnZXJcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cblxuICAgIGlmKF9wdWJsaWMuc2V0dGluZ3MubW9kZSA9PT0gJ2Jyb3dzZXInKXtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICBwcm9jZXNzLmV4aXQoKTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogVGFrZSBhbiBhcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyBhbmQgYW4gYXJyYXkgb2YgcHJvcGVydHkgb2JqZWN0cyxcbiAqIG1lcmdlcyBlYWNoLCBhbmQgcmV0dXJucyBhIHNoYWxsb3cgY29weS5cbiAqXG4gKiBAcGFyYW0ge2FycmF5fSBwcm90b09iakFyciBBcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG4gKiBAcGFyYW0ge2FycmF5fSBwcm9wc09iakFyciBBcnJheSBvZiBkZXNpcmVkIHByb3BlcnR5IG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuICogQHJldHVybnMge29iamVjdH0gb2JqZWN0XG4gKi9cbl9wdWJsaWMubmFpdmVfY2xvbmVyID0gZnVuY3Rpb24ocHJvdG9PYmpBcnIscHJvcHNPYmpBcnIpe1xuXG4gICAgZnVuY3Rpb24gbWVyZ2UoZG9ub3JzKXtcbiAgICAgIHZhciBvID0ge307XG4gICAgICBmb3IodmFyIGEgaW4gZG9ub3JzKXtcbiAgICAgICAgICBmb3IodmFyIGIgaW4gZG9ub3JzW2FdKXtcbiAgICAgICAgICAgICAgaWYoZG9ub3JzW2FdW2JdIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgICAgICAgICAgICAgb1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBkb25vcnNbYV1bYl0gPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICBvW2JdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkb25vcnNbYV1bYl0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICBvW2JdID0gZG9ub3JzW2FdW2JdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG87XG4gICAgfVxuXG4gICAgdmFyIHByb3RvID0gbWVyZ2UocHJvdG9PYmpBcnIpLFxuICAgICAgICBwcm9wcyA9IG1lcmdlKHByb3BzT2JqQXJyKTtcblxuICAgIC8vQHRvZG8gY29uc2lkZXIgbWFudWFsbHkgc2V0dGluZyB0aGUgcHJvdG90eXBlIGluc3RlYWRcbiAgICB2YXIgZmluYWxPYmplY3QgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcbiAgICBmb3IodmFyIGkgaW4gcHJvcHMpe1xuICAgICAgZmluYWxPYmplY3RbaV0gPSBwcm9wc1tpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmluYWxPYmplY3Q7XG59O1xuXG5cbl9wdWJsaWMuZ2VuZXJhdGVfaWQgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnLScgKyAoKyt0aGlzLmkpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG52YXIgRGVmZXJyZWRTY2hlbWEgPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpO1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneS9kZWZlcnJlZFxuKi9cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIG9iamVjdCBvciBpZiBvbmUgZXhpc3RzIGJ5IHRoZSBzYW1lIGlkLFxuICogcmV0dXJucyBpdC5cblxuIDxiPlVzYWdlOjwvYj5cbiBgYGBcbiB2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuICAgICAgICBxID0gT3JneS5kZWZlcnJlZCh7XG4gICAgICAgICAgaWQgOiBcInExXCJcbiAgICAgICAgfSk7XG4gYGBgXG5cbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gZGVmZXJyZWRcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBMaXN0IG9mIG9wdGlvbnM6XG4gKlxuICogIC0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuICogICAtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuICogICAtIE9wdGlvbmFsLlxuICpcbiAqXG4gKiAgLSA8Yj50aW1lb3V0PC9iPiB7bnVtYmVyfSBUaW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQgaWYgbm90IHlldCByZXNvbHZlZC5cbiAgICAgLSBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQuXG4gICAgIC0gRGVsYXlzIGluIG9iamVjdC50aGVuKCkgYW5kIG9iamVjdC5kb25lKCkgd29uJ3Qgbm90IHRyaWdnZXIgdGhpcywgYmVjYXVzZSB0aG9zZSBtZXRob2RzIHJ1biBhZnRlciByZXNvbHZlLlxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L2RlZmVycmVkfVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYob3B0aW9ucy5pZCAmJiBDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG4gICAgICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQ3JlYXRlIGEgbmV3IGRlZmVycmVkIGNsYXNzIGluc3RhbmNlXG4gICAgICAgIF9vID0gX3ByaXZhdGUuZmFjdG9yeShbRGVmZXJyZWRTY2hlbWFdLFtvcHRpb25zXSk7XG5cbiAgICAgICAgLy9BQ1RJVkFURSBERUZFUlJFRFxuICAgICAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgRmlsZV9sb2FkZXIgPSByZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJyk7XG5cblxudmFyIF9wdWJsaWMgPSB7fTtcblxuXG4vKipcbiAqIEBwYXJhbSBhcnJheSBvcHRpb25zIFByb3RvdHlwZSBvYmplY3RzXG4qKi9cbl9wdWJsaWMuZmFjdG9yeSA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLG9wdGlvbnNPYmpBcnIpe1xuXG4gICAgLy9NZXJnZSBhcnJheSBvZiBvYmplY3RzIGludG8gYSBzaW5nbGUsIHNoYWxsb3cgY2xvbmVcbiAgICB2YXIgX28gPSBDb25maWcubmFpdmVfY2xvbmVyKHByb3RvT2JqQXJyLG9wdGlvbnNPYmpBcnIpO1xuXG4gICAgLy9pZiBubyBpZCwgZ2VuZXJhdGUgb25lXG4gICAgX28uaWQgPSAoIV9vLmlkKSA/IENvbmZpZy5nZW5lcmF0ZV9pZCgpIDogX28uaWQ7XG5cbiAgICByZXR1cm4gX287XG59O1xuXG5cbl9wdWJsaWMuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmope1xuXG4gICAgLy9NQUtFIFNVUkUgTkFNSU5HIENPTkZMSUNUIERPRVMgTk9UIEVYSVNUXG4gICAgaWYoQ29uZmlnLmxpc3Rbb2JqLmlkXSAmJiAhQ29uZmlnLmxpc3Rbb2JqLmlkXS5vdmVyd3JpdGFibGUpe1xuICAgICAgICBDb25maWcuZGVidWcoXCJUcmllZCBpbGxlZ2FsIG92ZXJ3cml0ZSBvZiBcIitvYmouaWQrXCIuXCIpO1xuICAgICAgICByZXR1cm4gQ29uZmlnLmxpc3Rbb2JqLmlkXTtcbiAgICB9XG5cbiAgICAvL1NBVkUgVE8gTUFTVEVSIExJU1RcbiAgICBDb25maWcubGlzdFtvYmouaWRdID0gb2JqO1xuXG4gICAgLy9BVVRPIFRJTUVPVVRcbiAgICBfcHVibGljLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cbiAgICAvL0NhbGwgaG9va1xuICAgIGlmKENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuX3B1YmxpYy5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG4gICAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gICAgaWYoZGVmLnRpbWVvdXRfaWQpe1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVmLnRpbWVvdXRfaWQpO1xuICAgIH1cblxuICAgIC8vU2V0IHN0YXRlIHRvIHJlc29sdmVkXG4gICAgX3B1YmxpYy5zZXRfc3RhdGUoZGVmLDEpO1xuXG4gICAgLy9DYWxsIGhvb2tcbiAgICBpZihDb25maWcuc2V0dGluZ3MuaG9va3Mub25TZXR0bGUpe1xuICAgICAgQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKGRlZik7XG4gICAgfVxuXG4gICAgLy9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cbiAgICBkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcbiAgICAgICAgZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG4gICAgICAgIC8vUnVuIGRvbmVcbiAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICxkZWYuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICxkZWYuY2Fib29zZVxuICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICApO1xuICAgIH0pO1xuXG4gICAgLy9SdW4gdGhlbiBxdWV1ZVxuICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICBkZWZcbiAgICAgICAgLGRlZi5jYWxsYmFja3MudGhlblxuICAgICAgICAsZGVmLnZhbHVlXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICk7XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIFJ1bnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIHNlcXVlbnRpYWxseSBhcyBhIHBhcnRpYWwgZnVuY3Rpb24uXG4gKiBFYWNoIGZ1bmN0aW9uJ3MgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBvZiBpdHMgcHJlZGVjZXNzb3IgZnVuY3Rpb24uXG4gKlxuICogQnkgZGVmYXVsdCwgZXhlY3V0aW9uIGNoYWluIGlzIHBhdXNlZCB3aGVuIGFueSBmdW5jdGlvblxuICogcmV0dXJucyBhbiB1bnJlc29sdmVkIGRlZmVycmVkLiAocGF1c2Vfb25fZGVmZXJyZWQpIFtPUFRJT05BTF1cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmICAvZGVmZXJyZWQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gb2JqICAvaXRpbmVyYXJ5XG4gKiAgICAgIHRyYWluICAgICAgIHthcnJheX1cbiAqICAgICAgaG9va3MgICAgICAge29iamVjdH1cbiAqICAgICAgICAgIG9uQmVmb3JlICAgICAgICB7YXJyYXl9XG4gKiAgICAgICAgICBvbkNvbXBsZXRlICAgICAge2FycmF5fVxuICogQHBhcmFtIHttaXhlZH0gcGFyYW0gL3BhcmFtIHRvIHBhc3MgdG8gZmlyc3QgY2FsbGJhY2tcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgIHBhdXNlX29uX2RlZmVycmVkICAge2Jvb2xlYW59XG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuICAgIC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuICAgIHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG4gICAgLy9vbkJlZm9yZSBldmVudFxuICAgIGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsb2JqLmhvb2tzLm9uQmVmb3JlXG4gICAgICAgICAgICAscGFyYW1cbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICB3aGlsZShvYmoudHJhaW4ubGVuZ3RoID4gMCl7XG5cbiAgICAgICAgLy9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuICAgICAgICB2YXIgbGFzdCA9IG9iai50cmFpbi5zaGlmdCgpO1xuICAgICAgICBkZWYuZXhlY3V0aW9uX2hpc3RvcnkucHVzaChsYXN0KTtcblxuICAgICAgICAvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuICAgICAgICByID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscik7XG5cbiAgICAgICAgLy9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG4gICAgICAgIC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcbiAgICAgICAgaWYob3B0aW9ucy5wYXVzZV9vbl9kZWZlcnJlZCl7XG5cbiAgICAgICAgICAgIC8vSWYgciBpcyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cbiAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyIHIgcmVzb2x2ZXNcbiAgICAgICAgICAgICAgICByLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXG4gICAgICAgICAgICAgICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAgICAgICAgICAgICAsb2JqXG4gICAgICAgICAgICAgICAgICAgICAgICAsclxuICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL3Rlcm1pbmF0ZSBleGVjdXRpb25cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vSWYgaXMgYW4gYXJyYXkgdGhhbiBjb250YWlucyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGVsc2UgaWYociBpbnN0YW5jZW9mIEFycmF5KXtcblxuICAgICAgICAgICAgICAgIHZhciB0aGVuYWJsZXMgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiByKXtcblxuICAgICAgICAgICAgICAgICAgICBpZihyW2ldLnRoZW4gJiYgcltpXS5zZXR0bGVkICE9PSAxKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhlbmFibGVzLnB1c2gocltpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IChmdW5jdGlvbih0LGRlZixvYmoscGFyYW0pe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9CYWlsIGlmIGFueSB0aGVuYWJsZXMgdW5zZXR0bGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiB0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRbaV0uc2V0dGxlZCAhPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG4gICAgICAgICAgICAgICAgICAgICAgICByW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9vbkNvbXBsZXRlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHVibGljLnJ1bl90cmFpbihkZWYsb2JqLmhvb2tzLm9uQ29tcGxldGUscix7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX0pO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcGFyYW0ge251bWJlcn0gaW50XG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5zZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYsaW50KXtcblxuICAgIGRlZi5zdGF0ZSA9IGludDtcblxuICAgIC8vSUYgUkVTT0xWRUQgT1IgUkVKRUNURUQsIFNFVFRMRVxuICAgIGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuICAgICAgICBkZWYuc2V0dGxlZCA9IDE7XG4gICAgfVxuXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG4gICAgICAgIF9wdWJsaWMuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5fcHVibGljLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZil7XG4gICAgcmV0dXJuIGRlZi5zdGF0ZTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBhdXRvbWF0aWMgdGltZW91dCBvbiBhIHByb21pc2Ugb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7aW50ZWdlcn0gdGltZW91dCAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbih0aW1lb3V0KXtcblxuICAgIHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgPyB0aGlzLnRpbWVvdXQgOiB0aW1lb3V0O1xuXG4gICAgLy9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG4gICAgaWYoIXRoaXMudHlwZSB8fCB0aGlzLnR5cGUgIT09ICd0aW1lcicpe1xuXG4gICAgICAgIC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG4gICAgICAgIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgIFwiQXV0byB0aW1lb3V0IHRoaXMudGltZW91dCBjYW5ub3QgYmUgdW5kZWZpbmVkLlwiXG4gICAgICAgICAgICAgICx0aGlzLmlkXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcbiAgICAgICAgICAgIC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aW1lb3V0X2lkID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IuY2FsbChzY29wZSk7XG4gICAgICAgIH0sIHRoaXMudGltZW91dCk7XG5cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgLy9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG4gICAgaWYodGhpcy5zdGF0ZSAhPT0gMSl7XG5cbiAgICAgICAgLy9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG4gICAgICAgIHZhciBtc2dzID0gW107XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGlmKG9iai5zdGF0ZSAhPT0gMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcbiAgICAgICAgICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiAgICAgICAgICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICAgICAgICAgIHZhciByID0gX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KHRoaXMsJ3Vwc3RyZWFtJyxmbik7XG4gICAgICAgICAgICBtc2dzLnB1c2goc2NvcGUuaWQgKyBcIjogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyIFwiXG4gICAgICAgICAgICAgICAgICAgICsgdGhpcy50aW1lb3V0ICsgXCJtc1wiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChcIkNhdXNlOlwiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5fcHVibGljLmVycm9yID0gZnVuY3Rpb24oY2Ipe1xuXG4gICAgLy9JRiBFUlJPUiBBTFJFQURZIFRIUk9XTiwgRVhFQ1VURSBDQiBJTU1FRElBVEVMWVxuICAgIGlmKHRoaXMuc3RhdGUgPT09IDIpe1xuICAgICAgICBjYigpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICB0aGlzLnJlamVjdF9xLnB1c2goY2IpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFNpZ25hbHMgYWxsIGRvd25zdHJlYW0gcHJvbWlzZXMgdGhhdCBfcHVibGljIHByb21pc2Ugb2JqZWN0J3NcbiAqIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICpcbiAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3JcbiAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnNpZ25hbF9kb3duc3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0KXtcblxuICAgIC8vTUFLRSBTVVJFIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRFxuICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgPT09IDEpe1xuXG4gICAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc3RhdGUgIT09IDEpe1xuICAgICAgICAgICAgLy90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgc3VjY2Vzc2Z1bGx5IHNldHRsZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgQ29uZmlnLmRlYnVnKHRhcmdldC5pZCArIFwiIHRyaWVkIHRvIHNldHRsZSBwcm9taXNlIFwiK1wiJ1wiK3RhcmdldC5kb3duc3RyZWFtW2ldLmlkK1wiJyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gc2V0dGxlZC5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcbiAgICAvL1NFVFRMRUQgVEhBVCBSRVNVTFQgQVMgQSBTSURFIEVGRkVDVCBUTyBBTk9USEVSIFNFVFRMRU1FTlRcbiAgICBmb3IgKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcbiAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG4gICAgICAgICAgICBfcHVibGljLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbi8qKlxuKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSwgYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWUgICAgICAgICAgVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAgICAgICAgICAgICAgVGhlIHRlc3QgY2FsbGJhY2sgdG8gYmUgYXBwbGllZCB0byBlYWNoIG9iamVjdFxuKiBAcGFyYW0ge2FycmF5fSBicmVhZGNydW1iICAgICAgICAgVGhlIGJyZWFkY3J1bWIgdGhyb3VnaCB0aGUgY2hhaW4gb2YgdGhlIGZpcnN0IG1hdGNoXG4qIEByZXR1cm5zIHttaXhlZH1cbiovXG5fcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cbiAgICBpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBicmVhZGNydW1iID0gW29iai5pZF07XG4gICAgfVxuXG4gICAgdmFyIHIxO1xuXG4gICAgZm9yKHZhciBpIGluIG9ialtwcm9wTmFtZV0pe1xuXG4gICAgICAgIC8vUlVOIFRFU1RcbiAgICAgICAgcjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuICAgICAgICBpZihyMSAhPT0gZmFsc2Upe1xuICAgICAgICAvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcbiAgICAgICAgICAgIC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuICAgICAgICAgICAgaWYoYnJlYWRjcnVtYi5pbmRleE9mKHIxKSAhPT0gLTEpe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICAgICAgICBcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICtwcm9wTmFtZStcIicgb2Ygb2JqZWN0IFwiXG4gICAgICAgICAgICAgICAgICAgICAgICArKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuICAgICAgICAgICAgICAgICAgICAsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhZGNydW1iLnB1c2gocjEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pKClcbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKTtcblxuICAgICAgICAgICAgaWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuICAgICAgICAgICAgICAgIHJldHVybiBfcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiBicmVhZGNydW1iO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGEgcHJvbWlzZSBkZXNjcmlwdGlvbiBpbnRvIGEgcHJvbWlzZS5cbiAqXG4gKiBAcGFyYW0ge3R5cGV9IG9ialxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuX3B1YmxpYy5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cbiAgICBvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuICAgIC8vQXV0b25hbWVcbiAgICBpZiAoIW9iai5pZCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG4gICAgICAgIG9iai5pZCA9IFwidGltZXItXCIgKyBvYmoudGltZW91dCArIFwiLVwiICsgKCsrQ29uZmlnLmkpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodHlwZW9mIG9iai51cmwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpO1xuICAgICAgICAvL1JFTU9WRSAuanMgRlJPTSBJRFxuICAgICAgICBpZiAob2JqLmlkLnNlYXJjaChcIi5qc1wiKSAhPT0gLTEpIHtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuc3BsaXQoXCIuXCIpO1xuICAgICAgICAgIG9iai5pZC5wb3AoKTtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1JldHVybiBpZiBhbHJlYWR5IGV4aXN0c1xuICAgIGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuICAgICAgLy9BIHByZXZpb3VzIHByb21pc2Ugb2YgdGhlIHNhbWUgaWQgZXhpc3RzLlxuICAgICAgLy9NYWtlIHN1cmUgdGhpcyBkZXBlbmRlbmN5IG9iamVjdCBkb2Vzbid0IGhhdmUgYVxuICAgICAgLy9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3JcbiAgICAgIGlmKG9iai5yZXNvbHZlcil7XG4gICAgICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgXCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG4gICAgICAgICAgLFwiRGV0ZWN0ZWQgcmUtaW5pdCBvZiAnXCIgKyBvYmouaWQgKyBcIicuXCJcbiAgICAgICAgICAsXCJBdHRlbXB0ZWQ6XCJcbiAgICAgICAgICAsb2JqXG4gICAgICAgICAgLFwiRXhpc3Rpbmc6XCJcbiAgICAgICAgICAsQ29uZmlnLmxpc3Rbb2JqLmlkXVxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2VcbiAgICB2YXIgZGVmO1xuICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAvL0V2ZW50XG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICdldmVudCcpOlxuICAgICAgICAgICAgZGVmID0gX3B1YmxpYy53cmFwX2V2ZW50KG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcbiAgICAgICAgICAgIHZhciBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKTtcbiAgICAgICAgICAgIGRlZiA9IFF1ZXVlKG9iai5kZXBlbmRlbmNpZXMsb2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vQWxyZWFkeSBhIHRoZW5hYmxlXG4gICAgICAgIGNhc2UodHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nKTpcblxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgICAgICAgLy9SZWZlcmVuY2UgdG8gYW4gZXhpc3RpbmcgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBvYmouaWQgPT09ICdzdHJpbmcnKTpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMuZGVmZXJyZWQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQgOiBvYmouaWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmKG9iai50aGVuKXtcbiAgICAgICAgICAgICAgICAgICAgICBvYmoudGhlbihmdW5jdGlvbihyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHIpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgLy9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuICAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5wcm9taXNlID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgICAgICAgaWYob2JqLnNjb3BlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iai5wcm9taXNlLmNhbGwob2JqLnNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIC8vT2JqZWN0IGlzIGEgdGhlbmFibGVcbiAgICAgICAgICAgICAgICBjYXNlKG9iai50aGVuKTpcbiAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9DaGVjayBpZiBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgICBpZih0eXBlb2YgZGVmICE9PSAnb2JqZWN0JyB8fCAhZGVmLnRoZW4pe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfdGltZXIob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vTG9hZCBmaWxlXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuICAgICAgICAgICAgLy9Jbmhlcml0IHBhcmVudCdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICAgIGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG4gICAgICAgICAgICAgIG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfeGhyKG9iaik7XG4gICAgfVxuXG4gICAgLy9JbmRleCBwcm9taXNlIGJ5IGlkIGZvciBmdXR1cmUgcmVmZXJlbmNpbmdcbiAgICBDb25maWcubGlzdFtvYmouaWRdID0gZGVmO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBAdG9kbzogcmVkbyB0aGlzXG4gKlxuICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cbiAqXG4gKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3B1YmxpYy53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQoe1xuICAgICAgICBpZCA6IG9iai5pZFxuICAgIH0pO1xuXG5cbiAgICBpZih0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblxuICAgICAgICBpZih0eXBlb2YgJCAhPT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICB2YXIgbXNnID0gJ3dpbmRvdyBhbmQgZG9jdW1lbnQgYmFzZWQgZXZlbnRzIGRlcGVuZCBvbiBqUXVlcnknO1xuICAgICAgICAgICAgZGVmLnJlamVjdChtc2cpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvL0ZvciBub3csIGRlcGVuZCBvbiBqcXVlcnkgZm9yIElFOCBET01Db250ZW50TG9hZGVkIHBvbHlmaWxsXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSl7XG4gICAgICAgICAgICAgICAgY2FzZShvYmouaWQgPT09ICdyZWFkeScgfHwgb2JqLmlkID09PSAnRE9NQ29udGVudExvYWRlZCcpOlxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlKG9iai5pZCA9PT0gJ2xvYWQnKTpcbiAgICAgICAgICAgICAgICAgICAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24ob2JqLmlkLFwiYm9keVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG5fcHVibGljLndyYXBfdGltZXIgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuICAgIHZhciBkZWYgPSBEZWZlcnJlZCgpO1xuXG4gICAgKGZ1bmN0aW9uKGRlZil7XG5cbiAgICAgICAgdmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgZGVmLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN0YXJ0IDogX3N0YXJ0XG4gICAgICAgICAgICAgICAgLGVuZCA6IF9lbmRcbiAgICAgICAgICAgICAgICAsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcbiAgICAgICAgICAgICAgICAsdGltZW91dCA6IG9iai50aW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxvYmoudGltZW91dCk7XG5cbiAgICB9KGRlZikpO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgZGVwZW5kcyBvbiB0aGUgbG9hZGluZyBvZiBhIGZpbGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlcFxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wdWJsaWMud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgaWYoIWRlcFtyZXF1aXJlZFtpXV0pe1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICBcIkZpbGUgcmVxdWVzdHMgY29udmVydGVkIHRvIHByb21pc2VzIHJlcXVpcmU6IFwiICsgcmVxdWlyZWRbaV1cbiAgICAgICAgICAsXCJNYWtlIHN1cmUgeW91IHdlcmVuJ3QgZXhwZWN0aW5nIGRlcGVuZGVuY3kgdG8gYWxyZWFkeSBoYXZlIGJlZW4gcmVzb2x2ZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAsZGVwXG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vSUYgUFJPTUlTRSBGT1IgVEhJUyBVUkwgQUxSRUFEWSBFWElTVFMsIFJFVFVSTiBJVFxuICAgIGlmKENvbmZpZy5saXN0W2RlcC5pZF0pe1xuICAgICAgcmV0dXJuIENvbmZpZy5saXN0W2RlcC5pZF07XG4gICAgfVxuXG4gICAgLy9DT05WRVJUIFRPIERFRkVSUkVEOlxuICAgIHZhciBkZWYgPSBEZWZlcnJlZChkZXApO1xuXG4gICAgaWYodHlwZW9mIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cbi8qKlxuKiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG4qIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG4qXG4qIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2VcbiogaW4gaXRzIHVwc3RyZWFtLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4qIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG4qIEByZXR1cm5zIHt2b2lkfVxuKi9cbl9wdWJsaWMucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCl7XG5cbiAgICBpZih0YXJnZXQuaGFsdF9yZXNvbHV0aW9uID09PSAxKSByZXR1cm47XG5cbiAgIC8vTUFLRSBTVVJFIFRIRSBTSUdOQUwgV0FTIEZST00gQSBQUk9NSVNFIEJFSU5HIExJU1RFTkVEIFRPXG4gICAvL0JVVCBBTExPVyBTRUxGIFNUQVRVUyBDSEVDS1xuICAgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuICAgICAgIHJldHVybiBDb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcbiAgIH1cbiAgIC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuICAgZWxzZXtcbiAgICAgICB2YXIgc3RhdHVzID0gMTtcbiAgICAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LnVwc3RyZWFtKXtcbiAgICAgICAgICAgLy9TRVRTIFNUQVRVUyBUTyAwIElGIEFOWSBPQlNFUlZJTkcgSEFWRSBGQUlMRUQsIEJVVCBOT1QgSUYgUEVORElORyBPUiBSRVNPTFZFRFxuICAgICAgICAgICBpZih0YXJnZXQudXBzdHJlYW1baV0uc3RhdGUgIT09IDEpIHtcbiAgICAgICAgICAgICAgIHN0YXR1cyA9IHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZTtcbiAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICB9XG4gICAgICAgfVxuICAgfVxuXG4gICAvL1JFU09MVkUgUVVFVUUgSUYgVVBTVFJFQU0gRklOSVNIRURcbiAgIGlmKHN0YXR1cyA9PT0gMSl7XG5cbiAgICAgICAgLy9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcbiAgICAgICAgLy9SRVBPUlRTIERVUExJQ0FURVNcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh0YXJnZXQuZGVwZW5kZW5jaWVzW2ldLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldC5yZXNvbHZlLmNhbGwodGFyZ2V0LHZhbHVlcyk7XG4gICB9XG5cbiAgIGlmKHN0YXR1cyA9PT0gMil7XG4gICAgICAgdmFyIGVyciA9IFtcbiAgICAgICAgICAgdGFyZ2V0LmlkK1wiIGRlcGVuZGVuY3kgJ1wiK3RhcmdldC51cHN0cmVhbVtpXS5pZCArIFwiJyB3YXMgcmVqZWN0ZWQuXCJcbiAgICAgICAgICAgLHRhcmdldC51cHN0cmVhbVtpXS5hcmd1bWVudHNcbiAgICAgICBdO1xuICAgICAgIHRhcmdldC5yZWplY3QuYXBwbHkodGFyZ2V0LGVycik7XG4gICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCIvKipcbiAqIERlZmF1bHQgcHJvcGVydGllcyBmb3IgYWxsIGRlZmVycmVkIG9iamVjdHMuXG4gKiBAaWdub3JlXG4gKi9cblxudmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3B1YmxpYyA9IHt9O1xuXG5fcHVibGljLmlzX29yZ3kgPSB0cnVlO1xuXG5fcHVibGljLmlkID0gbnVsbDtcblxuLy9BIENPVU5URVIgRk9SIEFVVDAtR0VORVJBVEVEIFBST01JU0UgSUQnU1xuX3B1YmxpYy5zZXR0bGVkID0gMDtcblxuLyoqXG4gKiBTVEFURSBDT0RFUzpcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLVxuICogLTEgICA9PiBTRVRUTElORyBbRVhFQ1VUSU5HIENBTExCQUNLU11cbiAqICAwICAgPT4gUEVORElOR1xuICogIDEgICA9PiBSRVNPTFZFRCAvIEZVTEZJTExFRFxuICogIDIgICA9PiBSRUpFQ1RFRFxuICovXG5fcHVibGljLnN0YXRlID0gMDtcblxuX3B1YmxpYy52YWx1ZSA9IFtdO1xuXG4vL1RoZSBtb3N0IHJlY2VudCB2YWx1ZSBnZW5lcmF0ZWQgYnkgdGhlIHRoZW4tPmRvbmUgY2hhaW4uXG5fcHVibGljLmNhYm9vc2UgPSBudWxsO1xuXG5fcHVibGljLm1vZGVsID0gXCJkZWZlcnJlZFwiO1xuXG5fcHVibGljLmRvbmVfZmlyZWQgPSAwO1xuXG5fcHVibGljLnRpbWVvdXRfaWQgPSBudWxsO1xuXG5fcHVibGljLmNhbGxiYWNrX3N0YXRlcyA9IHtcbiAgcmVzb2x2ZSA6IDBcbiAgLHRoZW4gOiAwXG4gICxkb25lIDogMFxuICAscmVqZWN0IDogMFxufTtcblxuLyoqXG4gKiBTZWxmIGV4ZWN1dGluZyBmdW5jdGlvbiB0byBpbml0aWFsaXplIGNhbGxiYWNrIGV2ZW50XG4gKiBsaXN0LlxuICpcbiAqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgcHJvcGVydHlOYW1lcyBhc1xuICogX3B1YmxpYy5jYWxsYmFja19zdGF0ZXM6IGFkZGluZyBib2lsZXJwbGF0ZVxuICogcHJvcGVydGllcyBmb3IgZWFjaFxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMuY2FsbGJhY2tzID0gKGZ1bmN0aW9uKCl7XG5cbiAgdmFyIG8gPSB7fTtcblxuICBmb3IodmFyIGkgaW4gX3B1YmxpYy5jYWxsYmFja19zdGF0ZXMpe1xuICAgIG9baV0gPSB7XG4gICAgICB0cmFpbiA6IFtdXG4gICAgICAsaG9va3MgOiB7XG4gICAgICAgIG9uQmVmb3JlIDoge1xuICAgICAgICAgIHRyYWluIDogW11cbiAgICAgICAgfVxuICAgICAgICAsb25Db21wbGV0ZSA6IHtcbiAgICAgICAgICB0cmFpbiA6IFtdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG87XG59KSgpO1xuXG4vL1BST01JU0UgSEFTIE9CU0VSVkVSUyBCVVQgRE9FUyBOT1QgT0JTRVJWRSBPVEhFUlNcbl9wdWJsaWMuZG93bnN0cmVhbSA9IHt9O1xuXG5fcHVibGljLmV4ZWN1dGlvbl9oaXN0b3J5ID0gW107XG5cbi8vV0hFTiBUUlVFLCBBTExPV1MgUkUtSU5JVCBbRk9SIFVQR1JBREVTIFRPIEEgUVVFVUVdXG5fcHVibGljLm92ZXJ3cml0YWJsZSA9IDA7XG5cblxuLyoqXG4gKiBEZWZhdWx0IHRpbWVvdXQgZm9yIGEgZGVmZXJyZWRcbiAqIEB0eXBlIG51bWJlclxuICovXG5fcHVibGljLnRpbWVvdXQgPSBDb25maWcuc2V0dGluZ3MudGltZW91dDtcblxuLyoqXG4gKiBSRU1PVEVcbiAqXG4gKiBSRU1PVEUgPT0gMSAgPT4gIFtERUZBVUxUXSBNYWtlIGh0dHAgcmVxdWVzdCBmb3IgZmlsZVxuICpcbiAqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cbiAqXG4gKiBPTkxZIEFQUExJRVMgVE8gU0NSSVBUUyBSVU4gVU5ERVIgTk9ERSBBUyBCUk9XU0VSIEhBUyBOT1xuICogRklMRVNZU1RFTSBBQ0NFU1NcbiAqL1xuX3B1YmxpYy5yZW1vdGUgPSAxO1xuXG4vL0FERFMgVE8gTUFTVEVSIExJU1QuIEFMV0FZUyBUUlVFIFVOTEVTUyBVUEdSQURJTkcgQSBQUk9NSVNFIFRPIEEgUVVFVUVcbl9wdWJsaWMubGlzdCA9IDE7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIFJlc29sdmVzIGEgZGVmZXJyZWQvcXVldWUuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcbiAqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3Jlc29sdmVcbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWx1ZSBSZXNvbHZlciB2YWx1ZS5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG4gKi9cbl9wdWJsaWMucmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICB0aGlzLmlkICsgXCIgY2FuJ3QgcmVzb2x2ZS5cIlxuICAgICAgLFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG4gICAgXSk7XG4gIH1cblxuICAvL1NFVCBTVEFURSBUTyBTRVRUTEVNRU5UIElOIFBST0dSRVNTXG4gIF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuICAvL1NFVCBWQUxVRVxuICB0aGlzLnZhbHVlID0gdmFsdWU7XG5cbiAgLy9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcbiAgLy9FVkVOIElGIFRIRVJFIElTIE5PIFJFU09MVkVSLCBTRVQgSVQgVE8gRklSRUQgV0hFTiBDQUxMRURcbiAgaWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG4gICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cbiAgICAvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG4gICAgdHJ5e1xuICAgICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVzb2x2ZXIodmFsdWUsdGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY2F0Y2goZSl7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG4gIH1cbiAgZWxzZXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cbiAgICAvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3NcbiAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuICAgICAgX3ByaXZhdGUuc2V0dGxlKHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgLy9SdW4gcmVzb2x2ZVxuICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgdGhpc1xuICAgICx0aGlzLmNhbGxiYWNrcy5yZXNvbHZlXG4gICAgLHRoaXMudmFsdWVcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgLy9yZXNvbHZlciBpcyBleHBlY3RlZCB0byBjYWxsIHJlc29sdmUgYWdhaW5cbiAgLy9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogUmVqZWN0cyBhIGRlZmVycmVkL3F1ZXVlXG4gKlxuICogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcbiAqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3JlamVjdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBlcnIgRXJyb3IgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG4gKi9cbl9wdWJsaWMucmVqZWN0ID0gZnVuY3Rpb24oZXJyKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZighKGVyciBpbnN0YW5jZW9mIEFycmF5KSl7XG4gICAgZXJyID0gW2Vycl07XG4gIH1cblxuICB2YXIgbXNnID0gXCJSZWplY3RlZCBcIit0aGlzLm1vZGVsK1wiOiAnXCIrdGhpcy5pZCtcIicuXCJcblxuICBpZihDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgZXJyLnVuc2hpZnQobXNnKTtcbiAgICBDb25maWcuZGVidWcoZXJyLHRoaXMpO1xuICB9XG4gIGVsc2V7XG4gICAgbXNnID0gbXNnICsgXCIgVHVybiBvbiBkZWJ1ZyBtb2RlIGZvciBtb3JlIGluZm8uXCI7XG4gICAgY29uc29sZS53YXJuKG1zZyk7XG4gIH1cblxuICAvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcbiAgaWYodGhpcy50aW1lb3V0X2lkKXtcbiAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgfVxuXG4gIC8vU2V0IHN0YXRlIHRvIHJlamVjdGVkXG4gIF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLDIpO1xuXG4gIC8vRXhlY3V0ZSByZWplY3Rpb24gcXVldWVcbiAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgIHRoaXNcbiAgICAsdGhpcy5jYWxsYmFja3MucmVqZWN0XG4gICAgLGVyclxuICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBDaGFpbiBtZXRob2RcblxuIDxiPlVzYWdlOjwvYj5cbiBgYGBcbiB2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuICAgICAgICBxID0gT3JneS5kZWZlcnJlZCh7XG4gICAgICAgICAgaWQgOiBcInExXCJcbiAgICAgICAgfSk7XG5cbiAvL1Jlc29sdmUgdGhlIGRlZmVycmVkXG4gcS5yZXNvbHZlKFwiU29tZSB2YWx1ZS5cIik7XG5cbiBxLnRoZW4oZnVuY3Rpb24ocil7XG4gIGNvbnNvbGUubG9nKHIpOyAvL1NvbWUgdmFsdWUuXG4gfSlcblxuIGBgYFxuXG4gKiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuICogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjdGhlblxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSByZWplY3RvciBSZWplY3Rpb24gY2FsbGJhY2sgZnVuY3Rpb25cbiAqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcbiAqL1xuX3B1YmxpYy50aGVuID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG4gIHN3aXRjaCh0cnVlKXtcblxuICAgIC8vQW4gZXJyb3Igd2FzIHByZXZpb3VzbHkgdGhyb3duLCBhZGQgcmVqZWN0b3IgJiBiYWlsIG91dFxuICAgIGNhc2UodGhpcy5zdGF0ZSA9PT0gMik6XG4gICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuICAgIGNhc2UodGhpcy5kb25lX2ZpcmVkID09PSAxKTpcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG4gICAgZGVmYXVsdDpcblxuICAgICAgLy9QdXNoIGNhbGxiYWNrIHRvIHRoZW4gcXVldWVcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cbiAgICAgIC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcbiAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgdGhpc1xuICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy50aGVuXG4gICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgLy9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuICAgICAgZWxzZXt9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBEb25lIGNhbGxiYWNrLlxuICpcbiAqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG4gKiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCNkb25lXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb25cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdG9yIFJlamVjdGlvbiBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcbiAqL1xuX3B1YmxpYy5kb25lID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG4gIGlmKHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ubGVuZ3RoID09PSAwXG4gICAgICYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCl7XG4gICAgICBpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpe1xuXG4gICAgICAgIC8vd3JhcCBjYWxsYmFjayB3aXRoIHNvbWUgb3RoZXIgY29tbWFuZHNcbiAgICAgICAgdmFyIGZuMiA9IGZ1bmN0aW9uKHIsZGVmZXJyZWQsbGFzdCl7XG5cbiAgICAgICAgICAvL0RvbmUgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UsIHNvIG5vdGUgdGhhdCBpdCBoYXMgYmVlblxuICAgICAgICAgIGRlZmVycmVkLmRvbmVfZmlyZWQgPSAxO1xuXG4gICAgICAgICAgZm4ocixkZWZlcnJlZCxsYXN0KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLnB1c2goZm4yKTtcblxuICAgICAgICAvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWUgb25Db21wbGV0ZVxuICAgICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnJlamVjdC5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG4gICAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSl7XG4gICAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gMSl7XG4gICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgICB0aGlzXG4gICAgICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy5yZWplY3RcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICAgIGVsc2V7fVxuICAgIH1cbiAgICBlbHNle1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gIH1cbiAgZWxzZXtcbiAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiZG9uZSgpIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLlwiKTtcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHVibGljID0ge30sXG4gICAgX3ByaXZhdGUgPSB7fTtcblxuX3B1YmxpYy5icm93c2VyID0ge30sXG5fcHVibGljLm5hdGl2ZSA9IHt9LFxuX3ByaXZhdGUubmF0aXZlID0ge307XG5cbi8vQnJvd3NlciBsb2FkXG5cbl9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuICB2YXIgaGVhZCA9ICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG4gIGlmKGVsZW0ub25sb2FkKXtcbiAgICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG4gICAgICAgfTtcblxuICAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChcIkZhaWxlZCB0byBsb2FkIHBhdGg6IFwiICsgcGF0aCk7XG4gICAgICAgfTtcblxuICAgIH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuICB9XG4gIGVsc2V7XG4gICAgLy9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG4gICAgaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbiAgICBjb25zb2xlLndhcm4oXCJObyBvbmxvYWQgYXZhaWxhYmxlIGZvciBsaW5rIHRhZywgYXV0b3Jlc29sdmluZy5cIik7XG4gICAgZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcbiAgfVxufVxuXG5fcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cbiAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICBlbGVtLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgIGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcbiAgICAgICAgaWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICAgICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgfTtcbiAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuICB0aGlzLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIHRoaXMuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuICB2YXIgcixcbiAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuICAoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgIGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgciA9IHJlcS5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgaWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgciA9IEpTT04ucGFyc2Uocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgX3B1YmxpYy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuICAgICAgICAgICAgICAgICxwYXRoXG4gICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgXSxkZWZlcnJlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfShwYXRoLGRlZmVycmVkKSk7XG5cbiAgcmVxLnNlbmQobnVsbCk7XG59XG5cblxuXG4vL05hdGl2ZSBsb2FkXG5cbl9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLmJyb3dzZXIuY3NzKHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgLy9sb2NhbCBwYWNrYWdlXG4gIGlmKHBhdGhbMF09PT0nLicpe1xuICAgIHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgsZGVmZXJyZWQpO1xuICAgIHZhciByID0gcmVxdWlyZShwYXRoKTtcbiAgICAvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcbiAgICBpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgIHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgfVxuICB9XG4gIC8vcmVtb3RlIHNjcmlwdFxuICBlbHNle1xuICAgIC8vQ2hlY2sgdGhhdCB3ZSBoYXZlIGNvbmZpZ3VyZWQgdGhlIGVudmlyb25tZW50IHRvIGFsbG93IHRoaXMsXG4gICAgLy9hcyBpdCByZXByZXNlbnRzIGEgc2VjdXJpdHkgdGhyZWF0IGFuZCBzaG91bGQgb25seSBiZSB1c2VkIGZvciBkZWJ1Z2dpbmdcbiAgICBpZighQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe19cbiAgICAgIENvbmZpZy5kZWJ1ZyhcIlNldCBjb25maWcuZGVidWdfbW9kZT0xIHRvIHJ1biByZW1vdGUgc2NyaXB0cyBvdXRzaWRlIG9mIGRlYnVnIG1vZGUuXCIpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICB2YXIgVm0gPSByZXF1aXJlKCd2bScpO1xuICAgICAgICByID0gVm0ucnVuSW5UaGlzQ29udGV4dChkYXRhKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5fcHVibGljLm5hdGl2ZS5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMubmF0aXZlLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgKGZ1bmN0aW9uKGRlZmVycmVkKXtcbiAgICBfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG4gICAgICBpZihkZWZlcnJlZC50eXBlID09PSAnanNvbicpe1xuICAgICAgICByID0gSlNPTi5wYXJzZShyKTtcbiAgICAgIH1cbiAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgfSlcbiAgfSkoZGVmZXJyZWQpXG59XG5cbl9wcml2YXRlLm5hdGl2ZS5nZXQgPSBmdW5jdGlvbiAocGF0aCxkZWZlcnJlZCxjYWxsYmFjayl7XG4gIHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgpO1xuICBpZihwYXRoWzBdID09PSAnLicpe1xuICAgIC8vZmlsZSBzeXN0ZW1cbiAgICB2YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuICAgIEZzLnJlYWRGaWxlKHBhdGgsIFwidXRmLThcIiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgfSk7XG4gIH1cbiAgZWxzZXtcbiAgICAvL2h0dHBcbiAgICB2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcbiAgICByZXF1ZXN0KHBhdGgsZnVuY3Rpb24oZXJyb3IscmVzcG9uc2UsYm9keSl7XG4gICAgICBpZiAoIWVycm9yICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG4gICAgICAgIGNhbGxiYWNrKGJvZHkpO1xuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfSlcbiAgfVxufVxuXG5fcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoID0gZnVuY3Rpb24ocCl7XG4gIHAgPSAocFswXSAhPT0gJy8nICYmIHBbMF0gIT09ICcuJylcbiAgPyAoKHBbMF0uaW5kZXhPZihcImh0dHBcIikhPT0wKSA/ICcuLycgKyBwIDogcCkgOiBwO1xuICByZXR1cm4gcDtcbn1cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIERlZmVycmVkU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5zY2hlbWEuanMnKTtcbnZhciBRdWV1ZVNjaGVtYSA9IHJlcXVpcmUoJy4vcXVldWUuc2NoZW1hLmpzJyk7XG52YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL3F1ZXVlLnByaXZhdGUuanMnKTtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIG9yZ3kvcXVldWVcbiAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjdGhlbiBhcyAjdGhlblxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNkb25lIGFzICNkb25lXG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3JlamVjdCBhcyAjcmVqZWN0XG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3Jlc29sdmUgYXMgI3Jlc29sdmVcbiAqXG4qL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG4gKiBpcyByZXNvbHZlZC5cblxuIDxiPlVzYWdlOjwvYj5cbiBgYGBcbiB2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuICAgICAgICBxID0gT3JneS5xdWV1ZShbXG4gICAgICAgICAgIHtcbiAgICAgICAgICAgICBjb21tZW50IDogXCJUaGlzIGlzIGEgbmVzdGVkIHF1ZXVlIGNyZWF0ZWQgb24gdGhlIGZseS5cIlxuICAgICAgICAgICAgICx0eXBlIDogXCJqc29uXCJcbiAgICAgICAgICAgICAsdXJsIDogXCIvYXBpL2pzb24vc29tbnVtc1wiXG4gICAgICAgICAgICAgLHJlc29sdmVyIDogZnVuY3Rpb24ocixkZWZlcnJlZCl7XG4gICAgICAgICAgICAgICAvL0ZpbHRlciBvdXQgZXZlbiBudW1iZXJzXG4gICAgICAgICAgICAgICB2YXIgb2RkID0gYXJyLmZpbHRlcihmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIDAgIT0gdmFsICUgMjtcbiAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShvZGQpO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICAgXSx7XG4gICAgICAgICAgIGlkIDogXCJxMVwiLFxuICAgICAgICAgICByZXNvbHZlciA6IGZ1bmN0aW9uKHIsZGVmZXJyZWQpe1xuICAgICAgICAgICAgIHZhciBwcmltZXMgPSByWzBdLmZpbHRlcihmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgICAgIGhpZ2ggPSBNYXRoLmZsb29yKE1hdGguc3FydCh2YWwpKSArIDE7XG4gICAgICAgICAgICAgICBmb3IgKHZhciBkaXYgPSAyOyBkaXYgPD0gaGlnaDsgZGl2KyspIHtcbiAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICUgZGl2ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJpbWVzKTtcbiAgICAgICAgICAgfSlcbiAgICAgICAgIH0pO1xuXG4gYGBgXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIHF1ZXVlXG4gKlxuICogQHBhcmFtIHthcnJheX0gZGVwcyBBcnJheSBvZiBkZXBlbmRlbmNpZXMgdGhhdCBtdXN0IGJlIHJlc29sdmVkIGJlZm9yZSA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIGNhbGxlZC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBMaXN0IG9mIG9wdGlvbnM6XG5cbi0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuICAtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuICAtIE9wdGlvbmFsLlxuXG5cbi0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLlxuICAtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uXG4gIC0gTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLlxuICAtIFRoZW4sZG9uZSBkZWxheXMgd2lsbCBub3QgZmxhZyBhIHRpbWVvdXQgYmVjYXVzZSB0aGV5IGFyZSBjYWxsZWQgYWZ0ZXIgdGhlIGluc3RhbmNlIGlzIGNvbnNpZGVyZWQgcmVzb2x2ZWQuXG5cblxuLSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPnJlc3VsdDwvaT4sPGk+ZGVmZXJyZWQ8L2k+KX0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuXG4gIC0gPGk+cmVzdWx0PC9pPiBpcyBhbiBhcnJheSBvZiB0aGUgcXVldWUncyByZXNvbHZlZCBkZXBlbmRlbmN5IHZhbHVlcy5cbiAgLSA8aT5kZWZlcnJlZDwvaT4gaXMgdGhlIHF1ZXVlIG9iamVjdC5cbiAgLSBUaGUgcXVldWUgd2lsbCBvbmx5IHJlc29sdmUgd2hlbiA8aT5kZWZlcnJlZDwvaT4ucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnKCkudGltZW91dC5cblxuICAqIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L3F1ZXVlfVxuICpcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG4gIHZhciBfbztcbiAgaWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy9ET0VTIE5PVCBBTFJFQURZIEVYSVNUXG4gIGlmKCFDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cbiAgICAvL1Bhc3MgYXJyYXkgb2YgcHJvdG90eXBlcyB0byBxdWV1ZSBmYWN0b3J5XG4gICAgdmFyIF9vID0gX3ByaXZhdGUuZmFjdG9yeShbRGVmZXJyZWRTY2hlbWEsUXVldWVTY2hlbWFdLFtvcHRpb25zXSk7XG5cbiAgICAvL0FjdGl2YXRlIHF1ZXVlXG4gICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyxvcHRpb25zLGRlcHMpO1xuXG4gIH1cbiAgLy9BTFJFQURZIEVYSVNUU1xuICBlbHNlIHtcblxuICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cbiAgICBpZihfby5tb2RlbCAhPT0gJ3F1ZXVlJyl7XG4gICAgLy9NQVRDSCBGT1VORCBCVVQgTk9UIEEgUVVFVUUsIFVQR1JBREUgVE8gT05FXG5cbiAgICAgIG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMTtcblxuICAgICAgX28gPSBfcHJpdmF0ZS51cGdyYWRlKF9vLG9wdGlvbnMsZGVwcyk7XG4gICAgfVxuICAgIGVsc2V7XG5cbiAgICAgIC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG4gICAgICBmb3IodmFyIGkgaW4gb3B0aW9ucyl7XG4gICAgICAgIF9vW2ldID0gb3B0aW9uc1tpXTtcbiAgICAgIH1cblxuICAgICAgLy9BREQgQURESVRJT05BTCBERVBFTkRFTkNJRVMgSUYgTk9UIFJFU09MVkVEXG4gICAgICBpZihkZXBzLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHJpdmF0ZS50cGwuYWRkLmNhbGwoX28sZGVwcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvL1JFU1VNRSBSRVNPTFVUSU9OIFVOTEVTUyBTUEVDSUZJRUQgT1RIRVJXSVNFXG4gICAgX28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID9cbiAgICBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDA7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cblxuLyoqXG4gKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZVxuICovXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24obyxvcHRpb25zLGRlcHMpe1xuXG4gICAgLy9BQ1RJVkFURSBBUyBBIERFRkVSUkVEXG4gICAgLy92YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcyk7XG4gICAgbyA9IF9wcm90by5hY3RpdmF0ZShvKTtcblxuICAgIC8vQHRvZG8gcmV0aGluayB0aGlzXG4gICAgLy9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG4gICAgLy9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG4gICAgLy9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcbiAgICAvL3JlbW90ZSBzb3VyY2UgaGVyZS5cbiAgICAvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuICAgIC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG4gICAgLy90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cbiAgICBvLnN0YXRlID0gLTE7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgIC8vUmVzdG9yZSBzdGF0ZVxuICAgICAgby5zdGF0ZSA9IDA7XG5cbiAgICAgIC8vQUREIERFUEVOREVOQ0lFUyBUTyBRVUVVRVxuICAgICAgUXVldWVTY2hlbWEuYWRkLmNhbGwobyxkZXBzKTtcblxuICAgICAgLy9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG4gICAgICBzZWxmLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cbiAgICAgIC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG4gICAgICBpZihvLmFzc2lnbil7XG4gICAgICAgICAgZm9yKHZhciBhIGluIG8uYXNzaWduKXtcbiAgICAgICAgICAgICAgc2VsZi5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9LDEpO1xuXG4gICAgcmV0dXJuIG87XG59O1xuXG5cbi8qKlxuKiBVcGdyYWRlcyBhIHByb21pc2Ugb2JqZWN0IHRvIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiovXG5fcHVibGljLnVwZ3JhZGUgPSBmdW5jdGlvbihvYmosb3B0aW9ucyxkZXBzKXtcblxuICAgIGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZygnQ2FuIG9ubHkgdXBncmFkZSB1bnNldHRsZWQgcHJvbWlzZSBvciBkZWZlcnJlZCBpbnRvIGEgcXVldWUuJyk7XG4gICAgfVxuXG4gICAvL0dFVCBBIE5FVyBRVUVVRSBPQkpFQ1QgQU5EIE1FUkdFIElOXG4gICAgdmFyIF9vID0gQ29uZmlnLm5haXZlX2Nsb25lcihbXG4gICAgICAgIFF1ZXVlU2NoZW1hXG4gICAgICAgICxvcHRpb25zXG4gICAgXSk7XG5cbiAgICBmb3IodmFyIGkgaW4gX28pe1xuICAgICAgIG9ialtpXSA9IF9vW2ldO1xuICAgIH1cblxuICAgIC8vZGVsZXRlIF9vO1xuXG4gICAgLy9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG4gICAgb2JqID0gdGhpcy5hY3RpdmF0ZShvYmosb3B0aW9ucyxkZXBzKTtcblxuICAgIC8vUkVUVVJOIFFVRVVFIE9CSkVDVFxuICAgIHJldHVybiBvYmo7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuc2NoZW1hLmpzJyk7XG5cbi8vRXh0ZW5kIGRlZmVycmVkIHNjaGVtYVxudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cbl9wdWJsaWMubW9kZWwgPSAncXVldWUnO1xuXG5cbi8vU0VUIFRSVUUgQUZURVIgUkVTT0xWRVIgRklSRURcbl9wdWJsaWMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuXG5cbi8vUFJFVkVOVFMgQSBRVUVVRSBGUk9NIFJFU09MVklORyBFVkVOIElGIEFMTCBERVBFTkRFTkNJRVMgTUVUXG4vL1BVUlBPU0U6IFBSRVZFTlRTIFFVRVVFUyBDUkVBVEVEIEJZIEFTU0lHTk1FTlQgRlJPTSBSRVNPTFZJTkdcbi8vQkVGT1JFIFRIRVkgQVJFIEZPUk1BTExZIElOU1RBTlRJQVRFRFxuX3B1YmxpYy5oYWx0X3Jlc29sdXRpb24gPSAwO1xuXG5cbi8vVVNFRCBUTyBDSEVDSyBTVEFURSwgRU5TVVJFUyBPTkUgQ09QWVxuX3B1YmxpYy51cHN0cmVhbSA9IHt9O1xuXG5cbi8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG5fcHVibGljLmRlcGVuZGVuY2llcyA9IFtdO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIFFVRVVFIElOU1RBTkNFIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuKiBBZGQgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gYSBxdWV1ZSdzIHVwc3RyZWFtIGFycmF5LlxuKlxuKiBUaGUgcXVldWUgd2lsbCByZXNvbHZlIG9uY2UgYWxsIHRoZSBwcm9taXNlcyBpbiBpdHNcbiogdXBzdHJlYW0gYXJyYXkgYXJlIHJlc29sdmVkLlxuKlxuKiBXaGVuIF9wdWJsaWMuY29uZmlnLmRlYnVnID09IDEsIG1ldGhvZCB3aWxsIHRlc3QgZWFjaFxuKiBkZXBlbmRlbmN5IGlzIG5vdCBwcmV2aW91c2x5IHNjaGVkdWxlZCB0byByZXNvbHZlXG4qIGRvd25zdHJlYW0gZnJvbSB0aGUgdGFyZ2V0LCBpbiB3aGljaFxuKiBjYXNlIGl0IHdvdWxkIG5ldmVyIHJlc29sdmUgYmVjYXVzZSBpdHMgdXBzdHJlYW0gZGVwZW5kcyBvbiBpdC5cbipcbiogQHBhcmFtIHthcnJheX0gYXJyICAvYXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRvIGFkZFxuKiBAcmV0dXJucyB7YXJyYXl9IHVwc3RyZWFtXG4qL1xuX3B1YmxpYy5hZGQgPSBmdW5jdGlvbihhcnIpe1xuXG4gIHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG4gICB0cnl7XG4gICAgICAgaWYoYXJyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXMudXBzdHJlYW07XG4gICB9XG4gICBjYXRjaChlcnIpe1xuICAgICAgIENvbmZpZy5kZWJ1ZyhlcnIpO1xuICAgfVxuXG4gICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG4gICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICBcIkNhbm5vdCBhZGQgZGVwZW5kZW5jeSBsaXN0IHRvIHF1ZXVlIGlkOidcIit0aGlzLmlkXG4gICAgICAgICtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIlxuICAgICAgXSxhcnIsdGhpcyk7XG4gICB9XG5cbiAgIGZvcih2YXIgYSBpbiBhcnIpe1xuXG4gICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgIC8vQ0hFQ0sgSUYgRVhJU1RTXG4gICAgICAgICAgIGNhc2UodHlwZW9mIENvbmZpZy5saXN0W2FyclthXVsnaWQnXV0gPT09ICdvYmplY3QnKTpcbiAgICAgICAgICAgICAgIGFyclthXSA9IENvbmZpZy5saXN0W2FyclthXVsnaWQnXV07XG4gICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAvL0lGIE5PVCwgQVRURU1QVCBUTyBDT05WRVJUIElUIFRPIEFOIE9SR1kgUFJPTUlTRVxuICAgICAgICAgICBjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcbiAgICAgICAgICAgICAgIGFyclthXSA9IF9wcml2YXRlLmNvbnZlcnRfdG9fcHJvbWlzZShhcnJbYV0se1xuICAgICAgICAgICAgICAgICBwYXJlbnQgOiB0aGlzXG4gICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgIC8vUkVGIElTIEEgUFJPTUlTRS5cbiAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJPYmplY3QgY291bGQgbm90IGJlIGNvbnZlcnRlZCB0byBwcm9taXNlLlwiKTtcbiAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYXJyW2FdKTtcbiAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgfVxuXG4gICAgICAgLy9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuICAgICAgIGZvcih2YXIgYiBpbiB0aGlzLmRvd25zdHJlYW0pe1xuICAgICAgICAgICBpZihiID09PSBhcnJbYV0uaWQpe1xuICAgICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgICBcIkVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICdcIlxuICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIHRvIHF1ZXVlXCIrXCIgJ1wiXG4gICAgICAgICAgICAgICAgK3RoaXMuaWQrXCInLlxcbiBQcm9taXNlIG9iamVjdCBmb3IgJ1wiXG4gICAgICAgICAgICAgICAgK2FyclthXS5pZCtcIicgaXMgc2NoZWR1bGVkIHRvIHJlc29sdmUgZG93bnN0cmVhbSBmcm9tIHF1ZXVlICdcIlxuICAgICAgICAgICAgICAgICt0aGlzLmlkK1wiJyBzbyBpdCBjYW4ndCBiZSBhZGRlZCB1cHN0cmVhbS5cIlxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICx0aGlzKTtcbiAgICAgICAgICAgfVxuICAgICAgIH1cblxuICAgICAgIC8vQUREIFRPIFVQU1RSRUFNLCBET1dOU1RSRUFNLCBERVBFTkRFTkNJRVNcbiAgICAgICB0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0gPSBhcnJbYV07XG4gICAgICAgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKTtcbiAgIH1cblxuICAgcmV0dXJuIHRoaXMudXBzdHJlYW07XG59O1xuXG5cbi8qKlxuKiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7YXJyYXl9IGFyclxuKiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG4qL1xuX3B1YmxpYy5yZW1vdmUgPSBmdW5jdGlvbihhcnIpe1xuXG4gIC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBSRU1PVkFMXG4gIGlmKHRoaXMuc3RhdGUgIT09IDApe1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgbGlzdCBmcm9tIHF1ZXVlIGlkOidcIit0aGlzLmlkK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiKTtcbiAgfVxuXG4gIGZvcih2YXIgYSBpbiBhcnIpe1xuICAgICBpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuICAgICAgICBkZWxldGUgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdO1xuICAgICAgICBkZWxldGUgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF07XG4gICAgIH1cbiAgfVxufTtcblxuXG4vKipcbiogUmVzZXRzIGFuIGV4aXN0aW5nLHNldHRsZWQgcXVldWUgYmFjayB0byBPcmd5aW5nIHN0YXRlLlxuKiBDbGVhcnMgb3V0IHRoZSBkb3duc3RyZWFtLlxuKiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHJldHVybnMge19wcml2YXRlLnRwbHxCb29sZWFufVxuKi9cbl9wdWJsaWMucmVzZXQgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLnNldHRsZWQgIT09IDEgfHwgdGhpcy5zdGF0ZSAhPT0gMSl7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbiBvbmx5IHJlc2V0IGEgcXVldWUgc2V0dGxlZCB3aXRob3V0IGVycm9ycy5cIik7XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB0aGlzLnNldHRsZWQgPSAwO1xuICB0aGlzLnN0YXRlID0gMDtcbiAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDA7XG4gIHRoaXMuZG9uZV9maXJlZCA9IDA7XG5cbiAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gIH1cblxuICAvL0NMRUFSIE9VVCBUSEUgRE9XTlNUUkVBTVxuICB0aGlzLmRvd25zdHJlYW0gPSB7fTtcbiAgdGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuICAvL1NFVCBORVcgQVVUTyBUSU1FT1VUXG4gIF9wcml2YXRlLmF1dG9fdGltZW91dC5jYWxsKHRoaXMsb3B0aW9ucy50aW1lb3V0KTtcblxuICAvL1BPSU5UTEVTUyAtIFdJTEwgSlVTVCBJTU1FRElBVEVMWSBSRVNPTFZFIFNFTEZcbiAgLy90aGlzLmNoZWNrX3NlbGYoKVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogQ2F1YWVzIGEgcXVldWUgdG8gbG9vayBvdmVyIGl0cyBkZXBlbmRlbmNpZXMgYW5kIHNlZSBpZiBpdFxuKiBjYW4gYmUgcmVzb2x2ZWQuXG4qXG4qIFRoaXMgaXMgZG9uZSBhdXRvbWF0aWNhbGx5IGJ5IGVhY2ggZGVwZW5kZW5jeSB0aGF0IGxvYWRzLFxuKiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcbipcbiogLWRlYnVnZ2luZ1xuKlxuKiAtdGhlIHF1ZXVlIGhhcyBiZWVuIHJlc2V0IGFuZCBubyBuZXdcbiogZGVwZW5kZW5jaWVzIHdlcmUgc2luY2UgYWRkZWQuXG4qXG4qIEByZXR1cm5zIHtpbnR9IFN0YXRlIG9mIHRoZSBxdWV1ZS5cbiovXG5fcHVibGljLmNoZWNrX3NlbGYgPSBmdW5jdGlvbigpe1xuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcbiAgX3ByaXZhdGUucmVjZWl2ZV9zaWduYWwodGhpcyx0aGlzLmlkKTtcbiAgcmV0dXJuIHRoaXMuc3RhdGU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiJdfQ==
