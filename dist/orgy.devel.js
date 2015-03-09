(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    Deferred = require("./deferred.js"),
    _public = {},
    _private = {};

////////////////////////////////////////
//  _public METHODS
////////////////////////////////////////

/**
 * Casts an object into an Orgy deferred.
 *
 * > Object to be casted must have the following properties:
 *  - then()
 *  - error()
 *
 * > If the casted object has an id or url property set, the id or url
 * [in that order] will become the id of the deferred for referencing
 * with Orgy.get(id)
 *
 * @param {object} obj  /thenable
 * @returns {object}
 */
_public.cast = function (obj) {

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
        //Get backtrace info if none found [may be set @ _public.define]
        var backtrace = Config.get_backtrace_info("cast");

        //if no id, use backtrace origin
        if (!options.id) {
            options.id = backtrace.origin + "-" + ++Config.i;
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

    //Create Rejector
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

    //Set rejector
    obj.error(err);

    //Return deferred
    return def;
};

module.exports = _public;

},{"./config.js":3,"./deferred.js":4}],3:[function(require,module,exports){
(function (process){
"use strict";

var _public = {};
var _private = {};

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
 * Configuration setter.
 *
 * @param {object} obj
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

    if (!(msg instanceof Array)) {
        msg = [msg];
    }

    for (var i in msg) {
        if (typeof msg[i] === "string") {
            console.error("ERROR-" + i + ": " + msg[i]);
        } else {
            console.error(msg[i]);
        }
    }

    //if we saved a stack trace to connect async, push it
    if (def) {
        console.log("Backtrace:");
        console.log(def.backtrace.stack);
    }

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

_public.get_backtrace_info = function (ss) {

    var r = {},
        l,
        str;

    l = r.stack = new Error().stack;

    if (this.settings.mode === "browser") {
        l = l.split(ss)[1].trim().split("\n");
        str = l.pop();
        while (str.search("orgy") !== -1 && l.length > 0) {
            //iterate until outside of class
            str = l.pop();
        }
        str = window.location.protocol + "//" + str.split("//")[1];
    } else {
        str = l.split(ss + " ")[1].split("\n")[1];
        str = str.match(/\(([^)]+)\)/)[1];
    }

    //Set origin
    r.origin = str;

    return r;
};

module.exports = _public;

}).call(this,require('_process'))

},{"_process":1}],4:[function(require,module,exports){
"use strict";

var _ = require("lodash");
var Config = require("./config.js");
var Queue = require("./queue.js");
var Tpl = require("./deferred.tpl.js");
var File_loader = require("./file_loader.js");

var _public = {},
    _private = {};

//////////////////////////////////////////
//  _public VARIABLES
//////////////////////////////////////////

//////////////////////////////////////////
//  _private VARIABLES
//////////////////////////////////////////

//////////////////////////////////////////
//  _public METHODS
//////////////////////////////////////////

/**
 * Creates a new deferred object.
 *
 * @param {object} options
 *          {string}  id  /Optional. Use the id with Orgy.get(id). Defaults to line number of instantiation, plus an iterator.
 *          {number} timeout /time in ms after which reject is called. Defaults to Orgy.config().timeout [5000]. Note the timeout is only affected by dependencies and/or the resolver callback. Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
 * @returns {object}
 */
_public.deferred = function (options) {

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

////////////////////////////////////////
//  _private METHODS
////////////////////////////////////////

_private.factory = function (options) {

    var _o = _.assign({}, [Tpl, options]);

    //Get backtrace info if none found [may be set @ _public.define]
    if (!_o.backtrace) {
        _o.backtrace = Config.get_backtrace_info("deferred");
    }

    //if no id, use backtrace origin
    if (!options.id) {
        _o.id = _o.backtrace.origin + "-" + ++Config.i;
    }

    return _o;
};

_private.settle = function (def) {

    //REMOVE AUTO TIMEOUT TIMER
    if (def.timeout_id) {
        clearTimeout(def.timeout_id);
    }

    //Set state to resolved
    _private.set_state(def, 1);

    //Call hook
    if (Config.settings.hooks.onSettle) {
        Config.settings.hooks.onSettle(def);
    }

    //Add done as a callback to then chain completion.
    def.callbacks.then.hooks.onComplete.train.push(function (d2, itinerary, last) {
        def.caboose = last;

        //Run done
        _private.run_train(def, def.callbacks.done, def.caboose, { pause_on_deferred: false });
    });

    //Run then queue
    _private.run_train(def, def.callbacks.then, def.value, { pause_on_deferred: true });

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
_private.run_train = function (def, obj, param, options) {

    //allow previous return values to be passed down chain
    var r = param || def.caboose || def.value;

    //onBefore event
    if (obj.hooks && obj.hooks.onBefore.train.length > 0) {
        _private.run_train(def, obj.hooks.onBefore, param, { pause_on_deferred: false });
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

                    _private.run_train(def, obj, r, { pause_on_deferred: true });
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

                                _private.run_train(def, obj, param, { pause_on_deferred: true });
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
        _private.run_train(def, obj.hooks.onComplete, r, { pause_on_deferred: false });
    }
};

/**
 * Sets the state of an Orgy object.
 *
 * @param {object} def
 * @param {number} int
 * @returns {void}
 */
_private.set_state = function (def, int) {

    def.state = int;

    //IF RESOLVED OR REJECTED, SETTLE
    if (int === 1 || int === 2) {
        def.settled = 1;
    }

    if (int === 1 || int === 2) {
        _private.signal_downstream(def);
    }
};

/**
 * Gets the state of an Orgy object
 *
 * @param {object} def
 * @returns {number}
 */
_private.get_state = function (def) {
    return def.state;
};

_private.activate = function (obj) {

    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if (Config.list[obj.id] && !Config.list[obj.id].overwritable) {
        Config.debug("Tried to overwrite " + obj.id + " without overwrite permissions.");
        return Config.list[obj.id];
    }

    //SAVE TO MASTER LIST
    Config.list[obj.id] = obj;

    //AUTO TIMEOUT
    _private.auto_timeout.call(obj);

    //Call hook
    if (Config.settings.hooks.onActivate) {
        Config.settings.hooks.onActivate(obj);
    }

    return obj;
};

/**
 * Sets the automatic timeout on a promise object.
 *
 * @param {integer} timeout (optional)
 * @returns {Boolean}
 */
_private.auto_timeout = function (timeout) {

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
            _private.auto_timeout_cb.call(scope);
        }, this.timeout);
    } else {}

    return true;
};

/**
 * Callback for autotimeout. Declaration here avoids memory leak.
 *
 * @returns {void}
 */
_private.auto_timeout_cb = function () {

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
            var r = _private.search_obj_recursively(this, "upstream", fn);
            msgs.push(scope.id + ": rejected by auto timeout after " + this.timeout + "ms");
            msgs.push("Cause:");
            msgs.push(r);
            return this.reject.call(this, msgs);
        } else {
            return this.reject.call(this);
        }
    }
};

_private.error = function (cb) {

    //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
    if (this.state === 2) {
        cb();
    } else {
        this.reject_q.push(cb);
    }

    return this;
};

/**
 * Signals all downstream promises that _private promise object's state has changed.
 *
 *
 * @todo Since the same queue may have been assigned twice directly or
 * indirectly via shared dependencies, make sure not to double resolve
 * - which throws an error.
 *
 * @param {object} target deferred/queue
 * @returns {void}
 */
