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

},{"./deferred.js":3,"./main.js":6,"lodash":undefined}]},{},[2,3,4,5,6,7]);
