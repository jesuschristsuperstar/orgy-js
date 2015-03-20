(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Orgy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";

var Config = require("./config.js"),
    Deferred = require("./deferred.js");

/**
 * Casts a thenable object into an Orgy deferred object.
 *
 * > To qualify as a <b>thenable</b>, the object to be casted must have the following properties:
 *  - then()
 *  - error()
 *
 * > If the casted object has an id or url property set, the id or url
 * [in that order] will become the id of the deferred for referencing
 * with Orgy.get(id)
 * 
 * @memberof orgy
 * @function cast
 * 
 * @param {object} obj A thenable
 * @returns {object}
 */
module.exports = function (obj) {

    var required = ["then", "error"];
    for (var i in required) {
        if (!obj[required[i]]) {
            return Config.debug("Castable objects require the following properties: " + required[i]);
        }
    }

    var options = {};
    if (obj.id) {
        options.id = obj.id;
    } else if (obj.url) {
        options.id = obj.url;
    } else {
        //if no id, use backtrace origin
        if (!options.id) {
            options.id = Config.generate_id();
        }
    }

    //Create a deferred
    var def = Deferred(options);

    //Create resolver
    var resolver = function resolver() {
        def.resolve.call(def, arguments[0]);
    };

    //Set Resolver
    obj.then(resolver);

    //Reject deferred on .error
    var err = (function (_err) {
        var _errWrapper = function err(_x) {
            return _err.apply(this, arguments);
        };

        _errWrapper.toString = function () {
            return _err.toString();
        };

        return _errWrapper;
    })(function (err) {
        def.reject(err);
    });
    obj.error(err);

    //Return deferred
    return def;
};

},{"./config.js":3,"./deferred.js":4}],3:[function(require,module,exports){
(function (process){
"use strict";

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

    debug_mode: 1
    //set the current working directory of the callee script,
    //because node has no constant for this
    , cwd: false,
    mode: (function () {
        if (typeof process === "object" && process + "" === "[object process]") {
            // is node
            return "native";
        } else {
            // not node
            return "browser";
        }
    })(),
    /**
     * - onActivate /when each instance activated
     * - onSettle   /when each instance settles
     *
     * @type object
     */
    hooks: {},
    timeout: 5000 //default timeout
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
 * @returns {object}
 */
_public.config = function (obj) {

    if (typeof obj === "object") {
        for (var i in obj) {
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
_public.debug = function (msg, def) {

    var msgs;
    if (msg instanceof Array) {
        msgs = msg.join("\n");
    }

    var e = new Error(msgs);
    console.log(e.stack);

    if (this.settings.debug_mode) {
        //turn off debug_mode to avoid hitting debugger
        debugger;
    }

    if (_public.settings.mode === "browser") {
        return false;
    } else {
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
_public.naive_cloner = function (donors) {
    var o = {};
    for (var a in donors) {
        for (var b in donors[a]) {
            if (donors[a][b] instanceof Array) {
                o[b] = donors[a][b].slice(0);
            } else if (typeof donors[a][b] === "object") {
                try {
                    o[b] = JSON.parse(JSON.stringify(donors[a][b]));
                } catch (e) {
                    console.error(e);
                    debugger;
                }
            } else {
                o[b] = donors[a][b];
            }
        }
    }
    return o;
};

_public.generate_id = function () {
    return new Date().getTime() + "-" + ++this.i;
};

module.exports = _public;

}).call(this,require('_process'))

},{"_process":1}],4:[function(require,module,exports){
"use strict";

var Config = require("./config.js");
var _private = require("./deferred.private.js");

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
 * @returns {object}
 */
module.exports = function (options) {

    var _o;
    options = options || {};

    if (options.id && Config.list[options.id]) {
        _o = Config.list[options.id];
    } else {
        //CREATE NEW INSTANCE OF DEFERRED CLASS
        _o = _private.factory(options);

        //ACTIVATE DEFERRED
        _o = _private.activate(_o);
    }

    return _o;
};

},{"./config.js":3,"./deferred.private.js":5}],5:[function(require,module,exports){
"use strict";

var Config = require("./config.js");
var File_loader = require("./file_loader.js");

var _public = {};

_public.factory = function (options) {

    var DeferredSchema = require("./deferred.schema.js");
    var _o = Config.naive_cloner([DeferredSchema, options]);

    //if no id, use backtrace origin
    if (!options.id) {
        _o.id = Config.generate_id();
    }

    return _o;
};

_public.activate = function (obj) {

    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if (Config.list[obj.id] && !Config.list[obj.id].overwritable) {
        Config.debug("Tried to overwrite " + obj.id + " without overwrite permissions.");
        return Config.list[obj.id];
    }

    //SAVE TO MASTER LIST
    Config.list[obj.id] = obj;

    //AUTO TIMEOUT
    _public.auto_timeout.call(obj);

    //Call hook
    if (Config.settings.hooks.onActivate) {
        Config.settings.hooks.onActivate(obj);
    }

    return obj;
};

_public.settle = function (def) {

    //REMOVE AUTO TIMEOUT TIMER
    if (def.timeout_id) {
        clearTimeout(def.timeout_id);
    }

    //Set state to resolved
    _public.set_state(def, 1);

    //Call hook
    if (Config.settings.hooks.onSettle) {
        Config.settings.hooks.onSettle(def);
    }

    //Add done as a callback to then chain completion.
    def.callbacks.then.hooks.onComplete.train.push(function (d2, itinerary, last) {
        def.caboose = last;

        //Run done
        _public.run_train(def, def.callbacks.done, def.caboose, { pause_on_deferred: false });
    });

    //Run then queue
    _public.run_train(def, def.callbacks.then, def.value, { pause_on_deferred: true });

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
_public.run_train = function (def, obj, param, options) {

    //allow previous return values to be passed down chain
    var r = param || def.caboose || def.value;

    //onBefore event
    if (obj.hooks && obj.hooks.onBefore.train.length > 0) {
        _public.run_train(def, obj.hooks.onBefore, param, { pause_on_deferred: false });
    }

    while (obj.train.length > 0) {

        //remove fn to execute
        var last = obj.train.shift();
        def.execution_history.push(last);

        //def.caboose needed for then chain declared after resolved instance
        r = def.caboose = last.call(def, def.value, def, r);

        //if result is an thenable, halt execution
        //and run unfired arr when thenable settles
        if (options.pause_on_deferred) {

            //If r is an unsettled thenable
            if (r && r.then && r.settled !== 1) {

                //execute rest of this train after r resolves
                r.callbacks.resolve.hooks.onComplete.train.push(function () {

                    _public.run_train(def, obj, r, { pause_on_deferred: true });
                });

                //terminate execution
                return;
            }

            //If is an array than contains an unsettled thenable
            else if (r instanceof Array) {

                var thenables = [];

                for (var i in r) {

                    if (r[i].then && r[i].settled !== 1) {

                        thenables.push(r[i]);

                        var fn = (function (t, def, obj, param) {

                            return function () {

                                //Bail if any thenables unsettled
                                for (var i in t) {
                                    if (t[i].settled !== 1) {
                                        return;
                                    }
                                }

                                _public.run_train(def, obj, param, { pause_on_deferred: true });
                            };
                        })(thenables, def, obj, param);

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
    if (obj.hooks && obj.hooks.onComplete.train.length > 0) {
        _public.run_train(def, obj.hooks.onComplete, r, { pause_on_deferred: false });
    }
};

/**
 * Sets the state of an Orgy object.
 *
 * @param {object} def
 * @param {number} int
 * @returns {void}
 */
_public.set_state = function (def, int) {

    def.state = int;

    //IF RESOLVED OR REJECTED, SETTLE
    if (int === 1 || int === 2) {
        def.settled = 1;
    }

    if (int === 1 || int === 2) {
        _public.signal_downstream(def);
    }
};

/**
 * Gets the state of an Orgy object
 *
 * @param {object} def
 * @returns {number}
 */
_public.get_state = function (def) {
    return def.state;
};

/**
 * Sets the automatic timeout on a promise object.
 *
 * @param {integer} timeout (optional)
 * @returns {Boolean}
 */
_public.auto_timeout = function (timeout) {

    this.timeout = typeof timeout === "undefined" ? this.timeout : timeout;

    //AUTO REJECT ON timeout
    if (!this.type || this.type !== "timer") {

        //DELETE PREVIOUS TIMEOUT IF EXISTS
        if (this.timeout_id) {
            clearTimeout(this.timeout_id);
        }

        if (typeof this.timeout === "undefined") {
            Config.debug(["Auto timeout this.timeout cannot be undefined.", this.id]);
        } else if (this.timeout === -1) {
            //NO AUTO TIMEOUT SET
            return false;
        }
        var scope = this;

        this.timeout_id = setTimeout(function () {
            _public.auto_timeout_cb.call(scope);
        }, this.timeout);
    } else {}

    return true;
};

/**
 * Callback for autotimeout. Declaration here avoids memory leak.
 *
 * @returns {void}
 */
_public.auto_timeout_cb = function () {

    if (this.state !== 1) {

        //GET THE UPSTREAM ERROR ID
        var msgs = [];
        var scope = this;

        var fn = function fn(obj) {
            if (obj.state !== 1) {
                return obj.id;
            } else {
                return false;
            }
        };

        /**
         * Run over a given object property recursively,
         * applying callback until
         * callback returns a non-false value.
         */
        if (Config.settings.debug_mode) {
            var r = _public.search_obj_recursively(this, "upstream", fn);
            msgs.push(scope.id + ": rejected by auto timeout after " + this.timeout + "ms");
            msgs.push("Cause:");
            msgs.push(r);
            return this.reject.call(this, msgs);
        } else {
            return this.reject.call(this);
        }
    }
};

_public.error = function (cb) {

    //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
    if (this.state === 2) {
        cb();
    } else {
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
_public.signal_downstream = function (target) {

    //MAKE SURE ALL DOWNSTREAM IS UNSETTLED
    for (var i in target.downstream) {
        if (target.downstream[i].settled === 1) {

            if (target.downstream[i].state !== 1) {
                //tried to settle a rejected downstream
                continue;
            } else {
                //tried to settle a successfully settled downstream
                Config.debug(target.id + " tried to settle promise " + "'" + target.downstream[i].id + "' that has already been settled.");
            }
        }
    }

    //NOW THAT WE KNOW ALL DOWNSTREAM IS UNSETTLED, WE CAN IGNORE ANY
    //SETTLED THAT RESULT AS A SIDE EFFECT TO ANOTHER SETTLEMENT
    for (var i in target.downstream) {
        if (target.downstream[i].settled !== 1) {
            _public.receive_signal(target.downstream[i], target.id);
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
_public.search_obj_recursively = function (obj, propName, fn, breadcrumb) {

    if (typeof breadcrumb === "undefined") {
        breadcrumb = [obj.id];
    }

    var r1;

    for (var i in obj[propName]) {

        //RUN TEST
        r1 = fn(obj[propName][i]);

        if (r1 !== false) {
            //MATCH RETURNED. RECURSE INTO MATCH IF HAS PROPERTY OF SAME NAME TO SEARCH
            //CHECK THAT WE AREN'T CAUGHT IN A CIRCULAR LOOP
            if (breadcrumb.indexOf(r1) !== -1) {
                return Config.debug(["Circular condition in recursive search of obj property '" + propName + "' of object " + (typeof obj.id !== "undefined" ? "'" + obj.id + "'" : "") + ". Offending value: " + r1, (function () {
                    breadcrumb.push(r1);
                    return breadcrumb.join(" [depends on]=> ");
                })()]);
            }

            breadcrumb.push(r1);

            if (obj[propName][i][propName]) {
                return _public.search_obj_recursively(obj[propName][i], propName, fn, breadcrumb);
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
_public.convert_to_promise = function (obj, options) {

    obj.id = obj.id || options.id;

    //Autoname
    if (!obj.id) {
        if (obj.type === "timer") {
            obj.id = "timer-" + obj.timeout + "-" + ++Config.i;
        } else if (typeof obj.url === "string") {
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
    if (Config.list[obj.id] && obj.type !== "timer") {
        //A previous promise of the same id exists.
        //Make sure this dependency object doesn't have a
        //resolver - if it does error
        if (obj.resolver) {
            Config.debug(["You can't set a resolver on a queue that has already been declared. You can only reference the original.", "Detected re-init of '" + obj.id + "'.", "Attempted:", obj, "Existing:", Config.list[obj.id]]);
        } else {
            return Config.list[obj.id];
        }
    }

    //Convert dependency to an instance
    var def;
    switch (true) {

        //Event
        case obj.type === "event":
            def = _public.wrap_event(obj);
            break;

        case obj.type === "queue":
            var Queue = require("./queue.js");
            def = Queue(obj.dependencies, obj);
            break;

        //Already a thenable
        case typeof obj.then === "function":

            switch (true) {

                //Reference to an existing instance
                case typeof obj.id === "string":
                    console.warn("'" + obj.id + "': did not exist. Auto creating new deferred.");
                    def = _public.deferred({
                        id: obj.id
                    });

                    //If object was a thenable, resolve the new deferred when then called
                    if (obj.then) {
                        obj.then(function (r) {
                            def.resolve(r);
                        });
                    }
                    break;

                //OBJECT PROPERTY .promise EXPECTED TO RETURN A PROMISE
                case typeof obj.promise === "function":
                    if (obj.scope) {
                        def = obj.promise.call(obj.scope);
                    } else {
                        def = obj.promise();
                    }
                    break;

                //Object is a thenable
                case obj.then:
                    def = obj;
                    break;

                default:

            }

            //Check if is a thenable
            if (typeof def !== "object" || !def.then) {
                return Config.debug("Dependency labeled as a promise did not return a promise.", obj);
            }
            break;

        case obj.type === "timer":
            def = _public.wrap_timer(obj);
            break;

        //Load file
        default:
            obj.type = obj.type || "default";
            //Inherit parent's current working directory
            if (options.parent && options.parent.cwd) {
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
_public.wrap_event = function (obj) {

    var Deferred = require("./deferred.js");
    var def = Deferred({
        id: obj.id
    });

    if (typeof document !== "undefined" && typeof window !== "undefined") {

        if (typeof $ !== "function") {
            var msg = "window and document based events depend on jQuery";
            def.reject(msg);
        } else {
            //For now, depend on jquery for IE8 DOMContentLoaded polyfill
            switch (true) {
                case obj.id === "ready" || obj.id === "DOMContentLoaded":
                    $(document).ready(function () {
                        def.resolve(1);
                    });
                    break;
                case obj.id === "load":
                    $(window).load(function () {
                        def.resolve(1);
                    });
                    break;
                default:
                    $(document).on(obj.id, "body", function () {
                        def.resolve(1);
                    });
            }
        }
    }

    return def;
};

_public.wrap_timer = function (obj) {

    var Deferred = require("./deferred.js");
    var def = Deferred();

    (function (def) {

        var _start = new Date().getTime();
        setTimeout(function () {
            var _end = new Date().getTime();
            def.resolve({
                start: _start,
                end: _end,
                elapsed: _end - _start,
                timeout: obj.timeout
            });
        }, obj.timeout);
    })(def);

    return def;
};

/**
 * Creates a deferred object that depends on the loading of a file.
 *
 * @param {object} dep
 * @returns {object} deferred object
 */
_public.wrap_xhr = function (dep) {

    var Deferred = require("./deferred.js");

    var required = ["id", "url"];
    for (var i in required) {
        if (!dep[required[i]]) {
            return Config.debug(["File requests converted to promises require: " + required[i], "Make sure you weren't expecting dependency to already have been resolved upstream.", dep]);
        }
    }

    //IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
    if (Config.list[dep.id]) {
        return Config.list[dep.id];
    }

    //CONVERT TO DEFERRED:
    var def = Deferred(dep);

    if (typeof File_loader[Config.settings.mode][dep.type] !== "undefined") {
        File_loader[Config.settings.mode][dep.type](dep.url, def, dep);
    } else {
        File_loader[Config.settings.mode]["default"](dep.url, def, dep);
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
_public.receive_signal = function (target, from_id) {

    if (target.halt_resolution === 1) return;

    //MAKE SURE THE SIGNAL WAS FROM A PROMISE BEING LISTENED TO
    //BUT ALLOW SELF STATUS CHECK
    if (from_id !== target.id && !target.upstream[from_id]) {
        return Config.debug(from_id + " can't signal " + target.id + " because not in upstream.");
    }
    //RUN THROUGH QUEUE OF OBSERVING PROMISES TO SEE IF ALL DONE
    else {
        var status = 1;
        for (var i in target.upstream) {
            //SETS STATUS TO 0 IF ANY OBSERVING HAVE FAILED, BUT NOT IF PENDING OR RESOLVED
            if (target.upstream[i].state !== 1) {
                status = target.upstream[i].state;
                break;
            }
        }
    }

    //RESOLVE QUEUE IF UPSTREAM FINISHED
    if (status === 1) {

        //GET RETURN VALUES PER DEPENDENCIES, WHICH SAVES ORDER AND
        //REPORTS DUPLICATES
        var values = [];
        for (var i in target.dependencies) {
            values.push(target.dependencies[i].value);
        }

        target.resolve.call(target, values);
    }

    if (status === 2) {
        var err = [target.id + " dependency '" + target.upstream[i].id + "' was rejected.", target.upstream[i].arguments];
        target.reject.apply(target, err);
    }
};

module.exports = _public;

//@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?

},{"./config.js":3,"./deferred.js":4,"./deferred.schema.js":6,"./file_loader.js":7,"./queue.js":9}],6:[function(require,module,exports){
/**
 * Default properties for all deferred objects.
 *
 */
"use strict";

var Config = require("./config.js");
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
  resolve: 0,
  then: 0,
  done: 0,
  reject: 0
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
_public.callbacks = (function () {

  var o = {};

  for (var i in _public.callback_states) {
    o[i] = {
      train: [],
      hooks: {
        onBefore: {
          train: []
        },
        onComplete: {
          train: []
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
_public.resolve = function (value) {

  var _private = require("./deferred.private.js");

  if (this.settled === 1) {
    Config.debug([this.id + " can't resolve.", "Only unsettled deferreds are resolvable."]);
  }

  //SET STATE TO SETTLEMENT IN PROGRESS
  _private.set_state(this, -1);

  //SET VALUE
  this.value = value;

  //RUN RESOLVER BEFORE PROCEEDING
  //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
  if (!this.resolver_fired && typeof this.resolver === "function") {

    this.resolver_fired = 1;

    //Add resolver to resolve train
    try {
      this.callbacks.resolve.train.push(function () {
        this.resolver(value, this);
      });
    } catch (e) {
      debugger;
    }
  } else {

    this.resolver_fired = 1;

    //Add settle to resolve train
    //Always settle before all other complete callbacks
    this.callbacks.resolve.hooks.onComplete.train.unshift(function () {
      _private.settle(this);
    });
  }

  //Run resolve
  _private.run_train(this, this.callbacks.resolve, this.value, { pause_on_deferred: false });

  //resolver is expected to call resolve again
  //and that will get us past this point
  return this;
};

_public.reject = function (err) {

  var _private = require("./deferred.private.js");

  if (!(err instanceof Array)) {
    err = [err];
  }

  var msg = "Rejected " + this.model + ": '" + this.id + "'.";

  if (Config.settings.debug_mode) {
    err.unshift(msg);
    Config.debug(err, this);
  } else {
    msg = msg + "\n Turn debug mode on for more info.";
    console.log(msg);
  }

  //Remove auto timeout timer
  if (this.timeout_id) {
    clearTimeout(this.timeout_id);
  }

  //Set state to rejected
  _private.set_state(this, 2);

  //Execute rejection queue
  _private.run_train(this, this.callbacks.reject, err, { pause_on_deferred: false });

  return this;
};

_public.then = function (fn, rejector) {

  switch (true) {

    //An error was previously thrown, bail out
    case this.state === 2:
      break;

    //Execution chain already finished. Bail out.
    case this.done_fired === 1:
      return Config.debug(this.id + " can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

    default:

      //Push callback to then queue
      this.callbacks.then.train.push(fn);

      //Push reject callback to the rejection queue
      if (typeof rejector === "function") {
        this.callbacks.reject.train.push(rejector);
      }

      //Settled, run train now
      if (this.settled === 1 && this.state === 1 && !this.done_fired) {
        this.run_train(this, this.callbacks.then, this.caboose, { pause_on_deferred: true });
      }
      //Unsettled, train will be run when settled
      else {}
  }

  return this;
};

_public.done = function (fn, rejector) {

  var _private = require("./deferred.private.js");

  if (this.callbacks.done.train.length === 0 && this.done_fired === 0) {
    if (typeof fn === "function") {

      //wrap callback with some other commands
      var fn2 = function fn2(r, deferred, last) {

        //Done can only be called once, so note that it has been
        deferred.done_fired = 1;

        fn(r, deferred, last);
      };

      this.callbacks.done.train.push(fn2);

      //Push reject callback to the rejection queue onComplete
      if (typeof rejector === "function") {
        this.callbacks.reject.hooks.onComplete.train.push(rejector);
      }

      //Settled, run train now
      if (this.settled === 1) {
        if (this.state === 1) {
          _private.run_train(this, this.callbacks.done, this.caboose, { pause_on_deferred: false });
        } else {
          _private.run_train(this, this.callbacks.reject, this.caboose, { pause_on_deferred: false });
        }
      }
      //Unsettled, train will be run when settled
      else {}
    } else {
      return Config.debug("done() must be passed a function.");
    }
  } else {
    return Config.debug("done() can only be called once.");
  }
};

module.exports = _public;

},{"./config.js":3,"./deferred.private.js":5}],7:[function(require,module,exports){
(function (process){
"use strict";

var Config = require("./config.js");
var _public = {},
    _private = {};

_public.browser = {}, _public.native = {}, _private.native = {};

//Browser load

_public.browser.css = function (path, deferred) {

  var head = document.getElementsByTagName("head")[0] || document.documentElement,
      elem = document.createElement("link");

  elem.setAttribute("href", path);
  elem.setAttribute("type", "text/css");
  elem.setAttribute("rel", "stylesheet");

  if (elem.onload) {
    (function (elem, path, deferred) {
      elem.onload = elem.onreadystatechange = function (path, deferred) {
        deferred.resolve(elem);
      };

      elem.onerror = function (path, deferred) {
        deferred.reject("Failed to load path: " + path);
      };
    })(elem, path, deferred);

    head.appendChild(elem);
  } else {
    //ADD elem BUT MAKE XHR REQUEST TO CHECK FILE RECEIVED
    head.appendChild(elem);
    console.warn("No onload available for link tag, autoresolving.");
    deferred.resolve(elem);
  }
};

_public.browser.script = function (path, deferred) {

  var elem = document.createElement("script");
  elem.type = "text/javascript";
  elem.setAttribute("src", path);

  (function (elem, path, deferred) {
    elem.onload = elem.onreadystatechange = function () {
      //Autoresolve by default
      if (typeof deferred.autoresolve !== "boolean" || deferred.autoresolve === true) {
        deferred.resolve(typeof elem.value !== "undefined" ? elem.value : elem);
      }
    };
    elem.onerror = function () {
      deferred.reject("Error loading: " + path);
    };
  })(elem, path, deferred);

  this.head.appendChild(elem);
};

_public.browser.html = function (path, deferred) {
  this["default"](path, deferred);
};

_public.browser["default"] = function (path, deferred, options) {
  var r,
      req = new XMLHttpRequest();
  req.open("GET", path, true);

  (function (path, deferred) {
    req.onreadystatechange = function () {
      if (req.readyState === 4) {
        if (req.status === 200) {
          r = req.responseText;
          if (options.type && options.type === "json") {
            try {
              r = JSON.parse(r);
            } catch (e) {
              _public.debug(["Could not decode JSON", path, r], deferred);
            }
          }
          deferred.resolve(r);
        } else {
          deferred.reject("Error loading: " + path);
        }
      }
    };
  })(path, deferred);

  req.send(null);
};

//Native load

_public.native.css = function (path, deferred) {
  _public.browser.css(path, deferred);
};

_public.native.script = function (path, deferred) {
  //local package
  if (path[0] === ".") {
    var pathInfo = _private.native.prepare_path(path, deferred);

    var r = require(pathInfo.path);

    //Change back to original working dir
    if (pathInfo.dirchanged) process.chdir(pathInfo.owd);

    //Autoresolve by default
    if (typeof deferred.autoresolve !== "boolean" || deferred.autoresolve === true) {
      deferred.resolve(r);
    }
  }
  //remote script
  else {

    //Check that we have configured the environment to allow this,
    //as it represents a security threat and should only be used for debugging
    if (!Config.settings.debug_mode) {
      _;
      Config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.");
    } else {
      _private.native.get(path, deferred, function (data) {
        var Vm = require("vm");
        r = Vm.runInThisContext(data);
        deferred.resolve(r);
      });
    }
  }
};

_public.native.html = function (path, deferred) {
  _public.native["default"](path, deferred);
};

_public.native["default"] = function (path, deferred) {
  _private.native.get(path, deferred, function (r) {
    deferred.resolve(r);
  });
};

_private.native.get = function (path, deferred, callback) {
  if (path[0] === ".") {

    var pathInfo = _private.native.prepare_path(path, deferred);

    //file system

    Fs.readFile(pathInfo.path, function (err, data) {
      if (err) throw err;
      callback(data);
    });

    //Change back to original working dir
    if (pathInfo.dirchanged) process.chdir(pathInfo.owd);
  } else {
    //http
    var Http = require("http");
    Http.get({ path: path }, function (res) {
      var data = "";
      res.on("data", function (buf) {
        data += buf;
      });
      res.on("end", function () {
        callback(data);
      });
    });
  }
};

_private.native.prepare_path = function (path, deferred) {
  var owd = process.cwd(),
      //keep track of starting point so we can return
  cwd = deferred.cwd ? deferred.cwd : Config.settings.cwd ? Config.settings.cwd : false,
      dirchanged = false;

  if (cwd) {
    process.chdir(cwd);
    dirchanged = true;
  } else {
    cwd = owd;
  }

  return {
    owd: owd,
    path: cwd + "/" + path,
    dirchanged: dirchanged
  };
};
module.exports = _public;

}).call(this,require('_process'))

},{"./config.js":3,"_process":1,"http":undefined,"vm":undefined}],8:[function(require,module,exports){
"use strict";

var Deferred = require("./deferred.js"),
    Queue = require("./queue.js"),
    Cast = require("./cast.js"),
    Config = require("./config.js");

module.exports = {

    /**
     * @namespace orgy
     */

    /**
    * Creates a new promise from a value and an id and automatically
    * resolves it.
    *
    * @memberof orgy 
    * 
    * @param {string} id A unique id you give to the object
    * @param {mixed}  data The value that the object is assigned
    * @param {object} options Passable options
    * @returns {object} resolved promise
    */
    define: function define(id, data, options) {

        var def;
        options = options || {};
        options.dependencies = options.dependencies || null;
        options.resolver = options.resolver || null;

        //test for a valid id
        if (typeof id !== "string") {
            Config.debug("Must set id when defining an instance.");
        }

        //Check no existing instance defined with same id
        if (Config.list[id] && Config.list[id].settled === 1) {
            return Config.debug("Can't define " + id + ". Already resolved.");
        }

        options.id = id;

        if (options.dependencies !== null && options.dependencies instanceof Array) {
            //Define as a queue - can't autoresolve because we have deps
            var deps = options.dependencies;
            delete options.dependencies;
            def = Queue(deps, options);
        } else {
            //Define as a deferred
            def = Deferred(options);

            //Try to immediately settle [define]
            if (options.resolver === null && (typeof options.autoresolve !== "boolean" || options.autoresolve === true)) {
                //prevent future autoresove attempts [i.e. from xhr response]
                def.autoresolve = false;
                def.resolve(data);
            }
        }

        return def;
    },

    /**
     * Gets an exisiting orgy object from global store.
     *
     * @memberof orgy 
     * 
     * @param {string} id Id of deferred or queue object.
     * @returns {object}
     */
    get: function get(id) {
        if (Config.list[id]) {
            return Config.list[id];
        } else {
            return Config.debug(["No instance exists: " + id]);
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
    assign: function assign(tgt, arr, add) {

        add = typeof add === "boolean" ? add : 1;

        var id, q;
        switch (true) {
            case typeof tgt === "object" && typeof tgt.then === "function":
                id = tgt.id;
                break;
            case typeof tgt === "string":
                id = tgt;
                break;
            default:
                return Config.debug("Assign target must be a queue object or the id of a queue.", this);
        }

        //IF TARGET ALREADY LISTED
        if (Config.list[id] && Config.list[id].model === "queue") {
            q = Config.list[id];

            //=> ADD TO QUEUE'S UPSTREAM
            if (add) {
                q.add(arr);
            }
            //=> REMOVE FROM QUEUE'S UPSTREAM
            else {
                q.remove(arr);
            }
        }
        //CREATE NEW QUEUE AND ADD DEPENDENCIES
        else if (add) {
            q = Queue(arr, {
                id: id
            });
        }
        //ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
        else {
            return Config.debug("Cannot remove dependencies from a queue that does not exist.", this);
        }

        return q;
    },

    /**
    * Documented in required file. 
    * @ignore
    */
    deferred: Deferred,

    /**
    * Documented in required file. 
    * @ignore
    */
    queue: Queue,

    /**
    * Documented in required file. 
    * @ignore
    */
    cast: Cast,

    /**
    * Documented in required file. 
    * @ignore
    */
    config: Config.config

};

},{"./cast.js":2,"./config.js":3,"./deferred.js":4,"./queue.js":9}],9:[function(require,module,exports){
"use strict";

var Config = require("./config.js");
var _private = require("./queue.private.js");

/**
 * Creates a new queue object.
 * If no <b>resolver</b> option is set, resolved when all dependencies are resolved. Else, resolved when the deferred param passed to the resolver option
 * is resolved.
 * 
 * ### Queue usage example:
 * <pre><code>
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
 * </code></pre>
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
 * @returns {object}
 */
module.exports = function (deps, options) {

  var _o;
  if (!(deps instanceof Array)) {
    return Config.debug("Queue dependencies must be an array.");
  }

  options = options || {};

  //DOES NOT ALREADY EXIST
  if (!Config.list[options.id]) {

    //CREATE NEW QUEUE OBJECT
    var _o = _private.factory(options);

    //ACTIVATE QUEUE
    _o = _private.activate(_o, options, deps);
  }
  //ALREADY EXISTS
  else {

    _o = Config.list[options.id];

    if (_o.model !== "queue") {
      //MATCH FOUND BUT NOT A QUEUE, UPGRADE TO ONE

      options.overwritable = 1;

      _o = _private.upgrade(_o, options, deps);
    } else {

      //OVERWRITE ANY EXISTING OPTIONS
      for (var i in options) {
        _o[i] = options[i];
      }

      //ADD ADDITIONAL DEPENDENCIES IF NOT RESOLVED
      if (deps.length > 0) {
        _private.tpl.add.call(_o, deps);
      }
    }

    //RESUME RESOLUTION UNLESS SPECIFIED OTHERWISE
    _o.halt_resolution = typeof options.halt_resolution !== "undefined" ? options.halt_resolution : 0;
  }

  return _o;
};

},{"./config.js":3,"./queue.private.js":10}],10:[function(require,module,exports){
"use strict";

var Config = require("./config.js");
var QueueSchema = require("./queue.schema.js");
var _proto = require("./deferred.private.js");
var _public = Object.create(_proto, {});

_public.factory = function (options) {

    //CREATE A NEW QUEUE OBJECT
    var _o = Config.naive_cloner([QueueSchema, options]);

    //if no id, use backtrace origin
    if (!options.id) {
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
_public.activate = function (o, options, deps) {

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

    setTimeout(function () {

        //Restore state
        o.state = 0;

        //ADD DEPENDENCIES TO QUEUE
        QueueSchema.add.call(o, deps);

        //SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
        self.receive_signal(o, o.id);

        //ASSIGN THIS QUEUE UPSTREAM TO OTHER QUEUES
        if (o.assign) {
            for (var a in o.assign) {
                self.assign(o.assign[a], [o], true);
            }
        }
    }, 1);

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
_public.upgrade = function (obj, options, deps) {

    if (obj.settled !== 0 || obj.model !== "promise" && obj.model !== "deferred") {
        return Config.debug("Can only upgrade unsettled promise or deferred into a queue.");
    }

    //GET A NEW QUEUE OBJECT AND MERGE IN
    var _o = Config.naive_cloner([QueueSchema, options]);

    for (var i in _o) {
        obj[i] = _o[i];
    }

    //delete _o;

    //CREATE NEW INSTANCE OF QUEUE
    obj = this.activate(obj, options, deps);

    //RETURN QUEUE OBJECT
    return obj;
};

module.exports = _public;

},{"./config.js":3,"./deferred.private.js":5,"./queue.schema.js":11}],11:[function(require,module,exports){
"use strict";

var Config = require("./config.js");
var _proto = require("./deferred.schema.js");

//Extend deferred schema
var _public = Object.create(_proto, {});

_public.model = "queue";

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
_public.add = function (arr) {

    var _private = require("./queue.private.js");

    try {
        if (arr.length === 0) return this.upstream;
    } catch (err) {
        Config.debug(err);
    }

    //IF NOT PENDING, DO NOT ALLOW TO ADD
    if (this.state !== 0) {
        return Config.debug(["Cannot add dependency list to queue id:'" + this.id + "'. Queue settled/in the process of being settled."], arr, this);
    }

    for (var a in arr) {

        switch (true) {

            //CHECK IF EXISTS
            case typeof Config.list[arr[a].id] === "object":
                arr[a] = Config.list[arr[a].id];
                break;

            //IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
            case typeof arr[a] === "object" && !arr[a].is_orgy:
                arr[a] = _private.convert_to_promise(arr[a], {
                    parent: this
                });
                break;

            //REF IS A PROMISE.
            case typeof arr[a].then === "function":
                break;

            default:
                console.error("Object could not be converted to promise.");
                console.error(arr[a]);
                debugger;
                continue;
        }

        //must check the target to see if the dependency exists in its downstream
        for (var b in this.downstream) {
            if (b === arr[a].id) {
                return Config.debug(["Error adding upstream dependency '" + arr[a].id + "' to queue" + " '" + this.id + "'.\n Promise object for '" + arr[a].id + "' is scheduled to resolve downstream from queue '" + this.id + "' so it can't be added upstream."], this);
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
_public.remove = function (arr) {

    //IF NOT PENDING, DO NOT ALLOW REMOVAL
    if (this.state !== 0) {
        return Config.debug("Cannot remove list from queue id:'" + this.id + "'. Queue settled/in the process of being settled.");
    }

    for (var a in arr) {
        if (this.upstream[arr[a].id]) {
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
_public.reset = function (options) {

    var _private = require("./deferred.private.js");

    if (this.settled !== 1 || this.state !== 1) {
        return Config.debug("Can only reset a queue settled without errors.");
    }

    options = options || {};

    this.settled = 0;
    this.state = 0;
    this.resolver_fired = 0;
    this.done_fired = 0;

    //REMOVE AUTO TIMEOUT TIMER
    if (this.timeout_id) {
        clearTimeout(this.timeout_id);
    }

    //CLEAR OUT THE DOWNSTREAM
    this.downstream = {};
    this.dependencies = [];

    //SET NEW AUTO TIMEOUT
    _private.auto_timeout.call(this, options.timeout);

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
_public.check_self = function () {
    var _private = require("./deferred.private.js");
    _private.receive_signal(this, this.id);
    return this.state;
};

module.exports = _public;

},{"./config.js":3,"./deferred.private.js":5,"./deferred.schema.js":6,"./queue.private.js":10}]},{},[8])(8)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvY2FzdC5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2NvbmZpZy5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2RlZmVycmVkLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZGVmZXJyZWQucHJpdmF0ZS5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2RlZmVycmVkLnNjaGVtYS5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2ZpbGVfbG9hZGVyLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvbWFpbi5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL3F1ZXVlLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvcXVldWUucHJpdmF0ZS5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL3F1ZXVlLnNjaGVtYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxREEsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztJQUMvQixRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0J4QyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVMsR0FBRyxFQUFDOztBQUUxQixRQUFJLFFBQVEsR0FBRyxDQUFDLE1BQU0sRUFBQyxPQUFPLENBQUMsQ0FBQztBQUNoQyxTQUFJLElBQUksQ0FBQyxJQUFJLFFBQVEsRUFBQztBQUNsQixZQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ2pCLG1CQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMscURBQXFELEdBQ25FLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3RCO0tBQ0o7O0FBRUQsUUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO0FBQ2pCLFFBQUcsR0FBRyxDQUFDLEVBQUUsRUFBQztBQUNOLGVBQU8sQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztLQUN2QixNQUNJLElBQUcsR0FBRyxDQUFDLEdBQUcsRUFBQztBQUNaLGVBQU8sQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztLQUN4QixNQUNHOztBQUVGLFlBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFDO0FBQ2IsbUJBQU8sQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ25DO0tBQ0Y7OztBQUdELFFBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FBRzVCLFFBQUksUUFBUSxHQUFHLG9CQUFVO0FBQ3JCLFdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN0QyxDQUFDOzs7QUFHRixPQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDOzs7QUFHbkIsUUFBSSxHQUFHOzs7Ozs7Ozs7O09BQUcsVUFBUyxHQUFHLEVBQUM7QUFDckIsV0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNqQixDQUFBLENBQUM7QUFDRixPQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7QUFHZixXQUFPLEdBQUcsQ0FBQztDQUNkLENBQUM7Ozs7OztBQ2hFRixJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7Ozs7Ozs7Ozs7QUFZakIsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7Ozs7OztBQU9sQixPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7Ozs7OztBQVFkLE9BQU8sQ0FBQyxRQUFRLEdBQUc7O0FBRWYsY0FBVSxFQUFHLENBQUM7OztBQUFBLE1BR2IsR0FBRyxFQUFHLEtBQUs7QUFDWCxRQUFJLEVBQUksQ0FBQSxZQUFVO0FBQ2YsWUFBRyxPQUFPLE9BQU8sS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxrQkFBa0IsRUFBQzs7QUFFbEUsbUJBQU8sUUFBUSxDQUFDO1NBQ25CLE1BQ0c7O0FBRUEsbUJBQU8sU0FBUyxDQUFDO1NBQ3BCO0tBQ0osQ0FBQSxFQUFFLEFBQUM7Ozs7Ozs7QUFPSCxTQUFLLEVBQUcsRUFDUjtBQUNBLFdBQU8sRUFBRyxJQUFJO0FBQUEsQ0FDbEIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXlCRixPQUFPLENBQUMsTUFBTSxHQUFHLFVBQVMsR0FBRyxFQUFDOztBQUUxQixRQUFHLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBQztBQUN2QixhQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBQztBQUNmLG1CQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5QjtLQUNKOztBQUVELFdBQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQztDQUMzQixDQUFDOzs7Ozs7Ozs7QUFVRixPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVMsR0FBRyxFQUFDLEdBQUcsRUFBQzs7QUFFN0IsUUFBSSxJQUFJLENBQUM7QUFDVCxRQUFHLEdBQUcsWUFBWSxLQUFLLEVBQUM7QUFDcEIsWUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDekI7O0FBRUQsUUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEIsV0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBR3JCLFFBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUM7O0FBRTFCLGlCQUFTO0tBQ1Y7O0FBRUQsUUFBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUM7QUFDbkMsZUFBTyxLQUFLLENBQUM7S0FDaEIsTUFDRztBQUNBLGVBQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUNsQjtDQUNKLENBQUM7Ozs7Ozs7Ozs7QUFXRixPQUFPLENBQUMsWUFBWSxHQUFHLFVBQVMsTUFBTSxFQUFDO0FBQ25DLFFBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNYLFNBQUksSUFBSSxDQUFDLElBQUksTUFBTSxFQUFDO0FBQ2hCLGFBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ25CLGdCQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxLQUFLLEVBQUM7QUFDN0IsaUJBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLE1BQ0ksSUFBRyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUM7QUFDdkMsb0JBQUc7QUFDRCxxQkFBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNqRCxDQUNELE9BQU0sQ0FBQyxFQUFDO0FBQ04sMkJBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakIsNkJBQVM7aUJBQ1Y7YUFDRixNQUNHO0FBQ0EsaUJBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkI7U0FDSjtLQUNKO0FBQ0QsV0FBTyxDQUFDLENBQUM7Q0FDWixDQUFDOztBQUdGLE9BQU8sQ0FBQyxXQUFXLEdBQUcsWUFBVTtBQUM5QixXQUFPLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxHQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQUFBQyxDQUFDO0NBQ2hELENBQUE7O0FBR0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Ozs7Ozs7QUMvSnpCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNwQyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OztBQWdCaEQsTUFBTSxDQUFDLE9BQU8sR0FBRyxVQUFTLE9BQU8sRUFBQzs7QUFFOUIsUUFBSSxFQUFFLENBQUM7QUFDUCxXQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQzs7QUFFeEIsUUFBRyxPQUFPLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ3JDLFVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNoQyxNQUNHOztBQUVBLFVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7QUFHL0IsVUFBRSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDOUI7O0FBRUQsV0FBTyxFQUFFLENBQUM7Q0FDYixDQUFDOzs7OztBQ2xDRixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDcEMsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7O0FBRzlDLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQzs7QUFHakIsT0FBTyxDQUFDLE9BQU8sR0FBRyxVQUFTLE9BQU8sRUFBQzs7QUFFL0IsUUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDckQsUUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUMzQixjQUFjLEVBQ2IsT0FBTyxDQUNULENBQUMsQ0FBQzs7O0FBR0gsUUFBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUM7QUFDYixVQUFFLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztLQUM5Qjs7QUFFRCxXQUFPLEVBQUUsQ0FBQztDQUNiLENBQUM7O0FBR0YsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFTLEdBQUcsRUFBQzs7O0FBRzVCLFFBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUM7QUFDeEQsY0FBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsR0FBQyxHQUFHLENBQUMsRUFBRSxHQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDN0UsZUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM5Qjs7O0FBR0QsVUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDOzs7QUFHMUIsV0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7OztBQUcvQixRQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBQztBQUNsQyxjQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdkM7O0FBRUQsV0FBTyxHQUFHLENBQUM7Q0FDZCxDQUFDOztBQUdGLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBUyxHQUFHLEVBQUM7OztBQUcxQixRQUFHLEdBQUcsQ0FBQyxVQUFVLEVBQUM7QUFDZCxvQkFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNoQzs7O0FBSUQsV0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7OztBQUl6QixRQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBQztBQUNoQyxjQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckM7OztBQUlELE9BQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFTLEVBQUUsRUFBQyxTQUFTLEVBQUMsSUFBSSxFQUFDO0FBQ3RFLFdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDOzs7QUFHbkIsZUFBTyxDQUFDLFNBQVMsQ0FDYixHQUFHLEVBQ0YsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQ2xCLEdBQUcsQ0FBQyxPQUFPLEVBQ1gsRUFBQyxpQkFBaUIsRUFBRyxLQUFLLEVBQUMsQ0FDL0IsQ0FBQztLQUVMLENBQUMsQ0FBQzs7O0FBSUgsV0FBTyxDQUFDLFNBQVMsQ0FDYixHQUFHLEVBQ0YsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQ2xCLEdBQUcsQ0FBQyxLQUFLLEVBQ1QsRUFBQyxpQkFBaUIsRUFBRyxJQUFJLEVBQUMsQ0FDOUIsQ0FBQzs7QUFHRixXQUFPLEdBQUcsQ0FBQztDQUNkLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNCRixPQUFPLENBQUMsU0FBUyxHQUFHLFVBQVMsR0FBRyxFQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUMsT0FBTyxFQUFDOzs7QUFHL0MsUUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQzs7O0FBRzFDLFFBQUcsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztBQUNoRCxlQUFPLENBQUMsU0FBUyxDQUNiLEdBQUcsRUFDRixHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFDbEIsS0FBSyxFQUNMLEVBQUMsaUJBQWlCLEVBQUcsS0FBSyxFQUFDLENBQy9CLENBQUM7S0FDTDs7QUFFRCxXQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQzs7O0FBR3ZCLFlBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDN0IsV0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7O0FBR2pDLFNBQUMsR0FBRyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUFDOzs7O0FBSWpELFlBQUcsT0FBTyxDQUFDLGlCQUFpQixFQUFDOzs7QUFHekIsZ0JBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEVBQUM7OztBQUc5QixpQkFBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVU7O0FBRXRELDJCQUFPLENBQUMsU0FBUyxDQUNiLEdBQUcsRUFDRixHQUFHLEVBQ0gsQ0FBQyxFQUNELEVBQUMsaUJBQWlCLEVBQUcsSUFBSSxFQUFDLENBQzlCLENBQUM7aUJBQ0wsQ0FBQyxDQUFDOzs7QUFHSCx1QkFBTzthQUNWOzs7aUJBR0ksSUFBRyxDQUFDLFlBQVksS0FBSyxFQUFDOztBQUV2QixvQkFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDOztBQUVuQixxQkFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUM7O0FBRVgsd0JBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBQzs7QUFFL0IsaUNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXJCLDRCQUFJLEVBQUUsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsS0FBSyxFQUFDOztBQUUvQixtQ0FBTyxZQUFVOzs7QUFHYixxQ0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUM7QUFDWCx3Q0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBQztBQUNsQiwrQ0FBTztxQ0FDVjtpQ0FDSjs7QUFFRCx1Q0FBTyxDQUFDLFNBQVMsQ0FDYixHQUFHLEVBQ0YsR0FBRyxFQUNILEtBQUssRUFDTCxFQUFDLGlCQUFpQixFQUFHLElBQUksRUFBQyxDQUM5QixDQUFDOzZCQUNMLENBQUM7eUJBRUwsQ0FBQSxDQUFFLFNBQVMsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDLEtBQUssQ0FBQyxDQUFDOzs7O0FBSTVCLHlCQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7OztBQUd2RCwrQkFBTztxQkFDVjtpQkFDSjthQUNKO1NBQ0o7S0FDSjs7O0FBR0QsUUFBRyxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQ2xELGVBQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFDLENBQUMsRUFBQyxFQUFDLGlCQUFpQixFQUFHLEtBQUssRUFBQyxDQUFDLENBQUM7S0FDN0U7Q0FDSixDQUFDOzs7Ozs7Ozs7QUFVRixPQUFPLENBQUMsU0FBUyxHQUFHLFVBQVMsR0FBRyxFQUFDLEdBQUcsRUFBQzs7QUFFakMsT0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUM7OztBQUdoQixRQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsRUFBQztBQUN0QixXQUFHLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztLQUNuQjs7QUFFRCxRQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsRUFBQztBQUN0QixlQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDbEM7Q0FDSixDQUFDOzs7Ozs7OztBQVNGLE9BQU8sQ0FBQyxTQUFTLEdBQUcsVUFBUyxHQUFHLEVBQUM7QUFDN0IsV0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDO0NBQ3BCLENBQUM7Ozs7Ozs7O0FBU0YsT0FBTyxDQUFDLFlBQVksR0FBRyxVQUFTLE9BQU8sRUFBQzs7QUFFcEMsUUFBSSxDQUFDLE9BQU8sR0FBRyxBQUFDLE9BQU8sT0FBTyxLQUFLLFdBQVcsR0FDNUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7OztBQUd6QixRQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBQzs7O0FBR25DLFlBQUcsSUFBSSxDQUFDLFVBQVUsRUFBQztBQUNmLHdCQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ2pDOztBQUVELFlBQUcsT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBQztBQUNuQyxrQkFBTSxDQUFDLEtBQUssQ0FBQyxDQUNYLGdEQUFnRCxFQUMvQyxJQUFJLENBQUMsRUFBRSxDQUNULENBQUMsQ0FBQztTQUNOLE1BQ0ksSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFDOztBQUV6QixtQkFBTyxLQUFLLENBQUM7U0FDaEI7QUFDRCxZQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7O0FBRWpCLFlBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLFlBQVU7QUFDbkMsbUJBQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3ZDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBRXBCLE1BQ0csRUFFSDs7QUFFRCxXQUFPLElBQUksQ0FBQztDQUNmLENBQUM7Ozs7Ozs7QUFRRixPQUFPLENBQUMsZUFBZSxHQUFHLFlBQVU7O0FBRWhDLFFBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUM7OztBQUdoQixZQUFJLElBQUksR0FBRyxFQUFFLENBQUM7QUFDZCxZQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7O0FBRWpCLFlBQUksRUFBRSxHQUFHLFlBQVMsR0FBRyxFQUFDO0FBQ2xCLGdCQUFHLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFDO0FBQ2YsdUJBQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQzthQUNqQixNQUNHO0FBQ0EsdUJBQU8sS0FBSyxDQUFDO2FBQ2hCO1NBQ0osQ0FBQzs7Ozs7OztBQU9GLFlBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUM7QUFDMUIsZ0JBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUMsVUFBVSxFQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzNELGdCQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsbUNBQW1DLEdBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDL0IsZ0JBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEIsZ0JBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYixtQkFBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUM7U0FDdEMsTUFDRztBQUNBLG1CQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pDO0tBQ0o7Q0FDSixDQUFDOztBQUdGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBUyxFQUFFLEVBQUM7OztBQUd4QixRQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFDO0FBQ2hCLFVBQUUsRUFBRSxDQUFDO0tBQ1IsTUFDRztBQUNBLFlBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQzFCOztBQUVELFdBQU8sSUFBSSxDQUFDO0NBQ2YsQ0FBQzs7Ozs7Ozs7Ozs7OztBQWNGLE9BQU8sQ0FBQyxpQkFBaUIsR0FBRyxVQUFTLE1BQU0sRUFBQzs7O0FBR3hDLFNBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBQztBQUMzQixZQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBQzs7QUFFcEMsZ0JBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFDOztBQUVsQyx5QkFBUzthQUNWLE1BQ0c7O0FBRUYsc0JBQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRywyQkFBMkIsR0FBQyxHQUFHLEdBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsa0NBQWtDLENBQUMsQ0FBQzthQUN0SDtTQUNGO0tBQ0o7Ozs7QUFJRCxTQUFLLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUM7QUFDNUIsWUFBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEVBQUM7QUFDbEMsbUJBQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDMUQ7S0FDSjtDQUNKLENBQUM7Ozs7Ozs7Ozs7OztBQWFGLE9BQU8sQ0FBQyxzQkFBc0IsR0FBRyxVQUFTLEdBQUcsRUFBQyxRQUFRLEVBQUMsRUFBRSxFQUFDLFVBQVUsRUFBQzs7QUFFakUsUUFBRyxPQUFPLFVBQVUsS0FBSyxXQUFXLEVBQUM7QUFDakMsa0JBQVUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN6Qjs7QUFFRCxRQUFJLEVBQUUsQ0FBQzs7QUFFUCxTQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBQzs7O0FBR3ZCLFVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTFCLFlBQUcsRUFBRSxLQUFLLEtBQUssRUFBQzs7O0FBR1osZ0JBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBQztBQUM3Qix1QkFBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQ2hCLDBEQUEwRCxHQUNyRCxRQUFRLEdBQUMsY0FBYyxJQUN0QixBQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUUsS0FBSyxXQUFXLEdBQUksR0FBRyxHQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQSxBQUFDLEdBQ3ZELHFCQUFxQixHQUFDLEVBQUUsRUFDNUIsQ0FBQyxZQUFVO0FBQ1IsOEJBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEIsMkJBQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2lCQUM5QyxDQUFBLEVBQUcsQ0FDUCxDQUFDLENBQUM7YUFDTjs7QUFFRCxzQkFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzs7QUFFcEIsZ0JBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFDO0FBQzFCLHVCQUFPLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLEVBQUUsRUFBQyxVQUFVLENBQUMsQ0FBQzthQUNsRjs7QUFFRCxrQkFBTTtTQUNUO0tBRUo7O0FBRUQsV0FBTyxVQUFVLENBQUM7Q0FDckIsQ0FBQzs7Ozs7Ozs7QUFTRixPQUFPLENBQUMsa0JBQWtCLEdBQUcsVUFBUyxHQUFHLEVBQUMsT0FBTyxFQUFDOztBQUU5QyxPQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLElBQUksT0FBTyxDQUFDLEVBQUUsQ0FBQzs7O0FBRzlCLFFBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO0FBQ1gsWUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtBQUN4QixlQUFHLENBQUMsRUFBRSxHQUFHLFFBQVEsR0FBRyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEFBQUMsQ0FBQztTQUN0RCxNQUNJLElBQUksT0FBTyxHQUFHLENBQUMsR0FBRyxLQUFLLFFBQVEsRUFBRTtBQUNwQyxlQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDOztBQUVsQyxnQkFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtBQUMvQixtQkFBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQixtQkFBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNiLG1CQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7S0FDRjs7O0FBR0QsUUFBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBQzs7OztBQUk3QyxZQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUM7QUFDZCxrQkFBTSxDQUFDLEtBQUssQ0FBQyxDQUNYLDBHQUEwRyxFQUN6Ryx1QkFBdUIsR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksRUFDdkMsWUFBWSxFQUNaLEdBQUcsRUFDSCxXQUFXLEVBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQ3JCLENBQUMsQ0FBQztTQUNKLE1BQ0c7QUFDRixtQkFBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM1QjtLQUNGOzs7QUFJRCxRQUFJLEdBQUcsQ0FBQztBQUNSLFlBQU8sSUFBSTs7O0FBR1AsYUFBSyxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU87QUFDckIsZUFBRyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUIsa0JBQU07O0FBQUEsQUFFVixhQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssT0FBTztBQUNyQixnQkFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xDLGVBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBQyxHQUFHLENBQUMsQ0FBQztBQUNsQyxrQkFBTTs7QUFBQTtBQUdWLGFBQUssT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVU7O0FBRS9CLG9CQUFPLElBQUk7OztBQUdQLHFCQUFLLE9BQU8sR0FBRyxDQUFDLEVBQUUsS0FBSyxRQUFRO0FBQzNCLDJCQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBQyxHQUFHLENBQUMsRUFBRSxHQUFFLCtDQUErQyxDQUFDLENBQUM7QUFDMUUsdUJBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQ25CLDBCQUFFLEVBQUcsR0FBRyxDQUFDLEVBQUU7cUJBQ2QsQ0FBQyxDQUFDOzs7QUFHSCx3QkFBRyxHQUFHLENBQUMsSUFBSSxFQUFDO0FBQ1YsMkJBQUcsQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFDbEIsK0JBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ2hCLENBQUMsQ0FBQztxQkFDSjtBQUNELDBCQUFNOztBQUFBO0FBR1YscUJBQUssT0FBTyxHQUFHLENBQUMsT0FBTyxLQUFLLFVBQVU7QUFDbEMsd0JBQUcsR0FBRyxDQUFDLEtBQUssRUFBQztBQUNULDJCQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUNyQyxNQUNHO0FBQ0EsMkJBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7cUJBQ3ZCO0FBQ0QsMEJBQU07O0FBQUE7QUFHVixxQkFBSyxHQUFHLENBQUMsSUFBSTtBQUNULHVCQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ1YsMEJBQU07O0FBQUEsQUFFVix3QkFBUTs7YUFFWDs7O0FBR0QsZ0JBQUcsT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQztBQUNwQyx1QkFBTyxNQUFNLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxFQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3hGO0FBQ0Qsa0JBQU07O0FBQUEsQUFFVixhQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssT0FBTztBQUNyQixlQUFHLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5QixrQkFBTTs7QUFBQTtBQUdWO0FBQ0ksZUFBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLFNBQVMsQ0FBQzs7QUFFakMsZ0JBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBQztBQUN0QyxtQkFBRyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUM5QjtBQUNELGVBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQUEsS0FDbkM7OztBQUdELFVBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQzs7QUFFMUIsV0FBTyxHQUFHLENBQUM7Q0FDZCxDQUFDOzs7Ozs7Ozs7Ozs7O0FBY0YsT0FBTyxDQUFDLFVBQVUsR0FBRyxVQUFTLEdBQUcsRUFBQzs7QUFFOUIsUUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLFFBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQztBQUNmLFVBQUUsRUFBRyxHQUFHLENBQUMsRUFBRTtLQUNkLENBQUMsQ0FBQzs7QUFHSCxRQUFHLE9BQU8sUUFBUSxLQUFLLFdBQVcsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUM7O0FBRWhFLFlBQUcsT0FBTyxDQUFDLEtBQUssVUFBVSxFQUFDO0FBQ3ZCLGdCQUFJLEdBQUcsR0FBRyxtREFBbUQsQ0FBQztBQUM5RCxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CLE1BQ0c7O0FBRUEsb0JBQU8sSUFBSTtBQUNQLHFCQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssa0JBQWtCO0FBQ3BELHFCQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVU7QUFDeEIsMkJBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ2xCLENBQUMsQ0FBQztBQUNILDBCQUFNO0FBQUEsQUFDVixxQkFBSyxHQUFHLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDbEIscUJBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBVTtBQUNyQiwyQkFBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDbEIsQ0FBQyxDQUFDO0FBQ0gsMEJBQU07QUFBQSxBQUNWO0FBQ0kscUJBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBQyxNQUFNLEVBQUMsWUFBVTtBQUNuQywyQkFBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDbEIsQ0FBQyxDQUFDO0FBQUEsYUFDVjtTQUNKO0tBQ0o7O0FBRUQsV0FBTyxHQUFHLENBQUM7Q0FDZCxDQUFDOztBQUdGLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBUyxHQUFHLEVBQUM7O0FBRTlCLFFBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxRQUFJLEdBQUcsR0FBRyxRQUFRLEVBQUUsQ0FBQzs7QUFFckIsQUFBQyxLQUFBLFVBQVMsR0FBRyxFQUFDOztBQUVWLFlBQUksTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDbEMsa0JBQVUsQ0FBQyxZQUFVO0FBQ2pCLGdCQUFJLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2hDLGVBQUcsQ0FBQyxPQUFPLENBQUM7QUFDUixxQkFBSyxFQUFHLE1BQU07QUFDYixtQkFBRyxFQUFHLElBQUk7QUFDVix1QkFBTyxFQUFHLElBQUksR0FBRyxNQUFNO0FBQ3ZCLHVCQUFPLEVBQUcsR0FBRyxDQUFDLE9BQU87YUFDekIsQ0FBQyxDQUFDO1NBQ04sRUFBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7S0FFbEIsQ0FBQSxDQUFDLEdBQUcsQ0FBQyxDQUFFOztBQUVSLFdBQU8sR0FBRyxDQUFDO0NBQ2QsQ0FBQzs7Ozs7Ozs7QUFTRixPQUFPLENBQUMsUUFBUSxHQUFHLFVBQVMsR0FBRyxFQUFDOztBQUU1QixRQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7O0FBRXhDLFFBQUksUUFBUSxHQUFHLENBQUMsSUFBSSxFQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLFNBQUksSUFBSSxDQUFDLElBQUksUUFBUSxFQUFDO0FBQ2xCLFlBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDakIsbUJBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUNoQiwrQ0FBK0MsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQzVELG9GQUFvRixFQUNwRixHQUFHLENBQ1AsQ0FBQyxDQUFDO1NBQ047S0FDSjs7O0FBR0QsUUFBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBQztBQUNyQixlQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQzVCOzs7QUFHRCxRQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRXhCLFFBQUcsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssV0FBVyxFQUFDO0FBQ3BFLG1CQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLENBQUM7S0FDOUQsTUFDRztBQUNGLG1CQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQztLQUMvRDs7QUFFRCxXQUFPLEdBQUcsQ0FBQztDQUNkLENBQUM7Ozs7Ozs7Ozs7Ozs7QUFhRixPQUFPLENBQUMsY0FBYyxHQUFHLFVBQVMsTUFBTSxFQUFDLE9BQU8sRUFBQzs7QUFFN0MsUUFBRyxNQUFNLENBQUMsZUFBZSxLQUFLLENBQUMsRUFBRSxPQUFPOzs7O0FBSXpDLFFBQUcsT0FBTyxLQUFLLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFDO0FBQ2xELGVBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLEVBQUUsR0FBRywyQkFBMkIsQ0FBQyxDQUFDO0tBQzdGOztTQUVHO0FBQ0EsWUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsYUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFDOztBQUV6QixnQkFBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUU7QUFDL0Isc0JBQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsQyxzQkFBTTthQUNUO1NBQ0o7S0FDSjs7O0FBR0QsUUFBRyxNQUFNLEtBQUssQ0FBQyxFQUFDOzs7O0FBSVgsWUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLGFBQUksSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBQztBQUM3QixrQkFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzdDOztBQUVELGNBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxNQUFNLENBQUMsQ0FBQztLQUN2Qzs7QUFFRCxRQUFHLE1BQU0sS0FBSyxDQUFDLEVBQUM7QUFDWixZQUFJLEdBQUcsR0FBRyxDQUNOLE1BQU0sQ0FBQyxFQUFFLEdBQUMsZUFBZSxHQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLGlCQUFpQixFQUNsRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FDaEMsQ0FBQztBQUNGLGNBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBQyxHQUFHLENBQUMsQ0FBQztLQUNuQztDQUNILENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Ozs7Ozs7Ozs7O0FDcHRCekIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3BDLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQzs7QUFFakIsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0FBRXZCLE9BQU8sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDOzs7QUFHbEIsT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7Ozs7Ozs7Ozs7QUFVcEIsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7O0FBRWxCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDOzs7QUFHbkIsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0FBRXZCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDOztBQUUzQixPQUFPLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQzs7QUFFdkIsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7O0FBRTFCLE9BQU8sQ0FBQyxlQUFlLEdBQUc7QUFDeEIsU0FBTyxFQUFHLENBQUM7QUFDVixNQUFJLEVBQUcsQ0FBQztBQUNSLE1BQUksRUFBRyxDQUFDO0FBQ1IsUUFBTSxFQUFHLENBQUM7Q0FDWixDQUFDOzs7Ozs7Ozs7Ozs7QUFZRixPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsWUFBVTs7QUFFN0IsTUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDOztBQUVYLE9BQUksSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLGVBQWUsRUFBQztBQUNuQyxLQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDTCxXQUFLLEVBQUcsRUFBRTtBQUNULFdBQUssRUFBRztBQUNQLGdCQUFRLEVBQUc7QUFDVCxlQUFLLEVBQUcsRUFBRTtTQUNYO0FBQ0Esa0JBQVUsRUFBRztBQUNaLGVBQUssRUFBRyxFQUFFO1NBQ1g7T0FDRjtLQUNGLENBQUM7R0FDSDs7QUFFRCxTQUFPLENBQUMsQ0FBQztDQUNWLENBQUEsRUFBRyxDQUFDOzs7QUFHTCxPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQzs7QUFFeEIsT0FBTyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQzs7O0FBRy9CLE9BQU8sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDOzs7Ozs7QUFPekIsT0FBTyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQzs7Ozs7Ozs7Ozs7O0FBWTFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDOzs7QUFHbkIsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7Ozs7Ozs7Ozs7OztBQWNqQixPQUFPLENBQUMsT0FBTyxHQUFHLFVBQVMsS0FBSyxFQUFDOztBQUUvQixNQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQzs7QUFFaEQsTUFBRyxJQUFJLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBQztBQUNwQixVQUFNLENBQUMsS0FBSyxDQUFDLENBQ1gsSUFBSSxDQUFDLEVBQUUsR0FBRyxpQkFBaUIsRUFDMUIsMENBQTBDLENBQzVDLENBQUMsQ0FBQztHQUNKOzs7QUFHRCxVQUFRLENBQUMsU0FBUyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFHNUIsTUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Ozs7QUFJbkIsTUFBRyxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLFVBQVUsRUFBQzs7QUFFN0QsUUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7OztBQUd4QixRQUFHO0FBQ0QsVUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFVO0FBQzFDLFlBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFDLElBQUksQ0FBQyxDQUFDO09BQzNCLENBQUMsQ0FBQztLQUNKLENBQ0QsT0FBTSxDQUFDLEVBQUM7QUFDTixlQUFTO0tBQ1Y7R0FDRixNQUNHOztBQUVGLFFBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDOzs7O0FBSXhCLFFBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFVO0FBQzlELGNBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDdkIsQ0FBQyxDQUFDO0dBQ0o7OztBQUdELFVBQVEsQ0FBQyxTQUFTLENBQ2hCLElBQUksRUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFDdEIsSUFBSSxDQUFDLEtBQUssRUFDVixFQUFDLGlCQUFpQixFQUFHLEtBQUssRUFBQyxDQUM3QixDQUFDOzs7O0FBSUYsU0FBTyxJQUFJLENBQUM7Q0FDYixDQUFDOztBQUdGLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBUyxHQUFHLEVBQUM7O0FBRTVCLE1BQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDOztBQUVoRCxNQUFHLEVBQUUsR0FBRyxZQUFZLEtBQUssQ0FBQSxBQUFDLEVBQUM7QUFDekIsT0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDYjs7QUFFRCxNQUFJLEdBQUcsR0FBRyxXQUFXLEdBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxLQUFLLEdBQUMsSUFBSSxDQUFDLEVBQUUsR0FBQyxJQUFJLENBQUE7O0FBRW5ELE1BQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUM7QUFDNUIsT0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQixVQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQyxJQUFJLENBQUMsQ0FBQztHQUN4QixNQUNHO0FBQ0YsT0FBRyxHQUFHLEdBQUcsR0FBRyxzQ0FBc0MsQ0FBQztBQUNuRCxXQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ2xCOzs7QUFHRCxNQUFHLElBQUksQ0FBQyxVQUFVLEVBQUM7QUFDakIsZ0JBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDL0I7OztBQUdELFVBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFHM0IsVUFBUSxDQUFDLFNBQVMsQ0FDaEIsSUFBSSxFQUNILElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUNyQixHQUFHLEVBQ0gsRUFBQyxpQkFBaUIsRUFBRyxLQUFLLEVBQUMsQ0FDN0IsQ0FBQzs7QUFFRixTQUFPLElBQUksQ0FBQztDQUNiLENBQUM7O0FBR0YsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFTLEVBQUUsRUFBQyxRQUFRLEVBQUM7O0FBRWxDLFVBQU8sSUFBSTs7O0FBR1QsU0FBSyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUM7QUFDbkIsWUFBTTs7QUFBQTtBQUdSLFNBQUssSUFBSSxDQUFDLFVBQVUsS0FBSyxDQUFDO0FBQ3hCLGFBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLDBHQUEwRyxDQUFDLENBQUM7O0FBQUEsQUFFMUk7OztBQUdFLFVBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7OztBQUduQyxVQUFHLE9BQU8sUUFBUSxLQUFLLFVBQVUsRUFBQztBQUNoQyxZQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQzVDOzs7QUFHRCxVQUFHLElBQUksQ0FBQyxPQUFPLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBQztBQUM1RCxZQUFJLENBQUMsU0FBUyxDQUNaLElBQUksRUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFDbkIsSUFBSSxDQUFDLE9BQU8sRUFDWixFQUFDLGlCQUFpQixFQUFHLElBQUksRUFBQyxDQUM1QixDQUFDO09BQ0g7O1dBRUcsRUFBRTtBQUFBLEdBQ1Q7O0FBRUQsU0FBTyxJQUFJLENBQUM7Q0FDYixDQUFDOztBQUdGLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBUyxFQUFFLEVBQUMsUUFBUSxFQUFDOztBQUVsQyxNQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQzs7QUFFaEQsTUFBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsSUFDbkMsSUFBSSxDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUM7QUFDeEIsUUFBRyxPQUFPLEVBQUUsS0FBSyxVQUFVLEVBQUM7OztBQUcxQixVQUFJLEdBQUcsR0FBRyxhQUFTLENBQUMsRUFBQyxRQUFRLEVBQUMsSUFBSSxFQUFDOzs7QUFHakMsZ0JBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDOztBQUV4QixVQUFFLENBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQztPQUNyQixDQUFDOztBQUVGLFVBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7OztBQUdwQyxVQUFHLE9BQU8sUUFBUSxLQUFLLFVBQVUsRUFBQztBQUNoQyxZQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7T0FDN0Q7OztBQUdELFVBQUcsSUFBSSxDQUFDLE9BQU8sS0FBSyxDQUFDLEVBQUM7QUFDcEIsWUFBRyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBQztBQUNsQixrQkFBUSxDQUFDLFNBQVMsQ0FDaEIsSUFBSSxFQUNILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUNuQixJQUFJLENBQUMsT0FBTyxFQUNaLEVBQUMsaUJBQWlCLEVBQUcsS0FBSyxFQUFDLENBQzdCLENBQUM7U0FDSCxNQUNHO0FBQ0Ysa0JBQVEsQ0FBQyxTQUFTLENBQ2hCLElBQUksRUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFDckIsSUFBSSxDQUFDLE9BQU8sRUFDWixFQUFDLGlCQUFpQixFQUFHLEtBQUssRUFBQyxDQUM3QixDQUFDO1NBQ0g7T0FDRjs7V0FFRyxFQUFFO0tBQ1QsTUFDRztBQUNGLGFBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0tBQzFEO0dBQ0YsTUFDRztBQUNGLFdBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0dBQ3hEO0NBQ0YsQ0FBQzs7QUFHRixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7Ozs7O0FDblR6QixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDcEMsSUFBSSxPQUFPLEdBQUcsRUFBRTtJQUNaLFFBQVEsR0FBRyxFQUFFLENBQUM7O0FBRWxCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUNwQixPQUFPLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Ozs7QUFJckIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsVUFBUyxJQUFJLEVBQUMsUUFBUSxFQUFDOztBQUUzQyxNQUFJLElBQUksR0FBSSxRQUFRLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLGVBQWU7TUFDaEYsSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRXRDLE1BQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLE1BQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3JDLE1BQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFDLFlBQVksQ0FBQyxDQUFDOztBQUV0QyxNQUFHLElBQUksQ0FBQyxNQUFNLEVBQUM7QUFDYixBQUFDLEtBQUEsVUFBUyxJQUFJLEVBQUMsSUFBSSxFQUFDLFFBQVEsRUFBQztBQUN6QixVQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFTLElBQUksRUFBQyxRQUFRLEVBQUM7QUFDN0QsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDekIsQ0FBQzs7QUFFRixVQUFJLENBQUMsT0FBTyxHQUFHLFVBQVMsSUFBSSxFQUFDLFFBQVEsRUFBQztBQUNuQyxnQkFBUSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsQ0FBQztPQUNsRCxDQUFDO0tBRUosQ0FBQSxDQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsUUFBUSxDQUFDLENBQUU7O0FBRXZCLFFBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDeEIsTUFDRzs7QUFFRixRQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLFdBQU8sQ0FBQyxJQUFJLENBQUMsa0RBQWtELENBQUMsQ0FBQztBQUNqRSxZQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQ3hCO0NBQ0YsQ0FBQTs7QUFFRCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxVQUFTLElBQUksRUFBQyxRQUFRLEVBQUM7O0FBRTlDLE1BQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUMsTUFBSSxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQztBQUM5QixNQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBQyxJQUFJLENBQUMsQ0FBQzs7QUFFOUIsQUFBQyxHQUFBLFVBQVMsSUFBSSxFQUFDLElBQUksRUFBQyxRQUFRLEVBQUM7QUFDekIsUUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsWUFBVTs7QUFFaEQsVUFBRyxPQUFPLFFBQVEsQ0FBQyxXQUFXLEtBQUssU0FBUyxJQUN6QyxRQUFRLENBQUMsV0FBVyxLQUFLLElBQUksRUFBQztBQUMvQixnQkFBUSxDQUFDLE9BQU8sQ0FBQyxBQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxXQUFXLEdBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztPQUMzRTtLQUNGLENBQUM7QUFDRixRQUFJLENBQUMsT0FBTyxHQUFHLFlBQVU7QUFDdkIsY0FBUSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsQ0FBQztLQUMzQyxDQUFDO0dBQ0wsQ0FBQSxDQUFDLElBQUksRUFBQyxJQUFJLEVBQUMsUUFBUSxDQUFDLENBQUU7O0FBRXZCLE1BQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzdCLENBQUE7O0FBRUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBUyxJQUFJLEVBQUMsUUFBUSxFQUFDO0FBQzVDLE1BQUksV0FBUSxDQUFDLElBQUksRUFBQyxRQUFRLENBQUMsQ0FBQztDQUM3QixDQUFBOztBQUVELE9BQU8sQ0FBQyxPQUFPLFdBQVEsR0FBRyxVQUFTLElBQUksRUFBQyxRQUFRLEVBQUMsT0FBTyxFQUFDO0FBQ3ZELE1BQUksQ0FBQztNQUNMLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO0FBQzNCLEtBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzs7QUFFNUIsQUFBQyxHQUFBLFVBQVMsSUFBSSxFQUFDLFFBQVEsRUFBQztBQUN0QixPQUFHLENBQUMsa0JBQWtCLEdBQUcsWUFBVztBQUNsQyxVQUFJLEdBQUcsQ0FBQyxVQUFVLEtBQUssQ0FBQyxFQUFFO0FBQ3hCLFlBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUM7QUFDcEIsV0FBQyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUM7QUFDckIsY0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFDO0FBQ3pDLGdCQUFHO0FBQ0QsZUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbkIsQ0FDRCxPQUFNLENBQUMsRUFBQztBQUNOLHFCQUFPLENBQUMsS0FBSyxDQUFDLENBQ1osdUJBQXVCLEVBQ3RCLElBQUksRUFDSixDQUFDLENBQ0gsRUFBQyxRQUFRLENBQUMsQ0FBQzthQUNiO1dBQ0Y7QUFDRCxrQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyQixNQUNHO0FBQ0Ysa0JBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDM0M7T0FDRjtLQUNGLENBQUM7R0FDSCxDQUFBLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxDQUFFOztBQUVsQixLQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ2hCLENBQUE7Ozs7QUFNRCxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxVQUFTLElBQUksRUFBQyxRQUFRLEVBQUM7QUFDMUMsU0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxDQUFDO0NBQ3BDLENBQUE7O0FBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsVUFBUyxJQUFJLEVBQUMsUUFBUSxFQUFDOztBQUU3QyxNQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBRyxHQUFHLEVBQUM7QUFDZixRQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUMsUUFBUSxDQUFDLENBQUM7O0FBRTNELFFBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7OztBQUcvQixRQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7OztBQUdwRCxRQUFHLE9BQU8sUUFBUSxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQ3pDLFFBQVEsQ0FBQyxXQUFXLEtBQUssSUFBSSxFQUFDO0FBQy9CLGNBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckI7R0FDRjs7T0FFRzs7OztBQUlGLFFBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBQztBQUFDLE9BQUMsQ0FBQTtBQUMvQixZQUFNLENBQUMsS0FBSyxDQUFDLHNFQUFzRSxDQUFDLENBQUM7S0FDdEYsTUFDRztBQUNGLGNBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsVUFBUyxJQUFJLEVBQUM7QUFDOUMsWUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLFNBQUMsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDckIsQ0FBQyxDQUFDO0tBQ0o7R0FDRjtDQUNGLENBQUE7O0FBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBUyxJQUFJLEVBQUMsUUFBUSxFQUFDO0FBQzNDLFNBQU8sQ0FBQyxNQUFNLFdBQVEsQ0FBQyxJQUFJLEVBQUMsUUFBUSxDQUFDLENBQUM7Q0FDdkMsQ0FBQTs7QUFFRCxPQUFPLENBQUMsTUFBTSxXQUFRLEdBQUcsVUFBUyxJQUFJLEVBQUMsUUFBUSxFQUFDO0FBQzlDLFVBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFDM0MsWUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNyQixDQUFDLENBQUE7Q0FDSCxDQUFBOztBQUVELFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLFVBQVUsSUFBSSxFQUFDLFFBQVEsRUFBQyxRQUFRLEVBQUM7QUFDckQsTUFBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFDOztBQUVqQixRQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUMsUUFBUSxDQUFDLENBQUM7Ozs7QUFJM0QsTUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsR0FBRyxFQUFFLElBQUksRUFBRTtBQUM5QyxVQUFJLEdBQUcsRUFBRSxNQUFNLEdBQUcsQ0FBQztBQUNuQixjQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDaEIsQ0FBQyxDQUFDOzs7QUFHSCxRQUFHLFFBQVEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7R0FDckQsTUFDRzs7QUFFRixRQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsUUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRyxJQUFJLEVBQUMsRUFBRSxVQUFVLEdBQUcsRUFBRTtBQUN0QyxVQUFJLElBQUksR0FBRyxFQUFFLENBQUM7QUFDZCxTQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLEdBQUcsRUFBRTtBQUMxQixZQUFJLElBQUksR0FBRyxDQUFDO09BQ2YsQ0FBQyxDQUFDO0FBQ0gsU0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsWUFBWTtBQUN0QixnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2xCLENBQUMsQ0FBQztLQUNKLENBQUMsQ0FBQztHQUNKO0NBQ0YsQ0FBQTs7QUFFRCxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksR0FBRyxVQUFTLElBQUksRUFBQyxRQUFRLEVBQUM7QUFDcEQsTUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRTs7QUFDbkIsS0FBRyxHQUFHLEFBQUMsUUFBUSxDQUFDLEdBQUcsR0FBSSxRQUFRLENBQUMsR0FBRyxHQUM1QixBQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLEtBQUssQUFBQztNQUM5RCxVQUFVLEdBQUcsS0FBSyxDQUFDOztBQUVwQixNQUFHLEdBQUcsRUFBQztBQUNMLFdBQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkIsY0FBVSxHQUFHLElBQUksQ0FBQztHQUNuQixNQUNHO0FBQ0YsT0FBRyxHQUFHLEdBQUcsQ0FBQztHQUNYOztBQUVELFNBQU87QUFDTCxPQUFHLEVBQUcsR0FBRztBQUNSLFFBQUksRUFBRyxHQUFHLEdBQUMsR0FBRyxHQUFDLElBQUk7QUFDbkIsY0FBVSxFQUFHLFVBQVU7R0FDekIsQ0FBQztDQUNILENBQUE7QUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7Ozs7OztBQzNNekIsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQztJQUNuQyxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztJQUM3QixJQUFJLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUMzQixNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQUVwQyxNQUFNLENBQUMsT0FBTyxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCakIsVUFBTSxFQUFHLGdCQUFTLEVBQUUsRUFBQyxJQUFJLEVBQUMsT0FBTyxFQUFDOztBQUU5QixZQUFJLEdBQUcsQ0FBQztBQUNSLGVBQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0FBQ3hCLGVBQU8sQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUM7QUFDcEQsZUFBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQzs7O0FBRzVDLFlBQUcsT0FBTyxFQUFFLEtBQUssUUFBUSxFQUFDO0FBQ3hCLGtCQUFNLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7U0FDeEQ7OztBQUdELFlBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEVBQUM7QUFDbEQsbUJBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsRUFBRSxHQUFHLHFCQUFxQixDQUFDLENBQUM7U0FDbkU7O0FBRUQsZUFBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7O0FBRWhCLFlBQUcsT0FBTyxDQUFDLFlBQVksS0FBSyxJQUFJLElBQzNCLE9BQU8sQ0FBQyxZQUFZLFlBQVksS0FBSyxFQUFDOztBQUV6QyxnQkFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztBQUNoQyxtQkFBTyxPQUFPLENBQUMsWUFBWSxDQUFDO0FBQzVCLGVBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzNCLE1BQ0c7O0FBRUYsZUFBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7O0FBR3hCLGdCQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssSUFBSSxLQUN0QixPQUFPLE9BQU8sQ0FBQyxXQUFXLEtBQUssU0FBUyxJQUN6QyxPQUFPLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQSxBQUFDLEVBQUM7O0FBRWpDLG1CQUFHLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztBQUN4QixtQkFBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQjtTQUNGOztBQUVELGVBQU8sR0FBRyxDQUFDO0tBQ2Q7Ozs7Ozs7Ozs7QUFXRCxPQUFHLEVBQUcsYUFBUyxFQUFFLEVBQUM7QUFDaEIsWUFBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ2pCLG1CQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDeEIsTUFDRztBQUNGLG1CQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FDbEIsc0JBQXNCLEdBQUMsRUFBRSxDQUMxQixDQUFDLENBQUM7U0FDSjtLQUNGOzs7Ozs7Ozs7Ozs7Ozs7QUFnQkQsVUFBTSxFQUFHLGdCQUFTLEdBQUcsRUFBQyxHQUFHLEVBQUMsR0FBRyxFQUFDOztBQUUxQixXQUFHLEdBQUcsQUFBQyxPQUFPLEdBQUcsS0FBSyxTQUFTLEdBQUksR0FBRyxHQUFHLENBQUMsQ0FBQzs7QUFFM0MsWUFBSSxFQUFFLEVBQUMsQ0FBQyxDQUFDO0FBQ1QsZ0JBQU8sSUFBSTtBQUNQLGlCQUFLLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssVUFBVTtBQUMxRCxrQkFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDWixzQkFBTTtBQUFBLEFBQ1YsaUJBQUssT0FBTyxHQUFHLEtBQUssUUFBUTtBQUN4QixrQkFBRSxHQUFHLEdBQUcsQ0FBQztBQUNULHNCQUFNO0FBQUEsQUFDVjtBQUNJLHVCQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsNERBQTRELEVBQUMsSUFBSSxDQUFDLENBQUM7QUFBQSxTQUM5Rjs7O0FBR0QsWUFBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sRUFBQztBQUNwRCxhQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzs7O0FBR3BCLGdCQUFHLEdBQUcsRUFBQztBQUNILGlCQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2Q7O2lCQUVHO0FBQ0EsaUJBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDakI7U0FDSjs7YUFFSSxJQUFHLEdBQUcsRUFBQztBQUNSLGFBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFDO0FBQ1Ysa0JBQUUsRUFBRyxFQUFFO2FBQ1YsQ0FBQyxDQUFDO1NBQ047O2FBRUc7QUFDQSxtQkFBTyxNQUFNLENBQUMsS0FBSyxDQUFDLDhEQUE4RCxFQUFDLElBQUksQ0FBQyxDQUFDO1NBQzVGOztBQUVELGVBQU8sQ0FBQyxDQUFDO0tBQ1o7Ozs7OztBQU1ELFlBQVEsRUFBRyxRQUFROzs7Ozs7QUFNbkIsU0FBSyxFQUFHLEtBQUs7Ozs7OztBQU1iLFFBQUksRUFBRyxJQUFJOzs7Ozs7QUFNWCxVQUFNLEVBQUcsTUFBTSxDQUFDLE1BQU07O0NBRXJCLENBQUM7Ozs7O0FDdEtGLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNwQyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc0Q3QyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVMsSUFBSSxFQUFDLE9BQU8sRUFBQzs7QUFFckMsTUFBSSxFQUFFLENBQUM7QUFDUCxNQUFHLEVBQUUsSUFBSSxZQUFZLEtBQUssQ0FBQSxBQUFDLEVBQUM7QUFDMUIsV0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7R0FDN0Q7O0FBRUQsU0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7OztBQUd4QixNQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUM7OztBQUcxQixRQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7QUFHbkMsTUFBRSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsQ0FBQztHQUV6Qzs7T0FFSTs7QUFFSCxNQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7O0FBRTdCLFFBQUcsRUFBRSxDQUFDLEtBQUssS0FBSyxPQUFPLEVBQUM7OztBQUd0QixhQUFPLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQzs7QUFFekIsUUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsQ0FBQztLQUN4QyxNQUNHOzs7QUFHRixXQUFJLElBQUksQ0FBQyxJQUFJLE9BQU8sRUFBQztBQUNuQixVQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ3BCOzs7QUFHRCxVQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQ2pCLGdCQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxDQUFDO09BQ2hDO0tBRUY7OztBQUdELE1BQUUsQ0FBQyxlQUFlLEdBQUcsQUFBQyxPQUFPLE9BQU8sQ0FBQyxlQUFlLEtBQUssV0FBVyxHQUNwRSxPQUFPLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztHQUM3Qjs7QUFFRCxTQUFPLEVBQUUsQ0FBQztDQUNYLENBQUM7Ozs7O0FDMUdGLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNwQyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMvQyxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUM5QyxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBQyxFQUFFLENBQUMsQ0FBQzs7QUFHdkMsT0FBTyxDQUFDLE9BQU8sR0FBRyxVQUFTLE9BQU8sRUFBQzs7O0FBR2pDLFFBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FDM0IsV0FBVyxFQUNWLE9BQU8sQ0FDVCxDQUFDLENBQUM7OztBQUdILFFBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFDO0FBQ2IsVUFBRSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDOUI7O0FBRUQsV0FBTyxFQUFFLENBQUM7Q0FDWCxDQUFDOzs7Ozs7Ozs7O0FBV0YsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFTLENBQUMsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFDOzs7O0FBSXZDLEtBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7OztBQVd2QixLQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDOztBQUViLFFBQUksSUFBSSxHQUFHLElBQUksQ0FBQzs7QUFFaEIsY0FBVSxDQUFDLFlBQVU7OztBQUduQixTQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQzs7O0FBR1osbUJBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQzs7O0FBRzdCLFlBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7O0FBRzVCLFlBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUNSLGlCQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUM7QUFDbEIsb0JBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3JDO1NBQ0o7S0FDRixFQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVMLFdBQU8sQ0FBQyxDQUFDO0NBQ1osQ0FBQzs7Ozs7Ozs7OztBQVdGLE9BQU8sQ0FBQyxPQUFPLEdBQUcsVUFBUyxHQUFHLEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQzs7QUFFeEMsUUFBRyxHQUFHLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSyxHQUFHLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsS0FBSyxLQUFLLFVBQVUsQUFBQyxFQUFDO0FBQzFFLGVBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO0tBQ3ZGOzs7QUFHRCxRQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQ3pCLFdBQVcsRUFDVixPQUFPLENBQ1gsQ0FBQyxDQUFDOztBQUVILFNBQUksSUFBSSxDQUFDLElBQUksRUFBRSxFQUFDO0FBQ2IsV0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQjs7Ozs7QUFLRCxPQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUMsT0FBTyxFQUFDLElBQUksQ0FBQyxDQUFDOzs7QUFHdEMsV0FBTyxHQUFHLENBQUM7Q0FDZCxDQUFDOztBQUdGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDOzs7OztBQzNHekIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3BDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDOzs7QUFHN0MsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUMsRUFBRSxDQUFDLENBQUM7O0FBRXZDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDOzs7QUFJeEIsT0FBTyxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7Ozs7O0FBTTNCLE9BQU8sQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDOzs7QUFJNUIsT0FBTyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7OztBQUl0QixPQUFPLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQjFCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsVUFBUyxHQUFHLEVBQUM7O0FBRXpCLFFBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDOztBQUU1QyxRQUFHO0FBQ0MsWUFBRyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7S0FDN0MsQ0FDRCxPQUFNLEdBQUcsRUFBQztBQUNOLGNBQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDckI7OztBQUdELFFBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUM7QUFDakIsZUFBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQ2xCLDBDQUEwQyxHQUFDLElBQUksQ0FBQyxFQUFFLEdBQ2pELG1EQUFtRCxDQUNyRCxFQUFDLEdBQUcsRUFBQyxJQUFJLENBQUMsQ0FBQztLQUNkOztBQUVELFNBQUksSUFBSSxDQUFDLElBQUksR0FBRyxFQUFDOztBQUViLGdCQUFPLElBQUk7OztBQUdQLGlCQUFLLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQU0sQ0FBQyxLQUFLLFFBQVE7QUFDOUMsbUJBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBTSxDQUFDLENBQUM7QUFDbkMsc0JBQU07O0FBQUE7QUFHVixpQkFBSyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLElBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxBQUFDO0FBQ2hELG1CQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUMxQywwQkFBTSxFQUFHLElBQUk7aUJBQ2QsQ0FBQyxDQUFDO0FBQ0gsc0JBQU07O0FBQUE7QUFHVixpQkFBSyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVTtBQUNsQyxzQkFBTTs7QUFBQSxBQUVWO0FBQ0ksdUJBQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztBQUMzRCx1QkFBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0Qix5QkFBUztBQUNULHlCQUFTO0FBQUEsU0FDaEI7OztBQUdELGFBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBQztBQUN6QixnQkFBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQztBQUNoQix1QkFBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQ2xCLG9DQUFvQyxHQUNuQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFDLFlBQVksR0FBQyxJQUFJLEdBQzNCLElBQUksQ0FBQyxFQUFFLEdBQUMsMkJBQTJCLEdBQ25DLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUMsbURBQW1ELEdBQzdELElBQUksQ0FBQyxFQUFFLEdBQUMsa0NBQWtDLENBQzVDLEVBQ0EsSUFBSSxDQUFDLENBQUM7YUFDVDtTQUNKOzs7QUFHRCxZQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsV0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ2xDLFlBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xDOztBQUVELFdBQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztDQUN2QixDQUFDOzs7Ozs7OztBQVNGLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBUyxHQUFHLEVBQUM7OztBQUc1QixRQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFDO0FBQ2hCLGVBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsR0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLG1EQUFtRCxDQUFDLENBQUM7S0FDekg7O0FBRUQsU0FBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUM7QUFDZCxZQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0FBQ3pCLG1CQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2hDLG1CQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3BDO0tBQ0g7Q0FDRixDQUFDOzs7Ozs7Ozs7QUFVRixPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVMsT0FBTyxFQUFDOztBQUUvQixRQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQzs7QUFFaEQsUUFBRyxJQUFJLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBQztBQUN4QyxlQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQztLQUN2RTs7QUFFRCxXQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQzs7QUFFeEIsUUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFDakIsUUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDZixRQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztBQUN4QixRQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQzs7O0FBR3BCLFFBQUcsSUFBSSxDQUFDLFVBQVUsRUFBQztBQUNqQixvQkFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUMvQjs7O0FBR0QsUUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDckIsUUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7OztBQUd2QixZQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzs7OztBQUtqRCxXQUFPLElBQUksQ0FBQztDQUNiLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkYsT0FBTyxDQUFDLFVBQVUsR0FBRyxZQUFVO0FBQzdCLFFBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ2hELFlBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxXQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7Q0FDbkIsQ0FBQzs7QUFHRixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyksXG4gICAgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cblxuLyoqXG4gKiBDYXN0cyBhIHRoZW5hYmxlIG9iamVjdCBpbnRvIGFuIE9yZ3kgZGVmZXJyZWQgb2JqZWN0LlxuICpcbiAqID4gVG8gcXVhbGlmeSBhcyBhIDxiPnRoZW5hYmxlPC9iPiwgdGhlIG9iamVjdCB0byBiZSBjYXN0ZWQgbXVzdCBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqICAtIHRoZW4oKVxuICogIC0gZXJyb3IoKVxuICpcbiAqID4gSWYgdGhlIGNhc3RlZCBvYmplY3QgaGFzIGFuIGlkIG9yIHVybCBwcm9wZXJ0eSBzZXQsIHRoZSBpZCBvciB1cmxcbiAqIFtpbiB0aGF0IG9yZGVyXSB3aWxsIGJlY29tZSB0aGUgaWQgb2YgdGhlIGRlZmVycmVkIGZvciByZWZlcmVuY2luZ1xuICogd2l0aCBPcmd5LmdldChpZClcbiAqIFxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBjYXN0XG4gKiBcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogQSB0aGVuYWJsZVxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1widGhlblwiLFwiZXJyb3JcIl07XG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKXtcbiAgICAgICAgaWYoIW9ialtyZXF1aXJlZFtpXV0pe1xuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhc3RhYmxlIG9iamVjdHMgcmVxdWlyZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6IFwiXG4gICAgICAgICAgICAgICAgKyByZXF1aXJlZFtpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIGlmKG9iai5pZCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBvYmouaWQ7XG4gICAgfVxuICAgIGVsc2UgaWYob2JqLnVybCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBvYmoudXJsO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgICAgIGlmKCFvcHRpb25zLmlkKXtcbiAgICAgICAgb3B0aW9ucy5pZCA9IENvbmZpZy5nZW5lcmF0ZV9pZCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vQ3JlYXRlIGEgZGVmZXJyZWRcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAvL0NyZWF0ZSByZXNvbHZlclxuICAgIHZhciByZXNvbHZlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSk7XG4gICAgfTtcblxuICAgIC8vU2V0IFJlc29sdmVyXG4gICAgb2JqLnRoZW4ocmVzb2x2ZXIpO1xuXG4gICAgLy9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG4gICAgdmFyIGVyciA9IGZ1bmN0aW9uKGVycil7XG4gICAgICBkZWYucmVqZWN0KGVycik7XG4gICAgfTtcbiAgICBvYmouZXJyb3IoZXJyKTtcblxuICAgIC8vUmV0dXJuIGRlZmVycmVkXG4gICAgcmV0dXJuIGRlZjtcbn07XG4iLCJ2YXIgX3B1YmxpYyA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQSBkaXJlY3Rvcnkgb2YgYWxsIHByb21pc2VzLCBkZWZlcnJlZHMsIGFuZCBxdWV1ZXMuXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5saXN0ID0ge307XG5cblxuLyoqXG4gKiBpdGVyYXRvciBmb3IgaWRzXG4gKiBAdHlwZSBpbnRlZ2VyXG4gKi9cbl9wdWJsaWMuaSA9IDA7XG5cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cbiAqXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5zZXR0aW5ncyA9IHtcblxuICAgIGRlYnVnX21vZGUgOiAxXG4gICAgLy9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG4gICAgLy9iZWNhdXNlIG5vZGUgaGFzIG5vIGNvbnN0YW50IGZvciB0aGlzXG4gICAgLGN3ZCA6IGZhbHNlXG4gICAgLG1vZGUgOiAoZnVuY3Rpb24oKXtcbiAgICAgICAgaWYodHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MgKyAnJyA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKXtcbiAgICAgICAgICAgIC8vIGlzIG5vZGVcbiAgICAgICAgICAgIHJldHVybiBcIm5hdGl2ZVwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvLyBub3Qgbm9kZVxuICAgICAgICAgICAgcmV0dXJuIFwiYnJvd3NlclwiO1xuICAgICAgICB9XG4gICAgfSgpKVxuICAgIC8qKlxuICAgICAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuICAgICAqIC0gb25TZXR0bGUgICAvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcbiAgICAgKlxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuICAgICxob29rcyA6IHtcbiAgICB9XG4gICAgLHRpbWVvdXQgOiA1MDAwIC8vZGVmYXVsdCB0aW1lb3V0XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBPcHRpb25zIHlvdSB3aXNoIHRvIHBhc3MgdG8gc2V0IHRoZSBnbG9iYWwgY29uZmlndXJhdGlvblxuICogXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGNvbmZpZ1xuICogXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIExpc3Qgb2Ygb3B0aW9uczogXG4gKiAgLSB7bnVtYmVyfSA8Yj50aW1lb3V0PC9iPlxuICogIC0ge3N0cmluZ30gPGI+Y3dkPC9iPiBTZXRzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuIFNlcnZlciBzaWRlIHNjcmlwdHMgb25seS5cbiAqICAtIHtib29sZWFufSA8Yj5kZWJ1Z19tb2RlPC9iPlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5jb25maWcgPSBmdW5jdGlvbihvYmope1xuXG4gICAgaWYodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpe1xuICAgICAgICBmb3IodmFyIGkgaW4gb2JqKXtcbiAgICAgICAgICBfcHVibGljLnNldHRpbmdzW2ldID0gb2JqW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9wdWJsaWMuc2V0dGluZ3M7XG59O1xuXG5cbi8qKlxuICogRGVidWdnaW5nIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gbXNnXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5kZWJ1ZyA9IGZ1bmN0aW9uKG1zZyxkZWYpe1xuXG4gICAgdmFyIG1zZ3M7XG4gICAgaWYobXNnIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgICBtc2dzID0gbXNnLmpvaW4oXCJcXG5cIik7XG4gICAgfVxuXG4gICAgdmFyIGUgPSBuZXcgRXJyb3IobXNncyk7XG4gICAgY29uc29sZS5sb2coZS5zdGFjayk7XG5cblxuICAgIGlmKHRoaXMuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgICAvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgaWYoX3B1YmxpYy5zZXR0aW5ncy5tb2RlID09PSAnYnJvd3Nlcicpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBNYWtlcyBhIHNoYWxsb3cgY29weSBvZiBhbiBhcnJheS5cbiAqIE1ha2VzIGEgY29weSBvZiBhbiBvYmplY3Qgc28gbG9uZyBhcyBpdCBpcyBKU09OXG4gKlxuICogQHBhcmFtIHthcnJheX0gZG9ub3JzIC9hcnJheSBvZiBkb25vciBvYmplY3RzLFxuICogICAgICAgICAgICAgICAgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5fcHVibGljLm5haXZlX2Nsb25lciA9IGZ1bmN0aW9uKGRvbm9ycyl7XG4gICAgdmFyIG8gPSB7fTtcbiAgICBmb3IodmFyIGEgaW4gZG9ub3JzKXtcbiAgICAgICAgZm9yKHZhciBiIGluIGRvbm9yc1thXSl7XG4gICAgICAgICAgICBpZihkb25vcnNbYV1bYl0gaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAgICAgICAgICAgb1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYodHlwZW9mIGRvbm9yc1thXVtiXSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgb1tiXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZG9ub3JzW2FdW2JdKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBvW2JdID0gZG9ub3JzW2FdW2JdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvO1xufTtcblxuXG5fcHVibGljLmdlbmVyYXRlX2lkID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgJy0nICsgKCsrdGhpcy5pKTsgIFxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBvYmplY3QuXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGRlZmVycmVkXG4gKiBcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIExpc3Qgb2Ygb3B0aW9uczpcbiAqICAtIHtzdHJpbmd9IDxiPmlkPC9iPiAgVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLiBPcHRpb25hbC5cbiAqICBcbiAqICAtIHtudW1iZXJ9IDxiPnRpbWVvdXQ8L2I+IFRpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC4gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS4gXG4gKiAgTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLiBcbiAqICBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuICogIFxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuICAgIHZhciBfbztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmKG9wdGlvbnMuaWQgJiYgQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuICAgICAgICBfbyA9IENvbmZpZy5saXN0W29wdGlvbnMuaWRdO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICAvL0NSRUFURSBORVcgSU5TVEFOQ0UgT0YgREVGRVJSRUQgQ0xBU1NcbiAgICAgICAgX28gPSBfcHJpdmF0ZS5mYWN0b3J5KG9wdGlvbnMpO1xuXG4gICAgICAgIC8vQUNUSVZBVEUgREVGRVJSRURcbiAgICAgICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9vO1xufTsiLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBGaWxlX2xvYWRlciA9IHJlcXVpcmUoJy4vZmlsZV9sb2FkZXIuanMnKTtcblxuXG52YXIgX3B1YmxpYyA9IHt9O1xuXG5cbl9wdWJsaWMuZmFjdG9yeSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIERlZmVycmVkU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5zY2hlbWEuanMnKTtcbiAgICB2YXIgX28gPSBDb25maWcubmFpdmVfY2xvbmVyKFtcbiAgICAgIERlZmVycmVkU2NoZW1hXG4gICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgICBpZighb3B0aW9ucy5pZCl7XG4gICAgICBfby5pZCA9IENvbmZpZy5nZW5lcmF0ZV9pZCgpO1xuICAgIH1cblxuICAgIHJldHVybiBfbztcbn07XG5cblxuX3B1YmxpYy5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICAvL01BS0UgU1VSRSBOQU1JTkcgQ09ORkxJQ1QgRE9FUyBOT1QgRVhJU1RcbiAgICBpZihDb25maWcubGlzdFtvYmouaWRdICYmICFDb25maWcubGlzdFtvYmouaWRdLm92ZXJ3cml0YWJsZSl7XG4gICAgICAgIENvbmZpZy5kZWJ1ZyhcIlRyaWVkIHRvIG92ZXJ3cml0ZSBcIitvYmouaWQrXCIgd2l0aG91dCBvdmVyd3JpdGUgcGVybWlzc2lvbnMuXCIpO1xuICAgICAgICByZXR1cm4gQ29uZmlnLmxpc3Rbb2JqLmlkXTtcbiAgICB9XG5cbiAgICAvL1NBVkUgVE8gTUFTVEVSIExJU1RcbiAgICBDb25maWcubGlzdFtvYmouaWRdID0gb2JqO1xuXG4gICAgLy9BVVRPIFRJTUVPVVRcbiAgICBfcHVibGljLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cbiAgICAvL0NhbGwgaG9va1xuICAgIGlmKENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuX3B1YmxpYy5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG4gICAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gICAgaWYoZGVmLnRpbWVvdXRfaWQpe1xuICAgICAgICBjbGVhclRpbWVvdXQoZGVmLnRpbWVvdXRfaWQpO1xuICAgIH1cblxuXG4gICAgLy9TZXQgc3RhdGUgdG8gcmVzb2x2ZWRcbiAgICBfcHVibGljLnNldF9zdGF0ZShkZWYsMSk7XG5cblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZShkZWYpO1xuICAgIH1cblxuXG4gICAgLy9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cbiAgICBkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcbiAgICAgICAgZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG4gICAgICAgIC8vUnVuIGRvbmVcbiAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICxkZWYuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICxkZWYuY2Fib29zZVxuICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICApO1xuXG4gICAgfSk7XG5cblxuICAgIC8vUnVuIHRoZW4gcXVldWVcbiAgICBfcHVibGljLnJ1bl90cmFpbihcbiAgICAgICAgZGVmXG4gICAgICAgICxkZWYuY2FsbGJhY2tzLnRoZW5cbiAgICAgICAgLGRlZi52YWx1ZVxuICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICApO1xuXG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIFJ1bnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIHNlcXVlbnRpYWxseSBhcyBhIHBhcnRpYWwgZnVuY3Rpb24uXG4gKiBFYWNoIGZ1bmN0aW9uJ3MgYXJndW1lbnQgaXMgdGhlIHJlc3VsdCBvZiBpdHMgcHJlZGVjZXNzb3IgZnVuY3Rpb24uXG4gKlxuICogQnkgZGVmYXVsdCwgZXhlY3V0aW9uIGNoYWluIGlzIHBhdXNlZCB3aGVuIGFueSBmdW5jdGlvblxuICogcmV0dXJucyBhbiB1bnJlc29sdmVkIGRlZmVycmVkLiAocGF1c2Vfb25fZGVmZXJyZWQpIFtPUFRJT05BTF1cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmICAvZGVmZXJyZWQgb2JqZWN0XG4gKiBAcGFyYW0ge29iamVjdH0gb2JqICAvaXRpbmVyYXJ5XG4gKiAgICAgIHRyYWluICAgICAgIHthcnJheX1cbiAqICAgICAgaG9va3MgICAgICAge29iamVjdH1cbiAqICAgICAgICAgIG9uQmVmb3JlICAgICAgICB7YXJyYXl9XG4gKiAgICAgICAgICBvbkNvbXBsZXRlICAgICAge2FycmF5fVxuICogQHBhcmFtIHttaXhlZH0gcGFyYW0gL3BhcmFtIHRvIHBhc3MgdG8gZmlyc3QgY2FsbGJhY2tcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgIHBhdXNlX29uX2RlZmVycmVkICAge2Jvb2xlYW59XG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuICAgIC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuICAgIHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG4gICAgLy9vbkJlZm9yZSBldmVudFxuICAgIGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsb2JqLmhvb2tzLm9uQmVmb3JlXG4gICAgICAgICAgICAscGFyYW1cbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICB3aGlsZShvYmoudHJhaW4ubGVuZ3RoID4gMCl7XG5cbiAgICAgICAgLy9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuICAgICAgICB2YXIgbGFzdCA9IG9iai50cmFpbi5zaGlmdCgpO1xuICAgICAgICBkZWYuZXhlY3V0aW9uX2hpc3RvcnkucHVzaChsYXN0KTtcblxuICAgICAgICAvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuICAgICAgICByID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscik7XG5cbiAgICAgICAgLy9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG4gICAgICAgIC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcbiAgICAgICAgaWYob3B0aW9ucy5wYXVzZV9vbl9kZWZlcnJlZCl7XG5cbiAgICAgICAgICAgIC8vSWYgciBpcyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cbiAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyIHIgcmVzb2x2ZXNcbiAgICAgICAgICAgICAgICByLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXG4gICAgICAgICAgICAgICAgICAgIF9wdWJsaWMucnVuX3RyYWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAgICAgICAgICAgICAsb2JqXG4gICAgICAgICAgICAgICAgICAgICAgICAsclxuICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL3Rlcm1pbmF0ZSBleGVjdXRpb25cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vSWYgaXMgYW4gYXJyYXkgdGhhbiBjb250YWlucyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGVsc2UgaWYociBpbnN0YW5jZW9mIEFycmF5KXtcblxuICAgICAgICAgICAgICAgIHZhciB0aGVuYWJsZXMgPSBbXTtcblxuICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiByKXtcblxuICAgICAgICAgICAgICAgICAgICBpZihyW2ldLnRoZW4gJiYgcltpXS5zZXR0bGVkICE9PSAxKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhlbmFibGVzLnB1c2gocltpXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IChmdW5jdGlvbih0LGRlZixvYmoscGFyYW0pe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9CYWlsIGlmIGFueSB0aGVuYWJsZXMgdW5zZXR0bGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiB0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRbaV0uc2V0dGxlZCAhPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3B1YmxpYy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG4gICAgICAgICAgICAgICAgICAgICAgICByW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9vbkNvbXBsZXRlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHVibGljLnJ1bl90cmFpbihkZWYsb2JqLmhvb2tzLm9uQ29tcGxldGUscix7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX0pO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcGFyYW0ge251bWJlcn0gaW50XG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5zZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYsaW50KXtcblxuICAgIGRlZi5zdGF0ZSA9IGludDtcblxuICAgIC8vSUYgUkVTT0xWRUQgT1IgUkVKRUNURUQsIFNFVFRMRVxuICAgIGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuICAgICAgICBkZWYuc2V0dGxlZCA9IDE7XG4gICAgfVxuXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG4gICAgICAgIF9wdWJsaWMuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5fcHVibGljLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZil7XG4gICAgcmV0dXJuIGRlZi5zdGF0ZTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBhdXRvbWF0aWMgdGltZW91dCBvbiBhIHByb21pc2Ugb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7aW50ZWdlcn0gdGltZW91dCAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbih0aW1lb3V0KXtcblxuICAgIHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgPyB0aGlzLnRpbWVvdXQgOiB0aW1lb3V0O1xuXG4gICAgLy9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG4gICAgaWYoIXRoaXMudHlwZSB8fCB0aGlzLnR5cGUgIT09ICd0aW1lcicpe1xuXG4gICAgICAgIC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG4gICAgICAgIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgIFwiQXV0byB0aW1lb3V0IHRoaXMudGltZW91dCBjYW5ub3QgYmUgdW5kZWZpbmVkLlwiXG4gICAgICAgICAgICAgICx0aGlzLmlkXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcbiAgICAgICAgICAgIC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aW1lb3V0X2lkID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IuY2FsbChzY29wZSk7XG4gICAgICAgIH0sIHRoaXMudGltZW91dCk7XG5cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgLy9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG4gICAgaWYodGhpcy5zdGF0ZSAhPT0gMSl7XG5cbiAgICAgICAgLy9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG4gICAgICAgIHZhciBtc2dzID0gW107XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGlmKG9iai5zdGF0ZSAhPT0gMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcbiAgICAgICAgICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiAgICAgICAgICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICAgICAgICAgIHZhciByID0gX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KHRoaXMsJ3Vwc3RyZWFtJyxmbik7XG4gICAgICAgICAgICBtc2dzLnB1c2goc2NvcGUuaWQgKyBcIjogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyIFwiXG4gICAgICAgICAgICAgICAgICAgICsgdGhpcy50aW1lb3V0ICsgXCJtc1wiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChcIkNhdXNlOlwiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5fcHVibGljLmVycm9yID0gZnVuY3Rpb24oY2Ipe1xuXG4gICAgLy9JRiBFUlJPUiBBTFJFQURZIFRIUk9XTiwgRVhFQ1VURSBDQiBJTU1FRElBVEVMWVxuICAgIGlmKHRoaXMuc3RhdGUgPT09IDIpe1xuICAgICAgICBjYigpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICB0aGlzLnJlamVjdF9xLnB1c2goY2IpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIFNpZ25hbHMgYWxsIGRvd25zdHJlYW0gcHJvbWlzZXMgdGhhdCBfcHVibGljIHByb21pc2Ugb2JqZWN0J3NcbiAqIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICpcbiAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3JcbiAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnNpZ25hbF9kb3duc3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0KXtcblxuICAgIC8vTUFLRSBTVVJFIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRFxuICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgPT09IDEpe1xuXG4gICAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc3RhdGUgIT09IDEpe1xuICAgICAgICAgICAgLy90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgc3VjY2Vzc2Z1bGx5IHNldHRsZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgQ29uZmlnLmRlYnVnKHRhcmdldC5pZCArIFwiIHRyaWVkIHRvIHNldHRsZSBwcm9taXNlIFwiK1wiJ1wiK3RhcmdldC5kb3duc3RyZWFtW2ldLmlkK1wiJyB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gc2V0dGxlZC5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9OT1cgVEhBVCBXRSBLTk9XIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRCwgV0UgQ0FOIElHTk9SRSBBTllcbiAgICAvL1NFVFRMRUQgVEhBVCBSRVNVTFQgQVMgQSBTSURFIEVGRkVDVCBUTyBBTk9USEVSIFNFVFRMRU1FTlRcbiAgICBmb3IgKHZhciBpIGluIHRhcmdldC5kb3duc3RyZWFtKXtcbiAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc2V0dGxlZCAhPT0gMSl7XG4gICAgICAgICAgICBfcHVibGljLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbi8qKlxuKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSwgYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWUgICAgICAgICAgVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAgICAgICAgICAgICAgVGhlIHRlc3QgY2FsbGJhY2sgdG8gYmUgYXBwbGllZCB0byBlYWNoIG9iamVjdFxuKiBAcGFyYW0ge2FycmF5fSBicmVhZGNydW1iICAgICAgICAgVGhlIGJyZWFkY3J1bWIgdGhyb3VnaCB0aGUgY2hhaW4gb2YgdGhlIGZpcnN0IG1hdGNoXG4qIEByZXR1cm5zIHttaXhlZH1cbiovXG5fcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cbiAgICBpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBicmVhZGNydW1iID0gW29iai5pZF07XG4gICAgfVxuXG4gICAgdmFyIHIxO1xuXG4gICAgZm9yKHZhciBpIGluIG9ialtwcm9wTmFtZV0pe1xuXG4gICAgICAgIC8vUlVOIFRFU1RcbiAgICAgICAgcjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuICAgICAgICBpZihyMSAhPT0gZmFsc2Upe1xuICAgICAgICAvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcbiAgICAgICAgICAgIC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuICAgICAgICAgICAgaWYoYnJlYWRjcnVtYi5pbmRleE9mKHIxKSAhPT0gLTEpe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICAgICAgICBcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICtwcm9wTmFtZStcIicgb2Ygb2JqZWN0IFwiXG4gICAgICAgICAgICAgICAgICAgICAgICArKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuICAgICAgICAgICAgICAgICAgICAsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhZGNydW1iLnB1c2gocjEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pKClcbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKTtcblxuICAgICAgICAgICAgaWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuICAgICAgICAgICAgICAgIHJldHVybiBfcHVibGljLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiBicmVhZGNydW1iO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGEgcHJvbWlzZSBkZXNjcmlwdGlvbiBpbnRvIGEgcHJvbWlzZS5cbiAqXG4gKiBAcGFyYW0ge3R5cGV9IG9ialxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuX3B1YmxpYy5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cbiAgICBvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuICAgIC8vQXV0b25hbWVcbiAgICBpZiAoIW9iai5pZCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG4gICAgICAgIG9iai5pZCA9IFwidGltZXItXCIgKyBvYmoudGltZW91dCArIFwiLVwiICsgKCsrQ29uZmlnLmkpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodHlwZW9mIG9iai51cmwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpO1xuICAgICAgICAvL1JFTU9WRSAuanMgRlJPTSBJRFxuICAgICAgICBpZiAob2JqLmlkLnNlYXJjaChcIi5qc1wiKSAhPT0gLTEpIHtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuc3BsaXQoXCIuXCIpO1xuICAgICAgICAgIG9iai5pZC5wb3AoKTtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1JldHVybiBpZiBhbHJlYWR5IGV4aXN0c1xuICAgIGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuICAgICAgLy9BIHByZXZpb3VzIHByb21pc2Ugb2YgdGhlIHNhbWUgaWQgZXhpc3RzLlxuICAgICAgLy9NYWtlIHN1cmUgdGhpcyBkZXBlbmRlbmN5IG9iamVjdCBkb2Vzbid0IGhhdmUgYVxuICAgICAgLy9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3JcbiAgICAgIGlmKG9iai5yZXNvbHZlcil7XG4gICAgICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgXCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG4gICAgICAgICAgLFwiRGV0ZWN0ZWQgcmUtaW5pdCBvZiAnXCIgKyBvYmouaWQgKyBcIicuXCJcbiAgICAgICAgICAsXCJBdHRlbXB0ZWQ6XCJcbiAgICAgICAgICAsb2JqXG4gICAgICAgICAgLFwiRXhpc3Rpbmc6XCJcbiAgICAgICAgICAsQ29uZmlnLmxpc3Rbb2JqLmlkXVxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2VcbiAgICB2YXIgZGVmO1xuICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAvL0V2ZW50XG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICdldmVudCcpOlxuICAgICAgICAgICAgZGVmID0gX3B1YmxpYy53cmFwX2V2ZW50KG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcbiAgICAgICAgICAgIHZhciBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKTtcbiAgICAgICAgICAgIGRlZiA9IFF1ZXVlKG9iai5kZXBlbmRlbmNpZXMsb2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vQWxyZWFkeSBhIHRoZW5hYmxlXG4gICAgICAgIGNhc2UodHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nKTpcblxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgICAgICAgLy9SZWZlcmVuY2UgdG8gYW4gZXhpc3RpbmcgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBvYmouaWQgPT09ICdzdHJpbmcnKTpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMuZGVmZXJyZWQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQgOiBvYmouaWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmKG9iai50aGVuKXtcbiAgICAgICAgICAgICAgICAgICAgICBvYmoudGhlbihmdW5jdGlvbihyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHIpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgLy9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuICAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5wcm9taXNlID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgICAgICAgaWYob2JqLnNjb3BlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iai5wcm9taXNlLmNhbGwob2JqLnNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIC8vT2JqZWN0IGlzIGEgdGhlbmFibGVcbiAgICAgICAgICAgICAgICBjYXNlKG9iai50aGVuKTpcbiAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9DaGVjayBpZiBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgICBpZih0eXBlb2YgZGVmICE9PSAnb2JqZWN0JyB8fCAhZGVmLnRoZW4pe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfdGltZXIob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vTG9hZCBmaWxlXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuICAgICAgICAgICAgLy9Jbmhlcml0IHBhcmVudCdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICAgIGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG4gICAgICAgICAgICAgIG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWYgPSBfcHVibGljLndyYXBfeGhyKG9iaik7XG4gICAgfVxuXG4gICAgLy9JbmRleCBwcm9taXNlIGJ5IGlkIGZvciBmdXR1cmUgcmVmZXJlbmNpbmdcbiAgICBDb25maWcubGlzdFtvYmouaWRdID0gZGVmO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBAdG9kbzogcmVkbyB0aGlzXG4gKlxuICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cbiAqXG4gKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3B1YmxpYy53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQoe1xuICAgICAgICBpZCA6IG9iai5pZFxuICAgIH0pO1xuXG5cbiAgICBpZih0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKXtcblxuICAgICAgICBpZih0eXBlb2YgJCAhPT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICB2YXIgbXNnID0gJ3dpbmRvdyBhbmQgZG9jdW1lbnQgYmFzZWQgZXZlbnRzIGRlcGVuZCBvbiBqUXVlcnknO1xuICAgICAgICAgICAgZGVmLnJlamVjdChtc2cpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvL0ZvciBub3csIGRlcGVuZCBvbiBqcXVlcnkgZm9yIElFOCBET01Db250ZW50TG9hZGVkIHBvbHlmaWxsXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSl7XG4gICAgICAgICAgICAgICAgY2FzZShvYmouaWQgPT09ICdyZWFkeScgfHwgb2JqLmlkID09PSAnRE9NQ29udGVudExvYWRlZCcpOlxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlKG9iai5pZCA9PT0gJ2xvYWQnKTpcbiAgICAgICAgICAgICAgICAgICAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24ob2JqLmlkLFwiYm9keVwiLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG5fcHVibGljLndyYXBfdGltZXIgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuICAgIHZhciBkZWYgPSBEZWZlcnJlZCgpO1xuXG4gICAgKGZ1bmN0aW9uKGRlZil7XG5cbiAgICAgICAgdmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgZGVmLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN0YXJ0IDogX3N0YXJ0XG4gICAgICAgICAgICAgICAgLGVuZCA6IF9lbmRcbiAgICAgICAgICAgICAgICAsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcbiAgICAgICAgICAgICAgICAsdGltZW91dCA6IG9iai50aW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxvYmoudGltZW91dCk7XG5cbiAgICB9KGRlZikpO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgZGVwZW5kcyBvbiB0aGUgbG9hZGluZyBvZiBhIGZpbGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlcFxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wdWJsaWMud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG4gICAgdmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgICBpZighZGVwW3JlcXVpcmVkW2ldXSl7XG4gICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgICBcIkZpbGUgcmVxdWVzdHMgY29udmVydGVkIHRvIHByb21pc2VzIHJlcXVpcmU6IFwiICsgcmVxdWlyZWRbaV1cbiAgICAgICAgICAgICAgICAsXCJNYWtlIHN1cmUgeW91IHdlcmVuJ3QgZXhwZWN0aW5nIGRlcGVuZGVuY3kgdG8gYWxyZWFkeSBoYXZlIGJlZW4gcmVzb2x2ZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAgICAgICAsZGVwXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vSUYgUFJPTUlTRSBGT1IgVEhJUyBVUkwgQUxSRUFEWSBFWElTVFMsIFJFVFVSTiBJVFxuICAgIGlmKENvbmZpZy5saXN0W2RlcC5pZF0pe1xuICAgICAgcmV0dXJuIENvbmZpZy5saXN0W2RlcC5pZF07XG4gICAgfVxuXG4gICAgLy9DT05WRVJUIFRPIERFRkVSUkVEOlxuICAgIHZhciBkZWYgPSBEZWZlcnJlZChkZXApO1xuXG4gICAgaWYodHlwZW9mIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVtkZXAudHlwZV0oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5zZXR0aW5ncy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cbi8qKlxuKiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG4qIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG4qXG4qIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2VcbiogaW4gaXRzIHVwc3RyZWFtLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4qIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG4qIEByZXR1cm5zIHt2b2lkfVxuKi9cbl9wdWJsaWMucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCl7XG5cbiAgICBpZih0YXJnZXQuaGFsdF9yZXNvbHV0aW9uID09PSAxKSByZXR1cm47XG5cbiAgIC8vTUFLRSBTVVJFIFRIRSBTSUdOQUwgV0FTIEZST00gQSBQUk9NSVNFIEJFSU5HIExJU1RFTkVEIFRPXG4gICAvL0JVVCBBTExPVyBTRUxGIFNUQVRVUyBDSEVDS1xuICAgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuICAgICAgIHJldHVybiBDb25maWcuZGVidWcoZnJvbV9pZCArIFwiIGNhbid0IHNpZ25hbCBcIiArIHRhcmdldC5pZCArIFwiIGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLlwiKTtcbiAgIH1cbiAgIC8vUlVOIFRIUk9VR0ggUVVFVUUgT0YgT0JTRVJWSU5HIFBST01JU0VTIFRPIFNFRSBJRiBBTEwgRE9ORVxuICAgZWxzZXtcbiAgICAgICB2YXIgc3RhdHVzID0gMTtcbiAgICAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LnVwc3RyZWFtKXtcbiAgICAgICAgICAgLy9TRVRTIFNUQVRVUyBUTyAwIElGIEFOWSBPQlNFUlZJTkcgSEFWRSBGQUlMRUQsIEJVVCBOT1QgSUYgUEVORElORyBPUiBSRVNPTFZFRFxuICAgICAgICAgICBpZih0YXJnZXQudXBzdHJlYW1baV0uc3RhdGUgIT09IDEpIHtcbiAgICAgICAgICAgICAgIHN0YXR1cyA9IHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZTtcbiAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICB9XG4gICAgICAgfVxuICAgfVxuXG4gICAvL1JFU09MVkUgUVVFVUUgSUYgVVBTVFJFQU0gRklOSVNIRURcbiAgIGlmKHN0YXR1cyA9PT0gMSl7XG5cbiAgICAgICAgLy9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcbiAgICAgICAgLy9SRVBPUlRTIERVUExJQ0FURVNcbiAgICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LmRlcGVuZGVuY2llcyl7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh0YXJnZXQuZGVwZW5kZW5jaWVzW2ldLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldC5yZXNvbHZlLmNhbGwodGFyZ2V0LHZhbHVlcyk7XG4gICB9XG5cbiAgIGlmKHN0YXR1cyA9PT0gMil7XG4gICAgICAgdmFyIGVyciA9IFtcbiAgICAgICAgICAgdGFyZ2V0LmlkK1wiIGRlcGVuZGVuY3kgJ1wiK3RhcmdldC51cHN0cmVhbVtpXS5pZCArIFwiJyB3YXMgcmVqZWN0ZWQuXCJcbiAgICAgICAgICAgLHRhcmdldC51cHN0cmVhbVtpXS5hcmd1bWVudHNcbiAgICAgICBdO1xuICAgICAgIHRhcmdldC5yZWplY3QuYXBwbHkodGFyZ2V0LGVycik7XG4gICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCIvKipcbiAqIERlZmF1bHQgcHJvcGVydGllcyBmb3IgYWxsIGRlZmVycmVkIG9iamVjdHMuXG4gKlxuICovXG52YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHVibGljID0ge307XG5cbl9wdWJsaWMuaXNfb3JneSA9IHRydWU7XG5cbl9wdWJsaWMuaWQgPSBudWxsO1xuXG4vL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG5fcHVibGljLnNldHRsZWQgPSAwO1xuXG4vKipcbiAqIFNUQVRFIENPREVTOlxuICogLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAtMSAgID0+IFNFVFRMSU5HIFtFWEVDVVRJTkcgQ0FMTEJBQ0tTXVxuICogIDAgICA9PiBQRU5ESU5HXG4gKiAgMSAgID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG4gKiAgMiAgID0+IFJFSkVDVEVEXG4gKi9cbl9wdWJsaWMuc3RhdGUgPSAwO1xuXG5fcHVibGljLnZhbHVlID0gW107XG5cbi8vVGhlIG1vc3QgcmVjZW50IHZhbHVlIGdlbmVyYXRlZCBieSB0aGUgdGhlbi0+ZG9uZSBjaGFpbi5cbl9wdWJsaWMuY2Fib29zZSA9IG51bGw7XG5cbl9wdWJsaWMubW9kZWwgPSBcImRlZmVycmVkXCI7XG5cbl9wdWJsaWMuZG9uZV9maXJlZCA9IDA7XG5cbl9wdWJsaWMudGltZW91dF9pZCA9IG51bGw7XG5cbl9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzID0ge1xuICByZXNvbHZlIDogMFxuICAsdGhlbiA6IDBcbiAgLGRvbmUgOiAwXG4gICxyZWplY3QgOiAwXG59O1xuXG4vKipcbiAqIFNlbGYgZXhlY3V0aW5nIGZ1bmN0aW9uIHRvIGluaXRpYWxpemUgY2FsbGJhY2sgZXZlbnRcbiAqIGxpc3QuXG4gKlxuICogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eU5hbWVzIGFzXG4gKiBfcHVibGljLmNhbGxiYWNrX3N0YXRlczogYWRkaW5nIGJvaWxlcnBsYXRlXG4gKiBwcm9wZXJ0aWVzIGZvciBlYWNoXG4gKlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5jYWxsYmFja3MgPSAoZnVuY3Rpb24oKXtcblxuICB2YXIgbyA9IHt9O1xuXG4gIGZvcih2YXIgaSBpbiBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyl7XG4gICAgb1tpXSA9IHtcbiAgICAgIHRyYWluIDogW11cbiAgICAgICxob29rcyA6IHtcbiAgICAgICAgb25CZWZvcmUgOiB7XG4gICAgICAgICAgdHJhaW4gOiBbXVxuICAgICAgICB9XG4gICAgICAgICxvbkNvbXBsZXRlIDoge1xuICAgICAgICAgIHRyYWluIDogW11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gbztcbn0pKCk7XG5cbi8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuX3B1YmxpYy5kb3duc3RyZWFtID0ge307XG5cbl9wdWJsaWMuZXhlY3V0aW9uX2hpc3RvcnkgPSBbXTtcblxuLy9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cbl9wdWJsaWMub3ZlcndyaXRhYmxlID0gMDtcblxuXG4vKipcbiAqIERlZmF1bHQgdGltZW91dCBmb3IgYSBkZWZlcnJlZFxuICogQHR5cGUgbnVtYmVyXG4gKi9cbl9wdWJsaWMudGltZW91dCA9IENvbmZpZy5zZXR0aW5ncy50aW1lb3V0O1xuXG4vKipcbiAqIFJFTU9URVxuICpcbiAqIFJFTU9URSA9PSAxICA9PiAgW0RFRkFVTFRdIE1ha2UgaHR0cCByZXF1ZXN0IGZvciBmaWxlXG4gKlxuICogUkVNT1RFID09IDAgID0+ICBSZWFkIGZpbGUgZGlyZWN0bHkgZnJvbSB0aGUgZmlsZXN5c3RlbVxuICpcbiAqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG4gKiBGSUxFU1lTVEVNIEFDQ0VTU1xuICovXG5fcHVibGljLnJlbW90ZSA9IDE7XG5cbi8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxuX3B1YmxpYy5saXN0ID0gMTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogUmVzb2x2ZXMgYSBkZWZlcnJlZC5cbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWx1ZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMucmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgIENvbmZpZy5kZWJ1ZyhbXG4gICAgICB0aGlzLmlkICsgXCIgY2FuJ3QgcmVzb2x2ZS5cIlxuICAgICAgLFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG4gICAgXSk7XG4gIH1cblxuICAvL1NFVCBTVEFURSBUTyBTRVRUTEVNRU5UIElOIFBST0dSRVNTXG4gIF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuICAvL1NFVCBWQUxVRVxuICB0aGlzLnZhbHVlID0gdmFsdWU7XG5cbiAgLy9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcbiAgLy9FVkVOIElGIFRIRVJFIElTIE5PIFJFU09MVkVSLCBTRVQgSVQgVE8gRklSRUQgV0hFTiBDQUxMRURcbiAgaWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG4gICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cbiAgICAvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG4gICAgdHJ5e1xuICAgICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVzb2x2ZXIodmFsdWUsdGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY2F0Y2goZSl7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG4gIH1cbiAgZWxzZXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cbiAgICAvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3NcbiAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuICAgICAgX3ByaXZhdGUuc2V0dGxlKHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgLy9SdW4gcmVzb2x2ZVxuICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgdGhpc1xuICAgICx0aGlzLmNhbGxiYWNrcy5yZXNvbHZlXG4gICAgLHRoaXMudmFsdWVcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgLy9yZXNvbHZlciBpcyBleHBlY3RlZCB0byBjYWxsIHJlc29sdmUgYWdhaW5cbiAgLy9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbl9wdWJsaWMucmVqZWN0ID0gZnVuY3Rpb24oZXJyKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZighKGVyciBpbnN0YW5jZW9mIEFycmF5KSl7XG4gICAgZXJyID0gW2Vycl07XG4gIH1cblxuICB2YXIgbXNnID0gXCJSZWplY3RlZCBcIit0aGlzLm1vZGVsK1wiOiAnXCIrdGhpcy5pZCtcIicuXCJcblxuICBpZihDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgZXJyLnVuc2hpZnQobXNnKTtcbiAgICBDb25maWcuZGVidWcoZXJyLHRoaXMpO1xuICB9XG4gIGVsc2V7XG4gICAgbXNnID0gbXNnICsgXCJcXG4gVHVybiBkZWJ1ZyBtb2RlIG9uIGZvciBtb3JlIGluZm8uXCI7XG4gICAgY29uc29sZS5sb2cobXNnKTtcbiAgfVxuXG4gIC8vUmVtb3ZlIGF1dG8gdGltZW91dCB0aW1lclxuICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICB9XG5cbiAgLy9TZXQgc3RhdGUgdG8gcmVqZWN0ZWRcbiAgX3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsMik7XG5cbiAgLy9FeGVjdXRlIHJlamVjdGlvbiBxdWV1ZVxuICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgdGhpc1xuICAgICx0aGlzLmNhbGxiYWNrcy5yZWplY3RcbiAgICAsZXJyXG4gICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG5fcHVibGljLnRoZW4gPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cbiAgc3dpdGNoKHRydWUpe1xuXG4gICAgLy9BbiBlcnJvciB3YXMgcHJldmlvdXNseSB0aHJvd24sIGJhaWwgb3V0XG4gICAgY2FzZSh0aGlzLnN0YXRlID09PSAyKTpcbiAgICAgIGJyZWFrO1xuXG4gICAgLy9FeGVjdXRpb24gY2hhaW4gYWxyZWFkeSBmaW5pc2hlZC4gQmFpbCBvdXQuXG4gICAgY2FzZSh0aGlzLmRvbmVfZmlyZWQgPT09IDEpOlxuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1Zyh0aGlzLmlkK1wiIGNhbid0IGF0dGFjaCAudGhlbigpIGJlY2F1c2UgLmRvbmUoKSBoYXMgYWxyZWFkeSBmaXJlZCwgYW5kIHRoYXQgbWVhbnMgdGhlIGV4ZWN1dGlvbiBjaGFpbiBpcyBjb21wbGV0ZS5cIik7XG5cbiAgICBkZWZhdWx0OlxuXG4gICAgICAvL1B1c2ggY2FsbGJhY2sgdG8gdGhlbiBxdWV1ZVxuICAgICAgdGhpcy5jYWxsYmFja3MudGhlbi50cmFpbi5wdXNoKGZuKTtcblxuICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlXG4gICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgaWYodGhpcy5zZXR0bGVkID09PSAxICYmIHRoaXMuc3RhdGUgPT09IDEgJiYgIXRoaXMuZG9uZV9maXJlZCl7XG4gICAgICAgIHRoaXMucnVuX3RyYWluKFxuICAgICAgICAgIHRoaXNcbiAgICAgICAgICAsdGhpcy5jYWxsYmFja3MudGhlblxuICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcbiAgICAgIGVsc2V7fVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbl9wdWJsaWMuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuICBpZih0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLmxlbmd0aCA9PT0gMFxuICAgICAmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuICAgICAgaWYodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKXtcblxuICAgICAgICAvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG4gICAgICAgIHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG4gICAgICAgICAgLy9Eb25lIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLCBzbyBub3RlIHRoYXQgaXQgaGFzIGJlZW5cbiAgICAgICAgICBkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuICAgICAgICAgIGZuKHIsZGVmZXJyZWQsbGFzdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cbiAgICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcbiAgICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgICAgICAgIGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuICAgICAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgICB0aGlzXG4gICAgICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy5kb25lXG4gICAgICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgdGhpc1xuICAgICAgICAgICAgICAsdGhpcy5jYWxsYmFja3MucmVqZWN0XG4gICAgICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuICAgICAgICBlbHNle31cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJkb25lKCkgbXVzdCBiZSBwYXNzZWQgYSBmdW5jdGlvbi5cIik7XG4gICAgfVxuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcImRvbmUoKSBjYW4gb25seSBiZSBjYWxsZWQgb25jZS5cIik7XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cbl9wdWJsaWMuYnJvd3NlciA9IHt9LFxuX3B1YmxpYy5uYXRpdmUgPSB7fSxcbl9wcml2YXRlLm5hdGl2ZSA9IHt9O1xuXG4vL0Jyb3dzZXIgbG9hZFxuXG5fcHVibGljLmJyb3dzZXIuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cbiAgdmFyIGhlYWQgPSAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuXG4gIGVsZW0uc2V0QXR0cmlidXRlKFwiaHJlZlwiLHBhdGgpO1xuICBlbGVtLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpO1xuICBlbGVtLnNldEF0dHJpYnV0ZShcInJlbFwiLFwic3R5bGVzaGVldFwiKTtcblxuICBpZihlbGVtLm9ubG9hZCl7XG4gICAgKGZ1bmN0aW9uKGVsZW0scGF0aCxkZWZlcnJlZCl7XG4gICAgICAgIGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuICAgICAgIH07XG5cbiAgICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJGYWlsZWQgdG8gbG9hZCBwYXRoOiBcIiArIHBhdGgpO1xuICAgICAgIH07XG5cbiAgICB9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG4gICAgaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbiAgfVxuICBlbHNle1xuICAgIC8vQUREIGVsZW0gQlVUIE1BS0UgWEhSIFJFUVVFU1QgVE8gQ0hFQ0sgRklMRSBSRUNFSVZFRFxuICAgIGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgY29uc29sZS53YXJuKFwiTm8gb25sb2FkIGF2YWlsYWJsZSBmb3IgbGluayB0YWcsIGF1dG9yZXNvbHZpbmcuXCIpO1xuICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG4gIH1cbn1cblxuX3B1YmxpYy5icm93c2VyLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG4gIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgZWxlbS50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwic3JjXCIscGF0aCk7XG5cbiAgKGZ1bmN0aW9uKGVsZW0scGF0aCxkZWZlcnJlZCl7XG4gICAgICBlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgLy9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG4gICAgICAgIGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgICAgIHx8IGRlZmVycmVkLmF1dG9yZXNvbHZlID09PSB0cnVlKXtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCh0eXBlb2YgZWxlbS52YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpID8gZWxlbS52YWx1ZSA6IGVsZW0pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcbiAgICAgIH07XG4gIH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cbiAgdGhpcy5oZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xufVxuXG5fcHVibGljLmJyb3dzZXIuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICB0aGlzLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCxvcHRpb25zKXtcbiAgdmFyIHIsXG4gIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICByZXEub3BlbignR0VUJywgcGF0aCwgdHJ1ZSk7XG5cbiAgKGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICBpZihyZXEuc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgIHIgPSByZXEucmVzcG9uc2VUZXh0O1xuICAgICAgICAgIGlmKG9wdGlvbnMudHlwZSAmJiBvcHRpb25zLnR5cGUgPT09ICdqc29uJyl7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIHIgPSBKU09OLnBhcnNlKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgIF9wdWJsaWMuZGVidWcoW1xuICAgICAgICAgICAgICAgIFwiQ291bGQgbm90IGRlY29kZSBKU09OXCJcbiAgICAgICAgICAgICAgICAscGF0aFxuICAgICAgICAgICAgICAgICxyXG4gICAgICAgICAgICAgIF0sZGVmZXJyZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KFwiRXJyb3IgbG9hZGluZzogXCIgKyBwYXRoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0ocGF0aCxkZWZlcnJlZCkpO1xuXG4gIHJlcS5zZW5kKG51bGwpO1xufVxuXG5cblxuLy9OYXRpdmUgbG9hZFxuXG5fcHVibGljLm5hdGl2ZS5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgX3B1YmxpYy5icm93c2VyLmNzcyhwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5uYXRpdmUuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIC8vbG9jYWwgcGFja2FnZVxuICBpZihwYXRoWzBdPT09Jy4nKXtcbiAgICB2YXIgcGF0aEluZm8gPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgsZGVmZXJyZWQpO1xuXG4gICAgdmFyIHIgPSByZXF1aXJlKHBhdGhJbmZvLnBhdGgpO1xuXG4gICAgLy9DaGFuZ2UgYmFjayB0byBvcmlnaW5hbCB3b3JraW5nIGRpclxuICAgIGlmKHBhdGhJbmZvLmRpcmNoYW5nZWQpIHByb2Nlc3MuY2hkaXIocGF0aEluZm8ub3dkKTtcblxuICAgIC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuICAgIGlmKHR5cGVvZiBkZWZlcnJlZC5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICB9XG4gIH1cbiAgLy9yZW1vdGUgc2NyaXB0XG4gIGVsc2V7XG5cbiAgICAvL0NoZWNrIHRoYXQgd2UgaGF2ZSBjb25maWd1cmVkIHRoZSBlbnZpcm9ubWVudCB0byBhbGxvdyB0aGlzLFxuICAgIC8vYXMgaXQgcmVwcmVzZW50cyBhIHNlY3VyaXR5IHRocmVhdCBhbmQgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgZGVidWdnaW5nXG4gICAgaWYoIUNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtfXG4gICAgICBDb25maWcuZGVidWcoXCJTZXQgY29uZmlnLmRlYnVnX21vZGU9MSB0byBydW4gcmVtb3RlIHNjcmlwdHMgb3V0c2lkZSBvZiBkZWJ1ZyBtb2RlLlwiKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgdmFyIFZtID0gcmVxdWlyZSgndm0nKTtcbiAgICAgICAgciA9IFZtLnJ1bkluVGhpc0NvbnRleHQoZGF0YSk7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuX3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLm5hdGl2ZS5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihyKXtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICB9KVxufVxuXG5fcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuICBpZihwYXRoWzBdID09PSAnLicpe1xuXG4gICAgdmFyIHBhdGhJbmZvID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoLGRlZmVycmVkKTtcblxuICAgIC8vZmlsZSBzeXN0ZW1cbiAgICBcbiAgICBGcy5yZWFkRmlsZShwYXRoSW5mby5wYXRoLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcblxuICAgIC8vQ2hhbmdlIGJhY2sgdG8gb3JpZ2luYWwgd29ya2luZyBkaXJcbiAgICBpZihwYXRoSW5mby5kaXJjaGFuZ2VkKSBwcm9jZXNzLmNoZGlyKHBhdGhJbmZvLm93ZCk7XG4gIH1cbiAgZWxzZXtcbiAgICAvL2h0dHBcbiAgICB2YXIgSHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbiAgICBIdHRwLmdldCh7IHBhdGggOiBwYXRofSwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgdmFyIGRhdGEgPSAnJztcbiAgICAgIHJlcy5vbignZGF0YScsIGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgICBkYXRhICs9IGJ1ZjtcbiAgICAgIH0pO1xuICAgICAgcmVzLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5fcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIHZhciBvd2QgPSBwcm9jZXNzLmN3ZCgpLCAvL2tlZXAgdHJhY2sgb2Ygc3RhcnRpbmcgcG9pbnQgc28gd2UgY2FuIHJldHVyblxuICAgICAgY3dkID0gKGRlZmVycmVkLmN3ZCkgPyBkZWZlcnJlZC5jd2QgOlxuICAgICAgICAgICAgKChDb25maWcuc2V0dGluZ3MuY3dkKSA/IENvbmZpZy5zZXR0aW5ncy5jd2QgOiBmYWxzZSlcbiAgLGRpcmNoYW5nZWQgPSBmYWxzZTtcblxuICBpZihjd2Qpe1xuICAgIHByb2Nlc3MuY2hkaXIoY3dkKTtcbiAgICBkaXJjaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuICBlbHNle1xuICAgIGN3ZCA9IG93ZDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb3dkIDogb3dkXG4gICAgLHBhdGggOiBjd2QrJy8nK3BhdGhcbiAgICAsZGlyY2hhbmdlZCA6IGRpcmNoYW5nZWRcbiAgfTtcbn1cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKSxcbiAgICBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKSxcbiAgICBDYXN0ID0gcmVxdWlyZSgnLi9jYXN0LmpzJyksXG4gICAgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbi8qKlxuICogQG5hbWVzcGFjZSBvcmd5XG4gKi9cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgcHJvbWlzZSBmcm9tIGEgdmFsdWUgYW5kIGFuIGlkIGFuZCBhdXRvbWF0aWNhbGx5XG4qIHJlc29sdmVzIGl0LlxuKlxuKiBAbWVtYmVyb2Ygb3JneSBcbiogXG4qIEBwYXJhbSB7c3RyaW5nfSBpZCBBIHVuaXF1ZSBpZCB5b3UgZ2l2ZSB0byB0aGUgb2JqZWN0XG4qIEBwYXJhbSB7bWl4ZWR9ICBkYXRhIFRoZSB2YWx1ZSB0aGF0IHRoZSBvYmplY3QgaXMgYXNzaWduZWRcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgUGFzc2FibGUgb3B0aW9uc1xuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBwcm9taXNlXG4qL1xuZGVmaW5lIDogZnVuY3Rpb24oaWQsZGF0YSxvcHRpb25zKXtcblxuICAgIHZhciBkZWY7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsO1xuICAgIG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGw7XG5cbiAgICAvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcbiAgICBpZih0eXBlb2YgaWQgIT09ICdzdHJpbmcnKXtcbiAgICAgIENvbmZpZy5kZWJ1ZyhcIk11c3Qgc2V0IGlkIHdoZW4gZGVmaW5pbmcgYW4gaW5zdGFuY2UuXCIpO1xuICAgIH1cblxuICAgIC8vQ2hlY2sgbm8gZXhpc3RpbmcgaW5zdGFuY2UgZGVmaW5lZCB3aXRoIHNhbWUgaWRcbiAgICBpZihDb25maWcubGlzdFtpZF0gJiYgQ29uZmlnLmxpc3RbaWRdLnNldHRsZWQgPT09IDEpe1xuICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbid0IGRlZmluZSBcIiArIGlkICsgXCIuIEFscmVhZHkgcmVzb2x2ZWQuXCIpO1xuICAgIH1cblxuICAgIG9wdGlvbnMuaWQgPSBpZDtcblxuICAgIGlmKG9wdGlvbnMuZGVwZW5kZW5jaWVzICE9PSBudWxsXG4gICAgICAmJiBvcHRpb25zLmRlcGVuZGVuY2llcyBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIC8vRGVmaW5lIGFzIGEgcXVldWUgLSBjYW4ndCBhdXRvcmVzb2x2ZSBiZWNhdXNlIHdlIGhhdmUgZGVwc1xuICAgICAgdmFyIGRlcHMgPSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlbGV0ZSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlZiA9IFF1ZXVlKGRlcHMsb3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAvL0RlZmluZSBhcyBhIGRlZmVycmVkXG4gICAgICBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuICAgICAgLy9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG4gICAgICBpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG4gICAgICAgICYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgICAgIHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcbiAgICAgICAgLy9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuICAgICAgICBkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcbiAgICAgICAgZGVmLnJlc29sdmUoZGF0YSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn0sXG5cblxuLyoqXG4gKiBHZXRzIGFuIGV4aXNpdGluZyBvcmd5IG9iamVjdCBmcm9tIGdsb2JhbCBzdG9yZS5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneSBcbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGlkIElkIG9mIGRlZmVycmVkIG9yIHF1ZXVlIG9iamVjdC5cbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbmdldCA6IGZ1bmN0aW9uKGlkKXtcbiAgaWYoQ29uZmlnLmxpc3RbaWRdKXtcbiAgICByZXR1cm4gQ29uZmlnLmxpc3RbaWRdO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICBcIk5vIGluc3RhbmNlIGV4aXN0czogXCIraWRcbiAgICBdKTtcbiAgfVxufSxcblxuXG4vKipcbiAqIEFkZC9yZW1vdmUgYW4gdXBzdHJlYW0gZGVwZW5kZW5jeSB0by9mcm9tIGEgcXVldWUuXG4gKlxuICogQ2FuIHVzZSBhIHF1ZXVlIGlkLCBldmVuIGZvciBhIHF1ZXVlIHRoYXQgaXMgeWV0IHRvIGJlIGNyZWF0ZWQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3kgXG4gKiBcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGd0IFF1ZXVlIGlkIC8gcXVldWUgb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyICBBcnJheSBvZiBwcm9taXNlIGlkcyBvciBkZXBlbmRlbmN5IG9iamVjdHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkICBJZiB0cnVlIDxiPkFERDwvYj4gYXJyYXkgdG8gcXVldWUgZGVwZW5kZW5jaWVzLCBJZiBmYWxzZSA8Yj5SRU1PVkU8L2I+IGFycmF5IGZyb20gcXVldWUgZGVwZW5kZW5jaWVzXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSBxdWV1ZVxuICovXG5hc3NpZ24gOiBmdW5jdGlvbih0Z3QsYXJyLGFkZCl7XG5cbiAgICBhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMTtcblxuICAgIHZhciBpZCxxO1xuICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGd0LnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgaWQgPSB0Z3QuaWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICBpZCA9IHRndDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKTtcbiAgICB9XG5cbiAgICAvL0lGIFRBUkdFVCBBTFJFQURZIExJU1RFRFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0ubW9kZWwgPT09ICdxdWV1ZScpe1xuICAgICAgICBxID0gQ29uZmlnLmxpc3RbaWRdO1xuXG4gICAgICAgIC8vPT4gQUREIFRPIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgaWYoYWRkKXtcbiAgICAgICAgICAgIHEuYWRkKGFycik7XG4gICAgICAgIH1cbiAgICAgICAgLy89PiBSRU1PVkUgRlJPTSBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBxLnJlbW92ZShhcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBBTkQgQUREIERFUEVOREVOQ0lFU1xuICAgIGVsc2UgaWYoYWRkKXtcbiAgICAgICAgcSA9IFF1ZXVlKGFycix7XG4gICAgICAgICAgICBpZCA6IGlkXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvL0VSUk9SOiBDQU4nVCBSRU1PVkUgRlJPTSBBIFFVRVVFIFRIQVQgRE9FUyBOT1QgRVhJU1RcbiAgICBlbHNle1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBkZXBlbmRlbmNpZXMgZnJvbSBhIHF1ZXVlIHRoYXQgZG9lcyBub3QgZXhpc3QuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHE7XG59LFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLiBcbiogQGlnbm9yZVxuKi9cbmRlZmVycmVkIDogRGVmZXJyZWQsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuIFxuKiBAaWdub3JlXG4qL1xucXVldWUgOiBRdWV1ZSxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS4gXG4qIEBpZ25vcmVcbiovXG5jYXN0IDogQ2FzdCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS4gXG4qIEBpZ25vcmVcbiovXG5jb25maWcgOiBDb25maWcuY29uZmlnXG5cbn07XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vcXVldWUucHJpdmF0ZS5qcycpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG4gKiBpcyByZXNvbHZlZC5cbiAqIFxuICogIyMjIFF1ZXVlIHVzYWdlIGV4YW1wbGU6XG4gKiA8cHJlPjxjb2RlPlxudmFyIHEgPSBPcmd5LnF1ZXVlKFtcbiAge1xuICAgIGNvbW1lbnQgOiBcIlRoaXMgaXMgYSBuZXN0ZWQgcXVldWUgY3JlYXRlZCBvbiB0aGUgZmx5LlwiXG4gICAgLHR5cGUgOiBcImpzb25cIlxuICAgICx1cmwgOiBcIi9hcGkvanNvbi9zb21udW1zXCJcbiAgICAscmVzb2x2ZXIgOiBmdW5jdGlvbihyLGRlZmVycmVkKXtcbiAgICAgIC8vRmlsdGVyIG91dCBldmVuIG51bWJlcnNcbiAgICAgIHZhciBvZGQgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICByZXR1cm4gMCAhPSB2YWwgJSAyO1xuICAgICAgfSk7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKG9kZCk7XG4gICAgfVxuICB9XG5dLHtcbiAgaWQgOiBcInExXCIsXG4gIHJlc29sdmVyIDogZnVuY3Rpb24ocixkZWZlcnJlZCl7XG4gICAgdmFyIHByaW1lcyA9IHJbMF0uZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgaGlnaCA9IE1hdGguZmxvb3IoTWF0aC5zcXJ0KHZhbCkpICsgMTtcbiAgICAgIGZvciAodmFyIGRpdiA9IDI7IGRpdiA8PSBoaWdoOyBkaXYrKykge1xuICAgICAgICBpZiAodmFsdWUgJSBkaXYgPT0gMCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGRlZmVycmVkLnJlc29sdmUocHJpbWVzKTtcbiAgfSlcbn0pO1xuICogPC9jb2RlPjwvcHJlPlxuICogXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIHF1ZXVlXG4gKiBcbiAqIEBwYXJhbSB7YXJyYXl9IGRlcHMgQXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRoYXQgbXVzdCBiZSByZXNvbHZlZCBiZWZvcmUgPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBjYWxsZWQuIFxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgIExpc3Qgb2Ygb3B0aW9uczpcbiAqICAtIHtzdHJpbmd9IDxiPmlkPC9iPiBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC4gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuIE9wdGlvbmFsLlxuICogIFxuICogIC0ge251bWJlcn0gPGI+dGltZW91dDwvYj4gXG4gKiAgVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLiBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQgWzUwMDBdLiBcbiAqICBcbiAqICAtIHtmdW5jdGlvbihyZXN1bHQsZGVmZXJyZWQpfSA8Yj5yZXNvbHZlcjwvYj4gXG4gKiAgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuIEFyZzEgaXMgYW4gYXJyYXkgb2YgdGhlIGRlcGVuZGVuY2llcycgcmVzb2x2ZWQgdmFsdWVzLiBBcmcyIGlzIHRoZSBkZWZlcnJlZCBvYmplY3QuIFRoZSBxdWV1ZSB3aWxsIG9ubHkgcmVzb2x2ZSB3aGVuIEFyZzIucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnLnRpbWVvdXQuXG4gKlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG4gIHZhciBfbztcbiAgaWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy9ET0VTIE5PVCBBTFJFQURZIEVYSVNUXG4gIGlmKCFDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cbiAgICAvL0NSRUFURSBORVcgUVVFVUUgT0JKRUNUXG4gICAgdmFyIF9vID0gX3ByaXZhdGUuZmFjdG9yeShvcHRpb25zKTtcblxuICAgIC8vQUNUSVZBVEUgUVVFVUVcbiAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cbiAgfVxuICAvL0FMUkVBRFkgRVhJU1RTXG4gIGVsc2Uge1xuXG4gICAgX28gPSBDb25maWcubGlzdFtvcHRpb25zLmlkXTtcblxuICAgIGlmKF9vLm1vZGVsICE9PSAncXVldWUnKXtcbiAgICAvL01BVENIIEZPVU5EIEJVVCBOT1QgQSBRVUVVRSwgVVBHUkFERSBUTyBPTkVcblxuICAgICAgb3B0aW9ucy5vdmVyd3JpdGFibGUgPSAxO1xuXG4gICAgICBfbyA9IF9wcml2YXRlLnVwZ3JhZGUoX28sb3B0aW9ucyxkZXBzKTtcbiAgICB9XG4gICAgZWxzZXtcblxuICAgICAgLy9PVkVSV1JJVEUgQU5ZIEVYSVNUSU5HIE9QVElPTlNcbiAgICAgIGZvcih2YXIgaSBpbiBvcHRpb25zKXtcbiAgICAgICAgX29baV0gPSBvcHRpb25zW2ldO1xuICAgICAgfVxuXG4gICAgICAvL0FERCBBRERJVElPTkFMIERFUEVOREVOQ0lFUyBJRiBOT1QgUkVTT0xWRURcbiAgICAgIGlmKGRlcHMubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wcml2YXRlLnRwbC5hZGQuY2FsbChfbyxkZXBzKTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8vUkVTVU1FIFJFU09MVVRJT04gVU5MRVNTIFNQRUNJRklFRCBPVEhFUldJU0VcbiAgICBfby5oYWx0X3Jlc29sdXRpb24gPSAodHlwZW9mIG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uICE9PSAndW5kZWZpbmVkJykgP1xuICAgIG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uIDogMDtcbiAgfVxuXG4gIHJldHVybiBfbztcbn07IiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpO1xudmFyIF9wcm90byA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xudmFyIF9wdWJsaWMgPSBPYmplY3QuY3JlYXRlKF9wcm90byx7fSk7XG5cblxuX3B1YmxpYy5mYWN0b3J5ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgLy9DUkVBVEUgQSBORVcgUVVFVUUgT0JKRUNUXG4gIHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIoW1xuICAgIFF1ZXVlU2NoZW1hXG4gICAgLG9wdGlvbnNcbiAgXSk7XG5cbiAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgaWYoIW9wdGlvbnMuaWQpe1xuICAgIF9vLmlkID0gQ29uZmlnLmdlbmVyYXRlX2lkKCk7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuXG5cbi8qKlxuICogQWN0aXZhdGVzIGEgcXVldWUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHthcnJheX0gZGVwc1xuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xuX3B1YmxpYy5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG8sb3B0aW9ucyxkZXBzKXtcblxuICAgIC8vQUNUSVZBVEUgQVMgQSBERUZFUlJFRFxuICAgIC8vdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpO1xuICAgIG8gPSBfcHJvdG8uYWN0aXZhdGUobyk7XG5cbiAgICAvL0B0b2RvIHJldGhpbmsgdGhpc1xuICAgIC8vVGhpcyB0aW1lb3V0IGdpdmVzIGRlZmluZWQgcHJvbWlzZXMgdGhhdCBhcmUgZGVmaW5lZFxuICAgIC8vZnVydGhlciBkb3duIHRoZSBzYW1lIHNjcmlwdCBhIGNoYW5jZSB0byBkZWZpbmUgdGhlbXNlbHZlc1xuICAgIC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG4gICAgLy9yZW1vdGUgc291cmNlIGhlcmUuXG4gICAgLy9UaGlzIGlzIGltcG9ydGFudCBpbiB0aGUgY2FzZSBvZiBjb21waWxlZCBqcyBmaWxlcyB0aGF0IGNvbnRhaW5cbiAgICAvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuICAgIC8vdGVtcG9yYXJpbHkgY2hhbmdlIHN0YXRlIHRvIHByZXZlbnQgb3V0c2lkZSByZXNvbHV0aW9uXG4gICAgby5zdGF0ZSA9IC0xO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAvL1Jlc3RvcmUgc3RhdGVcbiAgICAgIG8uc3RhdGUgPSAwO1xuXG4gICAgICAvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcbiAgICAgIFF1ZXVlU2NoZW1hLmFkZC5jYWxsKG8sZGVwcyk7XG5cbiAgICAgIC8vU0VFIElGIENBTiBCRSBJTU1FRElBVEVMWSBSRVNPTFZFRCBCWSBDSEVDS0lORyBVUFNUUkVBTVxuICAgICAgc2VsZi5yZWNlaXZlX3NpZ25hbChvLG8uaWQpO1xuXG4gICAgICAvL0FTU0lHTiBUSElTIFFVRVVFIFVQU1RSRUFNIFRPIE9USEVSIFFVRVVFU1xuICAgICAgaWYoby5hc3NpZ24pe1xuICAgICAgICAgIGZvcih2YXIgYSBpbiBvLmFzc2lnbil7XG4gICAgICAgICAgICAgIHNlbGYuYXNzaWduKG8uYXNzaWduW2FdLFtvXSx0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfSwxKTtcblxuICAgIHJldHVybiBvO1xufTtcblxuXG4vKipcbiogVXBncmFkZXMgYSBwcm9taXNlIG9iamVjdCB0byBhIHF1ZXVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4qIEBwYXJhbSB7YXJyYXl9IGRlcHMgXFxkZXBlbmRlbmNpZXNcbiogQHJldHVybnMge29iamVjdH0gcXVldWUgb2JqZWN0XG4qL1xuX3B1YmxpYy51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cbiAgICBpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoJ0NhbiBvbmx5IHVwZ3JhZGUgdW5zZXR0bGVkIHByb21pc2Ugb3IgZGVmZXJyZWQgaW50byBhIHF1ZXVlLicpO1xuICAgIH1cblxuICAgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuICAgIHZhciBfbyA9IENvbmZpZy5uYWl2ZV9jbG9uZXIoW1xuICAgICAgICBRdWV1ZVNjaGVtYVxuICAgICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgZm9yKHZhciBpIGluIF9vKXtcbiAgICAgICBvYmpbaV0gPSBfb1tpXTtcbiAgICB9XG5cbiAgICAvL2RlbGV0ZSBfbztcblxuICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBRVUVVRVxuICAgIG9iaiA9IHRoaXMuYWN0aXZhdGUob2JqLG9wdGlvbnMsZGVwcyk7XG5cbiAgICAvL1JFVFVSTiBRVUVVRSBPQkpFQ1RcbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJvdG8gPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpO1xuXG4vL0V4dGVuZCBkZWZlcnJlZCBzY2hlbWFcbnZhciBfcHVibGljID0gT2JqZWN0LmNyZWF0ZShfcHJvdG8se30pO1xuXG5fcHVibGljLm1vZGVsID0gJ3F1ZXVlJztcblxuXG4vL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG5fcHVibGljLnJlc29sdmVyX2ZpcmVkID0gMDtcblxuXG4vL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuLy9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG4vL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcbl9wdWJsaWMuaGFsdF9yZXNvbHV0aW9uID0gMDtcblxuXG4vL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcbl9wdWJsaWMudXBzdHJlYW0gPSB7fTtcblxuXG4vL1VTRUQgUkVUVVJOIFZBTFVFUywgRU5TVVJFUyBPUkRFUlxuX3B1YmxpYy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiogQWRkIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIGEgcXVldWUncyB1cHN0cmVhbSBhcnJheS5cbipcbiogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG4qIHVwc3RyZWFtIGFycmF5IGFyZSByZXNvbHZlZC5cbipcbiogV2hlbiBfcHVibGljLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcbiogZGVwZW5kZW5jeSBpcyBub3QgcHJldmlvdXNseSBzY2hlZHVsZWQgdG8gcmVzb2x2ZVxuKiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcbiogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG4qXG4qIEBwYXJhbSB7YXJyYXl9IGFyciAgL2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcbiogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuKi9cbl9wdWJsaWMuYWRkID0gZnVuY3Rpb24oYXJyKXtcblxuICB2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL3F1ZXVlLnByaXZhdGUuanMnKTtcblxuICAgdHJ5e1xuICAgICAgIGlmKGFyci5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLnVwc3RyZWFtO1xuICAgfVxuICAgY2F0Y2goZXJyKXtcbiAgICAgICBDb25maWcuZGVidWcoZXJyKTtcbiAgIH1cblxuICAgLy9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFRPIEFERFxuICAgaWYodGhpcy5zdGF0ZSAhPT0gMCl7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgXCJDYW5ub3QgYWRkIGRlcGVuZGVuY3kgbGlzdCB0byBxdWV1ZSBpZDonXCIrdGhpcy5pZFxuICAgICAgICArXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCJcbiAgICAgIF0sYXJyLHRoaXMpO1xuICAgfVxuXG4gICBmb3IodmFyIGEgaW4gYXJyKXtcblxuICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAvL0NIRUNLIElGIEVYSVNUU1xuICAgICAgICAgICBjYXNlKHR5cGVvZiBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dID09PSAnb2JqZWN0Jyk6XG4gICAgICAgICAgICAgICBhcnJbYV0gPSBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dO1xuICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgLy9JRiBOT1QsIEFUVEVNUFQgVE8gQ09OVkVSVCBJVCBUTyBBTiBPUkdZIFBST01JU0VcbiAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdID09PSAnb2JqZWN0JyAmJiAoIWFyclthXS5pc19vcmd5KSk6XG4gICAgICAgICAgICAgICBhcnJbYV0gPSBfcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcbiAgICAgICAgICAgICAgICAgcGFyZW50IDogdGhpc1xuICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAvL1JFRiBJUyBBIFBST01JU0UuXG4gICAgICAgICAgIGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIik7XG4gICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGFyclthXSk7XG4gICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgIH1cblxuICAgICAgIC8vbXVzdCBjaGVjayB0aGUgdGFyZ2V0IHRvIHNlZSBpZiB0aGUgZGVwZW5kZW5jeSBleGlzdHMgaW4gaXRzIGRvd25zdHJlYW1cbiAgICAgICBmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcbiAgICAgICAgICAgaWYoYiA9PT0gYXJyW2FdLmlkKXtcbiAgICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcbiAgICAgICAgICAgICAgICArYXJyW2FdLmlkK1wiJyB0byBxdWV1ZVwiK1wiICdcIlxuICAgICAgICAgICAgICAgICt0aGlzLmlkK1wiJy5cXG4gUHJvbWlzZSBvYmplY3QgZm9yICdcIlxuICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcbiAgICAgICAgICAgICAgICArdGhpcy5pZCtcIicgc28gaXQgY2FuJ3QgYmUgYWRkZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAsdGhpcyk7XG4gICAgICAgICAgIH1cbiAgICAgICB9XG5cbiAgICAgICAvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG4gICAgICAgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuICAgICAgIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdID0gdGhpcztcbiAgICAgICB0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG4gICB9XG5cbiAgIHJldHVybiB0aGlzLnVwc3RyZWFtO1xufTtcblxuXG4vKipcbiogUmVtb3ZlIGxpc3QgZnJvbSBhIHF1ZXVlLlxuKlxuKiBAcGFyYW0ge2FycmF5fSBhcnJcbiogQHJldHVybnMge2FycmF5fSBhcnJheSBvZiBsaXN0IHRoZSBxdWV1ZSBpcyB1cHN0cmVhbVxuKi9cbl9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKXtcblxuICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG4gIH1cblxuICBmb3IodmFyIGEgaW4gYXJyKXtcbiAgICAgaWYodGhpcy51cHN0cmVhbVthcnJbYV0uaWRdKXtcbiAgICAgICAgZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcbiAgICAgICAgZGVsZXRlIGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdO1xuICAgICB9XG4gIH1cbn07XG5cblxuLyoqXG4qIFJlc2V0cyBhbiBleGlzdGluZyxzZXR0bGVkIHF1ZXVlIGJhY2sgdG8gT3JneWluZyBzdGF0ZS5cbiogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cbiogRmFpbHMgaWYgbm90IHNldHRsZWQuXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4qIEByZXR1cm5zIHtfcHJpdmF0ZS50cGx8Qm9vbGVhbn1cbiovXG5fcHVibGljLnJlc2V0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cbiAgaWYodGhpcy5zZXR0bGVkICE9PSAxIHx8IHRoaXMuc3RhdGUgIT09IDEpe1xuICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdGhpcy5zZXR0bGVkID0gMDtcbiAgdGhpcy5zdGF0ZSA9IDA7XG4gIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuICB0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG4gIC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICB9XG5cbiAgLy9DTEVBUiBPVVQgVEhFIERPV05TVFJFQU1cbiAgdGhpcy5kb3duc3RyZWFtID0ge307XG4gIHRoaXMuZGVwZW5kZW5jaWVzID0gW107XG5cbiAgLy9TRVQgTkVXIEFVVE8gVElNRU9VVFxuICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cbiAgLy9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG4gIC8vdGhpcy5jaGVja19zZWxmKClcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcbiogY2FuIGJlIHJlc29sdmVkLlxuKlxuKiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2Fkcyxcbiogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG4qXG4qIC1kZWJ1Z2dpbmdcbipcbiogLXRoZSBxdWV1ZSBoYXMgYmVlbiByZXNldCBhbmQgbm8gbmV3XG4qIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuKlxuKiBAcmV0dXJucyB7aW50fSBTdGF0ZSBvZiB0aGUgcXVldWUuXG4qL1xuX3B1YmxpYy5jaGVja19zZWxmID0gZnVuY3Rpb24oKXtcbiAgdmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG4gIF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG4gIHJldHVybiB0aGlzLnN0YXRlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iXX0=
