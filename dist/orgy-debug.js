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

var _ = require("lodash"),
    Main = require("./main.js"),
    Config = Main.config,
    Queue = require("./queue.js"),
    Tpl = require("./deferred.tpl.js"),
    File_loader = require("./file_loader.js");

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
    Config = Main.config;

tpl = {};

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
publlc.cast = Cast.cast;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvY2FzdC5qcyIsIi92YXIvd3d3L29yZ3ktanMvc3JjL2pzL2RlZmVycmVkLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZGVmZXJyZWQudHBsLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvZmlsZV9sb2FkZXIuanMiLCIvdmFyL3d3dy9vcmd5LWpzL3NyYy9qcy9tYWluLmpzIiwiL3Zhci93d3cvb3JneS1qcy9zcmMvanMvcXVldWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMURBLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDM0IsUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDbkMsT0FBTyxHQUFHLEVBQUU7SUFDWixRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztB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QyxPQUFPLEdBQUcsVUFBUyxHQUFHLEVBQUMsT0FBTyxFQUFDLElBQUksRUFBQzs7QUFFekMsUUFBRyxHQUFHLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSyxHQUFHLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsS0FBSyxLQUFLLFVBQVUsQUFBQyxFQUFDO0FBQzFFLGVBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO0tBQ3JGOzs7QUFHRCxRQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBQyxDQUNqQixRQUFRLENBQUMsR0FBRyxFQUNYLE9BQU8sQ0FDWCxDQUFDLENBQUM7O0FBRUgsU0FBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUM7QUFDYixXQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCOzs7OztBQUtELE9BQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBQyxPQUFPLEVBQUMsSUFBSSxDQUFDLENBQUM7OztBQUcxQyxXQUFPLEdBQUcsQ0FBQztDQUNkLENBQUM7O0FBRUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBNYWluID0gcmVxdWlyZSgnLi9tYWluLmpzJyksXG4gICAgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQ2FzdHMgYW4gb2JqZWN0IGludG8gYW4gT3JneSBkZWZlcnJlZC5cbiAqXG4gKiA+IE9iamVjdCB0byBiZSBjYXN0ZWQgbXVzdCBoYXZlIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqICAtIHRoZW4oKVxuICogIC0gZXJyb3IoKVxuICpcbiAqID4gSWYgdGhlIGNhc3RlZCBvYmplY3QgaGFzIGFuIGlkIG9yIHVybCBwcm9wZXJ0eSBzZXQsIHRoZSBpZCBvciB1cmxcbiAqIFtpbiB0aGF0IG9yZGVyXSB3aWxsIGJlY29tZSB0aGUgaWQgb2YgdGhlIGRlZmVycmVkIGZvciByZWZlcmVuY2luZ1xuICogd2l0aCBPcmd5LmdldChpZClcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqICAvdGhlbmFibGVcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMuY2FzdCA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgcmVxdWlyZWQgPSBbXCJ0aGVuXCIsXCJlcnJvclwiXTtcbiAgICBmb3IodmFyIGkgaW4gcmVxdWlyZWQpe1xuICAgICAgICBpZighb2JqW3JlcXVpcmVkW2ldXSl7XG4gICAgICAgICAgICByZXR1cm4gTWFpbi5kZWJ1ZyhcIkNhc3RhYmxlIG9iamVjdHMgcmVxdWlyZSB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6IFwiXG4gICAgICAgICAgICAgICAgKyByZXF1aXJlZFtpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIGlmKG9iai5pZCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBvYmouaWQ7XG4gICAgfVxuICAgIGVsc2UgaWYob2JqLnVybCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBvYmoudXJsO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9HZXQgYmFja3RyYWNlIGluZm8gaWYgbm9uZSBmb3VuZCBbbWF5IGJlIHNldCBAIF9wdWJsaWMuZGVmaW5lXVxuICAgICAgdmFyIGJhY2t0cmFjZSA9IE1haW4uZ2V0X2JhY2t0cmFjZV9pbmZvKCdjYXN0Jyk7XG5cbiAgICAgIC8vaWYgbm8gaWQsIHVzZSBiYWNrdHJhY2Ugb3JpZ2luXG4gICAgICBpZighb3B0aW9ucy5pZCl7XG4gICAgICAgIG9wdGlvbnMuaWQgPSBiYWNrdHJhY2Uub3JpZ2luICsgJy0nICsgKCsrTWFpbltpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9DcmVhdGUgYSBkZWZlcnJlZFxuICAgIHZhciBkZWYgPSBEZWZlcnJlZChvcHRpb25zKTtcblxuICAgIC8vQ3JlYXRlIHJlc29sdmVyXG4gICAgdmFyIHJlc29sdmVyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgZGVmLnJlc29sdmUuY2FsbChkZWYsYXJndW1lbnRzWzBdKTtcbiAgICB9O1xuXG4gICAgLy9TZXQgUmVzb2x2ZXJcbiAgICBvYmoudGhlbihyZXNvbHZlcik7XG5cbiAgICAvL0NyZWF0ZSBSZWplY3RvclxuICAgIHZhciBlcnIgPSBmdW5jdGlvbihlcnIpe1xuICAgICAgZGVmLnJlamVjdChlcnIpO1xuICAgIH07XG5cbiAgICAvL1NldCByZWplY3RvclxuICAgIG9iai5lcnJvcihlcnIpO1xuXG4gICAgLy9SZXR1cm4gZGVmZXJyZWRcbiAgICByZXR1cm4gZGVmO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKSxcbk1haW4gPSByZXF1aXJlKCcuL21haW4uanMnKSxcbkNvbmZpZyA9IE1haW4uY29uZmlnLFxuUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyksXG5UcGwgPSByZXF1aXJlKCcuL2RlZmVycmVkLnRwbC5qcycpLFxuRmlsZV9sb2FkZXIgPSByZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJyk7XG5cblxudmFyIF9wdWJsaWMgPSB7fSxcbiAgICBfcHJpdmF0ZSA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogICAgICAgICAge3N0cmluZ30gIGlkICAvT3B0aW9uYWwuIFVzZSB0aGUgaWQgd2l0aCBPcmd5LmdldChpZCkuIERlZmF1bHRzIHRvIGxpbmUgbnVtYmVyIG9mIGluc3RhbnRpYXRpb24sIHBsdXMgYW4gaXRlcmF0b3IuXG4gKiAgICAgICAgICB7bnVtYmVyfSB0aW1lb3V0IC90aW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQuIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uIE5vdGUgdGhlIHRpbWVvdXQgaXMgb25seSBhZmZlY3RlZCBieSBkZXBlbmRlbmNpZXMgYW5kL29yIHRoZSByZXNvbHZlciBjYWxsYmFjay4gVGhlbixkb25lIGRlbGF5cyB3aWxsIG5vdCBmbGFnIGEgdGltZW91dCBiZWNhdXNlIHRoZXkgYXJlIGNhbGxlZCBhZnRlciB0aGUgaW5zdGFuY2UgaXMgY29uc2lkZXJlZCByZXNvbHZlZC5cbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMuZGVmZXJyZWQgPSBmdW5jdGlvbihvcHRpb25zKXtcblxuICAgIHZhciBfbztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmKG9wdGlvbnMuaWQgJiYgTWFpbi5saXN0W29wdGlvbnMuaWRdKXtcbiAgICAgICAgX28gPSBNYWluLmxpc3Rbb3B0aW9ucy5pZF07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBERUZFUlJFRCBDTEFTU1xuICAgICAgICBfbyA9IF9wcml2YXRlLmZhY3Rvcnkob3B0aW9ucyk7XG5cbiAgICAgICAgLy9BQ1RJVkFURSBERUZFUlJFRFxuICAgICAgICBfbyA9IF9wcml2YXRlLmFjdGl2YXRlKF9vKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuX3ByaXZhdGUuZmFjdG9yeSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgdmFyIF9vID0gXy5hc3NpZ24oe30sW1xuICAgICAgVHBsXG4gICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgLy9HZXQgYmFja3RyYWNlIGluZm8gaWYgbm9uZSBmb3VuZCBbbWF5IGJlIHNldCBAIF9wdWJsaWMuZGVmaW5lXVxuICAgIGlmKCFfby5iYWNrdHJhY2Upe1xuICAgICAgX28uYmFja3RyYWNlID0gTWFpbi5nZXRfYmFja3RyYWNlX2luZm8oJ2RlZmVycmVkJyk7XG4gICAgfVxuXG4gICAgLy9pZiBubyBpZCwgdXNlIGJhY2t0cmFjZSBvcmlnaW5cbiAgICBpZighb3B0aW9ucy5pZCl7XG4gICAgICBfby5pZCA9IF9vLmJhY2t0cmFjZS5vcmlnaW4gKyAnLScgKyAoKytNYWluW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gX287XG59O1xuXG5cbl9wcml2YXRlLnNldHRsZSA9IGZ1bmN0aW9uKGRlZil7XG5cbiAgICAvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcbiAgICBpZihkZWYudGltZW91dF9pZCl7XG4gICAgICAgIGNsZWFyVGltZW91dChkZWYudGltZW91dF9pZCk7XG4gICAgfVxuXG5cbiAgICAvL1NldCBzdGF0ZSB0byByZXNvbHZlZFxuICAgIF9wcml2YXRlLnNldF9zdGF0ZShkZWYsMSk7XG5cblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ29uZmlnLmhvb2tzLm9uU2V0dGxlKXtcbiAgICAgIENvbmZpZy5ob29rcy5vblNldHRsZShkZWYpO1xuICAgIH1cblxuXG4gICAgLy9BZGQgZG9uZSBhcyBhIGNhbGxiYWNrIHRvIHRoZW4gY2hhaW4gY29tcGxldGlvbi5cbiAgICBkZWYuY2FsbGJhY2tzLnRoZW4uaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKGQyLGl0aW5lcmFyeSxsYXN0KXtcbiAgICAgICAgZGVmLmNhYm9vc2UgPSBsYXN0O1xuXG4gICAgICAgIC8vUnVuIGRvbmVcbiAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAsZGVmLmNhbGxiYWNrcy5kb25lXG4gICAgICAgICAgICAsZGVmLmNhYm9vc2VcbiAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgKTtcblxuICAgIH0pO1xuXG5cbiAgICAvL1J1biB0aGVuIHF1ZXVlXG4gICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICBkZWZcbiAgICAgICAgLGRlZi5jYWxsYmFja3MudGhlblxuICAgICAgICAsZGVmLnZhbHVlXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuICAgICk7XG5cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBmdW5jdGlvbnMgc2VxdWVudGlhbGx5IGFzIGEgcGFydGlhbCBmdW5jdGlvbi5cbiAqIEVhY2ggZnVuY3Rpb24ncyBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IG9mIGl0cyBwcmVkZWNlc3NvciBmdW5jdGlvbi5cbiAqXG4gKiBCeSBkZWZhdWx0LCBleGVjdXRpb24gY2hhaW4gaXMgcGF1c2VkIHdoZW4gYW55IGZ1bmN0aW9uXG4gKiByZXR1cm5zIGFuIHVucmVzb2x2ZWQgZGVmZXJyZWQuIChwYXVzZV9vbl9kZWZlcnJlZCkgW09QVElPTkFMXVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWYgIC9kZWZlcnJlZCBvYmplY3RcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC9pdGluZXJhcnlcbiAqICAgICAgdHJhaW4gICAgICAge2FycmF5fVxuICogICAgICBob29rcyAgICAgICB7b2JqZWN0fVxuICogICAgICAgICAgb25CZWZvcmUgICAgICAgIHthcnJheX1cbiAqICAgICAgICAgIG9uQ29tcGxldGUgICAgICB7YXJyYXl9XG4gKiBAcGFyYW0ge21peGVkfSBwYXJhbSAvcGFyYW0gdG8gcGFzcyB0byBmaXJzdCBjYWxsYmFja1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqICAgICAgcGF1c2Vfb25fZGVmZXJyZWQgICB7Ym9vbGVhbn1cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3ByaXZhdGUucnVuX3RyYWluID0gZnVuY3Rpb24oZGVmLG9iaixwYXJhbSxvcHRpb25zKXtcblxuICAgIC8vYWxsb3cgcHJldmlvdXMgcmV0dXJuIHZhbHVlcyB0byBiZSBwYXNzZWQgZG93biBjaGFpblxuICAgIHZhciByID0gcGFyYW0gfHwgZGVmLmNhYm9vc2UgfHwgZGVmLnZhbHVlO1xuXG4gICAgLy9vbkJlZm9yZSBldmVudFxuICAgIGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25CZWZvcmUudHJhaW4ubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgIGRlZlxuICAgICAgICAgICAgLG9iai5ob29rcy5vbkJlZm9yZVxuICAgICAgICAgICAgLHBhcmFtXG4gICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgd2hpbGUob2JqLnRyYWluLmxlbmd0aCA+IDApe1xuXG4gICAgICAgIC8vcmVtb3ZlIGZuIHRvIGV4ZWN1dGVcbiAgICAgICAgdmFyIGxhc3QgPSBvYmoudHJhaW4uc2hpZnQoKTtcbiAgICAgICAgZGVmLmV4ZWN1dGlvbl9oaXN0b3J5LnB1c2gobGFzdCk7XG5cbiAgICAgICAgLy9kZWYuY2Fib29zZSBuZWVkZWQgZm9yIHRoZW4gY2hhaW4gZGVjbGFyZWQgYWZ0ZXIgcmVzb2x2ZWQgaW5zdGFuY2VcbiAgICAgICAgciA9IGRlZi5jYWJvb3NlID0gbGFzdC5jYWxsKGRlZixkZWYudmFsdWUsZGVmLHIpO1xuXG4gICAgICAgIC8vaWYgcmVzdWx0IGlzIGFuIHRoZW5hYmxlLCBoYWx0IGV4ZWN1dGlvblxuICAgICAgICAvL2FuZCBydW4gdW5maXJlZCBhcnIgd2hlbiB0aGVuYWJsZSBzZXR0bGVzXG4gICAgICAgIGlmKG9wdGlvbnMucGF1c2Vfb25fZGVmZXJyZWQpe1xuXG4gICAgICAgICAgICAvL0lmIHIgaXMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG4gICAgICAgICAgICBpZihyICYmIHIudGhlbiAmJiByLnNldHRsZWQgIT09IDEpe1xuXG4gICAgICAgICAgICAgICAgLy9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlciByIHJlc29sdmVzXG4gICAgICAgICAgICAgICAgci5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblxuICAgICAgICAgICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICxyXG4gICAgICAgICAgICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9JZiBpcyBhbiBhcnJheSB0aGFuIGNvbnRhaW5zIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuICAgICAgICAgICAgZWxzZSBpZihyIGluc3RhbmNlb2YgQXJyYXkpe1xuXG4gICAgICAgICAgICAgICAgdmFyIHRoZW5hYmxlcyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHIpe1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHJbaV0udGhlbiAmJiByW2ldLnNldHRsZWQgIT09IDEpe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVuYWJsZXMucHVzaChyW2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gKGZ1bmN0aW9uKHQsZGVmLG9iaixwYXJhbSl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0JhaWwgaWYgYW55IHRoZW5hYmxlcyB1bnNldHRsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodFtpXS5zZXR0bGVkICE9PSAxKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICxwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSkodGhlbmFibGVzLGRlZixvYmoscGFyYW0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2V4ZWN1dGUgcmVzdCBvZiB0aGlzIHRyYWluIGFmdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FsbCB0aGVuYWJsZXMgZm91bmQgaW4gciByZXNvbHZlXG4gICAgICAgICAgICAgICAgICAgICAgICByW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGVybWluYXRlIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9vbkNvbXBsZXRlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApe1xuICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9KTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHBhcmFtIHtudW1iZXJ9IGludFxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wcml2YXRlLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKGRlZixpbnQpe1xuXG4gICAgZGVmLnN0YXRlID0gaW50O1xuXG4gICAgLy9JRiBSRVNPTFZFRCBPUiBSRUpFQ1RFRCwgU0VUVExFXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMil7XG4gICAgICAgIGRlZi5zZXR0bGVkID0gMTtcbiAgICB9XG5cbiAgICBpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcbiAgICAgICAgX3ByaXZhdGUuc2lnbmFsX2Rvd25zdHJlYW0oZGVmKTtcbiAgICB9XG59O1xuXG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5fcHJpdmF0ZS5nZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYpe1xuICAgIHJldHVybiBkZWYuc3RhdGU7XG59O1xuXG5cbl9wcml2YXRlLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuICAgIC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuICAgIGlmKE1haW4ubGlzdFtvYmouaWRdICYmICFNYWluLmxpc3Rbb2JqLmlkXS5vdmVyd3JpdGFibGUpe1xuICAgICAgICBNYWluLmRlYnVnKFwiVHJpZWQgdG8gb3ZlcndyaXRlIFwiK29iai5pZCtcIiB3aXRob3V0IG92ZXJ3cml0ZSBwZXJtaXNzaW9ucy5cIik7XG4gICAgICAgIHJldHVybiBNYWluLmxpc3Rbb2JqLmlkXTtcbiAgICB9XG5cbiAgICAvL1NBVkUgVE8gTUFTVEVSIExJU1RcbiAgICBNYWluLmxpc3Rbb2JqLmlkXSA9IG9iajtcblxuICAgIC8vQVVUTyBUSU1FT1VUXG4gICAgX3ByaXZhdGUuYXV0b190aW1lb3V0LmNhbGwob2JqKTtcblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ29uZmlnLmhvb2tzLm9uQWN0aXZhdGUpe1xuICAgICAgQ29uZmlnLmhvb2tzLm9uQWN0aXZhdGUob2JqKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIGF1dG9tYXRpYyB0aW1lb3V0IG9uIGEgcHJvbWlzZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtpbnRlZ2VyfSB0aW1lb3V0IChvcHRpb25hbClcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5fcHJpdmF0ZS5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbih0aW1lb3V0KXtcblxuICAgIHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgPyB0aGlzLnRpbWVvdXQgOiB0aW1lb3V0O1xuXG4gICAgLy9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG4gICAgaWYoIXRoaXMudHlwZSB8fCB0aGlzLnR5cGUgIT09ICd0aW1lcicpe1xuXG4gICAgICAgIC8vREVMRVRFIFBSRVZJT1VTIFRJTUVPVVQgSUYgRVhJU1RTXG4gICAgICAgIGlmKHRoaXMudGltZW91dF9pZCl7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgIE1haW4uZGVidWcoW1xuICAgICAgICAgICAgICBcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuICAgICAgICAgICAgICAsdGhpcy5pZFxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy50aW1lb3V0ID09PSAtMSl7XG4gICAgICAgICAgICAvL05PIEFVVE8gVElNRU9VVCBTRVRcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGltZW91dF9pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIF9wcml2YXRlLmF1dG9fdGltZW91dF9jYi5jYWxsKHNjb3BlKTtcbiAgICAgICAgfSwgdGhpcy50aW1lb3V0KTtcblxuICAgIH1cbiAgICBlbHNle1xuICAgICAgICAvL0B0b2RvIFdIRU4gQSBUSU1FUiwgQUREIERVUkFUSU9OIFRPIEFMTCBVUFNUUkVBTSBBTkQgTEFURVJBTD9cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiBDYWxsYmFjayBmb3IgYXV0b3RpbWVvdXQuIERlY2xhcmF0aW9uIGhlcmUgYXZvaWRzIG1lbW9yeSBsZWFrLlxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHJpdmF0ZS5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpe1xuXG4gICAgaWYodGhpcy5zdGF0ZSAhPT0gMSl7XG5cbiAgICAgICAgLy9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG4gICAgICAgIHZhciBtc2dzID0gW107XG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgIGlmKG9iai5zdGF0ZSAhPT0gMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSxcbiAgICAgICAgICogYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiAgICAgICAgICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGlmKENvbmZpZy5kZWJ1Z19tb2RlKXtcbiAgICAgICAgICAgIHZhciByID0gX3ByaXZhdGUuc2VhcmNoX29ial9yZWN1cnNpdmVseSh0aGlzLCd1cHN0cmVhbScsZm4pO1xuICAgICAgICAgICAgbXNncy5wdXNoKHNjb3BlLmlkICsgXCI6IHJlamVjdGVkIGJ5IGF1dG8gdGltZW91dCBhZnRlciBcIlxuICAgICAgICAgICAgICAgICAgICArIHRoaXMudGltZW91dCArIFwibXNcIik7XG4gICAgICAgICAgICBtc2dzLnB1c2goXCJDYXVzZTpcIik7XG4gICAgICAgICAgICBtc2dzLnB1c2gocik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzLG1zZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuX3ByaXZhdGUuZXJyb3IgPSBmdW5jdGlvbihjYil7XG5cbiAgICAvL0lGIEVSUk9SIEFMUkVBRFkgVEhST1dOLCBFWEVDVVRFIENCIElNTUVESUFURUxZXG4gICAgaWYodGhpcy5zdGF0ZSA9PT0gMil7XG4gICAgICAgIGNiKCk7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHRoaXMucmVqZWN0X3EucHVzaChjYik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU2lnbmFscyBhbGwgZG93bnN0cmVhbSBwcm9taXNlcyB0aGF0IF9wcml2YXRlIHByb21pc2Ugb2JqZWN0J3Mgc3RhdGUgaGFzIGNoYW5nZWQuXG4gKlxuICpcbiAqIEB0b2RvIFNpbmNlIHRoZSBzYW1lIHF1ZXVlIG1heSBoYXZlIGJlZW4gYXNzaWduZWQgdHdpY2UgZGlyZWN0bHkgb3JcbiAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAqIC0gd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHJpdmF0ZS5zaWduYWxfZG93bnN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldCl7XG5cbiAgICAvL01BS0UgU1VSRSBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRURcbiAgICBmb3IodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuICAgICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkID09PSAxKXtcblxuICAgICAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnN0YXRlICE9PSAxKXtcbiAgICAgICAgICAgIC8vdHJpZWQgdG8gc2V0dGxlIGEgcmVqZWN0ZWQgZG93bnN0cmVhbVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAvL3RyaWVkIHRvIHNldHRsZSBhIHN1Y2Nlc3NmdWxseSBzZXR0bGVkIGRvd25zdHJlYW1cbiAgICAgICAgICAgIE1haW4uZGVidWcodGFyZ2V0LmlkICsgXCIgdHJpZWQgdG8gc2V0dGxlIHByb21pc2UgXCIrXCInXCIrdGFyZ2V0LmRvd25zdHJlYW1baV0uaWQrXCInIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBzZXR0bGVkLlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL05PVyBUSEFUIFdFIEtOT1cgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVELCBXRSBDQU4gSUdOT1JFIEFOWVxuICAgIC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuICAgIGZvciAodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuICAgICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkICE9PSAxKXtcbiAgICAgICAgICAgIF9wcml2YXRlLnF1ZXVlLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2ldLHRhcmdldC5pZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbi8qKlxuKiBSdW4gb3ZlciBhIGdpdmVuIG9iamVjdCBwcm9wZXJ0eSByZWN1cnNpdmVseSwgYXBwbHlpbmcgY2FsbGJhY2sgdW50aWxcbiogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWUgICAgICAgICAgVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuKiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiAgICAgICAgICAgICAgVGhlIHRlc3QgY2FsbGJhY2sgdG8gYmUgYXBwbGllZCB0byBlYWNoIG9iamVjdFxuKiBAcGFyYW0ge2FycmF5fSBicmVhZGNydW1iICAgICAgICAgVGhlIGJyZWFkY3J1bWIgdGhyb3VnaCB0aGUgY2hhaW4gb2YgdGhlIGZpcnN0IG1hdGNoXG4qIEByZXR1cm5zIHttaXhlZH1cbiovXG5fcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24ob2JqLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpe1xuXG4gICAgaWYodHlwZW9mIGJyZWFkY3J1bWIgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgYnJlYWRjcnVtYiA9IFtvYmouaWRdO1xuICAgIH1cblxuICAgIHZhciByMTtcblxuICAgIGZvcih2YXIgaSBpbiBvYmpbcHJvcE5hbWVdKXtcblxuICAgICAgICAvL1JVTiBURVNUXG4gICAgICAgIHIxID0gZm4ob2JqW3Byb3BOYW1lXVtpXSk7XG5cbiAgICAgICAgaWYocjEgIT09IGZhbHNlKXtcbiAgICAgICAgLy9NQVRDSCBSRVRVUk5FRC4gUkVDVVJTRSBJTlRPIE1BVENIIElGIEhBUyBQUk9QRVJUWSBPRiBTQU1FIE5BTUUgVE8gU0VBUkNIXG4gICAgICAgICAgICAvL0NIRUNLIFRIQVQgV0UgQVJFTidUIENBVUdIVCBJTiBBIENJUkNVTEFSIExPT1BcbiAgICAgICAgICAgIGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWFpbi5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgICAgIFwiQ2lyY3VsYXIgY29uZGl0aW9uIGluIHJlY3Vyc2l2ZSBzZWFyY2ggb2Ygb2JqIHByb3BlcnR5ICdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgK3Byb3BOYW1lK1wiJyBvZiBvYmplY3QgXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICsoKHR5cGVvZiBvYmouaWQgIT09ICd1bmRlZmluZWQnKSA/IFwiJ1wiK29iai5pZCtcIidcIiA6ICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgK1wiLiBPZmZlbmRpbmcgdmFsdWU6IFwiK3IxXG4gICAgICAgICAgICAgICAgICAgICwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFkY3J1bWIucHVzaChyMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnJlYWRjcnVtYi5qb2luKFwiIFtkZXBlbmRzIG9uXT0+IFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSkoKVxuICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBicmVhZGNydW1iLnB1c2gocjEpO1xuXG4gICAgICAgICAgICBpZihvYmpbcHJvcE5hbWVdW2ldW3Byb3BOYW1lXSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkob2JqW3Byb3BOYW1lXVtpXSxwcm9wTmFtZSxmbixicmVhZGNydW1iKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiBicmVhZGNydW1iO1xufTtcblxuXG4vKipcbiAqIENvbnZlcnRzIGEgcHJvbWlzZSBkZXNjcmlwdGlvbiBpbnRvIGEgcHJvbWlzZS5cbiAqXG4gKiBAcGFyYW0ge3R5cGV9IG9ialxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuX3ByaXZhdGUuY29udmVydF90b19wcm9taXNlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMpe1xuXG4gICAgb2JqLmlkID0gb2JqLmlkIHx8IG9wdGlvbnMuaWQ7XG5cbiAgICAvL0F1dG9uYW1lXG4gICAgaWYgKCFvYmouaWQpIHtcbiAgICAgIGlmIChvYmoudHlwZSA9PT0gJ3RpbWVyJykge1xuICAgICAgICBvYmouaWQgPSBcInRpbWVyLVwiICsgb2JqLnRpbWVvdXQgKyBcIi1cIiArICgrK01haW5baV0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodHlwZW9mIG9iai51cmwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpO1xuICAgICAgICAvL1JFTU9WRSAuanMgRlJPTSBJRFxuICAgICAgICBpZiAob2JqLmlkLnNlYXJjaChcIi5qc1wiKSAhPT0gLTEpIHtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuc3BsaXQoXCIuXCIpO1xuICAgICAgICAgIG9iai5pZC5wb3AoKTtcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1JldHVybiBpZiBhbHJlYWR5IGV4aXN0c1xuICAgIGlmKE1haW4ubGlzdFtvYmouaWRdICYmIG9iai50eXBlICE9PSAndGltZXInKXtcbiAgICAgIC8vQSBwcmV2aW91cyBwcm9taXNlIG9mIHRoZSBzYW1lIGlkIGV4aXN0cy5cbiAgICAgIC8vTWFrZSBzdXJlIHRoaXMgZGVwZW5kZW5jeSBvYmplY3QgZG9lc24ndCBoYXZlIGFcbiAgICAgIC8vcmVzb2x2ZXIgLSBpZiBpdCBkb2VzIGVycm9yXG4gICAgICBpZihvYmoucmVzb2x2ZXIpe1xuICAgICAgICBNYWluLmRlYnVnKFtcbiAgICAgICAgICBcIllvdSBjYW4ndCBzZXQgYSByZXNvbHZlciBvbiBhIHF1ZXVlIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZC4gWW91IGNhbiBvbmx5IHJlZmVyZW5jZSB0aGUgb3JpZ2luYWwuXCJcbiAgICAgICAgICAsXCJEZXRlY3RlZCByZS1pbml0IG9mICdcIiArIG9iai5pZCArIFwiJy5cIlxuICAgICAgICAgICxcIkF0dGVtcHRlZDpcIlxuICAgICAgICAgICxvYmpcbiAgICAgICAgICAsXCJFeGlzdGluZzpcIlxuICAgICAgICAgICxNYWluLmxpc3Rbb2JqLmlkXVxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBNYWluLmxpc3Rbb2JqLmlkXTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vQ29udmVydCBkZXBlbmRlbmN5IHRvIGFuIGluc3RhbmNlXG4gICAgdmFyIGRlZjtcbiAgICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAgICAgLy9FdmVudFxuICAgICAgICBjYXNlKG9iai50eXBlID09PSAnZXZlbnQnKTpcbiAgICAgICAgICAgIGRlZiA9IF9wcml2YXRlLndyYXBfZXZlbnQob2JqKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2Uob2JqLnR5cGUgPT09ICdxdWV1ZScpOlxuICAgICAgICAgICAgZGVmID0gUXVldWUob2JqLmRlcGVuZGVuY2llcyxvYmopO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgLy9BbHJlYWR5IGEgdGhlbmFibGVcbiAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXG4gICAgICAgICAgICBzd2l0Y2godHJ1ZSl7XG5cbiAgICAgICAgICAgICAgICAvL1JlZmVyZW5jZSB0byBhbiBleGlzdGluZyBpbnN0YW5jZVxuICAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5pZCA9PT0gJ3N0cmluZycpOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCInXCIrb2JqLmlkICtcIic6IGRpZCBub3QgZXhpc3QuIEF1dG8gY3JlYXRpbmcgbmV3IGRlZmVycmVkLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmID0gX3B1YmxpYy5kZWZlcnJlZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZCA6IG9iai5pZFxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvL0lmIG9iamVjdCB3YXMgYSB0aGVuYWJsZSwgcmVzb2x2ZSB0aGUgbmV3IGRlZmVycmVkIHdoZW4gdGhlbiBjYWxsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYob2JqLnRoZW4pe1xuICAgICAgICAgICAgICAgICAgICAgIG9iai50aGVuKGZ1bmN0aW9uKHIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUocik7XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAvL09CSkVDVCBQUk9QRVJUWSAucHJvbWlzZSBFWFBFQ1RFRCBUTyBSRVRVUk4gQSBQUk9NSVNFXG4gICAgICAgICAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLnByb21pc2UgPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgICAgICAgICBpZihvYmouc2NvcGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UuY2FsbChvYmouc2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYgPSBvYmoucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgLy9PYmplY3QgaXMgYSB0aGVuYWJsZVxuICAgICAgICAgICAgICAgIGNhc2Uob2JqLnRoZW4pOlxuICAgICAgICAgICAgICAgICAgICBkZWYgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcbiAgICAgICAgICAgIGlmKHR5cGVvZiBkZWYgIT09ICdvYmplY3QnIHx8ICFkZWYudGhlbil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoXCJEZXBlbmRlbmN5IGxhYmVsZWQgYXMgYSBwcm9taXNlIGRpZCBub3QgcmV0dXJuIGEgcHJvbWlzZS5cIixvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZShvYmoudHlwZSA9PT0gJ3RpbWVyJyk6XG4gICAgICAgICAgICBkZWYgPSBfcHJpdmF0ZS53cmFwX3RpbWVyKG9iaik7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAvL0xvYWQgZmlsZVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgb2JqLnR5cGUgPSBvYmoudHlwZSB8fCBcImRlZmF1bHRcIjtcbiAgICAgICAgICAgIC8vSW5oZXJpdCBwYXJlbnQncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAgICBpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2Qpe1xuICAgICAgICAgICAgICBvYmouY3dkID0gb3B0aW9ucy5wYXJlbnQuY3dkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmID0gX3ByaXZhdGUud3JhcF94aHIob2JqKTtcbiAgICB9XG5cbiAgICAvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuICAgIE1haW4ubGlzdFtvYmouaWRdID0gZGVmO1xuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBAdG9kbzogcmVkbyB0aGlzXG4gKlxuICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuICogUmVzb2x2ZWQgb24gZmlyc3QgZXZlbnQgdHJpZ2dlci5cbiAqXG4gKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAqL1xuX3ByaXZhdGUud3JhcF9ldmVudCA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICB2YXIgZGVmID0gX3B1YmxpYy5kZWZlcnJlZCh7XG4gICAgICAgIGlkIDogb2JqLmlkXG4gICAgfSk7XG5cblxuICAgIGlmKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpe1xuXG4gICAgICAgIGlmKHR5cGVvZiAkICE9PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgIHZhciBtc2cgPSAnd2luZG93IGFuZCBkb2N1bWVudCBiYXNlZCBldmVudHMgZGVwZW5kIG9uIGpRdWVyeSc7XG4gICAgICAgICAgICBkZWYucmVqZWN0KG1zZyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIC8vRm9yIG5vdywgZGVwZW5kIG9uIGpxdWVyeSBmb3IgSUU4IERPTUNvbnRlbnRMb2FkZWQgcG9seWZpbGxcbiAgICAgICAgICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgICAgICAgICBjYXNlKG9iai5pZCA9PT0gJ3JlYWR5JyB8fCBvYmouaWQgPT09ICdET01Db250ZW50TG9hZGVkJyk6XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZSgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2Uob2JqLmlkID09PSAnbG9hZCcpOlxuICAgICAgICAgICAgICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vbihvYmouaWQsXCJib2R5XCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbl9wcml2YXRlLndyYXBfdGltZXIgPSBmdW5jdGlvbihvYmope1xuXG4gICAgdmFyIHByb20gPSBfcHVibGljLmRlZmVycmVkKG9iaik7XG5cbiAgICAoZnVuY3Rpb24ocHJvbSl7XG5cbiAgICAgICAgdmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgcHJvbS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBzdGFydCA6IF9zdGFydFxuICAgICAgICAgICAgICAgICxlbmQgOiBfZW5kXG4gICAgICAgICAgICAgICAgLGVsYXBzZWQgOiBfZW5kIC0gX3N0YXJ0XG4gICAgICAgICAgICAgICAgLHRpbWVvdXQgOiBvYmoudGltZW91dFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sb2JqLnRpbWVvdXQpO1xuXG4gICAgfShwcm9tKSk7XG5cbiAgICByZXR1cm4gcHJvbTtcbn07XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgZGVwZW5kcyBvbiB0aGUgbG9hZGluZyBvZiBhIGZpbGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlcFxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wcml2YXRlLndyYXBfeGhyID0gZnVuY3Rpb24oZGVwKXtcblxuICAgIHZhciByZXF1aXJlZCA9IFtcImlkXCIsXCJ1cmxcIl07XG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKXtcbiAgICAgICAgaWYoIWRlcFtyZXF1aXJlZFtpXV0pe1xuICAgICAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoW1xuICAgICAgICAgICAgICAgIFwiRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogXCIgKyByZXF1aXJlZFtpXVxuICAgICAgICAgICAgICAgICxcIk1ha2Ugc3VyZSB5b3Ugd2VyZW4ndCBleHBlY3RpbmcgZGVwZW5kZW5jeSB0byBhbHJlYWR5IGhhdmUgYmVlbiByZXNvbHZlZCB1cHN0cmVhbS5cIlxuICAgICAgICAgICAgICAgICxkZXBcbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG4gICAgaWYoTWFpbi5saXN0W2RlcC5pZF0pe1xuICAgICAgcmV0dXJuIE1haW4ubGlzdFtkZXAuaWRdO1xuICAgIH1cblxuICAgIC8vQ09OVkVSVCBUTyBERUZFUlJFRDpcbiAgICB2YXIgZGVmID0gX3B1YmxpYy5kZWZlcnJlZChkZXApO1xuXG4gICAgaWYodHlwZW9mIEZpbGVfbG9hZGVyW0NvbmZpZy5tb2RlXVtkZXAudHlwZV0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5tb2RlXVtkZXAudHlwZV0oZGVwLnVybCxkZWYsZGVwKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIEZpbGVfbG9hZGVyW0NvbmZpZy5tb2RlXVsnZGVmYXVsdCddKGRlcC51cmwsZGVmLGRlcCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsIi8qKlxuICogRGVmYXVsdCBwcm9wZXJ0aWVzIGZvciBhbGwgZGVmZXJyZWQgb2JqZWN0cy5cbiAqXG4gKi9cbnZhciBNYWluID0gcmVxdWlyZSgnLi9tYWluLmpzJyksXG5Db25maWcgPSBNYWluLmNvbmZpZztcblxudHBsID0ge307XG5cbnRwbC5pc19vcmd5ID0gdHJ1ZTtcblxudHBsLmlkID0gbnVsbDtcblxuLy9BIENPVU5URVIgRk9SIEFVVDAtR0VORVJBVEVEIFBST01JU0UgSUQnU1xudHBsLnNldHRsZWQgPSAwO1xuXG4vKipcbiAqIFNUQVRFIENPREVTOlxuICogLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiAtMSAgID0+IFNFVFRMSU5HIFtFWEVDVVRJTkcgQ0FMTEJBQ0tTXVxuICogIDAgICA9PiBQRU5ESU5HXG4gKiAgMSAgID0+IFJFU09MVkVEIC8gRlVMRklMTEVEXG4gKiAgMiAgID0+IFJFSkVDVEVEXG4gKi9cbnRwbC5zdGF0ZSA9IDA7XG5cbnRwbC52YWx1ZSA9IFtdO1xuXG4vL1RoZSBtb3N0IHJlY2VudCB2YWx1ZSBnZW5lcmF0ZWQgYnkgdGhlIHRoZW4tPmRvbmUgY2hhaW4uXG50cGwuY2Fib29zZSA9IG51bGw7XG5cbnRwbC5tb2RlbCA9IFwiZGVmZXJyZWRcIjtcblxudHBsLmRvbmVfZmlyZWQgPSAwO1xuXG50cGwudGltZW91dF9pZCA9IG51bGw7XG5cbnRwbC5jYWxsYmFja19zdGF0ZXMgPSB7XG4gIHJlc29sdmUgOiAwXG4gICx0aGVuIDogMFxuICAsZG9uZSA6IDBcbiAgLHJlamVjdCA6IDBcbn07XG5cbi8qKlxuICogU2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBjYWxsYmFjayBldmVudFxuICogbGlzdC5cbiAqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIHByb3BlcnR5TmFtZXMgYXNcbiAqIHRwbC5jYWxsYmFja19zdGF0ZXM6IGFkZGluZyBib2lsZXJwbGF0ZVxuICogcHJvcGVydGllcyBmb3IgZWFjaFxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbnRwbC5jYWxsYmFja3MgPSAoZnVuY3Rpb24oKXtcblxuICB2YXIgbyA9IHt9O1xuXG4gIGZvcih2YXIgaSBpbiB0cGwuY2FsbGJhY2tfc3RhdGVzKXtcbiAgICBvW2ldID0ge1xuICAgICAgdHJhaW4gOiBbXVxuICAgICAgLGhvb2tzIDoge1xuICAgICAgICBvbkJlZm9yZSA6IHtcbiAgICAgICAgICB0cmFpbiA6IFtdXG4gICAgICAgIH1cbiAgICAgICAgLG9uQ29tcGxldGUgOiB7XG4gICAgICAgICAgdHJhaW4gOiBbXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBvO1xufSkoKTtcblxuLy9QUk9NSVNFIEhBUyBPQlNFUlZFUlMgQlVUIERPRVMgTk9UIE9CU0VSVkUgT1RIRVJTXG50cGwuZG93bnN0cmVhbSA9IHt9O1xuXG50cGwuZXhlY3V0aW9uX2hpc3RvcnkgPSBbXTtcblxuLy9XSEVOIFRSVUUsIEFMTE9XUyBSRS1JTklUIFtGT1IgVVBHUkFERVMgVE8gQSBRVUVVRV1cbnRwbC5vdmVyd3JpdGFibGUgPSAwO1xuXG5cbi8qKlxuICogRGVmYXVsdCB0aW1lb3V0IGZvciBhIGRlZmVycmVkXG4gKiBAdHlwZSBudW1iZXJcbiAqL1xudHBsLnRpbWVvdXQgPSBDb25maWcudGltZW91dDtcblxuLyoqXG4gKiBSRU1PVEVcbiAqXG4gKiBSRU1PVEUgPT0gMSAgPT4gIFtERUZBVUxUXSBNYWtlIGh0dHAgcmVxdWVzdCBmb3IgZmlsZVxuICpcbiAqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cbiAqXG4gKiBPTkxZIEFQUExJRVMgVE8gU0NSSVBUUyBSVU4gVU5ERVIgTk9ERSBBUyBCUk9XU0VSIEhBUyBOT1xuICogRklMRVNZU1RFTSBBQ0NFU1NcbiAqL1xudHBsLnJlbW90ZSA9IDE7XG5cbi8vQUREUyBUTyBNQVNURVIgTElTVC4gQUxXQVlTIFRSVUUgVU5MRVNTIFVQR1JBRElORyBBIFBST01JU0UgVE8gQSBRVUVVRVxudHBsLmxpc3QgPSAxO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGRlZmVycmVkLlxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbHVlXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xudHBsLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSl7XG5cbiAgaWYodGhpcy5zZXR0bGVkID09PSAxKXtcbiAgICBNYWluLmRlYnVnKFtcbiAgICAgIHRoaXMuaWQgKyBcIiBjYW4ndCByZXNvbHZlLlwiXG4gICAgICAsXCJPbmx5IHVuc2V0dGxlZCBkZWZlcnJlZHMgYXJlIHJlc29sdmFibGUuXCJcbiAgICBdKTtcbiAgfVxuXG4gIC8vU0VUIFNUQVRFIFRPIFNFVFRMRU1FTlQgSU4gUFJPR1JFU1NcbiAgdGhpcy5zZXRfc3RhdGUodGhpcywtMSk7XG5cbiAgLy9TRVQgVkFMVUVcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuXG4gIC8vUlVOIFJFU09MVkVSIEJFRk9SRSBQUk9DRUVESU5HXG4gIC8vRVZFTiBJRiBUSEVSRSBJUyBOTyBSRVNPTFZFUiwgU0VUIElUIFRPIEZJUkVEIFdIRU4gQ0FMTEVEXG4gIGlmKCF0aGlzLnJlc29sdmVyX2ZpcmVkICYmIHR5cGVvZiB0aGlzLnJlc29sdmVyID09PSAnZnVuY3Rpb24nKXtcblxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAxO1xuXG4gICAgLy9BZGQgcmVzb2x2ZXIgdG8gcmVzb2x2ZSB0cmFpblxuICAgIHRyeXtcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnJlc29sdmUudHJhaW4ucHVzaChmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnJlc29sdmVyKHZhbHVlLHRoaXMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNhdGNoKGUpe1xuICAgICAgZGVidWdnZXI7XG4gICAgfVxuICB9XG4gIGVsc2V7XG5cbiAgICB0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuICAgIC8vQWRkIHNldHRsZSB0byByZXNvbHZlIHRyYWluXG4gICAgLy9BbHdheXMgc2V0dGxlIGJlZm9yZSBhbGwgb3RoZXIgY29tcGxldGUgY2FsbGJhY2tzXG4gICAgdGhpcy5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnVuc2hpZnQoZnVuY3Rpb24oKXtcbiAgICAgIHNldHRsZSh0aGlzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vUnVuIHJlc29sdmVcbiAgdGhpcy5ydW5fdHJhaW4oXG4gICAgdGhpc1xuICAgICx0aGlzLmNhbGxiYWNrcy5yZXNvbHZlXG4gICAgLHRoaXMudmFsdWVcbiAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICk7XG5cbiAgLy9yZXNvbHZlciBpcyBleHBlY3RlZCB0byBjYWxsIHJlc29sdmUgYWdhaW5cbiAgLy9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbnRwbC5yZWplY3QgPSBmdW5jdGlvbihlcnIpe1xuXG4gIGlmKCEoZXJyIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICBlcnIgPSBbZXJyXTtcbiAgfVxuXG4gIHZhciBtc2cgPSBcIlJlamVjdGVkIFwiK3RoaXMubW9kZWwrXCI6ICdcIit0aGlzLmlkK1wiJy5cIlxuXG4gIGlmKENvbmZpZy5kZWJ1Z19tb2RlKXtcbiAgICBlcnIudW5zaGlmdChtc2cpO1xuICAgIE1haW4uZGVidWcoZXJyLHRoaXMpO1xuICB9XG4gIGVsc2V7XG4gICAgbXNnID0gbXNnICsgXCJcXG4gVHVybiBkZWJ1ZyBtb2RlIG9uIGZvciBtb3JlIGluZm8uXCI7XG4gICAgY29uc29sZS5sb2cobXNnKTtcbiAgfVxuXG4gIC8vUmVtb3ZlIGF1dG8gdGltZW91dCB0aW1lclxuICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuICB9XG5cbiAgLy9TZXQgc3RhdGUgdG8gcmVqZWN0ZWRcbiAgdGhpcy5zZXRfc3RhdGUodGhpcywyKTtcblxuICAvL0V4ZWN1dGUgcmVqZWN0aW9uIHF1ZXVlXG4gIHRoaXMucnVuX3RyYWluKFxuICAgIHRoaXNcbiAgICAsdGhpcy5jYWxsYmFja3MucmVqZWN0XG4gICAgLGVyclxuICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxudHBsLnRoZW4gPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cbiAgc3dpdGNoKHRydWUpe1xuXG4gICAgLy9BbiBlcnJvciB3YXMgcHJldmlvdXNseSB0aHJvd24sIGJhaWwgb3V0XG4gICAgY2FzZSh0aGlzLnN0YXRlID09PSAyKTpcbiAgICAgIGJyZWFrO1xuXG4gICAgLy9FeGVjdXRpb24gY2hhaW4gYWxyZWFkeSBmaW5pc2hlZC4gQmFpbCBvdXQuXG4gICAgY2FzZSh0aGlzLmRvbmVfZmlyZWQgPT09IDEpOlxuICAgICAgcmV0dXJuIE1haW4uZGVidWcodGhpcy5pZCtcIiBjYW4ndCBhdHRhY2ggLnRoZW4oKSBiZWNhdXNlIC5kb25lKCkgaGFzIGFscmVhZHkgZmlyZWQsIGFuZCB0aGF0IG1lYW5zIHRoZSBleGVjdXRpb24gY2hhaW4gaXMgY29tcGxldGUuXCIpO1xuXG4gICAgZGVmYXVsdDpcblxuICAgICAgLy9QdXNoIGNhbGxiYWNrIHRvIHRoZW4gcXVldWVcbiAgICAgIHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbik7XG5cbiAgICAgIC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcbiAgICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSAmJiB0aGlzLnN0YXRlID09PSAxICYmICF0aGlzLmRvbmVfZmlyZWQpe1xuICAgICAgICB0aGlzLnJ1bl90cmFpbihcbiAgICAgICAgICB0aGlzXG4gICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnRoZW5cbiAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICBlbHNle31cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG50cGwuZG9uZSA9IGZ1bmN0aW9uKGZuLHJlamVjdG9yKXtcblxuICBpZih0aGlzLmNhbGxiYWNrcy5kb25lLnRyYWluLmxlbmd0aCA9PT0gMFxuICAgICAmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuICAgICAgaWYodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKXtcblxuICAgICAgICAvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG4gICAgICAgIHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG4gICAgICAgICAgLy9Eb25lIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLCBzbyBub3RlIHRoYXQgaXQgaGFzIGJlZW5cbiAgICAgICAgICBkZWZlcnJlZC5kb25lX2ZpcmVkID0gMTtcblxuICAgICAgICAgIGZuKHIsZGVmZXJyZWQsbGFzdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5wdXNoKGZuMik7XG5cbiAgICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcbiAgICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKHJlamVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuICAgICAgICAgIGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuICAgICAgICAgICAgdGhpcy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgdGhpcy5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcbiAgICAgICAgZWxzZXt9XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gTWFpbi5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG4gIH1cbiAgZWxzZXtcbiAgICByZXR1cm4gTWFpbi5kZWJ1ZyhcImRvbmUoKSBjYW4gb25seSBiZSBjYWxsZWQgb25jZS5cIik7XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB0cGw7XG4iLCJ2YXIgTWFpbiA9IHJlcXVpcmUoJy4vbWFpbi5qcycpO1xuXG52YXIgSHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbnZhciBWbSA9IHJlcXVpcmUoJ3ZtJyk7XG52YXIgX3B1YmxpYyA9IHt9O1xuXG5fcHVibGljLmJyb3dzZXIgPSB7fSxcbl9wdWJsaWMubmF0aXZlID0ge30sXG5cbi8vQnJvd3NlciBsb2FkXG5cbl9wdWJsaWMuYnJvd3Nlci5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblxuICB2YXIgaGVhZCA9ICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG5cbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aCk7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7XG4gIGVsZW0uc2V0QXR0cmlidXRlKFwicmVsXCIsXCJzdHlsZXNoZWV0XCIpO1xuXG4gIGlmKGVsZW0ub25sb2FkKXtcbiAgICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgICAgZWxlbS5vbmxvYWQgPSBlbGVtLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSk7XG4gICAgICAgfTtcblxuICAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChcIkZhaWxlZCB0byBsb2FkIHBhdGg6IFwiICsgcGF0aCk7XG4gICAgICAgfTtcblxuICAgIH0oZWxlbSxwYXRoLGRlZmVycmVkKSk7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuICB9XG4gIGVsc2V7XG4gICAgLy9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG4gICAgaGVhZC5hcHBlbmRDaGlsZChlbGVtKTtcbiAgfVxufVxuXG5fcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cbiAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICBlbGVtLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcbiAgICAgIGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcbiAgICAgICAgaWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcbiAgICAgICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgfTtcbiAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuICB0aGlzLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG59XG5cbl9wdWJsaWMuYnJvd3Nlci5odG1sID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIHRoaXMuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn1cblxuX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpe1xuICB2YXIgcixcbiAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwYXRoLCB0cnVlKTtcblxuICAoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgIGlmKHJlcS5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgciA9IHJlcS5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgaWYob3B0aW9ucy50eXBlICYmIG9wdGlvbnMudHlwZSA9PT0gJ2pzb24nKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgciA9IEpTT04ucGFyc2Uocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgX3B1YmxpYy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgXCJDb3VsZCBub3QgZGVjb2RlIEpTT05cIlxuICAgICAgICAgICAgICAgICxwYXRoXG4gICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgXSxkZWZlcnJlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfShwYXRoLGRlZmVycmVkKSk7XG5cbiAgcmVxLnNlbmQobnVsbCk7XG59XG5cblxuXG4vL05hdGl2ZSBsb2FkXG5cbl9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLmJyb3dzZXIuY3NzKHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5zY3JpcHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcbiAgLy9sb2NhbCBwYWNrYWdlXG4gIGlmKHBhdGhbMF09PT0nLicpe1xuICAgIHZhciByID0gcmVxdWlyZShwYXRoKTtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICB9XG4gIC8vcmVtb3RlIHNjcmlwdFxuICBlbHNle1xuXG4gICAgLy9DaGVjayB0aGF0IHdlIGhhdmUgY29uZmlndXJlZCB0aGUgZW52aXJvbm1lbnQgdG8gYWxsb3cgdGhpcyxcbiAgICAvL2FzIGl0IHJlcHJlc2VudHMgYSBzZWN1cml0eSB0aHJlYXQgYW5kIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIGRlYnVnZ2luZ1xuICAgIGlmKCFNYWluLmNvbmZpZy5kZWJ1Z19tb2RlKXtfXG4gICAgICBNYWluLmRlYnVnKFwiU2V0IE1haW4uY29uZmlnLmRlYnVnX21vZGU9MSB0byBydW4gcmVtb3RlIHNjcmlwdHMgb3V0c2lkZSBvZiBkZWJ1ZyBtb2RlLlwiKTtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgciA9IFZtLnJ1bkluVGhpc0NvbnRleHQoZGF0YSk7XG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuX3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuICBfcHVibGljLm5hdGl2ZS5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpO1xufVxuXG5fcHVibGljLm5hdGl2ZS5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG4gIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihyKXtcbiAgICBkZWZlcnJlZC5yZXNvbHZlKHIpO1xuICB9KVxufVxuXG5fcHJpdmF0ZS5uYXRpdmUuZ2V0ID0gZnVuY3Rpb24gKHBhdGgsZGVmZXJyZWQsY2FsbGJhY2spe1xuICBpZihwYXRoWzBdID09PSAnLicpe1xuICAgIC8vZmlsZSBzeXN0ZW1cbiAgICAvL3ZhciBGcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgRnMucmVhZEZpbGUocGF0aCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgfSk7XG4gIH1cbiAgZWxzZXtcbiAgICAvL2h0dHBcbiAgICAvL3ZhciBIdHRwID0gcmVxdWlyZSgnaHR0cCcpO1xuICAgIEh0dHAuZ2V0KHsgcGF0aCA6IHBhdGh9LCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICB2YXIgZGF0YSA9ICcnO1xuICAgICAgcmVzLm9uKCdkYXRhJywgZnVuY3Rpb24gKGJ1Zikge1xuICAgICAgICAgIGRhdGEgKz0gYnVmO1xuICAgICAgfSk7XG4gICAgICByZXMub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBRdWV1ZSA9IHJlcXVpcmUoJy4vcXVldWUuanMnKSxcbiAgICBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKSxcbiAgICBDYXN0ID0gcmVxdWlyZSgnLi9jYXN0LmpzJyk7XG5cblxudmFyIF9wdWJsaWMgPSB7fTtcbnZhciBfcHJpdmF0ZSA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQSBkaXJlY3Rvcnkgb2YgYWxsIHByb21pc2VzLCBkZWZlcnJlZHMsIGFuZCBxdWV1ZXMuXG4gKiBAdHlwZSBvYmplY3RcbiAqL1xuX3B1YmxpYy5saXN0ID0ge307XG5cblxuLyoqXG4gKiBBcnJheSBvZiBhbGwgZXhwb3J0ZWQgbW9kdWxlc1xuICogQHR5cGUgQXJyYXlcbiAqL1xuX3B1YmxpYy5tb2R1bGVzX2V4cG9ydGVkID0gW107XG5cblxuLyoqXG4gKiBJbmRleCBudW1iZXIgb2YgbGFzdCBtb2R1bGUgbG9hZGVkIGluIF9wdWJsaWMubW9kdWxlc19leHBvcnRlZFxuICogQHR5cGUgTnVtYmVyXG4gKi9cbl9wdWJsaWMubW9kdWxlc19sb2FkZWQgPSAwO1xuXG5cbi8qKlxuICogaXRlcmF0b3IgZm9yIGlkc1xuICogQHR5cGUgaW50ZWdlclxuICovXG5fcHVibGljLmkgPSAwO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gdmFsdWVzLlxuICpcbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHJpdmF0ZS5jb25maWcgPSB7XG5cbiAgICBhdXRvcGF0aCA6ICcnXG4gICAgLGRvY3VtZW50IDogbnVsbFxuICAgICxkZWJ1Z19tb2RlIDogMVxuICAgIC8vc2V0IHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IG9mIHRoZSBjYWxsZWUgc2NyaXB0LFxuICAgIC8vYmVjYXVzZSBub2RlIGhhcyBubyBjb25zdGFudCBmb3IgdGhpc1xuICAgICxjd2QgOiBmYWxzZVxuICAgICxtb2RlIDogKGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKHR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBwcm9jZXNzICsgJycgPT09ICdbb2JqZWN0IHByb2Nlc3NdJyl7XG4gICAgICAgICAgICAvLyBpcyBub2RlXG4gICAgICAgICAgICByZXR1cm4gXCJuYXRpdmVcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy8gbm90IG5vZGVcbiAgICAgICAgICAgIHJldHVybiBcImJyb3dzZXJcIjtcbiAgICAgICAgfVxuICAgIH0oKSlcbiAgICAvKipcbiAgICAgKiAtIG9uQWN0aXZhdGUgL3doZW4gZWFjaCBpbnN0YW5jZSBhY3RpdmF0ZWRcbiAgICAgKiAtIG9uU2V0dGxlICAgL3doZW4gZWFjaCBpbnN0YW5jZSBzZXR0bGVzXG4gICAgICpcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cbiAgICAsaG9va3MgOiB7XG4gICAgfVxuICAgICx0aW1lb3V0IDogNTAwMCAvL2RlZmF1bHQgdGltZW91dFxufTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3B1YmxpYyBNRVRIT0RTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIHNldHRlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5fcHVibGljLmNvbmZpZyA9IGZ1bmN0aW9uKG9iail7XG5cbiAgICBpZih0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jyl7XG4gICAgICAgIGZvcih2YXIgaSBpbiBvYmope1xuICAgICAgICAgIF9wcml2YXRlLmNvbmZpZ1tpXSA9IG9ialtpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfcHJpdmF0ZS5jb25maWc7XG59O1xuXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IHByb21pc2UgZnJvbSBhIHZhbHVlIGFuZCBhbiBpZCBhbmQgYXV0b21hdGljYWxseVxuKiByZXNvbHZlcyBpdC5cbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkXG4qIEBwYXJhbSB7bWl4ZWR9IGRhdGFcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHJldHVybnMge29iamVjdH0gcmVzb2x2ZWQgcHJvbWlzZVxuKi9cbl9wdWJsaWMuZGVmaW5lID0gZnVuY3Rpb24oaWQsZGF0YSxvcHRpb25zKXtcblxuICAgIHZhciBkZWY7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsO1xuICAgIG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGw7XG5cbiAgICAvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcbiAgICBpZih0eXBlb2YgaWQgIT09ICdzdHJpbmcnKXtcbiAgICAgIF9wdWJsaWMuZGVidWcoXCJNdXN0IHNldCBpZCB3aGVuIGRlZmluaW5nIGFuIGluc3RhbmNlLlwiKTtcbiAgICB9XG5cbiAgICAvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG4gICAgaWYoX3B1YmxpYy5saXN0W2lkXSAmJiBfcHVibGljLmxpc3RbaWRdLnNldHRsZWQgPT09IDEpe1xuICAgICAgcmV0dXJuIF9wdWJsaWMuZGVidWcoXCJDYW4ndCBkZWZpbmUgXCIgKyBpZCArIFwiLiBBbHJlYWR5IHJlc29sdmVkLlwiKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmlkID0gaWQ7XG5cbiAgICAvL1NldCBiYWNrdHJhY2UgaW5mbywgaGVyZSAtIHNvIG9yaWdpbiBwb2ludHMgdG8gY2FsbGVlXG4gICAgb3B0aW9ucy5iYWNrdHJhY2UgPSB0aGlzLmdldF9iYWNrdHJhY2VfaW5mbygnZGVmaW5lJyk7XG5cbiAgICBpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuICAgICAgJiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAvL0RlZmluZSBhcyBhIHF1ZXVlIC0gY2FuJ3QgYXV0b3Jlc29sdmUgYmVjYXVzZSB3ZSBoYXZlIGRlcHNcbiAgICAgIHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWYgPSBRdWV1ZShkZXBzLG9wdGlvbnMpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9EZWZpbmUgYXMgYSBkZWZlcnJlZFxuICAgICAgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAgIC8vVHJ5IHRvIGltbWVkaWF0ZWx5IHNldHRsZSBbZGVmaW5lXVxuICAgICAgaWYob3B0aW9ucy5yZXNvbHZlciA9PT0gbnVsbFxuICAgICAgICAmJiAodHlwZW9mIG9wdGlvbnMuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgICAgICB8fCBvcHRpb25zLmF1dG9yZXNvbHZlID09PSB0cnVlKSl7XG4gICAgICAgIC8vcHJldmVudCBmdXR1cmUgYXV0b3Jlc292ZSBhdHRlbXB0cyBbaS5lLiBmcm9tIHhociByZXNwb25zZV1cbiAgICAgICAgZGVmLmF1dG9yZXNvbHZlID0gZmFsc2U7XG4gICAgICAgIGRlZi5yZXNvbHZlKGRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59O1xuXG5cbl9wdWJsaWMuZGVmaW5lX21vZHVsZSA9IGZ1bmN0aW9uKG9iail7XG5cbiAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgdmFyIGlkID0gb2JqLnEuX19pZDtcblxuICBpZih0eXBlb2YgT3JneS5saXN0W2lkXSA9PT0gJ3VuZGVmaW5lZCcgfHwgT3JneS5saXN0W2lkXS5zdGF0ZSA9PT0gMCl7XG4gICAgaWYob2JqLnEuX19kZXBlbmRlbmNpZXMpe1xuICAgICAgb3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvYmoucS5fX2RlcGVuZGVuY2llcztcbiAgICB9XG5cbiAgICBpZihvYmoucS5fX3Jlc29sdmVyKXtcbiAgICAgIG9wdGlvbnMucmVzb2x2ZXIgPSBvYmoucS5fX3Jlc29sdmVyLmJpbmQob2JqKTtcbiAgICB9O1xuXG4gICAgaWYoX3ByaXZhdGUuY29uZmlnLm1vZGUgPT09ICduYXRpdmUnKXtcbiAgICAgIG9wdGlvbnMuY3dkID0gX19kaXJuYW1lO1xuICAgICAgdmFyIGRlZiA9IHRoaXMuZGVmaW5lKGlkLG9iai5fcHVibGljLG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIGRlZjtcbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIHRoaXMuZGVmaW5lKGlkLG9iai5fcHVibGljLG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuXG4vKipcbiAqIEdldHRlci5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMuZ2V0ID0gZnVuY3Rpb24oaWQpe1xuICBpZihfcHVibGljLmxpc3RbaWRdKXtcbiAgICByZXR1cm4gX3B1YmxpYy5saXN0W2lkXTtcbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBfcHVibGljLmRlYnVnKFtcbiAgICAgIFwiTm8gaW5zdGFuY2UgZXhpc3RzOiBcIitpZFxuICAgIF0pO1xuICB9XG59O1xuXG5cbi8qKlxuICogQWRkL3JlbW92ZSBhbiB1cHN0cmVhbSBkZXBlbmRlbmN5IHRvL2Zyb20gYSBxdWV1ZS5cbiAqXG4gKiBDYW4gdXNlIGEgcXVldWUgaWQsIGV2ZW4gZm9yIGEgcXVldWUgdGhhdCBpcyB5ZXQgdG8gYmUgY3JlYXRlZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGd0IHwgcXVldWUgLyBxdWV1ZSBpZFxuICogQHBhcmFtIHthcnJheX0gIGFyciB8IGxpc3QvcHJvbWlzZSBpZHMsZGVwZW5kZW5jaWVzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGFkZCB8IGFkZCBpZiB0cnVlLCByZW1vdmUgaWYgZmFsc2VcbiAqXG4gKiBAcmV0dXJuIHthcnJheX0gcXVldWUgb2YgbGlzdFxuICovXG5fcHVibGljLmFzc2lnbiA9IGZ1bmN0aW9uKHRndCxhcnIsYWRkKXtcblxuICAgIGFkZCA9ICh0eXBlb2YgYWRkID09PSBcImJvb2xlYW5cIikgPyBhZGQgOiAxO1xuXG4gICAgdmFyIGlkLHE7XG4gICAgc3dpdGNoKHRydWUpe1xuICAgICAgICBjYXNlKHR5cGVvZiB0Z3QgPT09ICdvYmplY3QnICYmIHR5cGVvZiB0Z3QudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG4gICAgICAgICAgICBpZCA9IHRndC5pZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlKHR5cGVvZiB0Z3QgPT09ICdzdHJpbmcnKTpcbiAgICAgICAgICAgIGlkID0gdGd0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gX3B1YmxpYy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKTtcbiAgICB9XG5cbiAgICAvL0lGIFRBUkdFVCBBTFJFQURZIExJU1RFRFxuICAgIGlmKHRoaXMubGlzdFtpZF0gJiYgdGhpcy5saXN0W2lkXS5tb2RlbCA9PT0gJ3F1ZXVlJyl7XG4gICAgICAgIHEgPSB0aGlzLmxpc3RbaWRdO1xuXG4gICAgICAgIC8vPT4gQUREIFRPIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgaWYoYWRkKXtcbiAgICAgICAgICAgIHEuYWRkKGFycik7XG4gICAgICAgIH1cbiAgICAgICAgLy89PiBSRU1PVkUgRlJPTSBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBxLnJlbW92ZShhcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBBTkQgQUREIERFUEVOREVOQ0lFU1xuICAgIGVsc2UgaWYoYWRkKXtcblxuICAgICAgICBxID0gUXVldWUoYXJyLHtcbiAgICAgICAgICAgIGlkIDogaWRcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vRVJST1I6IENBTidUIFJFTU9WRSBGUk9NIEEgUVVFVUUgVEhBVCBET0VTIE5PVCBFWElTVFxuICAgIGVsc2V7XG4gICAgICAgIHJldHVybiBfcHVibGljLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBkZXBlbmRlbmNpZXMgZnJvbSBhIHF1ZXVlIHRoYXQgZG9lcyBub3QgZXhpc3QuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHE7XG59O1xuXG5cbi8qKlxuICogRGVidWdnaW5nIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gbXNnXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5kZWJ1ZyA9IGZ1bmN0aW9uKG1zZyxkZWYpe1xuXG4gICAgaWYoISAobXNnIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICAgICAgbXNnID0gW21zZ107XG4gICAgfVxuXG4gICAgZm9yKHZhciBpIGluIG1zZyl7XG4gICAgICAgIGlmKHR5cGVvZiBtc2dbaV0gPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFUlJPUi1cIitpK1wiOiBcIittc2dbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKG1zZ1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL2lmIHdlIHNhdmVkIGEgc3RhY2sgdHJhY2UgdG8gY29ubmVjdCBhc3luYywgcHVzaCBpdFxuICAgIGlmKGRlZil7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQmFja3RyYWNlOlwiKTtcbiAgICAgICAgY29uc29sZS5sb2coZGVmLmJhY2t0cmFjZS5zdGFjayk7XG4gICAgfVxuXG4gICAgaWYoX3ByaXZhdGUuY29uZmlnLmRlYnVnX21vZGUpe1xuICAgICAgLy90dXJuIG9mZiBkZWJ1Z19tb2RlIHRvIGF2b2lkIGhpdHRpbmcgZGVidWdnZXJcbiAgICAgIGRlYnVnZ2VyO1xuICAgIH1cblxuICAgIGlmKF9wcml2YXRlLmNvbmZpZy5tb2RlID09PSAnYnJvd3Nlcicpe1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgpO1xuICAgIH1cbn07XG5cblxuX3B1YmxpYy5nZXRfYmFja3RyYWNlX2luZm8gPSBmdW5jdGlvbihzcyl7XG5cbiAgICB2YXIgciA9IHt9XG4gICAgLGxcbiAgICAsc3RyO1xuXG4gICAgbCA9IHIuc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcblxuICAgIGlmKF9wcml2YXRlLmNvbmZpZy5tb2RlID09PSAnYnJvd3Nlcicpe1xuICAgICAgbCA9IGwuc3BsaXQoc3MpWzFdLnRyaW0oKS5zcGxpdChcIlxcblwiKTtcbiAgICAgIHN0ciA9IGwucG9wKCk7XG4gICAgICB3aGlsZShzdHIuc2VhcmNoKFwib3JneVwiKSAhPT0gLTEgJiYgbC5sZW5ndGggPiAwKXtcbiAgICAgICAgLy9pdGVyYXRlIHVudGlsIG91dHNpZGUgb2YgY2xhc3NcbiAgICAgICAgc3RyID0gbC5wb3AoKTtcbiAgICAgIH1cbiAgICAgIHN0ciA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHN0ci5zcGxpdChcIi8vXCIpWzFdO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgc3RyID0gbC5zcGxpdChzcyArIFwiIFwiKVsxXS5zcGxpdChcIlxcblwiKVsxXTtcbiAgICAgIHN0ciA9IHN0ci5tYXRjaCgvXFwoKFteKV0rKVxcKS8pWzFdO1xuICAgIH1cblxuICAgIC8vU2V0IG9yaWdpblxuICAgIHIub3JpZ2luID0gc3RyO1xuXG4gICAgcmV0dXJuIHI7XG59O1xuXG5fcHVibGljLmRlZmVycmVkID0gRGVmZXJyZWQuZGVmZXJyZWQ7XG5fcHVibGljLnF1ZXVlID0gUXVldWUucXVldWU7XG5wdWJsbGMuY2FzdCA9IENhc3QuY2FzdDtcbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiIsInZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyksXG4gICAgTWFpbiA9IHJlcXVpcmUoJy4vbWFpbi5qcycpLFxuICAgIERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpLFxuICAgIF9wdWJsaWMgPSB7fSxcbiAgICBfcHJpdmF0ZSA9IHt9O1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuKiBUZW1wbGF0ZSBvYmplY3QgZm9yIGFsbCBxdWV1ZXNcbipcbiogQHR5cGUgb2JqZWN0XG4qL1xuX3ByaXZhdGUudHBsID0ge1xuXG4gICBtb2RlbCA6ICdxdWV1ZSdcblxuXG4gICAvL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG4gICAscmVzb2x2ZXJfZmlyZWQgOiAwXG5cblxuICAgLy9QUkVWRU5UUyBBIFFVRVVFIEZST00gUkVTT0xWSU5HIEVWRU4gSUYgQUxMIERFUEVOREVOQ0lFUyBNRVRcbiAgIC8vUFVSUE9TRTogUFJFVkVOVFMgUVVFVUVTIENSRUFURUQgQlkgQVNTSUdOTUVOVCBGUk9NIFJFU09MVklOR1xuICAgLy9CRUZPUkUgVEhFWSBBUkUgRk9STUFMTFkgSU5TVEFOVElBVEVEXG4gICAsaGFsdF9yZXNvbHV0aW9uIDogMFxuXG5cbiAgIC8vVVNFRCBUTyBDSEVDSyBTVEFURSwgRU5TVVJFUyBPTkUgQ09QWVxuICAgLHVwc3RyZWFtIDoge31cblxuXG4gICAvL1VTRUQgUkVUVVJOIFZBTFVFUywgRU5TVVJFUyBPUkRFUlxuICAgLGRlcGVuZGVuY2llcyA6IFtdXG5cblxuICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gICAvLyAgUVVFVUUgSU5TVEFOQ0UgTUVUSE9EU1xuICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuICAgLyoqXG4gICAgKiBBZGQgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gYSBxdWV1ZSdzIHVwc3RyZWFtIGFycmF5LlxuICAgICpcbiAgICAqIFRoZSBxdWV1ZSB3aWxsIHJlc29sdmUgb25jZSBhbGwgdGhlIHByb21pc2VzIGluIGl0c1xuICAgICogdXBzdHJlYW0gYXJyYXkgYXJlIHJlc29sdmVkLlxuICAgICpcbiAgICAqIFdoZW4gX3B1YmxpYy5jb25maWcuZGVidWcgPT0gMSwgbWV0aG9kIHdpbGwgdGVzdCBlYWNoXG4gICAgKiBkZXBlbmRlbmN5IGlzIG5vdCBwcmV2aW91c2x5IHNjaGVkdWxlZCB0byByZXNvbHZlXG4gICAgKiBkb3duc3RyZWFtIGZyb20gdGhlIHRhcmdldCwgaW4gd2hpY2hcbiAgICAqIGNhc2UgaXQgd291bGQgbmV2ZXIgcmVzb2x2ZSBiZWNhdXNlIGl0cyB1cHN0cmVhbSBkZXBlbmRzIG9uIGl0LlxuICAgICpcbiAgICAqIEBwYXJhbSB7YXJyYXl9IGFyciAgL2FycmF5IG9mIGRlcGVuZGVuY2llcyB0byBhZGRcbiAgICAqIEByZXR1cm5zIHthcnJheX0gdXBzdHJlYW1cbiAgICAqL1xuICAgLGFkZCA6IGZ1bmN0aW9uKGFycil7XG5cbiAgICAgICB0cnl7XG4gICAgICAgICAgIGlmKGFyci5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLnVwc3RyZWFtO1xuICAgICAgIH1cbiAgICAgICBjYXRjaChlcnIpe1xuICAgICAgICAgICBNYWluLmRlYnVnKGVycik7XG4gICAgICAgfVxuXG4gICAgICAgLy9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFRPIEFERFxuICAgICAgIGlmKHRoaXMuc3RhdGUgIT09IDApe1xuICAgICAgICAgIHJldHVybiBNYWluLmRlYnVnKFtcbiAgICAgICAgICAgIFwiQ2Fubm90IGFkZCBkZXBlbmRlbmN5IGxpc3QgdG8gcXVldWUgaWQ6J1wiK3RoaXMuaWRcbiAgICAgICAgICAgICtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIlxuICAgICAgICAgIF0sYXJyLHRoaXMpO1xuICAgICAgIH1cblxuICAgICAgIGZvcih2YXIgYSBpbiBhcnIpe1xuXG4gICAgICAgICAgIHN3aXRjaCh0cnVlKXtcblxuICAgICAgICAgICAgICAgLy9DSEVDSyBJRiBFWElTVFNcbiAgICAgICAgICAgICAgIGNhc2UodHlwZW9mIE1haW4ubGlzdFthcnJbYV1bJ2lkJ11dID09PSAnb2JqZWN0Jyk6XG4gICAgICAgICAgICAgICAgICAgYXJyW2FdID0gTWFpbi5saXN0W2FyclthXVsnaWQnXV07XG4gICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgIC8vSUYgTk9ULCBBVFRFTVBUIFRPIENPTlZFUlQgSVQgVE8gQU4gT1JHWSBQUk9NSVNFXG4gICAgICAgICAgICAgICBjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcbiAgICAgICAgICAgICAgICAgICBhcnJbYV0gPSBEZWZlcnJlZC5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcbiAgICAgICAgICAgICAgICAgICAgIHBhcmVudCA6IHRoaXNcbiAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgLy9SRUYgSVMgQSBQUk9NSVNFLlxuICAgICAgICAgICAgICAgY2FzZSh0eXBlb2YgYXJyW2FdLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJPYmplY3QgY291bGQgbm90IGJlIGNvbnZlcnRlZCB0byBwcm9taXNlLlwiKTtcbiAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGFyclthXSk7XG4gICAgICAgICAgICAgICAgICAgZGVidWdnZXI7XG4gICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgIH1cblxuICAgICAgICAgICAvL211c3QgY2hlY2sgdGhlIHRhcmdldCB0byBzZWUgaWYgdGhlIGRlcGVuZGVuY3kgZXhpc3RzIGluIGl0cyBkb3duc3RyZWFtXG4gICAgICAgICAgIGZvcih2YXIgYiBpbiB0aGlzLmRvd25zdHJlYW0pe1xuICAgICAgICAgICAgICAgaWYoYiA9PT0gYXJyW2FdLmlkKXtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBNYWluLmRlYnVnKFtcbiAgICAgICAgICAgICAgICAgICAgXCJFcnJvciBhZGRpbmcgdXBzdHJlYW0gZGVwZW5kZW5jeSAnXCJcbiAgICAgICAgICAgICAgICAgICAgK2FyclthXS5pZCtcIicgdG8gcXVldWVcIitcIiAnXCJcbiAgICAgICAgICAgICAgICAgICAgK3RoaXMuaWQrXCInLlxcbiBQcm9taXNlIG9iamVjdCBmb3IgJ1wiXG4gICAgICAgICAgICAgICAgICAgICthcnJbYV0uaWQrXCInIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnXCJcbiAgICAgICAgICAgICAgICAgICAgK3RoaXMuaWQrXCInIHNvIGl0IGNhbid0IGJlIGFkZGVkIHVwc3RyZWFtLlwiXG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAsdGhpcyk7XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cblxuICAgICAgICAgICAvL0FERCBUTyBVUFNUUkVBTSwgRE9XTlNUUkVBTSwgREVQRU5ERU5DSUVTXG4gICAgICAgICAgIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSA9IGFyclthXTtcbiAgICAgICAgICAgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF0gPSB0aGlzO1xuICAgICAgICAgICB0aGlzLmRlcGVuZGVuY2llcy5wdXNoKGFyclthXSk7XG4gICAgICAgfVxuXG4gICAgICAgcmV0dXJuIHRoaXMudXBzdHJlYW07XG4gICB9XG5cblxuICAgLyoqXG4gICAgKiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG4gICAgKlxuICAgICogQHBhcmFtIHthcnJheX0gYXJyXG4gICAgKiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG4gICAgKi9cbiAgICxyZW1vdmUgOiBmdW5jdGlvbihhcnIpe1xuXG4gICAgICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuICAgICAgaWYodGhpcy5zdGF0ZSAhPT0gMCl7XG4gICAgICAgICAgcmV0dXJuIE1haW4uZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonXCIrdGhpcy5pZCtcIicuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5cIik7XG4gICAgICB9XG5cbiAgICAgIGZvcih2YXIgYSBpbiBhcnIpe1xuICAgICAgICAgaWYodGhpcy51cHN0cmVhbVthcnJbYV0uaWRdKXtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnVwc3RyZWFtW2FyclthXS5pZF07XG4gICAgICAgICAgICBkZWxldGUgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF07XG4gICAgICAgICB9XG4gICAgICB9XG4gICB9XG5cblxuICAvKipcbiAgICogUmVzZXRzIGFuIGV4aXN0aW5nLHNldHRsZWQgcXVldWUgYmFjayB0byBPcmd5aW5nIHN0YXRlLlxuICAgKiBDbGVhcnMgb3V0IHRoZSBkb3duc3RyZWFtLlxuICAgKiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAgICogQHJldHVybnMge19wcml2YXRlLnRwbHxCb29sZWFufVxuICAgKi9cbiAgICxyZXNldCA6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gICAgICBpZih0aGlzLnNldHRsZWQgIT09IDEgfHwgdGhpcy5zdGF0ZSAhPT0gMSl7XG4gICAgICAgIHJldHVybiBNYWluLmRlYnVnKFwiQ2FuIG9ubHkgcmVzZXQgYSBxdWV1ZSBzZXR0bGVkIHdpdGhvdXQgZXJyb3JzLlwiKTtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHRoaXMuc2V0dGxlZCA9IDA7XG4gICAgICB0aGlzLnN0YXRlID0gMDtcbiAgICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuICAgICAgdGhpcy5kb25lX2ZpcmVkID0gMDtcblxuICAgICAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gICAgICBpZih0aGlzLnRpbWVvdXRfaWQpe1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKTtcbiAgICAgIH1cblxuICAgICAgLy9DTEVBUiBPVVQgVEhFIERPV05TVFJFQU1cbiAgICAgIHRoaXMuZG93bnN0cmVhbSA9IHt9O1xuICAgICAgdGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuICAgICAgLy9TRVQgTkVXIEFVVE8gVElNRU9VVFxuICAgICAgRGVmZXJyZWQuYXV0b190aW1lb3V0LmNhbGwodGhpcyxvcHRpb25zLnRpbWVvdXQpO1xuXG4gICAgICAvL1BPSU5UTEVTUyAtIFdJTEwgSlVTVCBJTU1FRElBVEVMWSBSRVNPTFZFIFNFTEZcbiAgICAgIC8vdGhpcy5jaGVja19zZWxmKClcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICB9XG5cblxuICAgLyoqXG4gICAgKiBDYXVhZXMgYSBxdWV1ZSB0byBsb29rIG92ZXIgaXRzIGRlcGVuZGVuY2llcyBhbmQgc2VlIGlmIGl0XG4gICAgKiBjYW4gYmUgcmVzb2x2ZWQuXG4gICAgKlxuICAgICogVGhpcyBpcyBkb25lIGF1dG9tYXRpY2FsbHkgYnkgZWFjaCBkZXBlbmRlbmN5IHRoYXQgbG9hZHMsXG4gICAgKiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcbiAgICAqXG4gICAgKiAtZGVidWdnaW5nXG4gICAgKlxuICAgICogLXRoZSBxdWV1ZSBoYXMgYmVlbiByZXNldCBhbmQgbm8gbmV3XG4gICAgKiBkZXBlbmRlbmNpZXMgd2VyZSBzaW5jZSBhZGRlZC5cbiAgICAqXG4gICAgKiBAcmV0dXJucyB7aW50fSBTdGF0ZSBvZiB0aGUgcXVldWUuXG4gICAgKi9cbiAgICxjaGVja19zZWxmIDogZnVuY3Rpb24oKXtcbiAgICAgIF9wdWJsaWMucmVjZWl2ZV9zaWduYWwodGhpcyx0aGlzLmlkKTtcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlO1xuICAgfVxufTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBxdWV1ZSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHthcnJheX0gZGVwc1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqICAgICAgICAgIHtzdHJpbmd9ICBpZCAgL09wdGlvbmFsLiBVc2UgdGhlIGlkIHdpdGggT3JneS5nZXQoaWQpLiBEZWZhdWx0cyB0byBsaW5lIG51bWJlciBvZiBpbnN0YW50aWF0aW9uLCBwbHVzIGFuIGl0ZXJhdG9yLlxuICogICAgICAgICAge2NhbGxiYWNrKHJlc3VsdCxkZWZlcnJlZCl9IHJlc29sdmVyIC9DYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIGFmdGVyIGFsbCBkZXBlbmRlbmNpZXMgaGF2ZSByZXNvbHZlZC4gQXJnMSBpcyBhbiBhcnJheSBvZiB0aGUgZGVwZW5kZW5jaWVzJyByZXNvbHZlZCB2YWx1ZXMuIEFyZzIgaXMgdGhlIGRlZmVycmVkIG9iamVjdC4gVGhlIHF1ZXVlIHdpbGwgb25seSByZXNvbHZlIHdoZW4gQXJnMi5yZXNvbHZlKCkgaXMgY2FsbGVkLiBJZiBub3QsIGl0IHdpbGwgdGltZW91dCB0byBvcHRpb25zLnRpbWVvdXQgfHwgT3JneS5jb25maWcudGltZW91dC5cbiAqICAgICAgICAgIHtudW1iZXJ9IHRpbWVvdXQgL3RpbWUgaW4gbXMgYWZ0ZXIgd2hpY2ggcmVqZWN0IGlzIGNhbGxlZC4gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS4gTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLiBUaGVuLGRvbmUgZGVsYXlzIHdpbGwgbm90IGZsYWcgYSB0aW1lb3V0IGJlY2F1c2UgdGhleSBhcmUgY2FsbGVkIGFmdGVyIHRoZSBpbnN0YW5jZSBpcyBjb25zaWRlcmVkIHJlc29sdmVkLlxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cbl9wdWJsaWMucXVldWUgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG4gIHZhciBfbztcbiAgaWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcbiAgICByZXR1cm4gTWFpbi5kZWJ1ZyhcIlF1ZXVlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGFuIGFycmF5LlwiKTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuICBpZighTWFpbi5saXN0W29wdGlvbnMuaWRdKXtcblxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBPQkpFQ1RcbiAgICB2YXIgX28gPSBfcHJpdmF0ZS5mYWN0b3J5KG9wdGlvbnMpO1xuXG4gICAgLy9BQ1RJVkFURSBRVUVVRVxuICAgIF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKTtcblxuICB9XG4gIC8vQUxSRUFEWSBFWElTVFNcbiAgZWxzZSB7XG5cbiAgICBfbyA9IE1haW4ubGlzdFtvcHRpb25zLmlkXTtcblxuICAgIGlmKF9vLm1vZGVsICE9PSAncXVldWUnKXtcbiAgICAvL01BVENIIEZPVU5EIEJVVCBOT1QgQSBRVUVVRSwgVVBHUkFERSBUTyBPTkVcblxuICAgICAgb3B0aW9ucy5vdmVyd3JpdGFibGUgPSAxO1xuXG4gICAgICBfbyA9IF9wcml2YXRlLnVwZ3JhZGUoX28sb3B0aW9ucyxkZXBzKTtcbiAgICB9XG4gICAgZWxzZXtcblxuICAgICAgLy9PVkVSV1JJVEUgQU5ZIEVYSVNUSU5HIE9QVElPTlNcbiAgICAgIGZvcih2YXIgaSBpbiBvcHRpb25zKXtcbiAgICAgICAgX29baV0gPSBvcHRpb25zW2ldO1xuICAgICAgfVxuXG4gICAgICAvL0FERCBBRERJVElPTkFMIERFUEVOREVOQ0lFUyBJRiBOT1QgUkVTT0xWRURcbiAgICAgIGlmKGRlcHMubGVuZ3RoID4gMCl7XG4gICAgICAgIF9wcml2YXRlLnRwbC5hZGQuY2FsbChfbyxkZXBzKTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIC8vUkVTVU1FIFJFU09MVVRJT04gVU5MRVNTIFNQRUNJRklFRCBPVEhFUldJU0VcbiAgICBfby5oYWx0X3Jlc29sdXRpb24gPSAodHlwZW9mIG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uICE9PSAndW5kZWZpbmVkJykgP1xuICAgIG9wdGlvbnMuaGFsdF9yZXNvbHV0aW9uIDogMDtcbiAgfVxuXG4gIHJldHVybiBfbztcbn07XG5cblxuXG4vKipcbiogQSBcInNpZ25hbFwiIGhlcmUgY2F1c2VzIGEgcXVldWUgdG8gbG9vayB0aHJvdWdoIGVhY2ggaXRlbVxuKiBpbiBpdHMgdXBzdHJlYW0gYW5kIGNoZWNrIHRvIHNlZSBpZiBhbGwgYXJlIHJlc29sdmVkLlxuKlxuKiBTaWduYWxzIGNhbiBvbmx5IGJlIHJlY2VpdmVkIGJ5IGEgcXVldWUgaXRzZWxmIG9yIGFuIGluc3RhbmNlXG4qIGluIGl0cyB1cHN0cmVhbS5cbipcbiogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuKiBAcGFyYW0ge3N0cmluZ30gZnJvbV9pZFxuKiBAcmV0dXJucyB7dm9pZH1cbiovXG5fcHVibGljLnJlY2VpdmVfc2lnbmFsID0gZnVuY3Rpb24odGFyZ2V0LGZyb21faWQpe1xuXG4gICAgaWYodGFyZ2V0LmhhbHRfcmVzb2x1dGlvbiA9PT0gMSkgcmV0dXJuO1xuXG4gICAvL01BS0UgU1VSRSBUSEUgU0lHTkFMIFdBUyBGUk9NIEEgUFJPTUlTRSBCRUlORyBMSVNURU5FRCBUT1xuICAgLy9CVVQgQUxMT1cgU0VMRiBTVEFUVVMgQ0hFQ0tcbiAgIGlmKGZyb21faWQgIT09IHRhcmdldC5pZCAmJiAhdGFyZ2V0LnVwc3RyZWFtW2Zyb21faWRdKXtcbiAgICAgICByZXR1cm4gTWFpbi5kZWJ1Zyhmcm9tX2lkICsgXCIgY2FuJ3Qgc2lnbmFsIFwiICsgdGFyZ2V0LmlkICsgXCIgYmVjYXVzZSBub3QgaW4gdXBzdHJlYW0uXCIpO1xuICAgfVxuICAgLy9SVU4gVEhST1VHSCBRVUVVRSBPRiBPQlNFUlZJTkcgUFJPTUlTRVMgVE8gU0VFIElGIEFMTCBET05FXG4gICBlbHNle1xuICAgICAgIHZhciBzdGF0dXMgPSAxO1xuICAgICAgIGZvcih2YXIgaSBpbiB0YXJnZXQudXBzdHJlYW0pe1xuICAgICAgICAgICAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG4gICAgICAgICAgIGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuICAgICAgICAgICAgICAgc3RhdHVzID0gdGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlO1xuICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgIH1cbiAgICAgICB9XG4gICB9XG5cbiAgIC8vUkVTT0xWRSBRVUVVRSBJRiBVUFNUUkVBTSBGSU5JU0hFRFxuICAgaWYoc3RhdHVzID09PSAxKXtcblxuICAgICAgICAvL0dFVCBSRVRVUk4gVkFMVUVTIFBFUiBERVBFTkRFTkNJRVMsIFdISUNIIFNBVkVTIE9SREVSIEFORFxuICAgICAgICAvL1JFUE9SVFMgRFVQTElDQVRFU1xuICAgICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAgIGZvcih2YXIgaSBpbiB0YXJnZXQuZGVwZW5kZW5jaWVzKXtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHRhcmdldC5kZXBlbmRlbmNpZXNbaV0udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgRGVmZXJyZWQudHBsLnJlc29sdmUuY2FsbCh0YXJnZXQsdmFsdWVzKTtcbiAgIH1cblxuICAgaWYoc3RhdHVzID09PSAyKXtcbiAgICAgICB2YXIgZXJyID0gW1xuICAgICAgICAgICB0YXJnZXQuaWQrXCIgZGVwZW5kZW5jeSAnXCIrdGFyZ2V0LnVwc3RyZWFtW2ldLmlkICsgXCInIHdhcyByZWplY3RlZC5cIlxuICAgICAgICAgICAsdGFyZ2V0LnVwc3RyZWFtW2ldLmFyZ3VtZW50c1xuICAgICAgIF07XG4gICAgICAgRGVmZXJyZWQudHBsLnJlamVjdC5hcHBseSh0YXJnZXQsZXJyKTtcbiAgIH1cbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgX3ByaXZhdGUgTUVUSE9EU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuX3ByaXZhdGUuZmFjdG9yeSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG4gIC8vQ1JFQVRFIEEgTkVXIFFVRVVFIE9CSkVDVFxuICB2YXIgX28gPSBfLmFzc2lnbih7fSxbXG4gICAgRGVmZXJyZWQudHBsXG4gICAgLF9wcml2YXRlLnRwbFxuICAgICxvcHRpb25zXG4gIF0pO1xuXG4gIC8vR2V0IGJhY2t0cmFjZSBpbmZvIGlmIG5vbmUgZm91bmQgW21heSBiZSBzZXQgQCBNYWluLmRlZmluZV1cbiAgaWYoIV9vLmJhY2t0cmFjZSl7XG4gICAgX28uYmFja3RyYWNlID0gTWFpbi5nZXRfYmFja3RyYWNlX2luZm8oJ3F1ZXVlJyk7XG4gIH1cblxuICAvL2lmIG5vIGlkLCB1c2UgYmFja3RyYWNlIG9yaWdpblxuICBpZighb3B0aW9ucy5pZCl7XG4gICAgX28uaWQgPSBfby5iYWNrdHJhY2Uub3JpZ2luICsgJy0nICsgKCsrTWFpbltpXSk7XG4gIH1cblxuICByZXR1cm4gX287XG59O1xuXG5cbi8qKlxuICogQWN0aXZhdGVzIGEgcXVldWUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHthcnJheX0gZGVwc1xuICogQHJldHVybnMge29iamVjdH0gcXVldWVcbiAqL1xuX3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvLG9wdGlvbnMsZGVwcyl7XG5cbiAgICAvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcbiAgICBvID0gRGVmZXJyZWQuYWN0aXZhdGUobyk7XG5cbiAgICAvL0B0b2RvIHJldGhpbmsgdGhpc1xuICAgIC8vVGhpcyB0aW1lb3V0IGdpdmVzIGRlZmluZWQgcHJvbWlzZXMgdGhhdCBhcmUgZGVmaW5lZFxuICAgIC8vZnVydGhlciBkb3duIHRoZSBzYW1lIHNjcmlwdCBhIGNoYW5jZSB0byBkZWZpbmUgdGhlbXNlbHZlc1xuICAgIC8vYW5kIGluIGNhc2UgdGhpcyBxdWV1ZSBpcyBhYm91dCB0byByZXF1ZXN0IHRoZW0gZnJvbSBhXG4gICAgLy9yZW1vdGUgc291cmNlIGhlcmUuXG4gICAgLy9UaGlzIGlzIGltcG9ydGFudCBpbiB0aGUgY2FzZSBvZiBjb21waWxlZCBqcyBmaWxlcyB0aGF0IGNvbnRhaW5cbiAgICAvL211bHRpcGxlIG1vZHVsZXMgd2hlbiBkZXBlbmQgb24gZWFjaCBvdGhlci5cblxuICAgIC8vdGVtcG9yYXJpbHkgY2hhbmdlIHN0YXRlIHRvIHByZXZlbnQgb3V0c2lkZSByZXNvbHV0aW9uXG4gICAgby5zdGF0ZSA9IC0xO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgLy9SZXN0b3JlIHN0YXRlXG4gICAgICBvLnN0YXRlID0gMDtcblxuICAgICAgLy9BREQgREVQRU5ERU5DSUVTIFRPIFFVRVVFXG4gICAgICBfcHJpdmF0ZS50cGwuYWRkLmNhbGwobyxkZXBzKTtcblxuICAgICAgLy9TRUUgSUYgQ0FOIEJFIElNTUVESUFURUxZIFJFU09MVkVEIEJZIENIRUNLSU5HIFVQU1RSRUFNXG4gICAgICBfcHVibGljLnJlY2VpdmVfc2lnbmFsKG8sby5pZCk7XG5cbiAgICAgIC8vQVNTSUdOIFRISVMgUVVFVUUgVVBTVFJFQU0gVE8gT1RIRVIgUVVFVUVTXG4gICAgICBpZihvLmFzc2lnbil7XG4gICAgICAgICAgZm9yKHZhciBhIGluIG8uYXNzaWduKXtcbiAgICAgICAgICAgICAgX3B1YmxpYy5hc3NpZ24oby5hc3NpZ25bYV0sW29dLHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9LDEpO1xuXG4gICAgcmV0dXJuIG87XG59O1xuXG5cbi8qKlxuKiBVcGdyYWRlcyBhIHByb21pc2Ugb2JqZWN0IHRvIGEgcXVldWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHthcnJheX0gZGVwcyBcXGRlcGVuZGVuY2llc1xuKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiovXG5fcHJpdmF0ZS51cGdyYWRlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMsZGVwcyl7XG5cbiAgICBpZihvYmouc2V0dGxlZCAhPT0gMCB8fCAob2JqLm1vZGVsICE9PSAncHJvbWlzZScgJiYgb2JqLm1vZGVsICE9PSAnZGVmZXJyZWQnKSl7XG4gICAgICAgIHJldHVybiBNYWluLmRlYnVnKCdDYW4gb25seSB1cGdyYWRlIHVuc2V0dGxlZCBwcm9taXNlIG9yIGRlZmVycmVkIGludG8gYSBxdWV1ZS4nKTtcbiAgICB9XG5cbiAgIC8vR0VUIEEgTkVXIFFVRVVFIE9CSkVDVCBBTkQgTUVSR0UgSU5cbiAgICB2YXIgX28gPSBfLmFzc2lnbih7fSxbXG4gICAgICAgIF9wcml2YXRlLnRwbFxuICAgICAgICAsb3B0aW9uc1xuICAgIF0pO1xuXG4gICAgZm9yKHZhciBpIGluIF9vKXtcbiAgICAgICBvYmpbaV0gPSBfb1tpXTtcbiAgICB9XG5cbiAgICAvL2RlbGV0ZSBfbztcblxuICAgIC8vQ1JFQVRFIE5FVyBJTlNUQU5DRSBPRiBRVUVVRVxuICAgIG9iaiA9IF9wcml2YXRlLmFjdGl2YXRlKG9iaixvcHRpb25zLGRlcHMpO1xuXG4gICAgLy9SRVRVUk4gUVVFVUUgT0JKRUNUXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3B1YmxpYztcbiJdfQ==