_private.signal_downstream = function (target) {

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
            _private.queue.receive_signal(target.downstream[i], target.id);
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
_private.search_obj_recursively = function (obj, propName, fn, breadcrumb) {

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
                return _private.search_obj_recursively(obj[propName][i], propName, fn, breadcrumb);
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
_private.convert_to_promise = function (obj, options) {

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
            def = _private.wrap_event(obj);
            break;

        case obj.type === "queue":
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
            def = _private.wrap_timer(obj);
            break;

        //Load file
        default:
            obj.type = obj.type || "default";
            //Inherit parent's current working directory
            if (options.parent && options.parent.cwd) {
                obj.cwd = options.parent.cwd;
            }
            def = _private.wrap_xhr(obj);
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
_private.wrap_event = function (obj) {

    var def = _public.deferred({
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

_private.wrap_timer = function (obj) {

    var prom = _public.deferred(obj);

    (function (prom) {

        var _start = new Date().getTime();
        setTimeout(function () {
            var _end = new Date().getTime();
            prom.resolve({
                start: _start,
                end: _end,
                elapsed: _end - _start,
                timeout: obj.timeout
            });
        }, obj.timeout);
    })(prom);

    return prom;
};

/**
 * Creates a deferred object that depends on the loading of a file.
 *
 * @param {object} dep
 * @returns {object} deferred object
 */
_private.wrap_xhr = function (dep) {

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
    var def = _public.deferred(dep);

    if (typeof File_loader[Config.settings.mode][dep.type] !== "undefined") {
        File_loader[Config.settings.mode][dep.type](dep.url, def, dep);
    } else {
        File_loader[Config.settings.mode]["default"](dep.url, def, dep);
    }

    return def;
};

module.exports = _public;

//@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?

},{"./config.js":3,"./deferred.tpl.js":5,"./file_loader.js":6,"./queue.js":8,"lodash":undefined}],5:[function(require,module,exports){
"use strict";

/**
 * Default properties for all deferred objects.
 *
 */
var Config = require("./config.js");
var tpl = {};

tpl.is_orgy = true;

tpl.id = null;

//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
tpl.settled = 0;

/**
 * STATE CODES:
 * ------------------
 * -1   => SETTLING [EXECUTING CALLBACKS]
 *  0   => PENDING
 *  1   => RESOLVED / FULFILLED
 *  2   => REJECTED
 */
tpl.state = 0;

tpl.value = [];

//The most recent value generated by the then->done chain.
tpl.caboose = null;

tpl.model = "deferred";

tpl.done_fired = 0;

tpl.timeout_id = null;

tpl.callback_states = {
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
 * tpl.callback_states: adding boilerplate
 * properties for each
 *
 * @returns {object}
 */
tpl.callbacks = (function () {

  var o = {};

  for (var i in tpl.callback_states) {
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
tpl.downstream = {};

tpl.execution_history = [];

//WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]
tpl.overwritable = 0;

/**
 * Default timeout for a deferred
 * @type number
 */
tpl.timeout = Config.settings.timeout;

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
tpl.remote = 1;

//ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
tpl.list = 1;

//////////////////////////////////////////
//  _public METHODS
//////////////////////////////////////////

/**
 * Resolves a deferred.
 *
 * @param {mixed} value
 * @returns {void}
 */
tpl.resolve = function (value) {

  if (this.settled === 1) {
    Config.debug([this.id + " can't resolve.", "Only unsettled deferreds are resolvable."]);
  }

  //SET STATE TO SETTLEMENT IN PROGRESS
  this.set_state(this, -1);

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
      settle(this);
    });
  }

  //Run resolve
  this.run_train(this, this.callbacks.resolve, this.value, { pause_on_deferred: false });

  //resolver is expected to call resolve again
  //and that will get us past this point
  return this;
};

tpl.reject = function (err) {

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
  this.set_state(this, 2);

  //Execute rejection queue
  this.run_train(this, this.callbacks.reject, err, { pause_on_deferred: false });

  return this;
};

tpl.then = function (fn, rejector) {

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

tpl.done = function (fn, rejector) {

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
          this.run_train(this, this.callbacks.done, this.caboose, { pause_on_deferred: false });
        } else {
          this.run_train(this, this.callbacks.reject, this.caboose, { pause_on_deferred: false });
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

module.exports = tpl;

},{"./config.js":3}],6:[function(require,module,exports){
"use strict";

var Config = require("./config.js");

var Http = require("http");
var Vm = require("vm");
var _public = {};
_private = {};

_public.browser = {}, _public.native = {},

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
    var r = require(path);
    deferred.resolve(r);
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
    //file system
    //var Fs = require('fs');
    Fs.readFile(path, function (err, data) {
      if (err) throw err;
      callback(data);
    });
  } else {
    //http
    //var Http = require('http');
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

module.exports = _public;

},{"./config.js":3,"http":undefined,"vm":undefined}],7:[function(require,module,exports){
(function (__dirname){
"use strict";

var Config = require("./config.js"),
    Queue = require("./queue.js"),
    Deferred = require("./deferred.js"),
    Cast = require("./cast.js");

var _public = {};
var _private = {};

////////////////////////////////////////
//  _public METHODS
////////////////////////////////////////

/**
* Creates a new promise from a value and an id and automatically
* resolves it.
*
* @param {string} id
* @param {mixed} data
* @param {object} options
* @returns {object} resolved promise
*/
_public.define = function (id, data, options) {

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

  //Set backtrace info, here - so origin points to callee
  options.backtrace = this.get_backtrace_info("define");

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
};

_public.define_module = function (obj) {

  var options = {};
  var id = obj.q.__id;

  if (typeof Orgy.list[id] === "undefined" || Orgy.list[id].state === 0) {
    if (obj.q.__dependencies) {
      options.dependencies = obj.q.__dependencies;
    }

    if (obj.q.__resolver) {
      options.resolver = obj.q.__resolver.bind(obj);
    };

    if (_private.config.mode === "native") {
      options.cwd = __dirname;
      var def = this.define(id, obj._public, options);
      return def;
    } else {
      this.define(id, obj._public, options);
    }
  }
};

/**
 * Getter.
 *
 * @param {string} id
 * @returns {object}
 */
_public.get = function (id) {
  if (Config.list[id]) {
    return Config.list[id];
  } else {
    return Config.debug(["No instance exists: " + id]);
  }
};

/**
 * Add/remove an upstream dependency to/from a queue.
 *
 * Can use a queue id, even for a queue that is yet to be created.
 *
 * @param {string} tgt | queue / queue id
 * @param {array}  arr | list/promise ids,dependencies
 * @param {boolean} add | add if true, remove if false
 *
 * @return {array} queue of list
 */
_public.assign = function (tgt, arr, add) {

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
};

_public.deferred = Deferred.deferred;
_public.queue = Queue.queue;
_public.cast = Cast.cast;

module.exports = _public;

}).call(this,"/src/js")

},{"./cast.js":2,"./config.js":3,"./deferred.js":4,"./queue.js":8}],8:[function(require,module,exports){
"use strict";

var _ = require("lodash"),
    Config = require("./config.js"),
    Deferred = require("./deferred.js"),
    _public = {},
    _private = {};

//////////////////////////////////////////
//  _public VARIABLES
//////////////////////////////////////////

//////////////////////////////////////////
//  _private VARIABLES
//////////////////////////////////////////

/**
* Template object for all queues
*
* @type object
*/
_private.tpl = {

    model: "queue"

    //SET TRUE AFTER RESOLVER FIRED
    , resolver_fired: 0

    //PREVENTS A QUEUE FROM RESOLVING EVEN IF ALL DEPENDENCIES MET
    //PURPOSE: PREVENTS QUEUES CREATED BY ASSIGNMENT FROM RESOLVING
    //BEFORE THEY ARE FORMALLY INSTANTIATED
    , halt_resolution: 0

    //USED TO CHECK STATE, ENSURES ONE COPY
    , upstream: {}

    //USED RETURN VALUES, ENSURES ORDER
    , dependencies: []

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
    , add: function add(arr) {

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
                    arr[a] = Deferred.convert_to_promise(arr[a], {
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
    }

    /**
     * Remove list from a queue.
     *
     * @param {array} arr
     * @returns {array} array of list the queue is upstream
     */
    , remove: function remove(arr) {

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
    }

    /**
     * Resets an existing,settled queue back to Orgying state.
     * Clears out the downstream.
     * Fails if not settled.
     * @param {object} options
     * @returns {_private.tpl|Boolean}
     */
    , reset: function reset(options) {

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
        Deferred.auto_timeout.call(this, options.timeout);

        //POINTLESS - WILL JUST IMMEDIATELY RESOLVE SELF
        //this.check_self()

        return this;
    }

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
    , check_self: function check_self() {
        _public.receive_signal(this, this.id);
        return this.state;
    }
};

//////////////////////////////////////////
//  _public METHODS
//////////////////////////////////////////

/**
 * Creates a new queue object.
 *
 * @param {array} deps
 * @param {object} options
 *          {string}  id  /Optional. Use the id with Orgy.get(id). Defaults to line number of instantiation, plus an iterator.
 *          {callback(result,deferred)} resolver /Callback function to execute after all dependencies have resolved. Arg1 is an array of the dependencies' resolved values. Arg2 is the deferred object. The queue will only resolve when Arg2.resolve() is called. If not, it will timeout to options.timeout || Orgy.config.timeout.
 *          {number} timeout /time in ms after which reject is called. Defaults to Orgy.config().timeout [5000]. Note the timeout is only affected by dependencies and/or the resolver callback. Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
 *
 * @returns {object}
 */
_public.queue = function (deps, options) {

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

        Deferred.tpl.resolve.call(target, values);
    }

    if (status === 2) {
        var err = [target.id + " dependency '" + target.upstream[i].id + "' was rejected.", target.upstream[i].arguments];
        Deferred.tpl.reject.apply(target, err);
    }
};

//////////////////////////////////////////
//  _private METHODS
//////////////////////////////////////////

_private.factory = function (options) {

    //CREATE A NEW QUEUE OBJECT
    var _o = _.assign({}, [Deferred.tpl, _private.tpl, options]);

    //Get backtrace info if none found [may be set @ Main.define]
    if (!_o.backtrace) {
        _o.backtrace = Config.get_backtrace_info("queue");
    }

    //if no id, use backtrace origin
    if (!options.id) {
        _o.id = _o.backtrace.origin + "-" + ++Config.i;
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
_private.activate = function (o, options, deps) {

    //ACTIVATE AS A DEFERRED
    o = Deferred.activate(o);

    //@todo rethink this
    //This timeout gives defined promises that are defined
    //further down the same script a chance to define themselves
    //and in case this queue is about to request them from a
    //remote source here.
    //This is important in the case of compiled js files that contain
    //multiple modules when depend on each other.

    //temporarily change state to prevent outside resolution
    o.state = -1;
    setTimeout(function () {

        //Restore state
        o.state = 0;

        //ADD DEPENDENCIES TO QUEUE
        _private.tpl.add.call(o, deps);

        //SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
        _public.receive_signal(o, o.id);

        //ASSIGN THIS QUEUE UPSTREAM TO OTHER QUEUES
        if (o.assign) {
            for (var a in o.assign) {
                _public.assign(o.assign[a], [o], true);
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
_private.upgrade = function (obj, options, deps) {

    if (obj.settled !== 0 || obj.model !== "promise" && obj.model !== "deferred") {
        return Config.debug("Can only upgrade unsettled promise or deferred into a queue.");
    }

    //GET A NEW QUEUE OBJECT AND MERGE IN
    var _o = _.assign({}, [_private.tpl, options]);

    for (var i in _o) {
        obj[i] = _o[i];
    }

    //delete _o;

    //CREATE NEW INSTANCE OF QUEUE
    obj = _private.activate(obj, options, deps);

    //RETURN QUEUE OBJECT
    return obj;
};

module.exports = _public;

},{"./config.js":3,"./deferred.js":4,"lodash":undefined}]},{},[2,3,4,5,6,7,8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvY2FzdC5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2NvbmZpZy5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2RlZmVycmVkLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZGVmZXJyZWQudHBsLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZmlsZV9sb2FkZXIuanMiLCIvdmFyL3d3dy9vcmd5LWpzL3NyYy9qcy9tYWluLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvcXVldWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMURBLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7SUFDL0IsUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDbkMsT0FBTyxHQUFHLEVBQUU7SUFDWixRQUFR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QUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQzthQUN4QztTQUNKO0tBQ0YsRUFBQyxDQUFDLENBQUMsQ0FBQzs7QUFFTCxXQUFPLENBQUMsQ0FBQztDQUNaLENBQUM7Ozs7Ozs7Ozs7QUFXRixRQUFRLENBQUMsT0FBTyxHQUFHLFVBQVMsR0FBRyxFQUFDLE9BQU8sRUFBQyxJQUFJLEVBQUM7O0FBRXpDLFFBQUcsR0FBRyxDQUFDLE9BQU8sS0FBSyxDQUFDLElBQUssR0FBRyxDQUFDLEtBQUssS0FBSyxTQUFTLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxVQUFVLEFBQUMsRUFBQztBQUMxRSxlQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsOERBQThELENBQUMsQ0FBQztLQUN2Rjs7O0FBR0QsUUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUMsQ0FDakIsUUFBUSxDQUFDLEdBQUcsRUFDWCxPQUFPLENBQ1gsQ0FBQyxDQUFDOztBQUVILFNBQUksSUFBSSxDQUFDLElBQUksRUFBRSxFQUFDO0FBQ2IsV0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQjs7Ozs7QUFLRCxPQUFHLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUMsT0FBTyxFQUFDLElBQUksQ0FBQyxDQUFDOzs7QUFHMUMsV0FBTyxHQUFHLENBQUM7Q0FDZCxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcbiAgICBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKSxcbiAgICBfcHVibGljID0ge30sXG4gICAgX3ByaXZhdGUgPSB7fTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBDYXN0cyBhbiBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkLlxuICpcbiAqID4gT2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogIC0gdGhlbigpXG4gKiAgLSBlcnJvcigpXG4gKlxuICogPiBJZiB0aGUgY2FzdGVkIG9iamVjdCBoYXMgYW4gaWQgb3IgdXJsIHByb3BlcnR5IHNldCwgdGhlIGlkIG9yIHVybFxuICogW2luIHRoYXQgb3JkZXJdIHdpbGwgYmVjb21lIHRoZSBpZCBvZiB0aGUgZGVmZXJyZWQgZm9yIHJlZmVyZW5jaW5nXG4gKiB3aXRoIE9yZ3kuZ2V0KGlkKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC90aGVuYWJsZVxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5jYXN0ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCJdO1xuICAgIGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG4gICAgICAgIGlmKCFvYmpbcmVxdWlyZWRbaV1dKXtcbiAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYXN0YWJsZSBvYmplY3RzIHJlcXVpcmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOiBcIlxuICAgICAgICAgICAgICAgICsgcmVxdWlyZWRbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICBpZihvYmouaWQpe1xuICAgICAgICBvcHRpb25zLmlkID0gb2JqLmlkO1xuICAgIH1cbiAgICBlbHNlIGlmKG9iai51cmwpe1xuICAgICAgICBvcHRpb25zLmlkID0gb2JqLnVybDtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIC8vR2V0IGJhY2t0cmFjZSBpbmZvIGlmIG5vbmUgZm91bmQgW21heSBiZSBzZXQgQCBfcHVibGljLmRlZmluZV1cbiAgICAgIHZhciBiYWNrdHJhY2UgPSBDb25maWcuZ2V0X2JhY2t0cmFjZV9pbmZvKCdjYXN0Jyk7XG5cbiAgICAgIC8vaWYgbm8gaWQsIHVzZSBiYWNrdHJhY2Ugb3JpZ2luXG4gICAgICBpZighb3B0aW9ucy5pZCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBiYWNrdHJhY2Uub3JpZ2luICsgJy0nICsgKCsrQ29uZmlnLmkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vQ3JlYXRlIGEgZGVmZXJyZWRcbiAgICB2YXIgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAvL0NyZWF0ZSByZXNvbHZlclxuICAgIHZhciByZXNvbHZlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSk7XG4gICAgfTtcblxuICAgIC8vU2V0IFJlc29sdmVyXG4gICAgb2JqLnRoZW4ocmVzb2x2ZXIpO1xuXG4gICAgLy9DcmVhdGUgUmVqZWN0b3JcbiAgICB2YXIgZXJyID0gZnVuY3Rpb24oZXJyKXtcbiAgICAgIGRlZi5yZWplY3QoZXJyKTtcbiAgICB9O1xuXG4gICAgLy9TZXQgcmVqZWN0b3JcbiAgICBvYmouZXJyb3IoZXJyKTtcblxuICAgIC8vUmV0dXJuIGRlZmVycmVkXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBfcHVibGljID0ge307XG52YXIgX3ByaXZhdGUgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLmxpc3QgPSB7fTtcblxuXG4vKipcbiAqIGl0ZXJhdG9yIGZvciBpZHNcbiAqIEB0eXBlIGludGVnZXJcbiAqL1xuX3B1YmxpYy5pID0gMDtcblxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gdmFsdWVzLlxuICpcbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLnNldHRpbmdzID0ge1xuXG4gICAgZGVidWdfbW9kZSA6IDFcbiAgICAvL3NldCB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgY2FsbGVlIHNjcmlwdCxcbiAgICAvL2JlY2F1c2Ugbm9kZSBoYXMgbm8gY29uc3RhbnQgZm9yIHRoaXNcbiAgICAsY3dkIDogZmFsc2VcbiAgICAsbW9kZSA6IChmdW5jdGlvbigpe1xuICAgICAgICBpZih0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2VzcyArICcnID09PSAnW29iamVjdCBwcm9jZXNzXScpe1xuICAgICAgICAgICAgLy8gaXMgbm9kZVxuICAgICAgICAgICAgcmV0dXJuIFwibmF0aXZlXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vIG5vdCBub2RlXG4gICAgICAgICAgICByZXR1cm4gXCJicm93c2VyXCI7XG4gICAgICAgIH1cbiAgICB9KCkpXG4gICAgLyoqXG4gICAgICogLSBvbkFjdGl2YXRlIC93aGVuIGVhY2ggaW5zdGFuY2UgYWN0aXZhdGVkXG4gICAgICogLSBvblNldHRsZSAgIC93aGVuIGVhY2ggaW5zdGFuY2Ugc2V0dGxlc1xuICAgICAqXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICovXG4gICAgLGhvb2tzIDoge1xuICAgIH1cbiAgICAsdGltZW91dCA6IDUwMDAgLy9kZWZhdWx0IHRpbWVvdXRcbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gc2V0dGVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIGlmKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKXtcbiAgICAgICAgZm9yKHZhciBpIGluIG9iail7XG4gICAgICAgICAgX3B1YmxpYy5zZXR0aW5nc1tpXSA9IG9ialtpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfcHVibGljLnNldHRpbmdzO1xufTtcblxuXG4vKipcbiAqIERlYnVnZ2luZyBtZXRob2QuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbl9wdWJsaWMuZGVidWcgPSBmdW5jdGlvbihtc2csZGVmKXtcblxuICAgIGlmKCEgKG1zZyBpbnN0YW5jZW9mIEFycmF5KSl7XG4gICAgICAgIG1zZyA9IFttc2ddO1xuICAgIH1cblxuICAgIGZvcih2YXIgaSBpbiBtc2cpe1xuICAgICAgICBpZih0eXBlb2YgbXNnW2ldID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRVJST1ItXCIraStcIjogXCIrbXNnW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihtc2dbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9pZiB3ZSBzYXZlZCBhIHN0YWNrIHRyYWNlIHRvIGNvbm5lY3QgYXN5bmMsIHB1c2ggaXRcbiAgICBpZihkZWYpe1xuICAgICAgICBjb25zb2xlLmxvZyhcIkJhY2t0cmFjZTpcIik7XG4gICAgICAgIGNvbnNvbGUubG9nKGRlZi5iYWNrdHJhY2Uuc3RhY2spO1xuICAgIH1cblxuICAgIGlmKHRoaXMuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG4gICAgICAvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgaWYoX3B1YmxpYy5zZXR0aW5ncy5tb2RlID09PSAnYnJvd3Nlcicpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgpO1xuICAgIH1cbn07XG5cblxuX3B1YmxpYy5nZXRfYmFja3RyYWNlX2luZm8gPSBmdW5jdGlvbihzcyl7XG5cbiAgICB2YXIgciA9IHt9XG4gICAgLGxcbiAgICAsc3RyO1xuXG4gICAgbCA9IHIuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcblxuICAgIGlmKHRoaXMuc2V0dGluZ3MubW9kZSA9PT0gJ2Jyb3dzZXInKXtcbiAgICAgIGwgPSBsLnNwbGl0KHNzKVsxXS50cmltKCkuc3BsaXQoXCJcXG5cIik7XG4gICAgICBzdHIgPSBsLnBvcCgpO1xuICAgICAgd2hpbGUoc3RyLnNlYXJjaChcIm9yZ3lcIikgIT09IC0xICYmIGwubGVuZ3RoID4gMCl7XG4gICAgICAgIC8vaXRlcmF0ZSB1bnRpbCBvdXRzaWRlIG9mIGNsYXNzXG4gICAgICAgIHN0ciA9IGwucG9wKCk7XG4gICAgICB9XG4gICAgICBzdHIgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyBzdHIuc3BsaXQoXCIvL1wiKVsxXTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHN0ciA9IGwuc3BsaXQoc3MgKyBcIiBcIilbMV0uc3BsaXQoXCJcXG5cIilbMV07XG4gICAgICBzdHIgPSBzdHIubWF0Y2goL1xcKChbXildKylcXCkvKVsxXTtcbiAgICB9XG5cbiAgICAvL1NldCBvcmlnaW5cbiAgICByLm9yaWdpbiA9IHN0cjtcblxuICAgIHJldHVybiByO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xudmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyk7XG52YXIgVHBsID0gcmVxdWlyZSgnLi9kZWZlcnJlZC50cGwuanMnKTtcbnZhciBGaWxlX2xvYWRlciA9IHJlcXVpcmUoJy4vZmlsZV9sb2FkZXIuanMnKTtcblxuXG52YXIgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgICAgICB7c3RyaW5nfSAgaWQgIC9PcHRpb25hbC4gVXNlIHRoZSBpZCB3aXRoIE9yZ3kuZ2V0KGlkKS4gRGVmYXVsdHMgdG8gbGluZSBudW1iZXIgb2YgaW5zdGFudGlhdGlvbiwgcGx1cyBhbiBpdGVyYXRvci5cbiAqICAgICAgICAgIHtudW1iZXJ9IHRpbWVvdXQgL3RpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC4gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS4gTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLiBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5kZWZlcnJlZCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYob3B0aW9ucy5pZCAmJiBDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG4gICAgICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBERUZFUlJFRCBDTEFTU1xuICAgICAgICBfbyA9IF9wcml2YXRlLmZhY3Rvcnkob3B0aW9ucyk7XG5cbiAgICAgICAgLy9BQ1RJVkFURSBERUZFUlJFRFxuICAgICAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuX3ByaXZhdGUuZmFjdG9yeSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vID0gXy5hc3NpZ24oe30sW1xuICAgICAgVHBsXG4gICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgLy9HZXQgYmFja3RyYWNlIGluZm8gaWYgbm9uZSBmb3VuZCBbbWF5IGJlIHNldCBAIF9wdWJsaWMuZGVmaW5lXVxuICAgIGlmKCFfby5iYWNrdHJhY2Upe1xuICAgICAgX28uYmFja3RyYWNlID0gQ29uZmlnLmdldF9iYWNrdHJhY2VfaW5mbygnZGVmZXJyZWQnKTtcbiAgICB9XG5cbiAgICAvL2lmIG5vIGlkLCB1c2UgYmFja3RyYWNlIG9yaWdpblxuICAgIGlmKCFvcHRpb25zLmlkKXtcbiAgICAgIF9vLmlkID0gX28uYmFja3RyYWNlLm9yaWdpbiArICctJyArICgrK0NvbmZpZy5pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59O1xuXG5cbl9wcml2YXRlLnNldHRsZSA9IGZ1bmN0aW9uKGRlZil7XG5cbiAgICAvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcbiAgICBpZihkZWYudGltZW91dF9pZCl7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWYudGltZW91dF9pZCk7XG4gICAgfVxuXG5cbiAgICAvL1NldCBzdGF0ZSB0byByZXNvbHZlZFxuICAgIF9wcml2YXRlLnNldF9zdGF0ZShkZWYsMSk7XG5cblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZShkZWYpO1xuICAgIH1cblxuXG4gICAgLy9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cbiAgICBkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcbiAgICAgICAgZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG4gICAgICAgIC8vUnVuIGRvbmVcbiAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsZGVmLmNhbGxiYWNrcy5kb25lXG4gICAgICAgICAgICAsZGVmLmNhYm9vc2VcbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcblxuICAgIH0pO1xuXG5cbiAgICAvL1J1biB0aGVuIHF1ZXVlXG4gICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICBkZWZcbiAgICAgICAgLGRlZi5jYWxsYmFja3MudGhlblxuICAgICAgICAsZGVmLnZhbHVlXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICk7XG5cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBmdW5jdGlvbnMgc2VxdWVudGlhbGx5IGFzIGEgcGFydGlhbCBmdW5jdGlvbi5cbiAqIEVhY2ggZnVuY3Rpb24ncyBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IG9mIGl0cyBwcmVkZWNlc3NvciBmdW5jdGlvbi5cbiAqXG4gKiBCeSBkZWZhdWx0LCBleGVjdXRpb24gY2hhaW4gaXMgcGF1c2VkIHdoZW4gYW55IGZ1bmN0aW9uXG4gKiByZXR1cm5zIGFuIHVucmVzb2x2ZWQgZGVmZXJyZWQuIChwYXVzZV9vbl9kZWZlcnJlZCkgW09QVElPTkFMXVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWYgIC9kZWZlcnJlZCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC9pdGluZXJhcnlcbiAqICAgICAgdHJhaW4gICAgICAge2FycmF5fVxuICogICAgICBob29rcyAgICAgICB7b2JqZWN0fVxuICogICAgICAgICAgb25CZWZvcmUgICAgICAgIHthcnJheX1cbiAqICAgICAgICAgIG9uQ29tcGxldGUgICAgICB7YXJyYXl9XG4gKiBAcGFyYW0ge21peGVkfSBwYXJhbSAvcGFyYW0gdG8gcGFzcyB0byBmaXJzdCBjYWxsYmFja1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqICAgICAgcGF1c2Vfb25fZGVmZXJyZWQgICB7Ym9vbGVhbn1cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3ByaXZhdGUucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuICAgIC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuICAgIHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG4gICAgLy9vbkJlZm9yZSBldmVudFxuICAgIGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgLG9iai5ob29rcy5vbkJlZm9yZVxuICAgICAgICAgICAgLHBhcmFtXG4gICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgd2hpbGUob2JqLnRyYWluLmxlbmd0aCA+IDApe1xuXG4gICAgICAgIC8vcmVtb3ZlIGZuIHRvIGV4ZWN1dGVcbiAgICAgICAgdmFyIGxhc3QgPSBvYmoudHJhaW4uc2hpZnQoKTtcbiAgICAgICAgZGVmLmV4ZWN1dGlvbl9oaXN0b3J5LnB1c2gobGFzdCk7XG5cbiAgICAgICAgLy9kZWYuY2Fib29zZSBuZWVkZWQgZm9yIHRoZW4gY2hhaW4gZGVjbGFyZWQgYWZ0ZXIgcmVzb2x2ZWQgaW5zdGFuY2VcbiAgICAgICAgciA9IGRlZi5jYWJvb3NlID0gbGFzdC5jYWxsKGRlZixkZWYudmFsdWUsZGVmLHIpO1xuXG4gICAgICAgIC8vaWYgcmVzdWx0IGlzIGFuIHRoZW5hYmxlLCBoYWx0IGV4ZWN1dGlvblxuICAgICAgICAvL2FuZCBydW4gdW5maXJlZCBhcnIgd2hlbiB0aGVuYWJsZSBzZXR0bGVzXG4gICAgICAgIGlmKG9wdGlvbnMucGF1c2Vfb25fZGVmZXJyZWQpe1xuXG4gICAgICAgICAgICAvL0lmIHIgaXMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG4gICAgICAgICAgICBpZihyICYmIHIudGhlbiAmJiByLnNldHRsZWQgIT09IDEpe1xuXG4gICAgICAgICAgICAgICAgLy9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlciByIHJlc29sdmVzXG4gICAgICAgICAgICAgICAgci5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblxuICAgICAgICAgICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICxyXG4gICAgICAgICAgICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9JZiBpcyBhbiBhcnJheSB0aGFuIGNvbnRhaW5zIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuICAgICAgICAgICAgZWxzZSBpZihyIGluc3RhbmNlb2YgQXJyYXkpe1xuXG4gICAgICAgICAgICAgICAgdmFyIHRoZW5hYmxlcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHIpe1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHJbaV0udGhlbiAmJiByW2ldLnNldHRsZWQgIT09IDEpe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVuYWJsZXMucHVzaChyW2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gKGZ1bmN0aW9uKHQsZGVmLG9iaixwYXJhbSl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0JhaWwgaWYgYW55IHRoZW5hYmxlcyB1bnNldHRsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodFtpXS5zZXR0bGVkICE9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG4gICAgICAgICAgICAgICAgICAgICAgICByW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9vbkNvbXBsZXRlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9KTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHBhcmFtIHtudW1iZXJ9IGludFxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wcml2YXRlLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZixpbnQpe1xuXG4gICAgZGVmLnN0YXRlID0gaW50O1xuXG4gICAgLy9JRiBSRVNPTFZFRCBPUiBSRUpFQ1RFRCwgU0VUVExFXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG4gICAgICAgIGRlZi5zZXR0bGVkID0gMTtcbiAgICB9XG5cbiAgICBpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcbiAgICAgICAgX3ByaXZhdGUuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5fcHJpdmF0ZS5nZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYpe1xuICAgIHJldHVybiBkZWYuc3RhdGU7XG59O1xuXG5cbl9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuICAgIGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgIUNvbmZpZy5saXN0W29iai5pZF0ub3ZlcndyaXRhYmxlKXtcbiAgICAgICAgQ29uZmlnLmRlYnVnKFwiVHJpZWQgdG8gb3ZlcndyaXRlIFwiK29iai5pZCtcIiB3aXRob3V0IG92ZXJ3cml0ZSBwZXJtaXNzaW9ucy5cIik7XG4gICAgICAgIHJldHVybiBDb25maWcubGlzdFtvYmouaWRdO1xuICAgIH1cblxuICAgIC8vU0FWRSBUTyBNQVNURVIgTElTVFxuICAgIENvbmZpZy5saXN0W29iai5pZF0gPSBvYmo7XG5cbiAgICAvL0FVVE8gVElNRU9VVFxuICAgIF9wcml2YXRlLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cbiAgICAvL0NhbGwgaG9va1xuICAgIGlmKENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKXtcbiAgICAgIENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBhdXRvbWF0aWMgdGltZW91dCBvbiBhIHByb21pc2Ugb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7aW50ZWdlcn0gdGltZW91dCAob3B0aW9uYWwpXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3ByaXZhdGUuYXV0b190aW1lb3V0ID0gZnVuY3Rpb24odGltZW91dCl7XG5cbiAgICB0aGlzLnRpbWVvdXQgPSAodHlwZW9mIHRpbWVvdXQgPT09ICd1bmRlZmluZWQnKVxuICAgID8gdGhpcy50aW1lb3V0IDogdGltZW91dDtcblxuICAgIC8vQVVUTyBSRUpFQ1QgT04gdGltZW91dFxuICAgIGlmKCF0aGlzLnR5cGUgfHwgdGhpcy50eXBlICE9PSAndGltZXInKXtcblxuICAgICAgICAvL0RFTEVURSBQUkVWSU9VUyBUSU1FT1VUIElGIEVYSVNUU1xuICAgICAgICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0eXBlb2YgdGhpcy50aW1lb3V0ID09PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICBcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuICAgICAgICAgICAgICAsdGhpcy5pZFxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy50aW1lb3V0ID09PSAtMSl7XG4gICAgICAgICAgICAvL05PIEFVVE8gVElNRU9VVCBTRVRcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGltZW91dF9pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIF9wcml2YXRlLmF1dG9fdGltZW91dF9jYi5jYWxsKHNjb3BlKTtcbiAgICAgICAgfSwgdGhpcy50aW1lb3V0KTtcblxuICAgIH1cbiAgICBlbHNle1xuICAgICAgICAvL0B0b2RvIFdIRU4gQSBUSU1FUiwgQUREIERVUkFUSU9OIFRPIEFMTCBVUFNUUkVBTSBBTkQgTEFURVJBTD9cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgYXV0b3RpbWVvdXQuIERlY2xhcmF0aW9uIGhlcmUgYXZvaWRzIG1lbW9yeSBsZWFrLlxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHJpdmF0ZS5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG4gICAgaWYodGhpcy5zdGF0ZSAhPT0gMSl7XG5cbiAgICAgICAgLy9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG4gICAgICAgIHZhciBtc2dzID0gW107XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGlmKG9iai5zdGF0ZSAhPT0gMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcbiAgICAgICAgICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiAgICAgICAgICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGlmKENvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtcbiAgICAgICAgICAgIHZhciByID0gX3ByaXZhdGUuc2VhcmNoX29ial9yZWN1cnNpdmVseSh0aGlzLCd1cHN0cmVhbScsZm4pO1xuICAgICAgICAgICAgbXNncy5wdXNoKHNjb3BlLmlkICsgXCI6IHJlamVjdGVkIGJ5IGF1dG8gdGltZW91dCBhZnRlciBcIlxuICAgICAgICAgICAgICAgICAgICArIHRoaXMudGltZW91dCArIFwibXNcIik7XG4gICAgICAgICAgICBtc2dzLnB1c2goXCJDYXVzZTpcIik7XG4gICAgICAgICAgICBtc2dzLnB1c2gocik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzLG1zZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuX3ByaXZhdGUuZXJyb3IgPSBmdW5jdGlvbihjYil7XG5cbiAgICAvL0lGIEVSUk9SIEFMUkVBRFkgVEhST1dOLCBFWEVDVVRFIENCIElNTUVESUFURUxZXG4gICAgaWYodGhpcy5zdGF0ZSA9PT0gMil7XG4gICAgICAgIGNiKCk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHRoaXMucmVqZWN0X3EucHVzaChjYik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU2lnbmFscyBhbGwgZG93bnN0cmVhbSBwcm9taXNlcyB0aGF0IF9wcml2YXRlIHByb21pc2Ugb2JqZWN0J3Mgc3RhdGUgaGFzIGNoYW5nZWQuXG4gKlxuICpcbiAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3JcbiAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHJpdmF0ZS5zaWduYWxfZG93bnN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldCl7XG5cbiAgICAvL01BS0UgU1VSRSBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRURcbiAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuICAgICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkID09PSAxKXtcblxuICAgICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnN0YXRlICE9PSAxKXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgcmVqZWN0ZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvL3RyaWVkIHRvIHNldHRsZSBhIHN1Y2Nlc3NmdWxseSBzZXR0bGVkIGRvd25zdHJlYW1cbiAgICAgICAgICAgIENvbmZpZy5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vTk9XIFRIQVQgV0UgS05PVyBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRUQsIFdFIENBTiBJR05PUkUgQU5ZXG4gICAgLy9TRVRUTEVEIFRIQVQgUkVTVUxUIEFTIEEgU0lERSBFRkZFQ1QgVE8gQU5PVEhFUiBTRVRUTEVNRU5UXG4gICAgZm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgIT09IDEpe1xuICAgICAgICAgICAgX3ByaXZhdGUucXVldWUucmVjZWl2ZV9zaWduYWwodGFyZ2V0LmRvd25zdHJlYW1baV0sdGFyZ2V0LmlkKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4qIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LCBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7c3RyaW5nfSBwcm9wTmFtZSAgICAgICAgICBUaGUgcHJvcGVydHkgbmFtZSBvZiB0aGUgYXJyYXkgdG8gYnViYmxlIHVwXG4qIEBwYXJhbSB7ZnVuY3Rpb259IGZuICAgICAgICAgICAgICBUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG4qIEBwYXJhbSB7YXJyYXl9IGJyZWFkY3J1bWIgICAgICAgICBUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcbiogQHJldHVybnMge21peGVkfVxuKi9cbl9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cbiAgICBpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBicmVhZGNydW1iID0gW29iai5pZF07XG4gICAgfVxuXG4gICAgdmFyIHIxO1xuXG4gICAgZm9yKHZhciBpIGluIG9ialtwcm9wTmFtZV0pe1xuXG4gICAgICAgIC8vUlVOIFRFU1RcbiAgICAgICAgcjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuICAgICAgICBpZihyMSAhPT0gZmFsc2Upe1xuICAgICAgICAvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcbiAgICAgICAgICAgIC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuICAgICAgICAgICAgaWYoYnJlYWRjcnVtYi5pbmRleE9mKHIxKSAhPT0gLTEpe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoW1xuICAgICAgICAgICAgICAgICAgICBcIkNpcmN1bGFyIGNvbmRpdGlvbiBpbiByZWN1cnNpdmUgc2VhcmNoIG9mIG9iaiBwcm9wZXJ0eSAnXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICtwcm9wTmFtZStcIicgb2Ygb2JqZWN0IFwiXG4gICAgICAgICAgICAgICAgICAgICAgICArKCh0eXBlb2Ygb2JqLmlkICE9PSAndW5kZWZpbmVkJykgPyBcIidcIitvYmouaWQrXCInXCIgOiAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICtcIi4gT2ZmZW5kaW5nIHZhbHVlOiBcIityMVxuICAgICAgICAgICAgICAgICAgICAsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhZGNydW1iLnB1c2gocjEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pKClcbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKTtcblxuICAgICAgICAgICAgaWYob2JqW3Byb3BOYW1lXVtpXVtwcm9wTmFtZV0pe1xuICAgICAgICAgICAgICAgIHJldHVybiBfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KG9ialtwcm9wTmFtZV1baV0scHJvcE5hbWUsZm4sYnJlYWRjcnVtYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gYnJlYWRjcnVtYjtcbn07XG5cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHByb21pc2UgZGVzY3JpcHRpb24gaW50byBhIHByb21pc2UuXG4gKlxuICogQHBhcmFtIHt0eXBlfSBvYmpcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbl9wcml2YXRlLmNvbnZlcnRfdG9fcHJvbWlzZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zKXtcblxuICAgIG9iai5pZCA9IG9iai5pZCB8fCBvcHRpb25zLmlkO1xuXG4gICAgLy9BdXRvbmFtZVxuICAgIGlmICghb2JqLmlkKSB7XG4gICAgICBpZiAob2JqLnR5cGUgPT09ICd0aW1lcicpIHtcbiAgICAgICAgb2JqLmlkID0gXCJ0aW1lci1cIiArIG9iai50aW1lb3V0ICsgXCItXCIgKyAoKytDb25maWcuaSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqLnVybCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb2JqLmlkID0gb2JqLnVybC5zcGxpdChcIi9cIikucG9wKCk7XG4gICAgICAgIC8vUkVNT1ZFIC5qcyBGUk9NIElEXG4gICAgICAgIGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5zcGxpdChcIi5cIik7XG4gICAgICAgICAgb2JqLmlkLnBvcCgpO1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5qb2luKFwiLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vUmV0dXJuIGlmIGFscmVhZHkgZXhpc3RzXG4gICAgaWYoQ29uZmlnLmxpc3Rbb2JqLmlkXSAmJiBvYmoudHlwZSAhPT0gJ3RpbWVyJyl7XG4gICAgICAvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG4gICAgICAvL01ha2Ugc3VyZSB0aGlzIGRlcGVuZGVuY3kgb2JqZWN0IGRvZXNuJ3QgaGF2ZSBhXG4gICAgICAvL3Jlc29sdmVyIC0gaWYgaXQgZG9lcyBlcnJvclxuICAgICAgaWYob2JqLnJlc29sdmVyKXtcbiAgICAgICAgQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICBcIllvdSBjYW4ndCBzZXQgYSByZXNvbHZlciBvbiBhIHF1ZXVlIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZC4gWW91IGNhbiBvbmx5IHJlZmVyZW5jZSB0aGUgb3JpZ2luYWwuXCJcbiAgICAgICAgICAsXCJEZXRlY3RlZCByZS1pbml0IG9mICdcIiArIG9iai5pZCArIFwiJy5cIlxuICAgICAgICAgICxcIkF0dGVtcHRlZDpcIlxuICAgICAgICAgICxvYmpcbiAgICAgICAgICAsXCJFeGlzdGluZzpcIlxuICAgICAgICAgICxDb25maWcubGlzdFtvYmouaWRdXG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5saXN0W29iai5pZF07XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvL0NvbnZlcnQgZGVwZW5kZW5jeSB0byBhbiBpbnN0YW5jZVxuICAgIHZhciBkZWY7XG4gICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgIC8vRXZlbnRcbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ2V2ZW50Jyk6XG4gICAgICAgICAgICBkZWYgPSBfcHJpdmF0ZS53cmFwX2V2ZW50KG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAncXVldWUnKTpcbiAgICAgICAgICAgIGRlZiA9IFF1ZXVlKG9iai5kZXBlbmRlbmNpZXMsb2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vQWxyZWFkeSBhIHRoZW5hYmxlXG4gICAgICAgIGNhc2UodHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nKTpcblxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgICAgICAgLy9SZWZlcmVuY2UgdG8gYW4gZXhpc3RpbmcgaW5zdGFuY2VcbiAgICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBvYmouaWQgPT09ICdzdHJpbmcnKTpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiJ1wiK29iai5pZCArXCInOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgIGRlZiA9IF9wdWJsaWMuZGVmZXJyZWQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQgOiBvYmouaWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9JZiBvYmplY3Qgd2FzIGEgdGhlbmFibGUsIHJlc29sdmUgdGhlIG5ldyBkZWZlcnJlZCB3aGVuIHRoZW4gY2FsbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmKG9iai50aGVuKXtcbiAgICAgICAgICAgICAgICAgICAgICBvYmoudGhlbihmdW5jdGlvbihyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKHIpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgLy9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuICAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5wcm9taXNlID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgICAgICAgaWYob2JqLnNjb3BlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iai5wcm9taXNlLmNhbGwob2JqLnNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIC8vT2JqZWN0IGlzIGEgdGhlbmFibGVcbiAgICAgICAgICAgICAgICBjYXNlKG9iai50aGVuKTpcbiAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9DaGVjayBpZiBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgICBpZih0eXBlb2YgZGVmICE9PSAnb2JqZWN0JyB8fCAhZGVmLnRoZW4pe1xuICAgICAgICAgICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG4gICAgICAgICAgICBkZWYgPSBfcHJpdmF0ZS53cmFwX3RpbWVyKG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAvL0xvYWQgZmlsZVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgb2JqLnR5cGUgPSBvYmoudHlwZSB8fCBcImRlZmF1bHRcIjtcbiAgICAgICAgICAgIC8vSW5oZXJpdCBwYXJlbnQncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAgICBpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2Qpe1xuICAgICAgICAgICAgICBvYmouY3dkID0gb3B0aW9ucy5wYXJlbnQuY3dkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmID0gX3ByaXZhdGUud3JhcF94aHIob2JqKTtcbiAgICB9XG5cbiAgICAvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuICAgIENvbmZpZy5saXN0W29iai5pZF0gPSBkZWY7XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIEB0b2RvOiByZWRvIHRoaXNcbiAqXG4gKiBDb252ZXJ0cyBhIHJlZmVyZW5jZSB0byBhIERPTSBldmVudCB0byBhIHByb21pc2UuXG4gKiBSZXNvbHZlZCBvbiBmaXJzdCBldmVudCB0cmlnZ2VyLlxuICpcbiAqIEB0b2RvIHJlbW92ZSBqcXVlcnkgZGVwZW5kZW5jeVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuICovXG5fcHJpdmF0ZS53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciBkZWYgPSBfcHVibGljLmRlZmVycmVkKHtcbiAgICAgICAgaWQgOiBvYmouaWRcbiAgICB9KTtcblxuXG4gICAgaWYodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cbiAgICAgICAgaWYodHlwZW9mICQgIT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgdmFyIG1zZyA9ICd3aW5kb3cgYW5kIGRvY3VtZW50IGJhc2VkIGV2ZW50cyBkZXBlbmQgb24galF1ZXJ5JztcbiAgICAgICAgICAgIGRlZi5yZWplY3QobXNnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuICAgICAgICAgICAgICAgIGNhc2Uob2JqLmlkID09PSAncmVhZHknIHx8IG9iai5pZCA9PT0gJ0RPTUNvbnRlbnRMb2FkZWQnKTpcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZShvYmouaWQgPT09ICdsb2FkJyk6XG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKG9iai5pZCxcImJvZHlcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuX3ByaXZhdGUud3JhcF90aW1lciA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgcHJvbSA9IF9wdWJsaWMuZGVmZXJyZWQob2JqKTtcblxuICAgIChmdW5jdGlvbihwcm9tKXtcblxuICAgICAgICB2YXIgX3N0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBfZW5kID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICBwcm9tLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN0YXJ0IDogX3N0YXJ0XG4gICAgICAgICAgICAgICAgLGVuZCA6IF9lbmRcbiAgICAgICAgICAgICAgICAsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcbiAgICAgICAgICAgICAgICAsdGltZW91dCA6IG9iai50aW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxvYmoudGltZW91dCk7XG5cbiAgICB9KHByb20pKTtcblxuICAgIHJldHVybiBwcm9tO1xufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVwXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3ByaXZhdGUud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgICBpZighZGVwW3JlcXVpcmVkW2ldXSl7XG4gICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgICBcIkZpbGUgcmVxdWVzdHMgY29udmVydGVkIHRvIHByb21pc2VzIHJlcXVpcmU6IFwiICsgcmVxdWlyZWRbaV1cbiAgICAgICAgICAgICAgICAsXCJNYWtlIHN1cmUgeW91IHdlcmVuJ3QgZXhwZWN0aW5nIGRlcGVuZGVuY3kgdG8gYWxyZWFkeSBoYXZlIGJlZW4gcmVzb2x2ZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAgICAgICAsZGVwXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vSUYgUFJPTUlTRSBGT1IgVEhJUyBVUkwgQUxSRUFEWSBFWElTVFMsIFJFVFVSTiBJVFxuICAgIGlmKENvbmZpZy5saXN0W2RlcC5pZF0pe1xuICAgICAgcmV0dXJuIENvbmZpZy5saXN0W2RlcC5pZF07XG4gICAgfVxuXG4gICAgLy9DT05WRVJUIFRPIERFRkVSUkVEOlxuICAgIHZhciBkZWYgPSBfcHVibGljLmRlZmVycmVkKGRlcCk7XG5cbiAgICBpZih0eXBlb2YgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdW2RlcC50eXBlXShkZXAudXJsLGRlZixkZXApO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgRmlsZV9sb2FkZXJbQ29uZmlnLnNldHRpbmdzLm1vZGVdWydkZWZhdWx0J10oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwiLyoqXG4gKiBEZWZhdWx0IHByb3BlcnRpZXMgZm9yIGFsbCBkZWZlcnJlZCBvYmplY3RzLlxuICpcbiAqL1xudmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgdHBsID0ge307XG5cbnRwbC5pc19vcmd5ID0gdHJ1ZTtcblxudHBsLmlkID0gbnVsbDtcblxuLy9BIENPVU5URVIgRk9SIEFVVDAtR0VORVJBVEVEIFBST01JU0UgSUQnU1xudHBsLnNldHRsZWQgPSAwO1xuXG4vKipcbiAqIFNUQVRFIENPREVTOlxuICogLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAtMSAgID0+IFNFVFRMSU5HIFtFWEVDVVRJTkcgQ0FMTEJBQ0tTXVxuICogIDAgICA9PiBQRU5ESU5HXG4gKiAgMSAgID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG4gKiAgMiAgID0+IFJFSkVDVEVEXG4gKi9cbnRwbC5zdGF0ZSA9IDA7XG5cbnRwbC52YWx1ZSA9IFtdO1xuXG4vL1RoZSBtb3N0IHJlY2VudCB2YWx1ZSBnZW5lcmF0ZWQgYnkgdGhlIHRoZW4tPmRvbmUgY2hhaW4uXG50cGwuY2Fib29zZSA9IG51bGw7XG5cbnRwbC5tb2RlbCA9IFwiZGVmZXJyZWRcIjtcblxudHBsLmRvbmVfZmlyZWQgPSAwO1xuXG50cGwudGltZW91dF9pZCA9IG51bGw7XG5cbnRwbC5jYWxsYmFja19zdGF0ZXMgPSB7XG4gIHJlc29sdmUgOiAwXG4gICx0aGVuIDogMFxuICAsZG9uZSA6IDBcbiAgLHJlamVjdCA6IDBcbn07XG5cbi8qKlxuICogU2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBjYWxsYmFjayBldmVudFxuICogbGlzdC5cbiAqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIHByb3BlcnR5TmFtZXMgYXNcbiAqIHRwbC5jYWxsYmFja19zdGF0ZXM6IGFkZGluZyBib2lsZXJwbGF0ZVxuICogcHJvcGVydGllcyBmb3IgZWFjaFxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbnRwbC5jYWxsYmFja3MgPSAoZnVuY3Rpb24oKXtcblxuICB2YXIgbyA9IHt9O1xuXG4gIGZvcih2YXIgaSBpbiB0cGwuY2FsbGJhY2tfc3RhdGVzKXtcbiAgICBvW2ldID0ge1xuICAgICAgdHJhaW4gOiBbXVxuICAgICAgLGhvb2tzIDoge1xuICAgICAgICBvbkJlZm9yZSA6IHtcbiAgICAgICAgICB0cmFpbiA6IFtdXG4gICAgICAgIH1cbiAgICAgICAgLG9uQ29tcGxldGUgOiB7XG4gICAgICAgICAgdHJhaW4gOiBbXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBvO1xufSkoKTtcblxuLy9QUk9NSVNFIEhBUyBPQlNFUlZFUlMgQlVUIERPRVMgTk9UIE9CU0VSVkUgT1RIRVJTXG50cGwuZG93bnN0cmVhbSA9IHt9O1xuXG50cGwuZXhlY3V0aW9uX2hpc3RvcnkgPSBbXTtcblxuLy9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cbnRwbC5vdmVyd3JpdGFibGUgPSAwO1xuXG5cbi8qKlxuICogRGVmYXVsdCB0aW1lb3V0IGZvciBhIGRlZmVycmVkXG4gKiBAdHlwZSBudW1iZXJcbiAqL1xudHBsLnRpbWVvdXQgPSBDb25maWcuc2V0dGluZ3MudGltZW91dDtcblxuLyoqXG4gKiBSRU1PVEVcbiAqXG4gKiBSRU1PVEUgPT0gMSAgPT4gIFtERUZBVUxUXSBNYWtlIGh0dHAgcmVxdWVzdCBmb3IgZmlsZVxuICpcbiAqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cbiAqXG4gKiBPTkxZIEFQUExJRVMgVE8gU0NSSVBUUyBSVU4gVU5ERVIgTk9ERSBBUyBCUk9XU0VSIEhBUyBOT1xuICogRklMRVNZU1RFTSBBQ0NFU1NcbiAqL1xudHBsLnJlbW90ZSA9IDE7XG5cbi8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxudHBsLmxpc3QgPSAxO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGRlZmVycmVkLlxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbHVlXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xudHBsLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cbiAgaWYodGhpcy5zZXR0bGVkID09PSAxKXtcbiAgICBDb25maWcuZGVidWcoW1xuICAgICAgdGhpcy5pZCArIFwiIGNhbid0IHJlc29sdmUuXCJcbiAgICAgICxcIk9ubHkgdW5zZXR0bGVkIGRlZmVycmVkcyBhcmUgcmVzb2x2YWJsZS5cIlxuICAgIF0pO1xuICB9XG5cbiAgLy9TRVQgU1RBVEUgVE8gU0VUVExFTUVOVCBJTiBQUk9HUkVTU1xuICB0aGlzLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuICAvL1NFVCBWQUxVRVxuICB0aGlzLnZhbHVlID0gdmFsdWU7XG5cbiAgLy9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcbiAgLy9FVkVOIElGIFRIRVJFIElTIE5PIFJFU09MVkVSLCBTRVQgSVQgVE8gRklSRUQgV0hFTiBDQUxMRURcbiAgaWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG4gICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cbiAgICAvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG4gICAgdHJ5e1xuICAgICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVzb2x2ZXIodmFsdWUsdGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY2F0Y2goZSl7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG4gIH1cbiAgZWxzZXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cbiAgICAvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3NcbiAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuICAgICAgc2V0dGxlKHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgLy9SdW4gcmVzb2x2ZVxuICB0aGlzLnJ1bl90cmFpbihcbiAgICB0aGlzXG4gICAgLHRoaXMuY2FsbGJhY2tzLnJlc29sdmVcbiAgICAsdGhpcy52YWx1ZVxuICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgKTtcblxuICAvL3Jlc29sdmVyIGlzIGV4cGVjdGVkIHRvIGNhbGwgcmVzb2x2ZSBhZ2FpblxuICAvL2FuZCB0aGF0IHdpbGwgZ2V0IHVzIHBhc3QgdGhpcyBwb2ludFxuICByZXR1cm4gdGhpcztcbn07XG5cblxudHBsLnJlamVjdCA9IGZ1bmN0aW9uKGVycil7XG5cbiAgaWYoIShlcnIgaW5zdGFuY2VvZiBBcnJheSkpe1xuICAgIGVyciA9IFtlcnJdO1xuICB9XG5cbiAgdmFyIG1zZyA9IFwiUmVqZWN0ZWQgXCIrdGhpcy5tb2RlbCtcIjogJ1wiK3RoaXMuaWQrXCInLlwiXG5cbiAgaWYoQ29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuICAgIGVyci51bnNoaWZ0KG1zZyk7XG4gICAgQ29uZmlnLmRlYnVnKGVycix0aGlzKTtcbiAgfVxuICBlbHNle1xuICAgIG1zZyA9IG1zZyArIFwiXFxuIFR1cm4gZGVidWcgbW9kZSBvbiBmb3IgbW9yZSBpbmZvLlwiO1xuICAgIGNvbnNvbGUubG9nKG1zZyk7XG4gIH1cblxuICAvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcbiAgaWYodGhpcy50aW1lb3V0X2lkKXtcbiAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgfVxuXG4gIC8vU2V0IHN0YXRlIHRvIHJlamVjdGVkXG4gIHRoaXMuc2V0X3N0YXRlKHRoaXMsMik7XG5cbiAgLy9FeGVjdXRlIHJlamVjdGlvbiBxdWV1ZVxuICB0aGlzLnJ1bl90cmFpbihcbiAgICB0aGlzXG4gICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICxlcnJcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbnRwbC50aGVuID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG4gIHN3aXRjaCh0cnVlKXtcblxuICAgIC8vQW4gZXJyb3Igd2FzIHByZXZpb3VzbHkgdGhyb3duLCBiYWlsIG91dFxuICAgIGNhc2UodGhpcy5zdGF0ZSA9PT0gMik6XG4gICAgICBicmVhaztcblxuICAgIC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuICAgIGNhc2UodGhpcy5kb25lX2ZpcmVkID09PSAxKTpcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG4gICAgZGVmYXVsdDpcblxuICAgICAgLy9QdXNoIGNhbGxiYWNrIHRvIHRoZW4gcXVldWVcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cbiAgICAgIC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcbiAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuICAgICAgICB0aGlzLnJ1bl90cmFpbihcbiAgICAgICAgICB0aGlzXG4gICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnRoZW5cbiAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICBlbHNle31cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG50cGwuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICBpZih0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLmxlbmd0aCA9PT0gMFxuICAgICAmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuICAgICAgaWYodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKXtcblxuICAgICAgICAvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG4gICAgICAgIHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG4gICAgICAgICAgLy9Eb25lIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLCBzbyBub3RlIHRoYXQgaXQgaGFzIGJlZW5cbiAgICAgICAgICBkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuICAgICAgICAgIGZuKHIsZGVmZXJyZWQsbGFzdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cbiAgICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcbiAgICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgICAgICAgIGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuICAgICAgICAgICAgdGhpcy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcbiAgICAgICAgZWxzZXt9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiZG9uZSgpIG11c3QgYmUgcGFzc2VkIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBDb25maWcuZGVidWcoXCJkb25lKCkgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UuXCIpO1xuICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gdHBsO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5cbnZhciBIdHRwID0gcmVxdWlyZSgnaHR0cCcpO1xudmFyIFZtID0gcmVxdWlyZSgndm0nKTtcbnZhciBfcHVibGljID0ge31cbiAgICBfcHJpdmF0ZSA9IHt9O1xuXG5fcHVibGljLmJyb3dzZXIgPSB7fSxcbl9wdWJsaWMubmF0aXZlID0ge30sXG5cbi8vQnJvd3NlciBsb2FkXG5cbl9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuICB2YXIgaGVhZCA9ICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG4gIGlmKGVsZW0ub25sb2FkKXtcbiAgICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG4gICAgICAgfTtcblxuICAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChcIkZhaWxlZCB0byBsb2FkIHBhdGg6IFwiICsgcGF0aCk7XG4gICAgICAgfTtcblxuICAgIH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuICB9XG4gIGVsc2V7XG4gICAgLy9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG4gICAgaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbiAgfVxufVxuXG5fcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cbiAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICBlbGVtLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgIGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcbiAgICAgICAgaWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICAgICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgfTtcbiAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuICB0aGlzLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIHRoaXMuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuICB2YXIgcixcbiAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuICAoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgIGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgciA9IHJlcS5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgaWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgciA9IEpTT04ucGFyc2Uocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgX3B1YmxpYy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuICAgICAgICAgICAgICAgICxwYXRoXG4gICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgXSxkZWZlcnJlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfShwYXRoLGRlZmVycmVkKSk7XG5cbiAgcmVxLnNlbmQobnVsbCk7XG59XG5cblxuXG4vL05hdGl2ZSBsb2FkXG5cbl9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLmJyb3dzZXIuY3NzKHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgLy9sb2NhbCBwYWNrYWdlXG4gIGlmKHBhdGhbMF09PT0nLicpe1xuICAgIHZhciByID0gcmVxdWlyZShwYXRoKTtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICB9XG4gIC8vcmVtb3RlIHNjcmlwdFxuICBlbHNle1xuXG4gICAgLy9DaGVjayB0aGF0IHdlIGhhdmUgY29uZmlndXJlZCB0aGUgZW52aXJvbm1lbnQgdG8gYWxsb3cgdGhpcyxcbiAgICAvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuICAgIGlmKCFDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7X1xuICAgICAgQ29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIik7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHIgPSBWbS5ydW5JblRoaXNDb250ZXh0KGRhdGEpO1xuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbl9wdWJsaWMubmF0aXZlLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgX3B1YmxpYy5uYXRpdmUuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5uYXRpdmUuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG4gICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgfSlcbn1cblxuX3ByaXZhdGUubmF0aXZlLmdldCA9IGZ1bmN0aW9uIChwYXRoLGRlZmVycmVkLGNhbGxiYWNrKXtcbiAgaWYocGF0aFswXSA9PT0gJy4nKXtcbiAgICAvL2ZpbGUgc3lzdGVtXG4gICAgLy92YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuICAgIEZzLnJlYWRGaWxlKHBhdGgsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIGNhbGxiYWNrKGRhdGEpO1xuICAgIH0pO1xuICB9XG4gIGVsc2V7XG4gICAgLy9odHRwXG4gICAgLy92YXIgSHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbiAgICBIdHRwLmdldCh7IHBhdGggOiBwYXRofSwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgdmFyIGRhdGEgPSAnJztcbiAgICAgIHJlcy5vbignZGF0YScsIGZ1bmN0aW9uIChidWYpIHtcbiAgICAgICAgICBkYXRhICs9IGJ1ZjtcbiAgICAgIH0pO1xuICAgICAgcmVzLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKSxcbiAgICBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKSxcbiAgICBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKSxcbiAgICBDYXN0ID0gcmVxdWlyZSgnLi9jYXN0LmpzJyk7XG5cbnZhciBfcHVibGljID0ge307XG52YXIgX3ByaXZhdGUgPSB7fTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgcHJvbWlzZSBmcm9tIGEgdmFsdWUgYW5kIGFuIGlkIGFuZCBhdXRvbWF0aWNhbGx5XG4qIHJlc29sdmVzIGl0LlxuKlxuKiBAcGFyYW0ge3N0cmluZ30gaWRcbiogQHBhcmFtIHttaXhlZH0gZGF0YVxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBwcm9taXNlXG4qL1xuX3B1YmxpYy5kZWZpbmUgPSBmdW5jdGlvbihpZCxkYXRhLG9wdGlvbnMpe1xuXG4gICAgdmFyIGRlZjtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmRlcGVuZGVuY2llcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzIHx8IG51bGw7XG4gICAgb3B0aW9ucy5yZXNvbHZlciA9IG9wdGlvbnMucmVzb2x2ZXIgfHwgbnVsbDtcblxuICAgIC8vdGVzdCBmb3IgYSB2YWxpZCBpZFxuICAgIGlmKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpe1xuICAgICAgQ29uZmlnLmRlYnVnKFwiTXVzdCBzZXQgaWQgd2hlbiBkZWZpbmluZyBhbiBpbnN0YW5jZS5cIik7XG4gICAgfVxuXG4gICAgLy9DaGVjayBubyBleGlzdGluZyBpbnN0YW5jZSBkZWZpbmVkIHdpdGggc2FtZSBpZFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0uc2V0dGxlZCA9PT0gMSl7XG4gICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2FuJ3QgZGVmaW5lIFwiICsgaWQgKyBcIi4gQWxyZWFkeSByZXNvbHZlZC5cIik7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5pZCA9IGlkO1xuXG4gICAgLy9TZXQgYmFja3RyYWNlIGluZm8sIGhlcmUgLSBzbyBvcmlnaW4gcG9pbnRzIHRvIGNhbGxlZVxuICAgIG9wdGlvbnMuYmFja3RyYWNlID0gdGhpcy5nZXRfYmFja3RyYWNlX2luZm8oJ2RlZmluZScpO1xuXG4gICAgaWYob3B0aW9ucy5kZXBlbmRlbmNpZXMgIT09IG51bGxcbiAgICAgICYmIG9wdGlvbnMuZGVwZW5kZW5jaWVzIGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgLy9EZWZpbmUgYXMgYSBxdWV1ZSAtIGNhbid0IGF1dG9yZXNvbHZlIGJlY2F1c2Ugd2UgaGF2ZSBkZXBzXG4gICAgICB2YXIgZGVwcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuICAgICAgZGVsZXRlIG9wdGlvbnMuZGVwZW5kZW5jaWVzO1xuICAgICAgZGVmID0gUXVldWUoZGVwcyxvcHRpb25zKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIC8vRGVmaW5lIGFzIGEgZGVmZXJyZWRcbiAgICAgIGRlZiA9IERlZmVycmVkKG9wdGlvbnMpO1xuXG4gICAgICAvL1RyeSB0byBpbW1lZGlhdGVseSBzZXR0bGUgW2RlZmluZV1cbiAgICAgIGlmKG9wdGlvbnMucmVzb2x2ZXIgPT09IG51bGxcbiAgICAgICAgJiYgKHR5cGVvZiBvcHRpb25zLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICAgICAgfHwgb3B0aW9ucy5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSkpe1xuICAgICAgICAvL3ByZXZlbnQgZnV0dXJlIGF1dG9yZXNvdmUgYXR0ZW1wdHMgW2kuZS4gZnJvbSB4aHIgcmVzcG9uc2VdXG4gICAgICAgIGRlZi5hdXRvcmVzb2x2ZSA9IGZhbHNlO1xuICAgICAgICBkZWYucmVzb2x2ZShkYXRhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG5fcHVibGljLmRlZmluZV9tb2R1bGUgPSBmdW5jdGlvbihvYmope1xuXG4gIHZhciBvcHRpb25zID0ge307XG4gIHZhciBpZCA9IG9iai5xLl9faWQ7XG5cbiAgaWYodHlwZW9mIE9yZ3kubGlzdFtpZF0gPT09ICd1bmRlZmluZWQnIHx8IE9yZ3kubGlzdFtpZF0uc3RhdGUgPT09IDApe1xuICAgIGlmKG9iai5xLl9fZGVwZW5kZW5jaWVzKXtcbiAgICAgIG9wdGlvbnMuZGVwZW5kZW5jaWVzID0gb2JqLnEuX19kZXBlbmRlbmNpZXM7XG4gICAgfVxuXG4gICAgaWYob2JqLnEuX19yZXNvbHZlcil7XG4gICAgICBvcHRpb25zLnJlc29sdmVyID0gb2JqLnEuX19yZXNvbHZlci5iaW5kKG9iaik7XG4gICAgfTtcblxuICAgIGlmKF9wcml2YXRlLmNvbmZpZy5tb2RlID09PSAnbmF0aXZlJyl7XG4gICAgICBvcHRpb25zLmN3ZCA9IF9fZGlybmFtZTtcbiAgICAgIHZhciBkZWYgPSB0aGlzLmRlZmluZShpZCxvYmouX3B1YmxpYyxvcHRpb25zKTtcbiAgICAgIHJldHVybiBkZWY7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICB0aGlzLmRlZmluZShpZCxvYmouX3B1YmxpYyxvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cblxuLyoqXG4gKiBHZXR0ZXIuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5fcHVibGljLmdldCA9IGZ1bmN0aW9uKGlkKXtcbiAgaWYoQ29uZmlnLmxpc3RbaWRdKXtcbiAgICByZXR1cm4gQ29uZmlnLmxpc3RbaWRdO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG4gICAgICBcIk5vIGluc3RhbmNlIGV4aXN0czogXCIraWRcbiAgICBdKTtcbiAgfVxufTtcblxuXG4vKipcbiAqIEFkZC9yZW1vdmUgYW4gdXBzdHJlYW0gZGVwZW5kZW5jeSB0by9mcm9tIGEgcXVldWUuXG4gKlxuICogQ2FuIHVzZSBhIHF1ZXVlIGlkLCBldmVuIGZvciBhIHF1ZXVlIHRoYXQgaXMgeWV0IHRvIGJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRndCB8IHF1ZXVlIC8gcXVldWUgaWRcbiAqIEBwYXJhbSB7YXJyYXl9ICBhcnIgfCBsaXN0L3Byb21pc2UgaWRzLGRlcGVuZGVuY2llc1xuICogQHBhcmFtIHtib29sZWFufSBhZGQgfCBhZGQgaWYgdHJ1ZSwgcmVtb3ZlIGlmIGZhbHNlXG4gKlxuICogQHJldHVybiB7YXJyYXl9IHF1ZXVlIG9mIGxpc3RcbiAqL1xuX3B1YmxpYy5hc3NpZ24gPSBmdW5jdGlvbih0Z3QsYXJyLGFkZCl7XG5cbiAgICBhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMTtcblxuICAgIHZhciBpZCxxO1xuICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGd0LnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgaWQgPSB0Z3QuaWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICBpZCA9IHRndDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKTtcbiAgICB9XG5cbiAgICAvL0lGIFRBUkdFVCBBTFJFQURZIExJU1RFRFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0ubW9kZWwgPT09ICdxdWV1ZScpe1xuICAgICAgICBxID0gQ29uZmlnLmxpc3RbaWRdO1xuXG4gICAgICAgIC8vPT4gQUREIFRPIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgaWYoYWRkKXtcbiAgICAgICAgICAgIHEuYWRkKGFycik7XG4gICAgICAgIH1cbiAgICAgICAgLy89PiBSRU1PVkUgRlJPTSBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBxLnJlbW92ZShhcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBBTkQgQUREIERFUEVOREVOQ0lFU1xuICAgIGVsc2UgaWYoYWRkKXtcblxuICAgICAgICBxID0gUXVldWUoYXJyLHtcbiAgICAgICAgICAgIGlkIDogaWRcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vRVJST1I6IENBTidUIFJFTU9WRSBGUk9NIEEgUVVFVUUgVEhBVCBET0VTIE5PVCBFWElTVFxuICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGRlcGVuZGVuY2llcyBmcm9tIGEgcXVldWUgdGhhdCBkb2VzIG5vdCBleGlzdC5cIix0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcTtcbn07XG5cblxuX3B1YmxpYy5kZWZlcnJlZCA9IERlZmVycmVkLmRlZmVycmVkO1xuX3B1YmxpYy5xdWV1ZSA9IFF1ZXVlLnF1ZXVlO1xuX3B1YmxpYy5jYXN0ID0gQ2FzdC5jYXN0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpLFxuICAgIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyksXG4gICAgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4qIFRlbXBsYXRlIG9iamVjdCBmb3IgYWxsIHF1ZXVlc1xuKlxuKiBAdHlwZSBvYmplY3RcbiovXG5fcHJpdmF0ZS50cGwgPSB7XG5cbiAgIG1vZGVsIDogJ3F1ZXVlJ1xuXG5cbiAgIC8vU0VUIFRSVUUgQUZURVIgUkVTT0xWRVIgRklSRURcbiAgICxyZXNvbHZlcl9maXJlZCA6IDBcblxuXG4gICAvL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuICAgLy9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG4gICAvL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcbiAgICxoYWx0X3Jlc29sdXRpb24gOiAwXG5cblxuICAgLy9VU0VEIFRPIENIRUNLIFNUQVRFLCBFTlNVUkVTIE9ORSBDT1BZXG4gICAsdXBzdHJlYW0gOiB7fVxuXG5cbiAgIC8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG4gICAsZGVwZW5kZW5jaWVzIDogW11cblxuXG4gICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgIC8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG4gICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4gICAvKipcbiAgICAqIEFkZCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byBhIHF1ZXVlJ3MgdXBzdHJlYW0gYXJyYXkuXG4gICAgKlxuICAgICogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG4gICAgKiB1cHN0cmVhbSBhcnJheSBhcmUgcmVzb2x2ZWQuXG4gICAgKlxuICAgICogV2hlbiBfcHVibGljLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcbiAgICAqIGRlcGVuZGVuY3kgaXMgbm90IHByZXZpb3VzbHkgc2NoZWR1bGVkIHRvIHJlc29sdmVcbiAgICAqIGRvd25zdHJlYW0gZnJvbSB0aGUgdGFyZ2V0LCBpbiB3aGljaFxuICAgICogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG4gICAgKlxuICAgICogQHBhcmFtIHthcnJheX0gYXJyICAvYXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRvIGFkZFxuICAgICogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuICAgICovXG4gICAsYWRkIDogZnVuY3Rpb24oYXJyKXtcblxuICAgICAgIHRyeXtcbiAgICAgICAgICAgaWYoYXJyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXMudXBzdHJlYW07XG4gICAgICAgfVxuICAgICAgIGNhdGNoKGVycil7XG4gICAgICAgICAgIENvbmZpZy5kZWJ1ZyhlcnIpO1xuICAgICAgIH1cblxuICAgICAgIC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBUTyBBRERcbiAgICAgICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgIFwiQ2Fubm90IGFkZCBkZXBlbmRlbmN5IGxpc3QgdG8gcXVldWUgaWQ6J1wiK3RoaXMuaWRcbiAgICAgICAgICAgICtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIlxuICAgICAgICAgIF0sYXJyLHRoaXMpO1xuICAgICAgIH1cblxuICAgICAgIGZvcih2YXIgYSBpbiBhcnIpe1xuXG4gICAgICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAgICAgLy9DSEVDSyBJRiBFWElTVFNcbiAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIENvbmZpZy5saXN0W2FyclthXVsnaWQnXV0gPT09ICdvYmplY3QnKTpcbiAgICAgICAgICAgICAgICAgICBhcnJbYV0gPSBDb25maWcubGlzdFthcnJbYV1bJ2lkJ11dO1xuICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAvL0lGIE5PVCwgQVRURU1QVCBUTyBDT05WRVJUIElUIFRPIEFOIE9SR1kgUFJPTUlTRVxuICAgICAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdID09PSAnb2JqZWN0JyAmJiAoIWFyclthXS5pc19vcmd5KSk6XG4gICAgICAgICAgICAgICAgICAgYXJyW2FdID0gRGVmZXJyZWQuY29udmVydF90b19wcm9taXNlKGFyclthXSx7XG4gICAgICAgICAgICAgICAgICAgICBwYXJlbnQgOiB0aGlzXG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgIC8vUkVGIElTIEEgUFJPTUlTRS5cbiAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiT2JqZWN0IGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQgdG8gcHJvbWlzZS5cIik7XG4gICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihhcnJbYV0pO1xuICAgICAgICAgICAgICAgICAgIGRlYnVnZ2VyO1xuICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICB9XG5cbiAgICAgICAgICAgLy9tdXN0IGNoZWNrIHRoZSB0YXJnZXQgdG8gc2VlIGlmIHRoZSBkZXBlbmRlbmN5IGV4aXN0cyBpbiBpdHMgZG93bnN0cmVhbVxuICAgICAgICAgICBmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKXtcbiAgICAgICAgICAgICAgIGlmKGIgPT09IGFyclthXS5pZCl7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFtcbiAgICAgICAgICAgICAgICAgICAgXCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcbiAgICAgICAgICAgICAgICAgICAgK2FyclthXS5pZCtcIicgdG8gcXVldWVcIitcIiAnXCJcbiAgICAgICAgICAgICAgICAgICAgK3RoaXMuaWQrXCInLlxcbiBQcm9taXNlIG9iamVjdCBmb3IgJ1wiXG4gICAgICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcbiAgICAgICAgICAgICAgICAgICAgK3RoaXMuaWQrXCInIHNvIGl0IGNhbid0IGJlIGFkZGVkIHVwc3RyZWFtLlwiXG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAsdGhpcyk7XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cblxuICAgICAgICAgICAvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG4gICAgICAgICAgIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSA9IGFyclthXTtcbiAgICAgICAgICAgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuICAgICAgICAgICB0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG4gICAgICAgfVxuXG4gICAgICAgcmV0dXJuIHRoaXMudXBzdHJlYW07XG4gICB9XG5cblxuICAgLyoqXG4gICAgKiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG4gICAgKlxuICAgICogQHBhcmFtIHthcnJheX0gYXJyXG4gICAgKiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG4gICAgKi9cbiAgICxyZW1vdmUgOiBmdW5jdGlvbihhcnIpe1xuXG4gICAgICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuICAgICAgaWYodGhpcy5zdGF0ZSAhPT0gMCl7XG4gICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgbGlzdCBmcm9tIHF1ZXVlIGlkOidcIit0aGlzLmlkK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiKTtcbiAgICAgIH1cblxuICAgICAgZm9yKHZhciBhIGluIGFycil7XG4gICAgICAgICBpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcbiAgICAgICAgICAgIGRlbGV0ZSBhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXTtcbiAgICAgICAgIH1cbiAgICAgIH1cbiAgIH1cblxuXG4gIC8qKlxuICAgKiBSZXNldHMgYW4gZXhpc3Rpbmcsc2V0dGxlZCBxdWV1ZSBiYWNrIHRvIE9yZ3lpbmcgc3RhdGUuXG4gICAqIENsZWFycyBvdXQgdGhlIGRvd25zdHJlYW0uXG4gICAqIEZhaWxzIGlmIG5vdCBzZXR0bGVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJucyB7X3ByaXZhdGUudHBsfEJvb2xlYW59XG4gICAqL1xuICAgLHJlc2V0IDogZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgICAgIGlmKHRoaXMuc2V0dGxlZCAhPT0gMSB8fCB0aGlzLnN0YXRlICE9PSAxKXtcbiAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkNhbiBvbmx5IHJlc2V0IGEgcXVldWUgc2V0dGxlZCB3aXRob3V0IGVycm9ycy5cIik7XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICB0aGlzLnNldHRsZWQgPSAwO1xuICAgICAgdGhpcy5zdGF0ZSA9IDA7XG4gICAgICB0aGlzLnJlc29sdmVyX2ZpcmVkID0gMDtcbiAgICAgIHRoaXMuZG9uZV9maXJlZCA9IDA7XG5cbiAgICAgIC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuICAgICAgaWYodGhpcy50aW1lb3V0X2lkKXtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gICAgICB9XG5cbiAgICAgIC8vQ0xFQVIgT1VUIFRIRSBET1dOU1RSRUFNXG4gICAgICB0aGlzLmRvd25zdHJlYW0gPSB7fTtcbiAgICAgIHRoaXMuZGVwZW5kZW5jaWVzID0gW107XG5cbiAgICAgIC8vU0VUIE5FVyBBVVRPIFRJTUVPVVRcbiAgICAgIERlZmVycmVkLmF1dG9fdGltZW91dC5jYWxsKHRoaXMsb3B0aW9ucy50aW1lb3V0KTtcblxuICAgICAgLy9QT0lOVExFU1MgLSBXSUxMIEpVU1QgSU1NRURJQVRFTFkgUkVTT0xWRSBTRUxGXG4gICAgICAvL3RoaXMuY2hlY2tfc2VsZigpXG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgfVxuXG5cbiAgIC8qKlxuICAgICogQ2F1YWVzIGEgcXVldWUgdG8gbG9vayBvdmVyIGl0cyBkZXBlbmRlbmNpZXMgYW5kIHNlZSBpZiBpdFxuICAgICogY2FuIGJlIHJlc29sdmVkLlxuICAgICpcbiAgICAqIFRoaXMgaXMgZG9uZSBhdXRvbWF0aWNhbGx5IGJ5IGVhY2ggZGVwZW5kZW5jeSB0aGF0IGxvYWRzLFxuICAgICogc28gaXMgbm90IG5lZWRlZCB1bmxlc3M6XG4gICAgKlxuICAgICogLWRlYnVnZ2luZ1xuICAgICpcbiAgICAqIC10aGUgcXVldWUgaGFzIGJlZW4gcmVzZXQgYW5kIG5vIG5ld1xuICAgICogZGVwZW5kZW5jaWVzIHdlcmUgc2luY2UgYWRkZWQuXG4gICAgKlxuICAgICogQHJldHVybnMge2ludH0gU3RhdGUgb2YgdGhlIHF1ZXVlLlxuICAgICovXG4gICAsY2hlY2tfc2VsZiA6IGZ1bmN0aW9uKCl7XG4gICAgICBfcHVibGljLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZTtcbiAgIH1cbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7YXJyYXl9IGRlcHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgICAgICB7c3RyaW5nfSAgaWQgIC9PcHRpb25hbC4gVXNlIHRoZSBpZCB3aXRoIE9yZ3kuZ2V0KGlkKS4gRGVmYXVsdHMgdG8gbGluZSBudW1iZXIgb2YgaW5zdGFudGlhdGlvbiwgcGx1cyBhbiBpdGVyYXRvci5cbiAqICAgICAgICAgIHtjYWxsYmFjayhyZXN1bHQsZGVmZXJyZWQpfSByZXNvbHZlciAvQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuIEFyZzEgaXMgYW4gYXJyYXkgb2YgdGhlIGRlcGVuZGVuY2llcycgcmVzb2x2ZWQgdmFsdWVzLiBBcmcyIGlzIHRoZSBkZWZlcnJlZCBvYmplY3QuIFRoZSBxdWV1ZSB3aWxsIG9ubHkgcmVzb2x2ZSB3aGVuIEFyZzIucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnLnRpbWVvdXQuXG4gKiAgICAgICAgICB7bnVtYmVyfSB0aW1lb3V0IC90aW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQuIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uIE5vdGUgdGhlIHRpbWVvdXQgaXMgb25seSBhZmZlY3RlZCBieSBkZXBlbmRlbmNpZXMgYW5kL29yIHRoZSByZXNvbHZlciBjYWxsYmFjay4gVGhlbixkb25lIGRlbGF5cyB3aWxsIG5vdCBmbGFnIGEgdGltZW91dCBiZWNhdXNlIHRoZXkgYXJlIGNhbGxlZCBhZnRlciB0aGUgaW5zdGFuY2UgaXMgY29uc2lkZXJlZCByZXNvbHZlZC5cbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5fcHVibGljLnF1ZXVlID0gZnVuY3Rpb24oZGVwcyxvcHRpb25zKXtcblxuICB2YXIgX287XG4gIGlmKCEoZGVwcyBpbnN0YW5jZW9mIEFycmF5KSl7XG4gICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuICBpZighQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXG4gICAgLy9DUkVBVEUgTkVXIFFVRVVFIE9CSkVDVFxuICAgIHZhciBfbyA9IF9wcml2YXRlLmZhY3Rvcnkob3B0aW9ucyk7XG5cbiAgICAvL0FDVElWQVRFIFFVRVVFXG4gICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyxvcHRpb25zLGRlcHMpO1xuXG4gIH1cbiAgLy9BTFJFQURZIEVYSVNUU1xuICBlbHNlIHtcblxuICAgIF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cbiAgICBpZihfby5tb2RlbCAhPT0gJ3F1ZXVlJyl7XG4gICAgLy9NQVRDSCBGT1VORCBCVVQgTk9UIEEgUVVFVUUsIFVQR1JBREUgVE8gT05FXG5cbiAgICAgIG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMTtcblxuICAgICAgX28gPSBfcHJpdmF0ZS51cGdyYWRlKF9vLG9wdGlvbnMsZGVwcyk7XG4gICAgfVxuICAgIGVsc2V7XG5cbiAgICAgIC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG4gICAgICBmb3IodmFyIGkgaW4gb3B0aW9ucyl7XG4gICAgICAgIF9vW2ldID0gb3B0aW9uc1tpXTtcbiAgICAgIH1cblxuICAgICAgLy9BREQgQURESVRJT05BTCBERVBFTkRFTkNJRVMgSUYgTk9UIFJFU09MVkVEXG4gICAgICBpZihkZXBzLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHJpdmF0ZS50cGwuYWRkLmNhbGwoX28sZGVwcyk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICAvL1JFU1VNRSBSRVNPTFVUSU9OIFVOTEVTUyBTUEVDSUZJRUQgT1RIRVJXSVNFXG4gICAgX28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID9cbiAgICBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDA7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuXG5cblxuLyoqXG4qIEEgXCJzaWduYWxcIiBoZXJlIGNhdXNlcyBhIHF1ZXVlIHRvIGxvb2sgdGhyb3VnaCBlYWNoIGl0ZW1cbiogaW4gaXRzIHVwc3RyZWFtIGFuZCBjaGVjayB0byBzZWUgaWYgYWxsIGFyZSByZXNvbHZlZC5cbipcbiogU2lnbmFscyBjYW4gb25seSBiZSByZWNlaXZlZCBieSBhIHF1ZXVlIGl0c2VsZiBvciBhbiBpbnN0YW5jZVxuKiBpbiBpdHMgdXBzdHJlYW0uXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcbiogQHBhcmFtIHtzdHJpbmd9IGZyb21faWRcbiogQHJldHVybnMge3ZvaWR9XG4qL1xuX3B1YmxpYy5yZWNlaXZlX3NpZ25hbCA9IGZ1bmN0aW9uKHRhcmdldCxmcm9tX2lkKXtcblxuICAgIGlmKHRhcmdldC5oYWx0X3Jlc29sdXRpb24gPT09IDEpIHJldHVybjtcblxuICAgLy9NQUtFIFNVUkUgVEhFIFNJR05BTCBXQVMgRlJPTSBBIFBST01JU0UgQkVJTkcgTElTVEVORUQgVE9cbiAgIC8vQlVUIEFMTE9XIFNFTEYgU1RBVFVTIENIRUNLXG4gICBpZihmcm9tX2lkICE9PSB0YXJnZXQuaWQgJiYgIXRhcmdldC51cHN0cmVhbVtmcm9tX2lkXSl7XG4gICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1Zyhmcm9tX2lkICsgXCIgY2FuJ3Qgc2lnbmFsIFwiICsgdGFyZ2V0LmlkICsgXCIgYmVjYXVzZSBub3QgaW4gdXBzdHJlYW0uXCIpO1xuICAgfVxuICAgLy9SVU4gVEhST1VHSCBRVUVVRSBPRiBPQlNFUlZJTkcgUFJPTUlTRVMgVE8gU0VFIElGIEFMTCBET05FXG4gICBlbHNle1xuICAgICAgIHZhciBzdGF0dXMgPSAxO1xuICAgICAgIGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuICAgICAgICAgICAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG4gICAgICAgICAgIGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuICAgICAgICAgICAgICAgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgIH1cbiAgICAgICB9XG4gICB9XG5cbiAgIC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuICAgaWYoc3RhdHVzID09PSAxKXtcblxuICAgICAgICAvL0dFVCBSRVRVUk4gVkFMVUVTIFBFUiBERVBFTkRFTkNJRVMsIFdISUNIIFNBVkVTIE9SREVSIEFORFxuICAgICAgICAvL1JFUE9SVFMgRFVQTElDQVRFU1xuICAgICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZGVwZW5kZW5jaWVzKXtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgRGVmZXJyZWQudHBsLnJlc29sdmUuY2FsbCh0YXJnZXQsdmFsdWVzKTtcbiAgIH1cblxuICAgaWYoc3RhdHVzID09PSAyKXtcbiAgICAgICB2YXIgZXJyID0gW1xuICAgICAgICAgICB0YXJnZXQuaWQrXCIgZGVwZW5kZW5jeSAnXCIrdGFyZ2V0LnVwc3RyZWFtW2ldLmlkICsgXCInIHdhcyByZWplY3RlZC5cIlxuICAgICAgICAgICAsdGFyZ2V0LnVwc3RyZWFtW2ldLmFyZ3VtZW50c1xuICAgICAgIF07XG4gICAgICAgRGVmZXJyZWQudHBsLnJlamVjdC5hcHBseSh0YXJnZXQsZXJyKTtcbiAgIH1cbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3ByaXZhdGUgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuX3ByaXZhdGUuZmFjdG9yeSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gIC8vQ1JFQVRFIEEgTkVXIFFVRVVFIE9CSkVDVFxuICB2YXIgX28gPSBfLmFzc2lnbih7fSxbXG4gICAgRGVmZXJyZWQudHBsXG4gICAgLF9wcml2YXRlLnRwbFxuICAgICxvcHRpb25zXG4gIF0pO1xuXG4gIC8vR2V0IGJhY2t0cmFjZSBpbmZvIGlmIG5vbmUgZm91bmQgW21heSBiZSBzZXQgQCBNYWluLmRlZmluZV1cbiAgaWYoIV9vLmJhY2t0cmFjZSl7XG4gICAgX28uYmFja3RyYWNlID0gQ29uZmlnLmdldF9iYWNrdHJhY2VfaW5mbygncXVldWUnKTtcbiAgfVxuXG4gIC8vaWYgbm8gaWQsIHVzZSBiYWNrdHJhY2Ugb3JpZ2luXG4gIGlmKCFvcHRpb25zLmlkKXtcbiAgICBfby5pZCA9IF9vLmJhY2t0cmFjZS5vcmlnaW4gKyAnLScgKyAoKytDb25maWcuaSk7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuXG5cbi8qKlxuICogQWN0aXZhdGVzIGEgcXVldWUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHthcnJheX0gZGVwc1xuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xuX3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvLG9wdGlvbnMsZGVwcyl7XG5cbiAgICAvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcbiAgICBvID0gRGVmZXJyZWQuYWN0aXZhdGUobyk7XG5cbiAgICAvL0B0b2RvIHJldGhpbmsgdGhpc1xuICAgIC8vVGhpcyB0aW1lb3V0IGdpdmVzIGRlZmluZWQgcHJvbWlzZXMgdGhhdCBhcmUgZGVmaW5lZFxuICAgIC8vZnVydGhlciBkb3duIHRoZSBzYW1lIHNjcmlwdCBhIGNoYW5jZSB0byBkZWZpbmUgdGhlbXNlbHZlc1xuICAgIC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG4gICAgLy9yZW1vdGUgc291cmNlIGhlcmUuXG4gICAgLy9UaGlzIGlzIGltcG9ydGFudCBpbiB0aGUgY2FzZSBvZiBjb21waWxlZCBqcyBmaWxlcyB0aGF0IGNvbnRhaW5cbiAgICAvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuICAgIC8vdGVtcG9yYXJpbHkgY2hhbmdlIHN0YXRlIHRvIHByZXZlbnQgb3V0c2lkZSByZXNvbHV0aW9uXG4gICAgby5zdGF0ZSA9IC0xO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgLy9SZXN0b3JlIHN0YXRlXG4gICAgICBvLnN0YXRlID0gMDtcblxuICAgICAgLy9BREQgREVQRU5ERU5DSUVTIFRPIFFVRVVFXG4gICAgICBfcHJpdmF0ZS50cGwuYWRkLmNhbGwobyxkZXBzKTtcblxuICAgICAgLy9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG4gICAgICBfcHVibGljLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cbiAgICAgIC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG4gICAgICBpZihvLmFzc2lnbil7XG4gICAgICAgICAgZm9yKHZhciBhIGluIG8uYXNzaWduKXtcbiAgICAgICAgICAgICAgX3B1YmxpYy5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9LDEpO1xuXG4gICAgcmV0dXJuIG87XG59O1xuXG5cbi8qKlxuKiBVcGdyYWRlcyBhIHByb21pc2Ugb2JqZWN0IHRvIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiovXG5fcHJpdmF0ZS51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cbiAgICBpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG4gICAgICAgIHJldHVybiBDb25maWcuZGVidWcoJ0NhbiBvbmx5IHVwZ3JhZGUgdW5zZXR0bGVkIHByb21pc2Ugb3IgZGVmZXJyZWQgaW50byBhIHF1ZXVlLicpO1xuICAgIH1cblxuICAgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuICAgIHZhciBfbyA9IF8uYXNzaWduKHt9LFtcbiAgICAgICAgX3ByaXZhdGUudHBsXG4gICAgICAgICxvcHRpb25zXG4gICAgXSk7XG5cbiAgICBmb3IodmFyIGkgaW4gX28pe1xuICAgICAgIG9ialtpXSA9IF9vW2ldO1xuICAgIH1cblxuICAgIC8vZGVsZXRlIF9vO1xuXG4gICAgLy9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG4gICAgb2JqID0gX3ByaXZhdGUuYWN0aXZhdGUob2JqLG9wdGlvbnMsZGVwcyk7XG5cbiAgICAvL1JFVFVSTiBRVUVVRSBPQkpFQ1RcbiAgICByZXR1cm4gb2JqO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIl19
