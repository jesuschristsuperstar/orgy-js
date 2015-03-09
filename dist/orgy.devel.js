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

var Main = require("./main.js"),
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
            return Main.debug("Castable objects require the following properties: " + required[i]);
        }
    }

    var options = {};
    if (obj.id) {
        options.id = obj.id;
    } else if (obj.url) {
        options.id = obj.url;
    } else {
        //Get backtrace info if none found [may be set @ _public.define]
        var backtrace = Main.get_backtrace_info("cast");

        //if no id, use backtrace origin
        if (!options.id) {
            options.id = backtrace.origin + "-" + ++Main[i];
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

},{"./deferred.js":3,"./main.js":6}],3:[function(require,module,exports){
"use strict";

var _ = require("lodash");
debugger;
var Main = require("./main.js");
var Config = Main.config();
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

    if (options.id && Main.list[options.id]) {
        _o = Main.list[options.id];
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
        _o.backtrace = Main.get_backtrace_info("deferred");
    }

    //if no id, use backtrace origin
    if (!options.id) {
        _o.id = _o.backtrace.origin + "-" + ++Main[i];
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
    if (Config.hooks.onSettle) {
        Config.hooks.onSettle(def);
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
    if (Main.list[obj.id] && !Main.list[obj.id].overwritable) {
        Main.debug("Tried to overwrite " + obj.id + " without overwrite permissions.");
        return Main.list[obj.id];
    }

    //SAVE TO MASTER LIST
    Main.list[obj.id] = obj;

    //AUTO TIMEOUT
    _private.auto_timeout.call(obj);

    //Call hook
    if (Config.hooks.onActivate) {
        Config.hooks.onActivate(obj);
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
            Main.debug(["Auto timeout this.timeout cannot be undefined.", this.id]);
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
        if (Config.debug_mode) {
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
                Main.debug(target.id + " tried to settle promise " + "'" + target.downstream[i].id + "' that has already been settled.");
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
                return Main.debug(["Circular condition in recursive search of obj property '" + propName + "' of object " + (typeof obj.id !== "undefined" ? "'" + obj.id + "'" : "") + ". Offending value: " + r1, (function () {
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
            obj.id = "timer-" + obj.timeout + "-" + ++Main[i];
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
    if (Main.list[obj.id] && obj.type !== "timer") {
        //A previous promise of the same id exists.
        //Make sure this dependency object doesn't have a
        //resolver - if it does error
        if (obj.resolver) {
            Main.debug(["You can't set a resolver on a queue that has already been declared. You can only reference the original.", "Detected re-init of '" + obj.id + "'.", "Attempted:", obj, "Existing:", Main.list[obj.id]]);
        } else {
            return Main.list[obj.id];
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
                return Main.debug("Dependency labeled as a promise did not return a promise.", obj);
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
    Main.list[obj.id] = def;

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
            return Main.debug(["File requests converted to promises require: " + required[i], "Make sure you weren't expecting dependency to already have been resolved upstream.", dep]);
        }
    }

    //IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
    if (Main.list[dep.id]) {
        return Main.list[dep.id];
    }

    //CONVERT TO DEFERRED:
    var def = _public.deferred(dep);

    if (typeof File_loader[Config.mode][dep.type] !== "undefined") {
        File_loader[Config.mode][dep.type](dep.url, def, dep);
    } else {
        File_loader[Config.mode]["default"](dep.url, def, dep);
    }

    return def;
};

module.exports = _public;

//@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?

},{"./deferred.tpl.js":4,"./file_loader.js":5,"./main.js":6,"./queue.js":7,"lodash":undefined}],4:[function(require,module,exports){
"use strict";

/**
 * Default properties for all deferred objects.
 *
 */
var Main = require("./main.js"),
    Config = Main.config();

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
tpl.timeout = Config.timeout;

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
    Main.debug([this.id + " can't resolve.", "Only unsettled deferreds are resolvable."]);
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

  if (Config.debug_mode) {
    err.unshift(msg);
    Main.debug(err, this);
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
      return Main.debug(this.id + " can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

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
      return Main.debug("done() must be passed a function.");
    }
  } else {
    return Main.debug("done() can only be called once.");
  }
};

module.exports = tpl;

},{"./main.js":6}],5:[function(require,module,exports){
"use strict";

var Main = require("./main.js");

var Http = require("http");
var Vm = require("vm");
var _public = {};

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
    if (!Main.config.debug_mode) {
      _;
      Main.debug("Set Main.config.debug_mode=1 to run remote scripts outside of debug mode.");
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

},{"./main.js":6,"http":undefined,"vm":undefined}],6:[function(require,module,exports){
(function (process,__dirname){
"use strict";

var Queue = require("./queue.js"),
    Deferred = require("./deferred.js"),
    Cast = require("./cast.js");

var _public = {};
var _private = {};

debugger;
////////////////////////////////////////
//  _public VARIABLES
////////////////////////////////////////

/**
 * A directory of all promises, deferreds, and queues.
 * @type object
 */
_public.list = {};

/**
 * Array of all exported modules
 * @type Array
 */
_public.modules_exported = [];

/**
 * Index number of last module loaded in _public.modules_exported
 * @type Number
 */
_public.modules_loaded = 0;

/**
 * iterator for ids
 * @type integer
 */
_public.i = 0;

////////////////////////////////////////
//  _private VARIABLES
////////////////////////////////////////

/**
 * Configuration values.
 *
 * @type object
 */
_private.config = {

    autopath: "",
    document: null,
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
            _private.config[i] = obj[i];
        }
    }

    return _private.config;
};

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
        _public.debug("Must set id when defining an instance.");
    }

    //Check no existing instance defined with same id
    if (_public.list[id] && _public.list[id].settled === 1) {
        return _public.debug("Can't define " + id + ". Already resolved.");
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
    if (_public.list[id]) {
        return _public.list[id];
    } else {
        return _public.debug(["No instance exists: " + id]);
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
            return _public.debug("Assign target must be a queue object or the id of a queue.", this);
    }

    //IF TARGET ALREADY LISTED
    if (this.list[id] && this.list[id].model === "queue") {
        q = this.list[id];

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
        return _public.debug("Cannot remove dependencies from a queue that does not exist.", this);
    }

    return q;
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

    if (_private.config.debug_mode) {
        //turn off debug_mode to avoid hitting debugger
        debugger;
    }

    if (_private.config.mode === "browser") {
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

    if (_private.config.mode === "browser") {
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

_public.deferred = Deferred.deferred;
_public.queue = Queue.queue;
_public.cast = Cast.cast;

module.exports = _public;

}).call(this,require('_process'),"/src/js")

},{"./cast.js":2,"./deferred.js":3,"./queue.js":7,"_process":1}],7:[function(require,module,exports){
"use strict";

var _ = require("lodash"),
    Main = require("./main.js"),
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
            Main.debug(err);
        }

        //IF NOT PENDING, DO NOT ALLOW TO ADD
        if (this.state !== 0) {
            return Main.debug(["Cannot add dependency list to queue id:'" + this.id + "'. Queue settled/in the process of being settled."], arr, this);
        }

        for (var a in arr) {

            switch (true) {

                //CHECK IF EXISTS
                case typeof Main.list[arr[a].id] === "object":
                    arr[a] = Main.list[arr[a].id];
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
                    return Main.debug(["Error adding upstream dependency '" + arr[a].id + "' to queue" + " '" + this.id + "'.\n Promise object for '" + arr[a].id + "' is scheduled to resolve downstream from queue '" + this.id + "' so it can't be added upstream."], this);
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
            return Main.debug("Cannot remove list from queue id:'" + this.id + "'. Queue settled/in the process of being settled.");
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
            return Main.debug("Can only reset a queue settled without errors.");
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
        return Main.debug("Queue dependencies must be an array.");
    }

    options = options || {};

    //DOES NOT ALREADY EXIST
    if (!Main.list[options.id]) {

        //CREATE NEW QUEUE OBJECT
        var _o = _private.factory(options);

        //ACTIVATE QUEUE
        _o = _private.activate(_o, options, deps);
    }
    //ALREADY EXISTS
    else {

        _o = Main.list[options.id];

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
        return Main.debug(from_id + " can't signal " + target.id + " because not in upstream.");
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
        _o.backtrace = Main.get_backtrace_info("queue");
    }

    //if no id, use backtrace origin
    if (!options.id) {
        _o.id = _o.backtrace.origin + "-" + ++Main[i];
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
        return Main.debug("Can only upgrade unsettled promise or deferred into a queue.");
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

},{"./deferred.js":3,"./main.js":6,"lodash":undefined}]},{},[2,3,4,5,6,7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvY2FzdC5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2RlZmVycmVkLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZGVmZXJyZWQudHBsLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZmlsZV9sb2FkZXIuanMiLCIvdmFyL3d3dy9vcmd5LWpzL3NyYy9qcy9tYWluLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvcXVldWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMURBLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDM0IsUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDbkMsT0FBTyxHQUFHLEVBQUU7SUFDWixRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztB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eEM7U0FDSjtLQUNGLEVBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUwsV0FBTyxDQUFDLENBQUM7Q0FDWixDQUFDOzs7Ozs7Ozs7O0FBV0YsUUFBUSxDQUFDLE9BQU8sR0FBRyxVQUFTLEdBQUcsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFDOztBQUV6QyxRQUFHLEdBQUcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxJQUFLLEdBQUcsQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssVUFBVSxBQUFDLEVBQUM7QUFDMUUsZUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLDhEQUE4RCxDQUFDLENBQUM7S0FDckY7OztBQUdELFFBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFDLENBQ2pCLFFBQVEsQ0FBQyxHQUFHLEVBQ1gsT0FBTyxDQUNYLENBQUMsQ0FBQzs7QUFFSCxTQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBQztBQUNiLFdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakI7Ozs7O0FBS0QsT0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsQ0FBQzs7O0FBRzFDLFdBQU8sR0FBRyxDQUFDO0NBQ2QsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIE1haW4gPSByZXF1aXJlKCcuL21haW4uanMnKSxcbiAgICBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKSxcbiAgICBfcHVibGljID0ge30sXG4gICAgX3ByaXZhdGUgPSB7fTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBDYXN0cyBhbiBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkLlxuICpcbiAqID4gT2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogIC0gdGhlbigpXG4gKiAgLSBlcnJvcigpXG4gKlxuICogPiBJZiB0aGUgY2FzdGVkIG9iamVjdCBoYXMgYW4gaWQgb3IgdXJsIHByb3BlcnR5IHNldCwgdGhlIGlkIG9yIHVybFxuICogW2luIHRoYXQgb3JkZXJdIHdpbGwgYmVjb21lIHRoZSBpZCBvZiB0aGUgZGVmZXJyZWQgZm9yIHJlZmVyZW5jaW5nXG4gKiB3aXRoIE9yZ3kuZ2V0KGlkKVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC90aGVuYWJsZVxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5jYXN0ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciByZXF1aXJlZCA9IFtcInRoZW5cIixcImVycm9yXCJdO1xuICAgIGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG4gICAgICAgIGlmKCFvYmpbcmVxdWlyZWRbaV1dKXtcbiAgICAgICAgICAgIHJldHVybiBNYWluLmRlYnVnKFwiQ2FzdGFibGUgb2JqZWN0cyByZXF1aXJlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczogXCJcbiAgICAgICAgICAgICAgICArIHJlcXVpcmVkW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgaWYob2JqLmlkKXtcbiAgICAgICAgb3B0aW9ucy5pZCA9IG9iai5pZDtcbiAgICB9XG4gICAgZWxzZSBpZihvYmoudXJsKXtcbiAgICAgICAgb3B0aW9ucy5pZCA9IG9iai51cmw7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAvL0dldCBiYWNrdHJhY2UgaW5mbyBpZiBub25lIGZvdW5kIFttYXkgYmUgc2V0IEAgX3B1YmxpYy5kZWZpbmVdXG4gICAgICB2YXIgYmFja3RyYWNlID0gTWFpbi5nZXRfYmFja3RyYWNlX2luZm8oJ2Nhc3QnKTtcblxuICAgICAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgICAgIGlmKCFvcHRpb25zLmlkKXtcbiAgICAgICAgb3B0aW9ucy5pZCA9IGJhY2t0cmFjZS5vcmlnaW4gKyAnLScgKyAoKytNYWluW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL0NyZWF0ZSBhIGRlZmVycmVkXG4gICAgdmFyIGRlZiA9IERlZmVycmVkKG9wdGlvbnMpO1xuXG4gICAgLy9DcmVhdGUgcmVzb2x2ZXJcbiAgICB2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICBkZWYucmVzb2x2ZS5jYWxsKGRlZixhcmd1bWVudHNbMF0pO1xuICAgIH07XG5cbiAgICAvL1NldCBSZXNvbHZlclxuICAgIG9iai50aGVuKHJlc29sdmVyKTtcblxuICAgIC8vQ3JlYXRlIFJlamVjdG9yXG4gICAgdmFyIGVyciA9IGZ1bmN0aW9uKGVycil7XG4gICAgICBkZWYucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIC8vU2V0IHJlamVjdG9yXG4gICAgb2JqLmVycm9yKGVycik7XG5cbiAgICAvL1JldHVybiBkZWZlcnJlZFxuICAgIHJldHVybiBkZWY7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpO1xuZGVidWdnZXI7XG52YXIgTWFpbiA9IHJlcXVpcmUoJy4vbWFpbi5qcycpO1xudmFyIENvbmZpZyA9IE1haW4uY29uZmlnKCk7XG52YXIgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyk7XG52YXIgVHBsID0gcmVxdWlyZSgnLi9kZWZlcnJlZC50cGwuanMnKTtcbnZhciBGaWxlX2xvYWRlciA9IHJlcXVpcmUoJy4vZmlsZV9sb2FkZXIuanMnKTtcblxuXG52YXIgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgICAgICAgICB7c3RyaW5nfSAgaWQgIC9PcHRpb25hbC4gVXNlIHRoZSBpZCB3aXRoIE9yZ3kuZ2V0KGlkKS4gRGVmYXVsdHMgdG8gbGluZSBudW1iZXIgb2YgaW5zdGFudGlhdGlvbiwgcGx1cyBhbiBpdGVyYXRvci5cbiAqICAgICAgICAgIHtudW1iZXJ9IHRpbWVvdXQgL3RpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC4gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS4gTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLiBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5kZWZlcnJlZCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgaWYob3B0aW9ucy5pZCAmJiBNYWluLmxpc3Rbb3B0aW9ucy5pZF0pe1xuICAgICAgICBfbyA9IE1haW4ubGlzdFtvcHRpb25zLmlkXTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgLy9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIERFRkVSUkVEIENMQVNTXG4gICAgICAgIF9vID0gX3ByaXZhdGUuZmFjdG9yeShvcHRpb25zKTtcblxuICAgICAgICAvL0FDVElWQVRFIERFRkVSUkVEXG4gICAgICAgIF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28pO1xuICAgIH1cblxuICAgIHJldHVybiBfbztcbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5fcHJpdmF0ZS5mYWN0b3J5ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgICB2YXIgX28gPSBfLmFzc2lnbih7fSxbXG4gICAgICBUcGxcbiAgICAgICxvcHRpb25zXG4gICAgXSk7XG5cbiAgICAvL0dldCBiYWNrdHJhY2UgaW5mbyBpZiBub25lIGZvdW5kIFttYXkgYmUgc2V0IEAgX3B1YmxpYy5kZWZpbmVdXG4gICAgaWYoIV9vLmJhY2t0cmFjZSl7XG4gICAgICBfby5iYWNrdHJhY2UgPSBNYWluLmdldF9iYWNrdHJhY2VfaW5mbygnZGVmZXJyZWQnKTtcbiAgICB9XG5cbiAgICAvL2lmIG5vIGlkLCB1c2UgYmFja3RyYWNlIG9yaWdpblxuICAgIGlmKCFvcHRpb25zLmlkKXtcbiAgICAgIF9vLmlkID0gX28uYmFja3RyYWNlLm9yaWdpbiArICctJyArICgrK01haW5baV0pO1xuICAgIH1cblxuICAgIHJldHVybiBfbztcbn07XG5cblxuX3ByaXZhdGUuc2V0dGxlID0gZnVuY3Rpb24oZGVmKXtcblxuICAgIC8vUkVNT1ZFIEFVVE8gVElNRU9VVCBUSU1FUlxuICAgIGlmKGRlZi50aW1lb3V0X2lkKXtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGRlZi50aW1lb3V0X2lkKTtcbiAgICB9XG5cblxuICAgIC8vU2V0IHN0YXRlIHRvIHJlc29sdmVkXG4gICAgX3ByaXZhdGUuc2V0X3N0YXRlKGRlZiwxKTtcblxuXG4gICAgLy9DYWxsIGhvb2tcbiAgICBpZihDb25maWcuaG9va3Mub25TZXR0bGUpe1xuICAgICAgQ29uZmlnLmhvb2tzLm9uU2V0dGxlKGRlZik7XG4gICAgfVxuXG5cbiAgICAvL0FkZCBkb25lIGFzIGEgY2FsbGJhY2sgdG8gdGhlbiBjaGFpbiBjb21wbGV0aW9uLlxuICAgIGRlZi5jYWxsYmFja3MudGhlbi5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oZDIsaXRpbmVyYXJ5LGxhc3Qpe1xuICAgICAgICBkZWYuY2Fib29zZSA9IGxhc3Q7XG5cbiAgICAgICAgLy9SdW4gZG9uZVxuICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICxkZWYuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICxkZWYuY2Fib29zZVxuICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICApO1xuXG4gICAgfSk7XG5cblxuICAgIC8vUnVuIHRoZW4gcXVldWVcbiAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgIGRlZlxuICAgICAgICAsZGVmLmNhbGxiYWNrcy50aGVuXG4gICAgICAgICxkZWYudmFsdWVcbiAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgKTtcblxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBSdW5zIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBzZXF1ZW50aWFsbHkgYXMgYSBwYXJ0aWFsIGZ1bmN0aW9uLlxuICogRWFjaCBmdW5jdGlvbidzIGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgb2YgaXRzIHByZWRlY2Vzc29yIGZ1bmN0aW9uLlxuICpcbiAqIEJ5IGRlZmF1bHQsIGV4ZWN1dGlvbiBjaGFpbiBpcyBwYXVzZWQgd2hlbiBhbnkgZnVuY3Rpb25cbiAqIHJldHVybnMgYW4gdW5yZXNvbHZlZCBkZWZlcnJlZC4gKHBhdXNlX29uX2RlZmVycmVkKSBbT1BUSU9OQUxdXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZiAgL2RlZmVycmVkIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iaiAgL2l0aW5lcmFyeVxuICogICAgICB0cmFpbiAgICAgICB7YXJyYXl9XG4gKiAgICAgIGhvb2tzICAgICAgIHtvYmplY3R9XG4gKiAgICAgICAgICBvbkJlZm9yZSAgICAgICAge2FycmF5fVxuICogICAgICAgICAgb25Db21wbGV0ZSAgICAgIHthcnJheX1cbiAqIEBwYXJhbSB7bWl4ZWR9IHBhcmFtIC9wYXJhbSB0byBwYXNzIHRvIGZpcnN0IGNhbGxiYWNrXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogICAgICBwYXVzZV9vbl9kZWZlcnJlZCAgIHtib29sZWFufVxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHJpdmF0ZS5ydW5fdHJhaW4gPSBmdW5jdGlvbihkZWYsb2JqLHBhcmFtLG9wdGlvbnMpe1xuXG4gICAgLy9hbGxvdyBwcmV2aW91cyByZXR1cm4gdmFsdWVzIHRvIGJlIHBhc3NlZCBkb3duIGNoYWluXG4gICAgdmFyIHIgPSBwYXJhbSB8fCBkZWYuY2Fib29zZSB8fCBkZWYudmFsdWU7XG5cbiAgICAvL29uQmVmb3JlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkJlZm9yZS50cmFpbi5sZW5ndGggPiAwKXtcbiAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsb2JqLmhvb2tzLm9uQmVmb3JlXG4gICAgICAgICAgICAscGFyYW1cbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICB3aGlsZShvYmoudHJhaW4ubGVuZ3RoID4gMCl7XG5cbiAgICAgICAgLy9yZW1vdmUgZm4gdG8gZXhlY3V0ZVxuICAgICAgICB2YXIgbGFzdCA9IG9iai50cmFpbi5zaGlmdCgpO1xuICAgICAgICBkZWYuZXhlY3V0aW9uX2hpc3RvcnkucHVzaChsYXN0KTtcblxuICAgICAgICAvL2RlZi5jYWJvb3NlIG5lZWRlZCBmb3IgdGhlbiBjaGFpbiBkZWNsYXJlZCBhZnRlciByZXNvbHZlZCBpbnN0YW5jZVxuICAgICAgICByID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscik7XG5cbiAgICAgICAgLy9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG4gICAgICAgIC8vYW5kIHJ1biB1bmZpcmVkIGFyciB3aGVuIHRoZW5hYmxlIHNldHRsZXNcbiAgICAgICAgaWYob3B0aW9ucy5wYXVzZV9vbl9kZWZlcnJlZCl7XG5cbiAgICAgICAgICAgIC8vSWYgciBpcyBhbiB1bnNldHRsZWQgdGhlbmFibGVcbiAgICAgICAgICAgIGlmKHIgJiYgci50aGVuICYmIHIuc2V0dGxlZCAhPT0gMSl7XG5cbiAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyIHIgcmVzb2x2ZXNcbiAgICAgICAgICAgICAgICByLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuXG4gICAgICAgICAgICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgICAgICAgICAgICAgLG9ialxuICAgICAgICAgICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy90ZXJtaW5hdGUgZXhlY3V0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0lmIGlzIGFuIGFycmF5IHRoYW4gY29udGFpbnMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG4gICAgICAgICAgICBlbHNlIGlmKHIgaW5zdGFuY2VvZiBBcnJheSl7XG5cbiAgICAgICAgICAgICAgICB2YXIgdGhlbmFibGVzID0gW107XG5cbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gcil7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYocltpXS50aGVuICYmIHJbaV0uc2V0dGxlZCAhPT0gMSl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW5hYmxlcy5wdXNoKHJbaV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSAoZnVuY3Rpb24odCxkZWYsb2JqLHBhcmFtKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQmFpbCBpZiBhbnkgdGhlbmFibGVzIHVuc2V0dGxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0W2ldLnNldHRsZWQgIT09IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLG9ialxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSh0aGVuYWJsZXMsZGVmLG9iaixwYXJhbSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYWxsIHRoZW5hYmxlcyBmb3VuZCBpbiByIHJlc29sdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbaV0uY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZuKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy90ZXJtaW5hdGUgZXhlY3V0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL29uQ29tcGxldGUgZXZlbnRcbiAgICBpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihkZWYsb2JqLmhvb2tzLm9uQ29tcGxldGUscix7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX0pO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcGFyYW0ge251bWJlcn0gaW50XG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3ByaXZhdGUuc2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmLGludCl7XG5cbiAgICBkZWYuc3RhdGUgPSBpbnQ7XG5cbiAgICAvL0lGIFJFU09MVkVEIE9SIFJFSkVDVEVELCBTRVRUTEVcbiAgICBpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcbiAgICAgICAgZGVmLnNldHRsZWQgPSAxO1xuICAgIH1cblxuICAgIGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuICAgICAgICBfcHJpdmF0ZS5zaWduYWxfZG93bnN0cmVhbShkZWYpO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBHZXRzIHRoZSBzdGF0ZSBvZiBhbiBPcmd5IG9iamVjdFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbl9wcml2YXRlLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZil7XG4gICAgcmV0dXJuIGRlZi5zdGF0ZTtcbn07XG5cblxuX3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmope1xuXG4gICAgLy9NQUtFIFNVUkUgTkFNSU5HIENPTkZMSUNUIERPRVMgTk9UIEVYSVNUXG4gICAgaWYoTWFpbi5saXN0W29iai5pZF0gJiYgIU1haW4ubGlzdFtvYmouaWRdLm92ZXJ3cml0YWJsZSl7XG4gICAgICAgIE1haW4uZGVidWcoXCJUcmllZCB0byBvdmVyd3JpdGUgXCIrb2JqLmlkK1wiIHdpdGhvdXQgb3ZlcndyaXRlIHBlcm1pc3Npb25zLlwiKTtcbiAgICAgICAgcmV0dXJuIE1haW4ubGlzdFtvYmouaWRdO1xuICAgIH1cblxuICAgIC8vU0FWRSBUTyBNQVNURVIgTElTVFxuICAgIE1haW4ubGlzdFtvYmouaWRdID0gb2JqO1xuXG4gICAgLy9BVVRPIFRJTUVPVVRcbiAgICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbChvYmopO1xuXG4gICAgLy9DYWxsIGhvb2tcbiAgICBpZihDb25maWcuaG9va3Mub25BY3RpdmF0ZSl7XG4gICAgICBDb25maWcuaG9va3Mub25BY3RpdmF0ZShvYmopO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgYXV0b21hdGljIHRpbWVvdXQgb24gYSBwcm9taXNlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHRpbWVvdXQgKG9wdGlvbmFsKVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbl9wcml2YXRlLmF1dG9fdGltZW91dCA9IGZ1bmN0aW9uKHRpbWVvdXQpe1xuXG4gICAgdGhpcy50aW1lb3V0ID0gKHR5cGVvZiB0aW1lb3V0ID09PSAndW5kZWZpbmVkJylcbiAgICA/IHRoaXMudGltZW91dCA6IHRpbWVvdXQ7XG5cbiAgICAvL0FVVE8gUkVKRUNUIE9OIHRpbWVvdXRcbiAgICBpZighdGhpcy50eXBlIHx8IHRoaXMudHlwZSAhPT0gJ3RpbWVyJyl7XG5cbiAgICAgICAgLy9ERUxFVEUgUFJFVklPVVMgVElNRU9VVCBJRiBFWElTVFNcbiAgICAgICAgaWYodGhpcy50aW1lb3V0X2lkKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodHlwZW9mIHRoaXMudGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgTWFpbi5kZWJ1ZyhbXG4gICAgICAgICAgICAgIFwiQXV0byB0aW1lb3V0IHRoaXMudGltZW91dCBjYW5ub3QgYmUgdW5kZWZpbmVkLlwiXG4gICAgICAgICAgICAgICx0aGlzLmlkXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aGlzLnRpbWVvdXQgPT09IC0xKXtcbiAgICAgICAgICAgIC8vTk8gQVVUTyBUSU1FT1VUIFNFVFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aW1lb3V0X2lkID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3ByaXZhdGUuYXV0b190aW1lb3V0X2NiLmNhbGwoc2NvcGUpO1xuICAgICAgICB9LCB0aGlzLnRpbWVvdXQpO1xuXG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQHRvZG8gV0hFTiBBIFRJTUVSLCBBREQgRFVSQVRJT04gVE8gQUxMIFVQU1RSRUFNIEFORCBMQVRFUkFMP1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBhdXRvdGltZW91dC4gRGVjbGFyYXRpb24gaGVyZSBhdm9pZHMgbWVtb3J5IGxlYWsuXG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wcml2YXRlLmF1dG9fdGltZW91dF9jYiA9IGZ1bmN0aW9uKCl7XG5cbiAgICBpZih0aGlzLnN0YXRlICE9PSAxKXtcblxuICAgICAgICAvL0dFVCBUSEUgVVBTVFJFQU0gRVJST1IgSURcbiAgICAgICAgdmFyIG1zZ3MgPSBbXTtcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcblxuICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgaWYob2JqLnN0YXRlICE9PSAxKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LFxuICAgICAgICAgKiBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuICAgICAgICAgKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYoQ29uZmlnLmRlYnVnX21vZGUpe1xuICAgICAgICAgICAgdmFyIHIgPSBfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KHRoaXMsJ3Vwc3RyZWFtJyxmbik7XG4gICAgICAgICAgICBtc2dzLnB1c2goc2NvcGUuaWQgKyBcIjogcmVqZWN0ZWQgYnkgYXV0byB0aW1lb3V0IGFmdGVyIFwiXG4gICAgICAgICAgICAgICAgICAgICsgdGhpcy50aW1lb3V0ICsgXCJtc1wiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChcIkNhdXNlOlwiKTtcbiAgICAgICAgICAgIG1zZ3MucHVzaChyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG5fcHJpdmF0ZS5lcnJvciA9IGZ1bmN0aW9uKGNiKXtcblxuICAgIC8vSUYgRVJST1IgQUxSRUFEWSBUSFJPV04sIEVYRUNVVEUgQ0IgSU1NRURJQVRFTFlcbiAgICBpZih0aGlzLnN0YXRlID09PSAyKXtcbiAgICAgICAgY2IoKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgdGhpcy5yZWplY3RfcS5wdXNoKGNiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTaWduYWxzIGFsbCBkb3duc3RyZWFtIHByb21pc2VzIHRoYXQgX3ByaXZhdGUgcHJvbWlzZSBvYmplY3QncyBzdGF0ZSBoYXMgY2hhbmdlZC5cbiAqXG4gKlxuICogQHRvZG8gU2luY2UgdGhlIHNhbWUgcXVldWUgbWF5IGhhdmUgYmVlbiBhc3NpZ25lZCB0d2ljZSBkaXJlY3RseSBvclxuICogaW5kaXJlY3RseSB2aWEgc2hhcmVkIGRlcGVuZGVuY2llcywgbWFrZSBzdXJlIG5vdCB0byBkb3VibGUgcmVzb2x2ZVxuICogLSB3aGljaCB0aHJvd3MgYW4gZXJyb3IuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IHRhcmdldCBkZWZlcnJlZC9xdWV1ZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wcml2YXRlLnNpZ25hbF9kb3duc3RyZWFtID0gZnVuY3Rpb24odGFyZ2V0KXtcblxuICAgIC8vTUFLRSBTVVJFIEFMTCBET1dOU1RSRUFNIElTIFVOU0VUVExFRFxuICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgPT09IDEpe1xuXG4gICAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1baV0uc3RhdGUgIT09IDEpe1xuICAgICAgICAgICAgLy90cmllZCB0byBzZXR0bGUgYSByZWplY3RlZCBkb3duc3RyZWFtXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgc3VjY2Vzc2Z1bGx5IHNldHRsZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgTWFpbi5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vTk9XIFRIQVQgV0UgS05PVyBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRUQsIFdFIENBTiBJR05PUkUgQU5ZXG4gICAgLy9TRVRUTEVEIFRIQVQgUkVTVUxUIEFTIEEgU0lERSBFRkZFQ1QgVE8gQU5PVEhFUiBTRVRUTEVNRU5UXG4gICAgZm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG4gICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgIT09IDEpe1xuICAgICAgICAgICAgX3ByaXZhdGUucXVldWUucmVjZWl2ZV9zaWduYWwodGFyZ2V0LmRvd25zdHJlYW1baV0sdGFyZ2V0LmlkKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4qIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LCBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gb2JqXG4qIEBwYXJhbSB7c3RyaW5nfSBwcm9wTmFtZSAgICAgICAgICBUaGUgcHJvcGVydHkgbmFtZSBvZiB0aGUgYXJyYXkgdG8gYnViYmxlIHVwXG4qIEBwYXJhbSB7ZnVuY3Rpb259IGZuICAgICAgICAgICAgICBUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG4qIEBwYXJhbSB7YXJyYXl9IGJyZWFkY3J1bWIgICAgICAgICBUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcbiogQHJldHVybnMge21peGVkfVxuKi9cbl9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYil7XG5cbiAgICBpZih0eXBlb2YgYnJlYWRjcnVtYiA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBicmVhZGNydW1iID0gW29iai5pZF07XG4gICAgfVxuXG4gICAgdmFyIHIxO1xuXG4gICAgZm9yKHZhciBpIGluIG9ialtwcm9wTmFtZV0pe1xuXG4gICAgICAgIC8vUlVOIFRFU1RcbiAgICAgICAgcjEgPSBmbihvYmpbcHJvcE5hbWVdW2ldKTtcblxuICAgICAgICBpZihyMSAhPT0gZmFsc2Upe1xuICAgICAgICAvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcbiAgICAgICAgICAgIC8vQ0hFQ0sgVEhBVCBXRSBBUkVOJ1QgQ0FVR0hUIElOIEEgQ0lSQ1VMQVIgTE9PUFxuICAgICAgICAgICAgaWYoYnJlYWRjcnVtYi5pbmRleE9mKHIxKSAhPT0gLTEpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYWluLmRlYnVnKFtcbiAgICAgICAgICAgICAgICAgICAgXCJDaXJjdWxhciBjb25kaXRpb24gaW4gcmVjdXJzaXZlIHNlYXJjaCBvZiBvYmogcHJvcGVydHkgJ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICArcHJvcE5hbWUrXCInIG9mIG9iamVjdCBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgKygodHlwZW9mIG9iai5pZCAhPT0gJ3VuZGVmaW5lZCcpID8gXCInXCIrb2JqLmlkK1wiJ1wiIDogJycpXG4gICAgICAgICAgICAgICAgICAgICAgICArXCIuIE9mZmVuZGluZyB2YWx1ZTogXCIrcjFcbiAgICAgICAgICAgICAgICAgICAgLChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBicmVhZGNydW1iLmpvaW4oXCIgW2RlcGVuZHMgb25dPT4gXCIpO1xuICAgICAgICAgICAgICAgICAgICB9KSgpXG4gICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJyZWFkY3J1bWIucHVzaChyMSk7XG5cbiAgICAgICAgICAgIGlmKG9ialtwcm9wTmFtZV1baV1bcHJvcE5hbWVdKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3ByaXZhdGUuc2VhcmNoX29ial9yZWN1cnNpdmVseShvYmpbcHJvcE5hbWVdW2ldLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIGJyZWFkY3J1bWI7XG59O1xuXG5cbi8qKlxuICogQ29udmVydHMgYSBwcm9taXNlIGRlc2NyaXB0aW9uIGludG8gYSBwcm9taXNlLlxuICpcbiAqIEBwYXJhbSB7dHlwZX0gb2JqXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5fcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UgPSBmdW5jdGlvbihvYmosb3B0aW9ucyl7XG5cbiAgICBvYmouaWQgPSBvYmouaWQgfHwgb3B0aW9ucy5pZDtcblxuICAgIC8vQXV0b25hbWVcbiAgICBpZiAoIW9iai5pZCkge1xuICAgICAgaWYgKG9iai50eXBlID09PSAndGltZXInKSB7XG4gICAgICAgIG9iai5pZCA9IFwidGltZXItXCIgKyBvYmoudGltZW91dCArIFwiLVwiICsgKCsrTWFpbltpXSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqLnVybCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb2JqLmlkID0gb2JqLnVybC5zcGxpdChcIi9cIikucG9wKCk7XG4gICAgICAgIC8vUkVNT1ZFIC5qcyBGUk9NIElEXG4gICAgICAgIGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5zcGxpdChcIi5cIik7XG4gICAgICAgICAgb2JqLmlkLnBvcCgpO1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5qb2luKFwiLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vUmV0dXJuIGlmIGFscmVhZHkgZXhpc3RzXG4gICAgaWYoTWFpbi5saXN0W29iai5pZF0gJiYgb2JqLnR5cGUgIT09ICd0aW1lcicpe1xuICAgICAgLy9BIHByZXZpb3VzIHByb21pc2Ugb2YgdGhlIHNhbWUgaWQgZXhpc3RzLlxuICAgICAgLy9NYWtlIHN1cmUgdGhpcyBkZXBlbmRlbmN5IG9iamVjdCBkb2Vzbid0IGhhdmUgYVxuICAgICAgLy9yZXNvbHZlciAtIGlmIGl0IGRvZXMgZXJyb3JcbiAgICAgIGlmKG9iai5yZXNvbHZlcil7XG4gICAgICAgIE1haW4uZGVidWcoW1xuICAgICAgICAgIFwiWW91IGNhbid0IHNldCBhIHJlc29sdmVyIG9uIGEgcXVldWUgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkLiBZb3UgY2FuIG9ubHkgcmVmZXJlbmNlIHRoZSBvcmlnaW5hbC5cIlxuICAgICAgICAgICxcIkRldGVjdGVkIHJlLWluaXQgb2YgJ1wiICsgb2JqLmlkICsgXCInLlwiXG4gICAgICAgICAgLFwiQXR0ZW1wdGVkOlwiXG4gICAgICAgICAgLG9ialxuICAgICAgICAgICxcIkV4aXN0aW5nOlwiXG4gICAgICAgICAgLE1haW4ubGlzdFtvYmouaWRdXG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgICAgZWxzZXtcbiAgICAgICAgcmV0dXJuIE1haW4ubGlzdFtvYmouaWRdO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy9Db252ZXJ0IGRlcGVuZGVuY3kgdG8gYW4gaW5zdGFuY2VcbiAgICB2YXIgZGVmO1xuICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAvL0V2ZW50XG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICdldmVudCcpOlxuICAgICAgICAgICAgZGVmID0gX3ByaXZhdGUud3JhcF9ldmVudChvYmopO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3F1ZXVlJyk6XG4gICAgICAgICAgICBkZWYgPSBRdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAvL0FscmVhZHkgYSB0aGVuYWJsZVxuICAgICAgICBjYXNlKHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cbiAgICAgICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAgICAgIC8vUmVmZXJlbmNlIHRvIGFuIGV4aXN0aW5nIGluc3RhbmNlXG4gICAgICAgICAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLmlkID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIidcIitvYmouaWQgK1wiJzogZGlkIG5vdCBleGlzdC4gQXV0byBjcmVhdGluZyBuZXcgZGVmZXJyZWQuXCIpO1xuICAgICAgICAgICAgICAgICAgICBkZWYgPSBfcHVibGljLmRlZmVycmVkKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkIDogb2JqLmlkXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vSWYgb2JqZWN0IHdhcyBhIHRoZW5hYmxlLCByZXNvbHZlIHRoZSBuZXcgZGVmZXJyZWQgd2hlbiB0aGVuIGNhbGxlZFxuICAgICAgICAgICAgICAgICAgICBpZihvYmoudGhlbil7XG4gICAgICAgICAgICAgICAgICAgICAgb2JqLnRoZW4oZnVuY3Rpb24ocil7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZShyKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIC8vT0JKRUNUIFBST1BFUlRZIC5wcm9taXNlIEVYUEVDVEVEIFRPIFJFVFVSTiBBIFBST01JU0VcbiAgICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBvYmoucHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyk6XG4gICAgICAgICAgICAgICAgICAgIGlmKG9iai5zY29wZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYgPSBvYmoucHJvbWlzZS5jYWxsKG9iai5zY29wZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iai5wcm9taXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAvL09iamVjdCBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgICAgICAgY2FzZShvYmoudGhlbik6XG4gICAgICAgICAgICAgICAgICAgIGRlZiA9IG9iajtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vQ2hlY2sgaWYgaXMgYSB0aGVuYWJsZVxuICAgICAgICAgICAgaWYodHlwZW9mIGRlZiAhPT0gJ29iamVjdCcgfHwgIWRlZi50aGVuKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFpbi5kZWJ1ZyhcIkRlcGVuZGVuY3kgbGFiZWxlZCBhcyBhIHByb21pc2UgZGlkIG5vdCByZXR1cm4gYSBwcm9taXNlLlwiLG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAndGltZXInKTpcbiAgICAgICAgICAgIGRlZiA9IF9wcml2YXRlLndyYXBfdGltZXIob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIC8vTG9hZCBmaWxlXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBvYmoudHlwZSA9IG9iai50eXBlIHx8IFwiZGVmYXVsdFwiO1xuICAgICAgICAgICAgLy9Jbmhlcml0IHBhcmVudCdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICAgIGlmKG9wdGlvbnMucGFyZW50ICYmIG9wdGlvbnMucGFyZW50LmN3ZCl7XG4gICAgICAgICAgICAgIG9iai5jd2QgPSBvcHRpb25zLnBhcmVudC5jd2Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWYgPSBfcHJpdmF0ZS53cmFwX3hocihvYmopO1xuICAgIH1cblxuICAgIC8vSW5kZXggcHJvbWlzZSBieSBpZCBmb3IgZnV0dXJlIHJlZmVyZW5jaW5nXG4gICAgTWFpbi5saXN0W29iai5pZF0gPSBkZWY7XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxuXG4vKipcbiAqIEB0b2RvOiByZWRvIHRoaXNcbiAqXG4gKiBDb252ZXJ0cyBhIHJlZmVyZW5jZSB0byBhIERPTSBldmVudCB0byBhIHByb21pc2UuXG4gKiBSZXNvbHZlZCBvbiBmaXJzdCBldmVudCB0cmlnZ2VyLlxuICpcbiAqIEB0b2RvIHJlbW92ZSBqcXVlcnkgZGVwZW5kZW5jeVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuICovXG5fcHJpdmF0ZS53cmFwX2V2ZW50ID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIHZhciBkZWYgPSBfcHVibGljLmRlZmVycmVkKHtcbiAgICAgICAgaWQgOiBvYmouaWRcbiAgICB9KTtcblxuXG4gICAgaWYodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cbiAgICAgICAgaWYodHlwZW9mICQgIT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgdmFyIG1zZyA9ICd3aW5kb3cgYW5kIGRvY3VtZW50IGJhc2VkIGV2ZW50cyBkZXBlbmQgb24galF1ZXJ5JztcbiAgICAgICAgICAgIGRlZi5yZWplY3QobXNnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuICAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuICAgICAgICAgICAgICAgIGNhc2Uob2JqLmlkID09PSAncmVhZHknIHx8IG9iai5pZCA9PT0gJ0RPTUNvbnRlbnRMb2FkZWQnKTpcbiAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZShvYmouaWQgPT09ICdsb2FkJyk6XG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKG9iai5pZCxcImJvZHlcIixmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuX3ByaXZhdGUud3JhcF90aW1lciA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgcHJvbSA9IF9wdWJsaWMuZGVmZXJyZWQob2JqKTtcblxuICAgIChmdW5jdGlvbihwcm9tKXtcblxuICAgICAgICB2YXIgX3N0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBfZW5kID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICBwcm9tLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN0YXJ0IDogX3N0YXJ0XG4gICAgICAgICAgICAgICAgLGVuZCA6IF9lbmRcbiAgICAgICAgICAgICAgICAsZWxhcHNlZCA6IF9lbmQgLSBfc3RhcnRcbiAgICAgICAgICAgICAgICAsdGltZW91dCA6IG9iai50aW1lb3V0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxvYmoudGltZW91dCk7XG5cbiAgICB9KHByb20pKTtcblxuICAgIHJldHVybiBwcm9tO1xufTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVwXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3ByaXZhdGUud3JhcF94aHIgPSBmdW5jdGlvbihkZXApe1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1wiaWRcIixcInVybFwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgICBpZighZGVwW3JlcXVpcmVkW2ldXSl7XG4gICAgICAgICAgICByZXR1cm4gTWFpbi5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJGaWxlIHJlcXVlc3RzIGNvbnZlcnRlZCB0byBwcm9taXNlcyByZXF1aXJlOiBcIiArIHJlcXVpcmVkW2ldXG4gICAgICAgICAgICAgICAgLFwiTWFrZSBzdXJlIHlvdSB3ZXJlbid0IGV4cGVjdGluZyBkZXBlbmRlbmN5IHRvIGFscmVhZHkgaGF2ZSBiZWVuIHJlc29sdmVkIHVwc3RyZWFtLlwiXG4gICAgICAgICAgICAgICAgLGRlcFxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL0lGIFBST01JU0UgRk9SIFRISVMgVVJMIEFMUkVBRFkgRVhJU1RTLCBSRVRVUk4gSVRcbiAgICBpZihNYWluLmxpc3RbZGVwLmlkXSl7XG4gICAgICByZXR1cm4gTWFpbi5saXN0W2RlcC5pZF07XG4gICAgfVxuXG4gICAgLy9DT05WRVJUIFRPIERFRkVSUkVEOlxuICAgIHZhciBkZWYgPSBfcHVibGljLmRlZmVycmVkKGRlcCk7XG5cbiAgICBpZih0eXBlb2YgRmlsZV9sb2FkZXJbQ29uZmlnLm1vZGVdW2RlcC50eXBlXSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgRmlsZV9sb2FkZXJbQ29uZmlnLm1vZGVdW2RlcC50eXBlXShkZXAudXJsLGRlZixkZXApO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgRmlsZV9sb2FkZXJbQ29uZmlnLm1vZGVdWydkZWZhdWx0J10oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwiLyoqXG4gKiBEZWZhdWx0IHByb3BlcnRpZXMgZm9yIGFsbCBkZWZlcnJlZCBvYmplY3RzLlxuICpcbiAqL1xudmFyIE1haW4gPSByZXF1aXJlKCcuL21haW4uanMnKSxcbkNvbmZpZyA9IE1haW4uY29uZmlnKCk7XG5cbnZhciB0cGwgPSB7fTtcblxudHBsLmlzX29yZ3kgPSB0cnVlO1xuXG50cGwuaWQgPSBudWxsO1xuXG4vL0EgQ09VTlRFUiBGT1IgQVVUMC1HRU5FUkFURUQgUFJPTUlTRSBJRCdTXG50cGwuc2V0dGxlZCA9IDA7XG5cbi8qKlxuICogU1RBVEUgQ09ERVM6XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS1cbiAqIC0xICAgPT4gU0VUVExJTkcgW0VYRUNVVElORyBDQUxMQkFDS1NdXG4gKiAgMCAgID0+IFBFTkRJTkdcbiAqICAxICAgPT4gUkVTT0xWRUQgLyBGVUxGSUxMRURcbiAqICAyICAgPT4gUkVKRUNURURcbiAqL1xudHBsLnN0YXRlID0gMDtcblxudHBsLnZhbHVlID0gW107XG5cbi8vVGhlIG1vc3QgcmVjZW50IHZhbHVlIGdlbmVyYXRlZCBieSB0aGUgdGhlbi0+ZG9uZSBjaGFpbi5cbnRwbC5jYWJvb3NlID0gbnVsbDtcblxudHBsLm1vZGVsID0gXCJkZWZlcnJlZFwiO1xuXG50cGwuZG9uZV9maXJlZCA9IDA7XG5cbnRwbC50aW1lb3V0X2lkID0gbnVsbDtcblxudHBsLmNhbGxiYWNrX3N0YXRlcyA9IHtcbiAgcmVzb2x2ZSA6IDBcbiAgLHRoZW4gOiAwXG4gICxkb25lIDogMFxuICAscmVqZWN0IDogMFxufTtcblxuLyoqXG4gKiBTZWxmIGV4ZWN1dGluZyBmdW5jdGlvbiB0byBpbml0aWFsaXplIGNhbGxiYWNrIGV2ZW50XG4gKiBsaXN0LlxuICpcbiAqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgcHJvcGVydHlOYW1lcyBhc1xuICogdHBsLmNhbGxiYWNrX3N0YXRlczogYWRkaW5nIGJvaWxlcnBsYXRlXG4gKiBwcm9wZXJ0aWVzIGZvciBlYWNoXG4gKlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xudHBsLmNhbGxiYWNrcyA9IChmdW5jdGlvbigpe1xuXG4gIHZhciBvID0ge307XG5cbiAgZm9yKHZhciBpIGluIHRwbC5jYWxsYmFja19zdGF0ZXMpe1xuICAgIG9baV0gPSB7XG4gICAgICB0cmFpbiA6IFtdXG4gICAgICAsaG9va3MgOiB7XG4gICAgICAgIG9uQmVmb3JlIDoge1xuICAgICAgICAgIHRyYWluIDogW11cbiAgICAgICAgfVxuICAgICAgICAsb25Db21wbGV0ZSA6IHtcbiAgICAgICAgICB0cmFpbiA6IFtdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG87XG59KSgpO1xuXG4vL1BST01JU0UgSEFTIE9CU0VSVkVSUyBCVVQgRE9FUyBOT1QgT0JTRVJWRSBPVEhFUlNcbnRwbC5kb3duc3RyZWFtID0ge307XG5cbnRwbC5leGVjdXRpb25faGlzdG9yeSA9IFtdO1xuXG4vL1dIRU4gVFJVRSwgQUxMT1dTIFJFLUlOSVQgW0ZPUiBVUEdSQURFUyBUTyBBIFFVRVVFXVxudHBsLm92ZXJ3cml0YWJsZSA9IDA7XG5cblxuLyoqXG4gKiBEZWZhdWx0IHRpbWVvdXQgZm9yIGEgZGVmZXJyZWRcbiAqIEB0eXBlIG51bWJlclxuICovXG50cGwudGltZW91dCA9IENvbmZpZy50aW1lb3V0O1xuXG4vKipcbiAqIFJFTU9URVxuICpcbiAqIFJFTU9URSA9PSAxICA9PiAgW0RFRkFVTFRdIE1ha2UgaHR0cCByZXF1ZXN0IGZvciBmaWxlXG4gKlxuICogUkVNT1RFID09IDAgID0+ICBSZWFkIGZpbGUgZGlyZWN0bHkgZnJvbSB0aGUgZmlsZXN5c3RlbVxuICpcbiAqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG4gKiBGSUxFU1lTVEVNIEFDQ0VTU1xuICovXG50cGwucmVtb3RlID0gMTtcblxuLy9BRERTIFRPIE1BU1RFUiBMSVNULiBBTFdBWVMgVFJVRSBVTkxFU1MgVVBHUkFESU5HIEEgUFJPTUlTRSBUTyBBIFFVRVVFXG50cGwubGlzdCA9IDE7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIFJlc29sdmVzIGEgZGVmZXJyZWQuXG4gKlxuICogQHBhcmFtIHttaXhlZH0gdmFsdWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG50cGwucmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKXtcblxuICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgIE1haW4uZGVidWcoW1xuICAgICAgdGhpcy5pZCArIFwiIGNhbid0IHJlc29sdmUuXCJcbiAgICAgICxcIk9ubHkgdW5zZXR0bGVkIGRlZmVycmVkcyBhcmUgcmVzb2x2YWJsZS5cIlxuICAgIF0pO1xuICB9XG5cbiAgLy9TRVQgU1RBVEUgVE8gU0VUVExFTUVOVCBJTiBQUk9HUkVTU1xuICB0aGlzLnNldF9zdGF0ZSh0aGlzLC0xKTtcblxuICAvL1NFVCBWQUxVRVxuICB0aGlzLnZhbHVlID0gdmFsdWU7XG5cbiAgLy9SVU4gUkVTT0xWRVIgQkVGT1JFIFBST0NFRURJTkdcbiAgLy9FVkVOIElGIFRIRVJFIElTIE5PIFJFU09MVkVSLCBTRVQgSVQgVE8gRklSRUQgV0hFTiBDQUxMRURcbiAgaWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG4gICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cbiAgICAvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG4gICAgdHJ5e1xuICAgICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVzb2x2ZXIodmFsdWUsdGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY2F0Y2goZSl7XG4gICAgICBkZWJ1Z2dlcjtcbiAgICB9XG4gIH1cbiAgZWxzZXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgc2V0dGxlIHRvIHJlc29sdmUgdHJhaW5cbiAgICAvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3NcbiAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpe1xuICAgICAgc2V0dGxlKHRoaXMpO1xuICAgIH0pO1xuICB9XG5cbiAgLy9SdW4gcmVzb2x2ZVxuICB0aGlzLnJ1bl90cmFpbihcbiAgICB0aGlzXG4gICAgLHRoaXMuY2FsbGJhY2tzLnJlc29sdmVcbiAgICAsdGhpcy52YWx1ZVxuICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgKTtcblxuICAvL3Jlc29sdmVyIGlzIGV4cGVjdGVkIHRvIGNhbGwgcmVzb2x2ZSBhZ2FpblxuICAvL2FuZCB0aGF0IHdpbGwgZ2V0IHVzIHBhc3QgdGhpcyBwb2ludFxuICByZXR1cm4gdGhpcztcbn07XG5cblxudHBsLnJlamVjdCA9IGZ1bmN0aW9uKGVycil7XG5cbiAgaWYoIShlcnIgaW5zdGFuY2VvZiBBcnJheSkpe1xuICAgIGVyciA9IFtlcnJdO1xuICB9XG5cbiAgdmFyIG1zZyA9IFwiUmVqZWN0ZWQgXCIrdGhpcy5tb2RlbCtcIjogJ1wiK3RoaXMuaWQrXCInLlwiXG5cbiAgaWYoQ29uZmlnLmRlYnVnX21vZGUpe1xuICAgIGVyci51bnNoaWZ0KG1zZyk7XG4gICAgTWFpbi5kZWJ1ZyhlcnIsdGhpcyk7XG4gIH1cbiAgZWxzZXtcbiAgICBtc2cgPSBtc2cgKyBcIlxcbiBUdXJuIGRlYnVnIG1vZGUgb24gZm9yIG1vcmUgaW5mby5cIjtcbiAgICBjb25zb2xlLmxvZyhtc2cpO1xuICB9XG5cbiAgLy9SZW1vdmUgYXV0byB0aW1lb3V0IHRpbWVyXG4gIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG4gIH1cblxuICAvL1NldCBzdGF0ZSB0byByZWplY3RlZFxuICB0aGlzLnNldF9zdGF0ZSh0aGlzLDIpO1xuXG4gIC8vRXhlY3V0ZSByZWplY3Rpb24gcXVldWVcbiAgdGhpcy5ydW5fdHJhaW4oXG4gICAgdGhpc1xuICAgICx0aGlzLmNhbGxiYWNrcy5yZWplY3RcbiAgICAsZXJyXG4gICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICApO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG50cGwudGhlbiA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAvL0FuIGVycm9yIHdhcyBwcmV2aW91c2x5IHRocm93biwgYmFpbCBvdXRcbiAgICBjYXNlKHRoaXMuc3RhdGUgPT09IDIpOlxuICAgICAgYnJlYWs7XG5cbiAgICAvL0V4ZWN1dGlvbiBjaGFpbiBhbHJlYWR5IGZpbmlzaGVkLiBCYWlsIG91dC5cbiAgICBjYXNlKHRoaXMuZG9uZV9maXJlZCA9PT0gMSk6XG4gICAgICByZXR1cm4gTWFpbi5kZWJ1Zyh0aGlzLmlkK1wiIGNhbid0IGF0dGFjaCAudGhlbigpIGJlY2F1c2UgLmRvbmUoKSBoYXMgYWxyZWFkeSBmaXJlZCwgYW5kIHRoYXQgbWVhbnMgdGhlIGV4ZWN1dGlvbiBjaGFpbiBpcyBjb21wbGV0ZS5cIik7XG5cbiAgICBkZWZhdWx0OlxuXG4gICAgICAvL1B1c2ggY2FsbGJhY2sgdG8gdGhlbiBxdWV1ZVxuICAgICAgdGhpcy5jYWxsYmFja3MudGhlbi50cmFpbi5wdXNoKGZuKTtcblxuICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlXG4gICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgaWYodGhpcy5zZXR0bGVkID09PSAxICYmIHRoaXMuc3RhdGUgPT09IDEgJiYgIXRoaXMuZG9uZV9maXJlZCl7XG4gICAgICAgIHRoaXMucnVuX3RyYWluKFxuICAgICAgICAgIHRoaXNcbiAgICAgICAgICAsdGhpcy5jYWxsYmFja3MudGhlblxuICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcbiAgICAgIGVsc2V7fVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbnRwbC5kb25lID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG4gIGlmKHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ubGVuZ3RoID09PSAwXG4gICAgICYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCl7XG4gICAgICBpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpe1xuXG4gICAgICAgIC8vd3JhcCBjYWxsYmFjayB3aXRoIHNvbWUgb3RoZXIgY29tbWFuZHNcbiAgICAgICAgdmFyIGZuMiA9IGZ1bmN0aW9uKHIsZGVmZXJyZWQsbGFzdCl7XG5cbiAgICAgICAgICAvL0RvbmUgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UsIHNvIG5vdGUgdGhhdCBpdCBoYXMgYmVlblxuICAgICAgICAgIGRlZmVycmVkLmRvbmVfZmlyZWQgPSAxO1xuXG4gICAgICAgICAgZm4ocixkZWZlcnJlZCxsYXN0KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLnB1c2goZm4yKTtcblxuICAgICAgICAvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWUgb25Db21wbGV0ZVxuICAgICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgIHRoaXMuY2FsbGJhY2tzLnJlamVjdC5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG4gICAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSl7XG4gICAgICAgICAgaWYodGhpcy5zdGF0ZSA9PT0gMSl7XG4gICAgICAgICAgICB0aGlzLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgdGhpc1xuICAgICAgICAgICAgICAsdGhpcy5jYWxsYmFja3MuZG9uZVxuICAgICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICB0aGlzLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgdGhpc1xuICAgICAgICAgICAgICAsdGhpcy5jYWxsYmFja3MucmVqZWN0XG4gICAgICAgICAgICAgICx0aGlzLmNhYm9vc2VcbiAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy9VbnNldHRsZWQsIHRyYWluIHdpbGwgYmUgcnVuIHdoZW4gc2V0dGxlZFxuICAgICAgICBlbHNle31cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHJldHVybiBNYWluLmRlYnVnKFwiZG9uZSgpIG11c3QgYmUgcGFzc2VkIGEgZnVuY3Rpb24uXCIpO1xuICAgIH1cbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBNYWluLmRlYnVnKFwiZG9uZSgpIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLlwiKTtcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHRwbDtcbiIsInZhciBNYWluID0gcmVxdWlyZSgnLi9tYWluLmpzJyk7XG5cbnZhciBIdHRwID0gcmVxdWlyZSgnaHR0cCcpO1xudmFyIFZtID0gcmVxdWlyZSgndm0nKTtcbnZhciBfcHVibGljID0ge307XG5cbl9wdWJsaWMuYnJvd3NlciA9IHt9LFxuX3B1YmxpYy5uYXRpdmUgPSB7fSxcblxuLy9Ccm93c2VyIGxvYWRcblxuX3B1YmxpYy5icm93c2VyLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG4gIHZhciBoZWFkID0gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG4gIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblxuICBlbGVtLnNldEF0dHJpYnV0ZShcImhyZWZcIixwYXRoKTtcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsXCJ0ZXh0L2Nzc1wiKTtcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJyZWxcIixcInN0eWxlc2hlZXRcIik7XG5cbiAgaWYoZWxlbS5vbmxvYWQpe1xuICAgIChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICBlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcbiAgICAgICB9O1xuXG4gICAgICAgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KFwiRmFpbGVkIHRvIGxvYWQgcGF0aDogXCIgKyBwYXRoKTtcbiAgICAgICB9O1xuXG4gICAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuICAgIGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gIH1cbiAgZWxzZXtcbiAgICAvL0FERCBlbGVtIEJVVCBNQUtFIFhIUiBSRVFVRVNUIFRPIENIRUNLIEZJTEUgUkVDRUlWRURcbiAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuICB9XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gIGVsZW0udHlwZSA9ICd0ZXh0L2phdmFzY3JpcHQnO1xuICBlbGVtLnNldEF0dHJpYnV0ZShcInNyY1wiLHBhdGgpO1xuXG4gIChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuICAgICAgZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuICAgICAgICBpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgICAgICB8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgodHlwZW9mIGVsZW0udmFsdWUgIT09ICd1bmRlZmluZWQnKSA/IGVsZW0udmFsdWUgOiBlbGVtKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG4gICAgICB9O1xuICB9KGVsZW0scGF0aCxkZWZlcnJlZCkpO1xuXG4gIHRoaXMuaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbn1cblxuX3B1YmxpYy5icm93c2VyLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgdGhpcy5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLmJyb3dzZXIuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsb3B0aW9ucyl7XG4gIHZhciByLFxuICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxLm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXG4gIChmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgaWYocmVxLnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICByID0gcmVxLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgICBpZihvcHRpb25zLnR5cGUgJiYgb3B0aW9ucy50eXBlID09PSAnanNvbicpe1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICByID0gSlNPTi5wYXJzZShyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICBfcHVibGljLmRlYnVnKFtcbiAgICAgICAgICAgICAgICBcIkNvdWxkIG5vdCBkZWNvZGUgSlNPTlwiXG4gICAgICAgICAgICAgICAgLHBhdGhcbiAgICAgICAgICAgICAgICAsclxuICAgICAgICAgICAgICBdLGRlZmVycmVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9KHBhdGgsZGVmZXJyZWQpKTtcblxuICByZXEuc2VuZChudWxsKTtcbn1cblxuXG5cbi8vTmF0aXZlIGxvYWRcblxuX3B1YmxpYy5uYXRpdmUuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wdWJsaWMuYnJvd3Nlci5jc3MocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMubmF0aXZlLnNjcmlwdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAvL2xvY2FsIHBhY2thZ2VcbiAgaWYocGF0aFswXT09PScuJyl7XG4gICAgdmFyIHIgPSByZXF1aXJlKHBhdGgpO1xuICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gIH1cbiAgLy9yZW1vdGUgc2NyaXB0XG4gIGVsc2V7XG5cbiAgICAvL0NoZWNrIHRoYXQgd2UgaGF2ZSBjb25maWd1cmVkIHRoZSBlbnZpcm9ubWVudCB0byBhbGxvdyB0aGlzLFxuICAgIC8vYXMgaXQgcmVwcmVzZW50cyBhIHNlY3VyaXR5IHRocmVhdCBhbmQgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgZGVidWdnaW5nXG4gICAgaWYoIU1haW4uY29uZmlnLmRlYnVnX21vZGUpe19cbiAgICAgIE1haW4uZGVidWcoXCJTZXQgTWFpbi5jb25maWcuZGVidWdfbW9kZT0xIHRvIHJ1biByZW1vdGUgc2NyaXB0cyBvdXRzaWRlIG9mIGRlYnVnIG1vZGUuXCIpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICByID0gVm0ucnVuSW5UaGlzQ29udGV4dChkYXRhKTtcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5fcHVibGljLm5hdGl2ZS5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wdWJsaWMubmF0aXZlLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59XG5cbl9wdWJsaWMubmF0aXZlLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKHIpe1xuICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gIH0pXG59XG5cbl9wcml2YXRlLm5hdGl2ZS5nZXQgPSBmdW5jdGlvbiAocGF0aCxkZWZlcnJlZCxjYWxsYmFjayl7XG4gIGlmKHBhdGhbMF0gPT09ICcuJyl7XG4gICAgLy9maWxlIHN5c3RlbVxuICAgIC8vdmFyIEZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICBGcy5yZWFkRmlsZShwYXRoLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICB9KTtcbiAgfVxuICBlbHNle1xuICAgIC8vaHR0cFxuICAgIC8vdmFyIEh0dHAgPSByZXF1aXJlKCdodHRwJyk7XG4gICAgSHR0cC5nZXQoeyBwYXRoIDogcGF0aH0sIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgIHZhciBkYXRhID0gJyc7XG4gICAgICByZXMub24oJ2RhdGEnLCBmdW5jdGlvbiAoYnVmKSB7XG4gICAgICAgICAgZGF0YSArPSBidWY7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNhbGxiYWNrKGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIFF1ZXVlID0gcmVxdWlyZSgnLi9xdWV1ZS5qcycpLFxuICAgIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpLFxuICAgIENhc3QgPSByZXF1aXJlKCcuL2Nhc3QuanMnKTtcblxuXG52YXIgX3B1YmxpYyA9IHt9O1xudmFyIF9wcml2YXRlID0ge307XG5cbmRlYnVnZ2VyO1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLmxpc3QgPSB7fTtcblxuXG4vKipcbiAqIEFycmF5IG9mIGFsbCBleHBvcnRlZCBtb2R1bGVzXG4gKiBAdHlwZSBBcnJheVxuICovXG5fcHVibGljLm1vZHVsZXNfZXhwb3J0ZWQgPSBbXTtcblxuXG4vKipcbiAqIEluZGV4IG51bWJlciBvZiBsYXN0IG1vZHVsZSBsb2FkZWQgaW4gX3B1YmxpYy5tb2R1bGVzX2V4cG9ydGVkXG4gKiBAdHlwZSBOdW1iZXJcbiAqL1xuX3B1YmxpYy5tb2R1bGVzX2xvYWRlZCA9IDA7XG5cblxuLyoqXG4gKiBpdGVyYXRvciBmb3IgaWRzXG4gKiBAdHlwZSBpbnRlZ2VyXG4gKi9cbl9wdWJsaWMuaSA9IDA7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiB2YWx1ZXMuXG4gKlxuICogQHR5cGUgb2JqZWN0XG4gKi9cbl9wcml2YXRlLmNvbmZpZyA9IHtcblxuICAgIGF1dG9wYXRoIDogJydcbiAgICAsZG9jdW1lbnQgOiBudWxsXG4gICAgLGRlYnVnX21vZGUgOiAxXG4gICAgLy9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG4gICAgLy9iZWNhdXNlIG5vZGUgaGFzIG5vIGNvbnN0YW50IGZvciB0aGlzXG4gICAgLGN3ZCA6IGZhbHNlXG4gICAgLG1vZGUgOiAoZnVuY3Rpb24oKXtcbiAgICAgICAgaWYodHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHByb2Nlc3MgKyAnJyA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKXtcbiAgICAgICAgICAgIC8vIGlzIG5vZGVcbiAgICAgICAgICAgIHJldHVybiBcIm5hdGl2ZVwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvLyBub3Qgbm9kZVxuICAgICAgICAgICAgcmV0dXJuIFwiYnJvd3NlclwiO1xuICAgICAgICB9XG4gICAgfSgpKVxuICAgIC8qKlxuICAgICAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuICAgICAqIC0gb25TZXR0bGUgICAvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcbiAgICAgKlxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuICAgICxob29rcyA6IHtcbiAgICB9XG4gICAgLHRpbWVvdXQgOiA1MDAwIC8vZGVmYXVsdCB0aW1lb3V0XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gc2V0dGVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIGlmKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKXtcbiAgICAgICAgZm9yKHZhciBpIGluIG9iail7XG4gICAgICAgICAgX3ByaXZhdGUuY29uZmlnW2ldID0gb2JqW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9wcml2YXRlLmNvbmZpZztcbn07XG5cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgcHJvbWlzZSBmcm9tIGEgdmFsdWUgYW5kIGFuIGlkIGFuZCBhdXRvbWF0aWNhbGx5XG4qIHJlc29sdmVzIGl0LlxuKlxuKiBAcGFyYW0ge3N0cmluZ30gaWRcbiogQHBhcmFtIHttaXhlZH0gZGF0YVxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBwcm9taXNlXG4qL1xuX3B1YmxpYy5kZWZpbmUgPSBmdW5jdGlvbihpZCxkYXRhLG9wdGlvbnMpe1xuXG4gICAgdmFyIGRlZjtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmRlcGVuZGVuY2llcyA9IG9wdGlvbnMuZGVwZW5kZW5jaWVzIHx8IG51bGw7XG4gICAgb3B0aW9ucy5yZXNvbHZlciA9IG9wdGlvbnMucmVzb2x2ZXIgfHwgbnVsbDtcblxuICAgIC8vdGVzdCBmb3IgYSB2YWxpZCBpZFxuICAgIGlmKHR5cGVvZiBpZCAhPT0gJ3N0cmluZycpe1xuICAgICAgX3B1YmxpYy5kZWJ1ZyhcIk11c3Qgc2V0IGlkIHdoZW4gZGVmaW5pbmcgYW4gaW5zdGFuY2UuXCIpO1xuICAgIH1cblxuICAgIC8vQ2hlY2sgbm8gZXhpc3RpbmcgaW5zdGFuY2UgZGVmaW5lZCB3aXRoIHNhbWUgaWRcbiAgICBpZihfcHVibGljLmxpc3RbaWRdICYmIF9wdWJsaWMubGlzdFtpZF0uc2V0dGxlZCA9PT0gMSl7XG4gICAgICByZXR1cm4gX3B1YmxpYy5kZWJ1ZyhcIkNhbid0IGRlZmluZSBcIiArIGlkICsgXCIuIEFscmVhZHkgcmVzb2x2ZWQuXCIpO1xuICAgIH1cblxuICAgIG9wdGlvbnMuaWQgPSBpZDtcblxuICAgIC8vU2V0IGJhY2t0cmFjZSBpbmZvLCBoZXJlIC0gc28gb3JpZ2luIHBvaW50cyB0byBjYWxsZWVcbiAgICBvcHRpb25zLmJhY2t0cmFjZSA9IHRoaXMuZ2V0X2JhY2t0cmFjZV9pbmZvKCdkZWZpbmUnKTtcblxuICAgIGlmKG9wdGlvbnMuZGVwZW5kZW5jaWVzICE9PSBudWxsXG4gICAgICAmJiBvcHRpb25zLmRlcGVuZGVuY2llcyBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIC8vRGVmaW5lIGFzIGEgcXVldWUgLSBjYW4ndCBhdXRvcmVzb2x2ZSBiZWNhdXNlIHdlIGhhdmUgZGVwc1xuICAgICAgdmFyIGRlcHMgPSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlbGV0ZSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICAgIGRlZiA9IFF1ZXVlKGRlcHMsb3B0aW9ucyk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAvL0RlZmluZSBhcyBhIGRlZmVycmVkXG4gICAgICBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuICAgICAgLy9UcnkgdG8gaW1tZWRpYXRlbHkgc2V0dGxlIFtkZWZpbmVdXG4gICAgICBpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG4gICAgICAgICYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gJ2Jvb2xlYW4nXG4gICAgICAgIHx8IG9wdGlvbnMuYXV0b3Jlc29sdmUgPT09IHRydWUpKXtcbiAgICAgICAgLy9wcmV2ZW50IGZ1dHVyZSBhdXRvcmVzb3ZlIGF0dGVtcHRzIFtpLmUuIGZyb20geGhyIHJlc3BvbnNlXVxuICAgICAgICBkZWYuYXV0b3Jlc29sdmUgPSBmYWxzZTtcbiAgICAgICAgZGVmLnJlc29sdmUoZGF0YSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuX3B1YmxpYy5kZWZpbmVfbW9kdWxlID0gZnVuY3Rpb24ob2JqKXtcblxuICB2YXIgb3B0aW9ucyA9IHt9O1xuICB2YXIgaWQgPSBvYmoucS5fX2lkO1xuXG4gIGlmKHR5cGVvZiBPcmd5Lmxpc3RbaWRdID09PSAndW5kZWZpbmVkJyB8fCBPcmd5Lmxpc3RbaWRdLnN0YXRlID09PSAwKXtcbiAgICBpZihvYmoucS5fX2RlcGVuZGVuY2llcyl7XG4gICAgICBvcHRpb25zLmRlcGVuZGVuY2llcyA9IG9iai5xLl9fZGVwZW5kZW5jaWVzO1xuICAgIH1cblxuICAgIGlmKG9iai5xLl9fcmVzb2x2ZXIpe1xuICAgICAgb3B0aW9ucy5yZXNvbHZlciA9IG9iai5xLl9fcmVzb2x2ZXIuYmluZChvYmopO1xuICAgIH07XG5cbiAgICBpZihfcHJpdmF0ZS5jb25maWcubW9kZSA9PT0gJ25hdGl2ZScpe1xuICAgICAgb3B0aW9ucy5jd2QgPSBfX2Rpcm5hbWU7XG4gICAgICB2YXIgZGVmID0gdGhpcy5kZWZpbmUoaWQsb2JqLl9wdWJsaWMsb3B0aW9ucyk7XG4gICAgICByZXR1cm4gZGVmO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgdGhpcy5kZWZpbmUoaWQsb2JqLl9wdWJsaWMsb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5cbi8qKlxuICogR2V0dGVyLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZFxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5nZXQgPSBmdW5jdGlvbihpZCl7XG4gIGlmKF9wdWJsaWMubGlzdFtpZF0pe1xuICAgIHJldHVybiBfcHVibGljLmxpc3RbaWRdO1xuICB9XG4gIGVsc2V7XG4gICAgcmV0dXJuIF9wdWJsaWMuZGVidWcoW1xuICAgICAgXCJObyBpbnN0YW5jZSBleGlzdHM6IFwiK2lkXG4gICAgXSk7XG4gIH1cbn07XG5cblxuLyoqXG4gKiBBZGQvcmVtb3ZlIGFuIHVwc3RyZWFtIGRlcGVuZGVuY3kgdG8vZnJvbSBhIHF1ZXVlLlxuICpcbiAqIENhbiB1c2UgYSBxdWV1ZSBpZCwgZXZlbiBmb3IgYSBxdWV1ZSB0aGF0IGlzIHlldCB0byBiZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0Z3QgfCBxdWV1ZSAvIHF1ZXVlIGlkXG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyIHwgbGlzdC9wcm9taXNlIGlkcyxkZXBlbmRlbmNpZXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkIHwgYWRkIGlmIHRydWUsIHJlbW92ZSBpZiBmYWxzZVxuICpcbiAqIEByZXR1cm4ge2FycmF5fSBxdWV1ZSBvZiBsaXN0XG4gKi9cbl9wdWJsaWMuYXNzaWduID0gZnVuY3Rpb24odGd0LGFycixhZGQpe1xuXG4gICAgYWRkID0gKHR5cGVvZiBhZGQgPT09IFwiYm9vbGVhblwiKSA/IGFkZCA6IDE7XG5cbiAgICB2YXIgaWQscTtcbiAgICBzd2l0Y2godHJ1ZSl7XG4gICAgICAgIGNhc2UodHlwZW9mIHRndCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHRndC50aGVuID09PSAnZnVuY3Rpb24nKTpcbiAgICAgICAgICAgIGlkID0gdGd0LmlkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UodHlwZW9mIHRndCA9PT0gJ3N0cmluZycpOlxuICAgICAgICAgICAgaWQgPSB0Z3Q7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBfcHVibGljLmRlYnVnKFwiQXNzaWduIHRhcmdldCBtdXN0IGJlIGEgcXVldWUgb2JqZWN0IG9yIHRoZSBpZCBvZiBhIHF1ZXVlLlwiLHRoaXMpO1xuICAgIH1cblxuICAgIC8vSUYgVEFSR0VUIEFMUkVBRFkgTElTVEVEXG4gICAgaWYodGhpcy5saXN0W2lkXSAmJiB0aGlzLmxpc3RbaWRdLm1vZGVsID09PSAncXVldWUnKXtcbiAgICAgICAgcSA9IHRoaXMubGlzdFtpZF07XG5cbiAgICAgICAgLy89PiBBREQgVE8gUVVFVUUnUyBVUFNUUkVBTVxuICAgICAgICBpZihhZGQpe1xuICAgICAgICAgICAgcS5hZGQoYXJyKTtcbiAgICAgICAgfVxuICAgICAgICAvLz0+IFJFTU9WRSBGUk9NIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHEucmVtb3ZlKGFycik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy9DUkVBVEUgTkVXIFFVRVVFIEFORCBBREQgREVQRU5ERU5DSUVTXG4gICAgZWxzZSBpZihhZGQpe1xuXG4gICAgICAgIHEgPSBRdWV1ZShhcnIse1xuICAgICAgICAgICAgaWQgOiBpZFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy9FUlJPUjogQ0FOJ1QgUkVNT1ZFIEZST00gQSBRVUVVRSBUSEFUIERPRVMgTk9UIEVYSVNUXG4gICAgZWxzZXtcbiAgICAgICAgcmV0dXJuIF9wdWJsaWMuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGRlcGVuZGVuY2llcyBmcm9tIGEgcXVldWUgdGhhdCBkb2VzIG5vdCBleGlzdC5cIix0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcTtcbn07XG5cblxuLyoqXG4gKiBEZWJ1Z2dpbmcgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSBtc2dcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHVibGljLmRlYnVnID0gZnVuY3Rpb24obXNnLGRlZil7XG5cbiAgICBpZighIChtc2cgaW5zdGFuY2VvZiBBcnJheSkpe1xuICAgICAgICBtc2cgPSBbbXNnXTtcbiAgICB9XG5cbiAgICBmb3IodmFyIGkgaW4gbXNnKXtcbiAgICAgICAgaWYodHlwZW9mIG1zZ1tpXSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVSUk9SLVwiK2krXCI6IFwiK21zZ1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobXNnW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vaWYgd2Ugc2F2ZWQgYSBzdGFjayB0cmFjZSB0byBjb25uZWN0IGFzeW5jLCBwdXNoIGl0XG4gICAgaWYoZGVmKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJCYWNrdHJhY2U6XCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhkZWYuYmFja3RyYWNlLnN0YWNrKTtcbiAgICB9XG5cbiAgICBpZihfcHJpdmF0ZS5jb25maWcuZGVidWdfbW9kZSl7XG4gICAgICAvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuICAgICAgZGVidWdnZXI7XG4gICAgfVxuXG4gICAgaWYoX3ByaXZhdGUuY29uZmlnLm1vZGUgPT09ICdicm93c2VyJyl7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgICAgcHJvY2Vzcy5leGl0KCk7XG4gICAgfVxufTtcblxuXG5fcHVibGljLmdldF9iYWNrdHJhY2VfaW5mbyA9IGZ1bmN0aW9uKHNzKXtcblxuICAgIHZhciByID0ge31cbiAgICAsbFxuICAgICxzdHI7XG5cbiAgICBsID0gci5zdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuXG4gICAgaWYoX3ByaXZhdGUuY29uZmlnLm1vZGUgPT09ICdicm93c2VyJyl7XG4gICAgICBsID0gbC5zcGxpdChzcylbMV0udHJpbSgpLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgc3RyID0gbC5wb3AoKTtcbiAgICAgIHdoaWxlKHN0ci5zZWFyY2goXCJvcmd5XCIpICE9PSAtMSAmJiBsLmxlbmd0aCA+IDApe1xuICAgICAgICAvL2l0ZXJhdGUgdW50aWwgb3V0c2lkZSBvZiBjbGFzc1xuICAgICAgICBzdHIgPSBsLnBvcCgpO1xuICAgICAgfVxuICAgICAgc3RyID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgc3RyLnNwbGl0KFwiLy9cIilbMV07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICBzdHIgPSBsLnNwbGl0KHNzICsgXCIgXCIpWzFdLnNwbGl0KFwiXFxuXCIpWzFdO1xuICAgICAgc3RyID0gc3RyLm1hdGNoKC9cXCgoW14pXSspXFwpLylbMV07XG4gICAgfVxuXG4gICAgLy9TZXQgb3JpZ2luXG4gICAgci5vcmlnaW4gPSBzdHI7XG5cbiAgICByZXR1cm4gcjtcbn07XG5cbl9wdWJsaWMuZGVmZXJyZWQgPSBEZWZlcnJlZC5kZWZlcnJlZDtcbl9wdWJsaWMucXVldWUgPSBRdWV1ZS5xdWV1ZTtcbl9wdWJsaWMuY2FzdCA9IENhc3QuY2FzdDtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKSxcbiAgICBNYWluID0gcmVxdWlyZSgnLi9tYWluLmpzJyksXG4gICAgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4qIFRlbXBsYXRlIG9iamVjdCBmb3IgYWxsIHF1ZXVlc1xuKlxuKiBAdHlwZSBvYmplY3RcbiovXG5fcHJpdmF0ZS50cGwgPSB7XG5cbiAgIG1vZGVsIDogJ3F1ZXVlJ1xuXG5cbiAgIC8vU0VUIFRSVUUgQUZURVIgUkVTT0xWRVIgRklSRURcbiAgICxyZXNvbHZlcl9maXJlZCA6IDBcblxuXG4gICAvL1BSRVZFTlRTIEEgUVVFVUUgRlJPTSBSRVNPTFZJTkcgRVZFTiBJRiBBTEwgREVQRU5ERU5DSUVTIE1FVFxuICAgLy9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG4gICAvL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcbiAgICxoYWx0X3Jlc29sdXRpb24gOiAwXG5cblxuICAgLy9VU0VEIFRPIENIRUNLIFNUQVRFLCBFTlNVUkVTIE9ORSBDT1BZXG4gICAsdXBzdHJlYW0gOiB7fVxuXG5cbiAgIC8vVVNFRCBSRVRVUk4gVkFMVUVTLCBFTlNVUkVTIE9SREVSXG4gICAsZGVwZW5kZW5jaWVzIDogW11cblxuXG4gICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgIC8vICBRVUVVRSBJTlNUQU5DRSBNRVRIT0RTXG4gICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4gICAvKipcbiAgICAqIEFkZCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byBhIHF1ZXVlJ3MgdXBzdHJlYW0gYXJyYXkuXG4gICAgKlxuICAgICogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG4gICAgKiB1cHN0cmVhbSBhcnJheSBhcmUgcmVzb2x2ZWQuXG4gICAgKlxuICAgICogV2hlbiBfcHVibGljLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcbiAgICAqIGRlcGVuZGVuY3kgaXMgbm90IHByZXZpb3VzbHkgc2NoZWR1bGVkIHRvIHJlc29sdmVcbiAgICAqIGRvd25zdHJlYW0gZnJvbSB0aGUgdGFyZ2V0LCBpbiB3aGljaFxuICAgICogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG4gICAgKlxuICAgICogQHBhcmFtIHthcnJheX0gYXJyICAvYXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRvIGFkZFxuICAgICogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuICAgICovXG4gICAsYWRkIDogZnVuY3Rpb24oYXJyKXtcblxuICAgICAgIHRyeXtcbiAgICAgICAgICAgaWYoYXJyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXMudXBzdHJlYW07XG4gICAgICAgfVxuICAgICAgIGNhdGNoKGVycil7XG4gICAgICAgICAgIE1haW4uZGVidWcoZXJyKTtcbiAgICAgICB9XG5cbiAgICAgICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG4gICAgICAgaWYodGhpcy5zdGF0ZSAhPT0gMCl7XG4gICAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoW1xuICAgICAgICAgICAgXCJDYW5ub3QgYWRkIGRlcGVuZGVuY3kgbGlzdCB0byBxdWV1ZSBpZDonXCIrdGhpcy5pZFxuICAgICAgICAgICAgK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiXG4gICAgICAgICAgXSxhcnIsdGhpcyk7XG4gICAgICAgfVxuXG4gICAgICAgZm9yKHZhciBhIGluIGFycil7XG5cbiAgICAgICAgICAgc3dpdGNoKHRydWUpe1xuXG4gICAgICAgICAgICAgICAvL0NIRUNLIElGIEVYSVNUU1xuICAgICAgICAgICAgICAgY2FzZSh0eXBlb2YgTWFpbi5saXN0W2FyclthXVsnaWQnXV0gPT09ICdvYmplY3QnKTpcbiAgICAgICAgICAgICAgICAgICBhcnJbYV0gPSBNYWluLmxpc3RbYXJyW2FdWydpZCddXTtcbiAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgLy9JRiBOT1QsIEFUVEVNUFQgVE8gQ09OVkVSVCBJVCBUTyBBTiBPUkdZIFBST01JU0VcbiAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIGFyclthXSA9PT0gJ29iamVjdCcgJiYgKCFhcnJbYV0uaXNfb3JneSkpOlxuICAgICAgICAgICAgICAgICAgIGFyclthXSA9IERlZmVycmVkLmNvbnZlcnRfdG9fcHJvbWlzZShhcnJbYV0se1xuICAgICAgICAgICAgICAgICAgICAgcGFyZW50IDogdGhpc1xuICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAvL1JFRiBJUyBBIFBST01JU0UuXG4gICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBhcnJbYV0udGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG4gICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIk9iamVjdCBjb3VsZCBub3QgYmUgY29udmVydGVkIHRvIHByb21pc2UuXCIpO1xuICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYXJyW2FdKTtcbiAgICAgICAgICAgICAgICAgICBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgfVxuXG4gICAgICAgICAgIC8vbXVzdCBjaGVjayB0aGUgdGFyZ2V0IHRvIHNlZSBpZiB0aGUgZGVwZW5kZW5jeSBleGlzdHMgaW4gaXRzIGRvd25zdHJlYW1cbiAgICAgICAgICAgZm9yKHZhciBiIGluIHRoaXMuZG93bnN0cmVhbSl7XG4gICAgICAgICAgICAgICBpZihiID09PSBhcnJbYV0uaWQpe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoW1xuICAgICAgICAgICAgICAgICAgICBcIkVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICdcIlxuICAgICAgICAgICAgICAgICAgICArYXJyW2FdLmlkK1wiJyB0byBxdWV1ZVwiK1wiICdcIlxuICAgICAgICAgICAgICAgICAgICArdGhpcy5pZCtcIicuXFxuIFByb21pc2Ugb2JqZWN0IGZvciAnXCJcbiAgICAgICAgICAgICAgICAgICAgK2FyclthXS5pZCtcIicgaXMgc2NoZWR1bGVkIHRvIHJlc29sdmUgZG93bnN0cmVhbSBmcm9tIHF1ZXVlICdcIlxuICAgICAgICAgICAgICAgICAgICArdGhpcy5pZCtcIicgc28gaXQgY2FuJ3QgYmUgYWRkZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICx0aGlzKTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuXG4gICAgICAgICAgIC8vQUREIFRPIFVQU1RSRUFNLCBET1dOU1RSRUFNLCBERVBFTkRFTkNJRVNcbiAgICAgICAgICAgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdO1xuICAgICAgICAgICBhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXSA9IHRoaXM7XG4gICAgICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKTtcbiAgICAgICB9XG5cbiAgICAgICByZXR1cm4gdGhpcy51cHN0cmVhbTtcbiAgIH1cblxuXG4gICAvKipcbiAgICAqIFJlbW92ZSBsaXN0IGZyb20gYSBxdWV1ZS5cbiAgICAqXG4gICAgKiBAcGFyYW0ge2FycmF5fSBhcnJcbiAgICAqIEByZXR1cm5zIHthcnJheX0gYXJyYXkgb2YgbGlzdCB0aGUgcXVldWUgaXMgdXBzdHJlYW1cbiAgICAqL1xuICAgLHJlbW92ZSA6IGZ1bmN0aW9uKGFycil7XG5cbiAgICAgIC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBSRU1PVkFMXG4gICAgICBpZih0aGlzLnN0YXRlICE9PSAwKXtcbiAgICAgICAgICByZXR1cm4gTWFpbi5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgbGlzdCBmcm9tIHF1ZXVlIGlkOidcIit0aGlzLmlkK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiKTtcbiAgICAgIH1cblxuICAgICAgZm9yKHZhciBhIGluIGFycil7XG4gICAgICAgICBpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pe1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcbiAgICAgICAgICAgIGRlbGV0ZSBhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXTtcbiAgICAgICAgIH1cbiAgICAgIH1cbiAgIH1cblxuXG4gIC8qKlxuICAgKiBSZXNldHMgYW4gZXhpc3Rpbmcsc2V0dGxlZCBxdWV1ZSBiYWNrIHRvIE9yZ3lpbmcgc3RhdGUuXG4gICAqIENsZWFycyBvdXQgdGhlIGRvd25zdHJlYW0uXG4gICAqIEZhaWxzIGlmIG5vdCBzZXR0bGVkLlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAgKiBAcmV0dXJucyB7X3ByaXZhdGUudHBsfEJvb2xlYW59XG4gICAqL1xuICAgLHJlc2V0IDogZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgICAgIGlmKHRoaXMuc2V0dGxlZCAhPT0gMSB8fCB0aGlzLnN0YXRlICE9PSAxKXtcbiAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuICAgICAgfVxuXG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgdGhpcy5zZXR0bGVkID0gMDtcbiAgICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgICAgdGhpcy5yZXNvbHZlcl9maXJlZCA9IDA7XG4gICAgICB0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG4gICAgICAvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcbiAgICAgIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICAgICAgfVxuXG4gICAgICAvL0NMRUFSIE9VVCBUSEUgRE9XTlNUUkVBTVxuICAgICAgdGhpcy5kb3duc3RyZWFtID0ge307XG4gICAgICB0aGlzLmRlcGVuZGVuY2llcyA9IFtdO1xuXG4gICAgICAvL1NFVCBORVcgQVVUTyBUSU1FT1VUXG4gICAgICBEZWZlcnJlZC5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cbiAgICAgIC8vUE9JTlRMRVNTIC0gV0lMTCBKVVNUIElNTUVESUFURUxZIFJFU09MVkUgU0VMRlxuICAgICAgLy90aGlzLmNoZWNrX3NlbGYoKVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgIH1cblxuXG4gICAvKipcbiAgICAqIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcbiAgICAqIGNhbiBiZSByZXNvbHZlZC5cbiAgICAqXG4gICAgKiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2FkcyxcbiAgICAqIHNvIGlzIG5vdCBuZWVkZWQgdW5sZXNzOlxuICAgICpcbiAgICAqIC1kZWJ1Z2dpbmdcbiAgICAqXG4gICAgKiAtdGhlIHF1ZXVlIGhhcyBiZWVuIHJlc2V0IGFuZCBubyBuZXdcbiAgICAqIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuICAgICpcbiAgICAqIEByZXR1cm5zIHtpbnR9IFN0YXRlIG9mIHRoZSBxdWV1ZS5cbiAgICAqL1xuICAgLGNoZWNrX3NlbGYgOiBmdW5jdGlvbigpe1xuICAgICAgX3B1YmxpYy5yZWNlaXZlX3NpZ25hbCh0aGlzLHRoaXMuaWQpO1xuICAgICAgcmV0dXJuIHRoaXMuc3RhdGU7XG4gICB9XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHF1ZXVlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogICAgICAgICAge3N0cmluZ30gIGlkICAvT3B0aW9uYWwuIFVzZSB0aGUgaWQgd2l0aCBPcmd5LmdldChpZCkuIERlZmF1bHRzIHRvIGxpbmUgbnVtYmVyIG9mIGluc3RhbnRpYXRpb24sIHBsdXMgYW4gaXRlcmF0b3IuXG4gKiAgICAgICAgICB7Y2FsbGJhY2socmVzdWx0LGRlZmVycmVkKX0gcmVzb2x2ZXIgL0NhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgYWZ0ZXIgYWxsIGRlcGVuZGVuY2llcyBoYXZlIHJlc29sdmVkLiBBcmcxIGlzIGFuIGFycmF5IG9mIHRoZSBkZXBlbmRlbmNpZXMnIHJlc29sdmVkIHZhbHVlcy4gQXJnMiBpcyB0aGUgZGVmZXJyZWQgb2JqZWN0LiBUaGUgcXVldWUgd2lsbCBvbmx5IHJlc29sdmUgd2hlbiBBcmcyLnJlc29sdmUoKSBpcyBjYWxsZWQuIElmIG5vdCwgaXQgd2lsbCB0aW1lb3V0IHRvIG9wdGlvbnMudGltZW91dCB8fCBPcmd5LmNvbmZpZy50aW1lb3V0LlxuICogICAgICAgICAge251bWJlcn0gdGltZW91dCAvdGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLiBEZWZhdWx0cyB0byBPcmd5LmNvbmZpZygpLnRpbWVvdXQgWzUwMDBdLiBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suIFRoZW4sZG9uZSBkZWxheXMgd2lsbCBub3QgZmxhZyBhIHRpbWVvdXQgYmVjYXVzZSB0aGV5IGFyZSBjYWxsZWQgYWZ0ZXIgdGhlIGluc3RhbmNlIGlzIGNvbnNpZGVyZWQgcmVzb2x2ZWQuXG4gKlxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuX3B1YmxpYy5xdWV1ZSA9IGZ1bmN0aW9uKGRlcHMsb3B0aW9ucyl7XG5cbiAgdmFyIF9vO1xuICBpZighKGRlcHMgaW5zdGFuY2VvZiBBcnJheSkpe1xuICAgIHJldHVybiBNYWluLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy9ET0VTIE5PVCBBTFJFQURZIEVYSVNUXG4gIGlmKCFNYWluLmxpc3Rbb3B0aW9ucy5pZF0pe1xuXG4gICAgLy9DUkVBVEUgTkVXIFFVRVVFIE9CSkVDVFxuICAgIHZhciBfbyA9IF9wcml2YXRlLmZhY3Rvcnkob3B0aW9ucyk7XG5cbiAgICAvL0FDVElWQVRFIFFVRVVFXG4gICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyxvcHRpb25zLGRlcHMpO1xuXG4gIH1cbiAgLy9BTFJFQURZIEVYSVNUU1xuICBlbHNlIHtcblxuICAgIF9vID0gTWFpbi5saXN0W29wdGlvbnMuaWRdO1xuXG4gICAgaWYoX28ubW9kZWwgIT09ICdxdWV1ZScpe1xuICAgIC8vTUFUQ0ggRk9VTkQgQlVUIE5PVCBBIFFVRVVFLCBVUEdSQURFIFRPIE9ORVxuXG4gICAgICBvcHRpb25zLm92ZXJ3cml0YWJsZSA9IDE7XG5cbiAgICAgIF9vID0gX3ByaXZhdGUudXBncmFkZShfbyxvcHRpb25zLGRlcHMpO1xuICAgIH1cbiAgICBlbHNle1xuXG4gICAgICAvL09WRVJXUklURSBBTlkgRVhJU1RJTkcgT1BUSU9OU1xuICAgICAgZm9yKHZhciBpIGluIG9wdGlvbnMpe1xuICAgICAgICBfb1tpXSA9IG9wdGlvbnNbaV07XG4gICAgICB9XG5cbiAgICAgIC8vQUREIEFERElUSU9OQUwgREVQRU5ERU5DSUVTIElGIE5PVCBSRVNPTFZFRFxuICAgICAgaWYoZGVwcy5sZW5ndGggPiAwKXtcbiAgICAgICAgX3ByaXZhdGUudHBsLmFkZC5jYWxsKF9vLGRlcHMpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgLy9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuICAgIF9vLmhhbHRfcmVzb2x1dGlvbiA9ICh0eXBlb2Ygb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gIT09ICd1bmRlZmluZWQnKSA/XG4gICAgb3B0aW9ucy5oYWx0X3Jlc29sdXRpb24gOiAwO1xuICB9XG5cbiAgcmV0dXJuIF9vO1xufTtcblxuXG5cbi8qKlxuKiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG4qIGluIGl0cyB1cHN0cmVhbSBhbmQgY2hlY2sgdG8gc2VlIGlmIGFsbCBhcmUgcmVzb2x2ZWQuXG4qXG4qIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2VcbiogaW4gaXRzIHVwc3RyZWFtLlxuKlxuKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4qIEBwYXJhbSB7c3RyaW5nfSBmcm9tX2lkXG4qIEByZXR1cm5zIHt2b2lkfVxuKi9cbl9wdWJsaWMucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCl7XG5cbiAgICBpZih0YXJnZXQuaGFsdF9yZXNvbHV0aW9uID09PSAxKSByZXR1cm47XG5cbiAgIC8vTUFLRSBTVVJFIFRIRSBTSUdOQUwgV0FTIEZST00gQSBQUk9NSVNFIEJFSU5HIExJU1RFTkVEIFRPXG4gICAvL0JVVCBBTExPVyBTRUxGIFNUQVRVUyBDSEVDS1xuICAgaWYoZnJvbV9pZCAhPT0gdGFyZ2V0LmlkICYmICF0YXJnZXQudXBzdHJlYW1bZnJvbV9pZF0pe1xuICAgICAgIHJldHVybiBNYWluLmRlYnVnKGZyb21faWQgKyBcIiBjYW4ndCBzaWduYWwgXCIgKyB0YXJnZXQuaWQgKyBcIiBiZWNhdXNlIG5vdCBpbiB1cHN0cmVhbS5cIik7XG4gICB9XG4gICAvL1JVTiBUSFJPVUdIIFFVRVVFIE9GIE9CU0VSVklORyBQUk9NSVNFUyBUTyBTRUUgSUYgQUxMIERPTkVcbiAgIGVsc2V7XG4gICAgICAgdmFyIHN0YXR1cyA9IDE7XG4gICAgICAgZm9yKHZhciBpIGluIHRhcmdldC51cHN0cmVhbSl7XG4gICAgICAgICAgIC8vU0VUUyBTVEFUVVMgVE8gMCBJRiBBTlkgT0JTRVJWSU5HIEhBVkUgRkFJTEVELCBCVVQgTk9UIElGIFBFTkRJTkcgT1IgUkVTT0xWRURcbiAgICAgICAgICAgaWYodGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlICE9PSAxKSB7XG4gICAgICAgICAgICAgICBzdGF0dXMgPSB0YXJnZXQudXBzdHJlYW1baV0uc3RhdGU7XG4gICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgfVxuICAgICAgIH1cbiAgIH1cblxuICAgLy9SRVNPTFZFIFFVRVVFIElGIFVQU1RSRUFNIEZJTklTSEVEXG4gICBpZihzdGF0dXMgPT09IDEpe1xuXG4gICAgICAgIC8vR0VUIFJFVFVSTiBWQUxVRVMgUEVSIERFUEVOREVOQ0lFUywgV0hJQ0ggU0FWRVMgT1JERVIgQU5EXG4gICAgICAgIC8vUkVQT1JUUyBEVVBMSUNBVEVTXG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgZm9yKHZhciBpIGluIHRhcmdldC5kZXBlbmRlbmNpZXMpe1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godGFyZ2V0LmRlcGVuZGVuY2llc1tpXS52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBEZWZlcnJlZC50cGwucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpO1xuICAgfVxuXG4gICBpZihzdGF0dXMgPT09IDIpe1xuICAgICAgIHZhciBlcnIgPSBbXG4gICAgICAgICAgIHRhcmdldC5pZCtcIiBkZXBlbmRlbmN5ICdcIit0YXJnZXQudXBzdHJlYW1baV0uaWQgKyBcIicgd2FzIHJlamVjdGVkLlwiXG4gICAgICAgICAgICx0YXJnZXQudXBzdHJlYW1baV0uYXJndW1lbnRzXG4gICAgICAgXTtcbiAgICAgICBEZWZlcnJlZC50cGwucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpO1xuICAgfVxufTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG5fcHJpdmF0ZS5mYWN0b3J5ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cbiAgLy9DUkVBVEUgQSBORVcgUVVFVUUgT0JKRUNUXG4gIHZhciBfbyA9IF8uYXNzaWduKHt9LFtcbiAgICBEZWZlcnJlZC50cGxcbiAgICAsX3ByaXZhdGUudHBsXG4gICAgLG9wdGlvbnNcbiAgXSk7XG5cbiAgLy9HZXQgYmFja3RyYWNlIGluZm8gaWYgbm9uZSBmb3VuZCBbbWF5IGJlIHNldCBAIE1haW4uZGVmaW5lXVxuICBpZighX28uYmFja3RyYWNlKXtcbiAgICBfby5iYWNrdHJhY2UgPSBNYWluLmdldF9iYWNrdHJhY2VfaW5mbygncXVldWUnKTtcbiAgfVxuXG4gIC8vaWYgbm8gaWQsIHVzZSBiYWNrdHJhY2Ugb3JpZ2luXG4gIGlmKCFvcHRpb25zLmlkKXtcbiAgICBfby5pZCA9IF9vLmJhY2t0cmFjZS5vcmlnaW4gKyAnLScgKyAoKytNYWluW2ldKTtcbiAgfVxuXG4gIHJldHVybiBfbztcbn07XG5cblxuLyoqXG4gKiBBY3RpdmF0ZXMgYSBxdWV1ZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZVxuICovXG5fcHJpdmF0ZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG8sb3B0aW9ucyxkZXBzKXtcblxuICAgIC8vQUNUSVZBVEUgQVMgQSBERUZFUlJFRFxuICAgIG8gPSBEZWZlcnJlZC5hY3RpdmF0ZShvKTtcblxuICAgIC8vQHRvZG8gcmV0aGluayB0aGlzXG4gICAgLy9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG4gICAgLy9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG4gICAgLy9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcbiAgICAvL3JlbW90ZSBzb3VyY2UgaGVyZS5cbiAgICAvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuICAgIC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG4gICAgLy90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cbiAgICBvLnN0YXRlID0gLTE7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAvL1Jlc3RvcmUgc3RhdGVcbiAgICAgIG8uc3RhdGUgPSAwO1xuXG4gICAgICAvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcbiAgICAgIF9wcml2YXRlLnRwbC5hZGQuY2FsbChvLGRlcHMpO1xuXG4gICAgICAvL1NFRSBJRiBDQU4gQkUgSU1NRURJQVRFTFkgUkVTT0xWRUQgQlkgQ0hFQ0tJTkcgVVBTVFJFQU1cbiAgICAgIF9wdWJsaWMucmVjZWl2ZV9zaWduYWwobyxvLmlkKTtcblxuICAgICAgLy9BU1NJR04gVEhJUyBRVUVVRSBVUFNUUkVBTSBUTyBPVEhFUiBRVUVVRVNcbiAgICAgIGlmKG8uYXNzaWduKXtcbiAgICAgICAgICBmb3IodmFyIGEgaW4gby5hc3NpZ24pe1xuICAgICAgICAgICAgICBfcHVibGljLmFzc2lnbihvLmFzc2lnblthXSxbb10sdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH0sMSk7XG5cbiAgICByZXR1cm4gbztcbn07XG5cblxuLyoqXG4qIFVwZ3JhZGVzIGEgcHJvbWlzZSBvYmplY3QgdG8gYSBxdWV1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuKiBAcGFyYW0ge2FycmF5fSBkZXBzIFxcZGVwZW5kZW5jaWVzXG4qIEByZXR1cm5zIHtvYmplY3R9IHF1ZXVlIG9iamVjdFxuKi9cbl9wcml2YXRlLnVwZ3JhZGUgPSBmdW5jdGlvbihvYmosb3B0aW9ucyxkZXBzKXtcblxuICAgIGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09ICdwcm9taXNlJyAmJiBvYmoubW9kZWwgIT09ICdkZWZlcnJlZCcpKXtcbiAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoJ0NhbiBvbmx5IHVwZ3JhZGUgdW5zZXR0bGVkIHByb21pc2Ugb3IgZGVmZXJyZWQgaW50byBhIHF1ZXVlLicpO1xuICAgIH1cblxuICAgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuICAgIHZhciBfbyA9IF8uYXNzaWduKHt9LFtcbiAgICAgICAgX3ByaXZhdGUudHBsXG4gICAgICAgICxvcHRpb25zXG4gICAgXSk7XG5cbiAgICBmb3IodmFyIGkgaW4gX28pe1xuICAgICAgIG9ialtpXSA9IF9vW2ldO1xuICAgIH1cblxuICAgIC8vZGVsZXRlIF9vO1xuXG4gICAgLy9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG4gICAgb2JqID0gX3ByaXZhdGUuYWN0aXZhdGUob2JqLG9wdGlvbnMsZGVwcyk7XG5cbiAgICAvL1JFVFVSTiBRVUVVRSBPQkpFQ1RcbiAgICByZXR1cm4gb2JqO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIl19
