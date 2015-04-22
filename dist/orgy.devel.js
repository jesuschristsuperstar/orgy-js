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
			return Config.debug("Id "+options.id+" conflicts with existing id.");
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
};


module.exports = _public;

}).call(this,require('_process'))

},{"_process":2}],5:[function(require,module,exports){
var Config = require('./config.js');
var _private = require('./deferred.private.js');

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
		var DeferredSchema = require('./deferred.schema.js')();
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
		if(!_o.id){
			_o.id = Config.generate_id();
		}

		return _o;
};


_public.activate = function(obj){

		//MAKE SURE NAMING CONFLICT DOES NOT EXIST
		if(Config.list[obj.id] && !Config.list[obj.id].overwritable){
				Config.debug("Tried illegal overwrite of "+obj.id+".");
				return Config.list[obj.id];
		}

		//SAVE TO MASTER LIST
		//@todo only save if was assigned an id,
		//which implies user intends to access somewhere else outside of scope
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
	 var status;
	 if(from_id !== target.id && !target.upstream[from_id]){
			 return Config.debug(from_id + " can't signal " + target.id + " because not in upstream.");
	 }
	 //RUN THROUGH QUEUE OF OBSERVING PROMISES TO SEE IF ALL DONE
	 else{
			 status = 1;
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
var schema = function(){

	var Config = require('./config.js'),
			_public = {};

	this.get = function(){
		return _public;
	};

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

	/**
	* Default timeout for a deferred
	* @type number
	*/
	_public.timeout = (function(){
		return Config.config().timeout;
	}());

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
};

var factory = function(){
	var o = new schema();
	return o.get();
};

module.exports = factory;

},{"./config.js":4,"./deferred.private.js":6}],8:[function(require,module,exports){
var Config = require('./config.js');
var _public = {},
		_private = {};

_public.browser = {};
_public.native = {};
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
};

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
};

_public.browser.html = function(path,deferred){
	this.default(path,deferred);
};

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
};



//Native load

_public.native.css = function(path,deferred){
	_public.browser.css(path,deferred);
};

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
};

_public.native.html = function(path,deferred){
	_public.native.default(path,deferred);
};

_public.native.default = function(path,deferred){
	(function(deferred){
		_private.native.get(path,deferred,function(r){
			if(deferred.type === 'json'){
				r = JSON.parse(r);
			}
			deferred.resolve(r);
		});
	})(deferred);
};

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
		});
	}
};

_private.native.prepare_path = function(p){
	p = (p[0] !== '/' && p[0] !== '.')
	? ((p[0].indexOf("http")!==0) ? './' + p : p) : p;
	return p;
};

module.exports = _public;

},{"./config.js":4,"fs":1,"request":1,"vm":1}],9:[function(require,module,exports){
var Config = require('./config.js');
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

		var DeferredSchema = require('./deferred.schema.js')();
		var QueueSchema = require('./queue.schema.js')();

		//Pass array of prototypes to queue factory
		_o = _private.factory([DeferredSchema,QueueSchema],[options]);

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
var QueueSchema = require('./queue.schema.js')();
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
var schema = function(){

	var _private = this,
			_public = {};

	_private.config = require('./config.js'),

	this.get = function(){
		return _public;
	};

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
	* When _public._private.config.debug == 1, method will test each
	* dependency is not previously scheduled to resolve
	* downstream from the target, in which
	* case it would never resolve because its upstream depends on it.
	*
	* @param {array} arr  /array of dependencies to add
	* @returns {array} upstream
	*/
	_public.add = function(arr){

		var _deferred_private = require('./queue.private.js');

		try{
				if(arr.length === 0) return this.upstream;
		}
		catch(err){
				_private.config.debug(err);
		}

		//IF NOT PENDING, DO NOT ALLOW TO ADD
		if(this.state !== 0){
				return _private.config.debug([
					"Cannot add dependency list to queue id:'"+this.id
					+"'. Queue settled/in the process of being settled."
				],arr,this);
		}

		for(var a in arr){

				switch(true){

						//CHECK IF EXISTS
						case(typeof _private.config.list[arr[a].id] === 'object'):
								arr[a] = _private.config.list[arr[a].id];
								break;

						//IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
						case(typeof arr[a] === 'object' && (!arr[a].is_orgy)):
								arr[a] = _deferred_private.convert_to_promise(arr[a],{
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
								return _private.config.debug([
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
				return _private.config.debug("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
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
	* @returns {_deferred_private.tpl|Boolean}
	*/
	_public.reset = function(options){

		var _deferred_private = require('./deferred.private.js');

		if(this.settled !== 1 || this.state !== 1){
			return _private.config.debug("Can only reset a queue settled without errors.");
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
		_deferred_private.auto_timeout.call(this,options.timeout);

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
		var _deferred_private = require('./deferred.private.js');
		_deferred_private.receive_signal(this,this.id);
		return this.state;
	};
};

var factory = function(){
	var o = new schema();
	return o.get();
};

module.exports = factory;

},{"./config.js":4,"./deferred.private.js":6,"./queue.private.js":10}]},{},[])("/src/main.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9tYWluLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2Nhc3QuanMiLCJzcmMvY29uZmlnLmpzIiwic3JjL2RlZmVycmVkLmpzIiwic3JjL2RlZmVycmVkLnByaXZhdGUuanMiLCJzcmMvZGVmZXJyZWQuc2NoZW1hLmpzIiwic3JjL2ZpbGVfbG9hZGVyLmpzIiwic3JjL3F1ZXVlLmpzIiwic3JjL3F1ZXVlLnByaXZhdGUuanMiLCJzcmMvcXVldWUuc2NoZW1hLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyksXG4gICAgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyksXG4gICAgQ2FzdCA9IHJlcXVpcmUoJy4vY2FzdC5qcycpLFxuICAgIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4vKipcbiAqIEBuYW1lc3BhY2Ugb3JneVxuICovXG5cbi8qKlxuKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIGZyb20gYSB2YWx1ZSBhbmQgYW4gaWQgYW5kIGF1dG9tYXRpY2FsbHlcbiogcmVzb2x2ZXMgaXQuXG4qXG4qIEBtZW1iZXJvZiBvcmd5XG4qIEBmdW5jdGlvbiBkZWZpbmVcbipcbiogQHBhcmFtIHtzdHJpbmd9IGlkIEEgdW5pcXVlIGlkIHlvdSBnaXZlIHRvIHRoZSBvYmplY3RcbiogQHBhcmFtIHttaXhlZH0gIGRhdGEgVGhlIHZhbHVlIHRoYXQgdGhlIG9iamVjdCBpcyBhc3NpZ25lZFxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBcbi0gPGI+ZGVwZW5kZW5jaWVzPC9iPiB7YXJyYXl9XG4tIDxiPnJlc29sdmVyPC9iPiB7ZnVuY3Rpb24oPGk+YXNzaWduZWRWYWx1ZTwvaT4sPGk+ZGVmZXJyZWQ8L2k+fVxuKiBAcmV0dXJucyB7b2JqZWN0fSByZXNvbHZlZCBkZWZlcnJlZFxuKi9cbmRlZmluZSA6IGZ1bmN0aW9uKGlkLGRhdGEsb3B0aW9ucyl7XG5cbiAgICB2YXIgZGVmO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuZGVwZW5kZW5jaWVzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXMgfHwgbnVsbDtcbiAgICBvcHRpb25zLnJlc29sdmVyID0gb3B0aW9ucy5yZXNvbHZlciB8fCBudWxsO1xuXG4gICAgLy90ZXN0IGZvciBhIHZhbGlkIGlkXG4gICAgaWYodHlwZW9mIGlkICE9PSAnc3RyaW5nJyl7XG4gICAgICBDb25maWcuZGVidWcoXCJNdXN0IHNldCBpZCB3aGVuIGRlZmluaW5nIGFuIGluc3RhbmNlLlwiKTtcbiAgICB9XG5cbiAgICAvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG4gICAgaWYoQ29uZmlnLmxpc3RbaWRdICYmIENvbmZpZy5saXN0W2lkXS5zZXR0bGVkID09PSAxKXtcbiAgICAgIHJldHVybiBDb25maWcuZGVidWcoXCJDYW4ndCBkZWZpbmUgXCIgKyBpZCArIFwiLiBBbHJlYWR5IHJlc29sdmVkLlwiKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmlkID0gaWQ7XG5cbiAgICBpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuICAgICAgJiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICAvL0RlZmluZSBhcyBhIHF1ZXVlIC0gY2FuJ3QgYXV0b3Jlc29sdmUgYmVjYXVzZSB3ZSBoYXZlIGRlcHNcbiAgICAgIHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgICBkZWYgPSBRdWV1ZShkZXBzLG9wdGlvbnMpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgLy9EZWZpbmUgYXMgYSBkZWZlcnJlZFxuICAgICAgZGVmID0gRGVmZXJyZWQob3B0aW9ucyk7XG5cbiAgICAgIC8vVHJ5IHRvIGltbWVkaWF0ZWx5IHNldHRsZSBbZGVmaW5lXVxuICAgICAgaWYob3B0aW9ucy5yZXNvbHZlciA9PT0gbnVsbFxuICAgICAgICAmJiAodHlwZW9mIG9wdGlvbnMuYXV0b3Jlc29sdmUgIT09ICdib29sZWFuJ1xuICAgICAgICB8fCBvcHRpb25zLmF1dG9yZXNvbHZlID09PSB0cnVlKSl7XG4gICAgICAgIC8vcHJldmVudCBmdXR1cmUgYXV0b3Jlc292ZSBhdHRlbXB0cyBbaS5lLiBmcm9tIHhociByZXNwb25zZV1cbiAgICAgICAgZGVmLmF1dG9yZXNvbHZlID0gZmFsc2U7XG4gICAgICAgIGRlZi5yZXNvbHZlKGRhdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWY7XG59LFxuXG5cbi8qKlxuICogR2V0cyBhbiBleGlzaXRpbmcgZGVmZXJyZWQgLyBxdWV1ZSBvYmplY3QgZnJvbSBnbG9iYWwgc3RvcmUuXG4gKiBSZXR1cm5zIG51bGwgaWYgbm9uZSBmb3VuZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGdldFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCBJZCBvZiBkZWZlcnJlZCBvciBxdWV1ZSBvYmplY3QuXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCB8IHF1ZXVlIHwgbnVsbFxuICovXG5nZXQgOiBmdW5jdGlvbihpZCl7XG4gIGlmKENvbmZpZy5saXN0W2lkXSl7XG4gICAgcmV0dXJuIENvbmZpZy5saXN0W2lkXTtcbiAgfVxuICBlbHNle1xuICAgIHJldHVybiBudWxsO1xuICB9XG59LFxuXG5cbi8qKlxuICogQWRkL3JlbW92ZSBhbiB1cHN0cmVhbSBkZXBlbmRlbmN5IHRvL2Zyb20gYSBxdWV1ZS5cbiAqXG4gKiBDYW4gdXNlIGEgcXVldWUgaWQsIGV2ZW4gZm9yIGEgcXVldWUgdGhhdCBpcyB5ZXQgdG8gYmUgY3JlYXRlZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGFzc2lnblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGd0IFF1ZXVlIGlkIC8gcXVldWUgb2JqZWN0XG4gKiBAcGFyYW0ge2FycmF5fSAgYXJyICBBcnJheSBvZiBwcm9taXNlIGlkcyBvciBkZXBlbmRlbmN5IG9iamVjdHNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkICBJZiB0cnVlIDxiPkFERDwvYj4gYXJyYXkgdG8gcXVldWUgZGVwZW5kZW5jaWVzLCBJZiBmYWxzZSA8Yj5SRU1PVkU8L2I+IGFycmF5IGZyb20gcXVldWUgZGVwZW5kZW5jaWVzXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSBxdWV1ZVxuICovXG5hc3NpZ24gOiBmdW5jdGlvbih0Z3QsYXJyLGFkZCl7XG5cbiAgICBhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMTtcblxuICAgIHZhciBpZCxxO1xuICAgIHN3aXRjaCh0cnVlKXtcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGd0LnRoZW4gPT09ICdmdW5jdGlvbicpOlxuICAgICAgICAgICAgaWQgPSB0Z3QuaWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSh0eXBlb2YgdGd0ID09PSAnc3RyaW5nJyk6XG4gICAgICAgICAgICBpZCA9IHRndDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIENvbmZpZy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKTtcbiAgICB9XG5cbiAgICAvL0lGIFRBUkdFVCBBTFJFQURZIExJU1RFRFxuICAgIGlmKENvbmZpZy5saXN0W2lkXSAmJiBDb25maWcubGlzdFtpZF0ubW9kZWwgPT09ICdxdWV1ZScpe1xuICAgICAgICBxID0gQ29uZmlnLmxpc3RbaWRdO1xuXG4gICAgICAgIC8vPT4gQUREIFRPIFFVRVVFJ1MgVVBTVFJFQU1cbiAgICAgICAgaWYoYWRkKXtcbiAgICAgICAgICAgIHEuYWRkKGFycik7XG4gICAgICAgIH1cbiAgICAgICAgLy89PiBSRU1PVkUgRlJPTSBRVUVVRSdTIFVQU1RSRUFNXG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBxLnJlbW92ZShhcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vQ1JFQVRFIE5FVyBRVUVVRSBBTkQgQUREIERFUEVOREVOQ0lFU1xuICAgIGVsc2UgaWYoYWRkKXtcbiAgICAgICAgcSA9IFF1ZXVlKGFycix7XG4gICAgICAgICAgICBpZCA6IGlkXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvL0VSUk9SOiBDQU4nVCBSRU1PVkUgRlJPTSBBIFFVRVVFIFRIQVQgRE9FUyBOT1QgRVhJU1RcbiAgICBlbHNle1xuICAgICAgICByZXR1cm4gQ29uZmlnLmRlYnVnKFwiQ2Fubm90IHJlbW92ZSBkZXBlbmRlbmNpZXMgZnJvbSBhIHF1ZXVlIHRoYXQgZG9lcyBub3QgZXhpc3QuXCIsdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHE7XG59LFxuXG4vKipcbiogRG9jdW1lbnRlZCBpbiByZXF1aXJlZCBmaWxlLlxuKiBAaWdub3JlXG4qL1xuZGVmZXJyZWQgOiBEZWZlcnJlZCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbnF1ZXVlIDogUXVldWUsXG5cbi8qKlxuKiBEb2N1bWVudGVkIGluIHJlcXVpcmVkIGZpbGUuXG4qIEBpZ25vcmVcbiovXG5jYXN0IDogQ2FzdCxcblxuLyoqXG4qIERvY3VtZW50ZWQgaW4gcmVxdWlyZWQgZmlsZS5cbiogQGlnbm9yZVxuKi9cbmNvbmZpZyA6IENvbmZpZy5jb25maWdcblxufTtcbiIsbnVsbCwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpLFxuXHRcdERlZmVycmVkID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5qcycpO1xuXG4vKipcbiAqIENhc3RzIGEgdGhlbmFibGUgb2JqZWN0IGludG8gYW4gT3JneSBkZWZlcnJlZCBvYmplY3QuXG4gKlxuICogPiBUbyBxdWFsaWZ5IGFzIGEgPGI+dGhlbmFibGU8L2I+LCB0aGUgb2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogPlxuICogPiAtIGlkXG4gKiA+XG4gKiA+IC0gdGhlbigpXG4gKiA+XG4gKiA+IC0gZXJyb3IoKVxuICpcbiAqIEBtZW1iZXJvZiBvcmd5XG4gKiBAZnVuY3Rpb24gY2FzdFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogQSB0aGVuYWJsZSB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqICAtIHtzdHJpbmd9IDxiPmlkPC9iPiAgVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG4gKlxuICogIC0ge2Z1bmN0aW9ufSA8Yj50aGVuPC9iPlxuICpcbiAqICAtIHtmdW5jdGlvbn0gPGI+ZXJyb3I8L2I+XG4gKlxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0dmFyIHJlcXVpcmVkID0gW1widGhlblwiLFwiZXJyb3JcIixcImlkXCJdO1xuXHRcdGZvcih2YXIgaSBpbiByZXF1aXJlZCl7XG5cdFx0XHRpZighb2JqW3JlcXVpcmVkW2ldXSl7XG5cdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcoXCJDYXN0IG1ldGhvZCBtaXNzaW5nIHByb3BlcnR5ICdcIiArIHJlcXVpcmVkW2ldICtcIidcIik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIG9wdGlvbnMgPSB7fTtcblx0XHRvcHRpb25zLmlkID0gb2JqLmlkO1xuXG5cdFx0Ly9NYWtlIHN1cmUgaWQgZG9lcyBub3QgY29uZmxpY3Qgd2l0aCBleGlzdGluZ1xuXHRcdGlmKENvbmZpZy5saXN0W29wdGlvbnMuaWRdKXtcblx0XHRcdHJldHVybiBDb25maWcuZGVidWcoXCJJZCBcIitvcHRpb25zLmlkK1wiIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIGlkLlwiKTtcblx0XHR9XG5cblx0XHQvL0NyZWF0ZSBhIGRlZmVycmVkXG5cdFx0dmFyIGRlZiA9IERlZmVycmVkKG9wdGlvbnMpO1xuXG5cdFx0Ly9DcmVhdGUgcmVzb2x2ZXJcblx0XHR2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpe1xuXHRcdFx0ZGVmLnJlc29sdmUuY2FsbChkZWYsYXJndW1lbnRzWzBdKTtcblx0XHR9O1xuXG5cdFx0Ly9TZXQgUmVzb2x2ZXJcblx0XHRvYmoudGhlbihyZXNvbHZlcik7XG5cblx0XHQvL1JlamVjdCBkZWZlcnJlZCBvbiAuZXJyb3Jcblx0XHR2YXIgZXJyID0gZnVuY3Rpb24oZXJyKXtcblx0XHRcdGRlZi5yZWplY3QoZXJyKTtcblx0XHR9O1xuXHRcdG9iai5lcnJvcihlcnIpO1xuXG5cdFx0Ly9SZXR1cm4gZGVmZXJyZWRcblx0XHRyZXR1cm4gZGVmO1xufTtcbiIsInZhciBfcHVibGljID0ge307XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wdWJsaWMgVkFSSUFCTEVTXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuLyoqXG4gKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLmxpc3QgPSB7fTtcblxuXG4vKipcbiAqIGl0ZXJhdG9yIGZvciBpZHNcbiAqIEB0eXBlIGludGVnZXJcbiAqL1xuX3B1YmxpYy5pID0gMDtcblxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gdmFsdWVzLlxuICpcbiAqIEB0eXBlIG9iamVjdFxuICovXG5fcHVibGljLnNldHRpbmdzID0ge1xuXG5cdFx0ZGVidWdfbW9kZSA6IDFcblx0XHQvL3NldCB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgY2FsbGVlIHNjcmlwdCxcblx0XHQvL2JlY2F1c2Ugbm9kZSBoYXMgbm8gY29uc3RhbnQgZm9yIHRoaXNcblx0XHQsY3dkIDogZmFsc2Vcblx0XHQsbW9kZSA6IChmdW5jdGlvbigpe1xuXHRcdFx0XHRpZih0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgcHJvY2VzcyArICcnID09PSAnW29iamVjdCBwcm9jZXNzXScpe1xuXHRcdFx0XHRcdFx0Ly8gaXMgbm9kZVxuXHRcdFx0XHRcdFx0cmV0dXJuIFwibmF0aXZlXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdC8vIG5vdCBub2RlXG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJicm93c2VyXCI7XG5cdFx0XHRcdH1cblx0XHR9KCkpXG5cdFx0LyoqXG5cdFx0ICogLSBvbkFjdGl2YXRlIC93aGVuIGVhY2ggaW5zdGFuY2UgYWN0aXZhdGVkXG5cdFx0ICogLSBvblNldHRsZSAgIC93aGVuIGVhY2ggaW5zdGFuY2Ugc2V0dGxlc1xuXHRcdCAqXG5cdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0ICovXG5cdFx0LGhvb2tzIDoge1xuXHRcdH1cblx0XHQsdGltZW91dCA6IDUwMDAgLy9kZWZhdWx0IHRpbWVvdXRcbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gIF9wcml2YXRlIFZBUklBQkxFU1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICBfcHVibGljIE1FVEhPRFNcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4vKipcbiAqIE9wdGlvbnMgeW91IHdpc2ggdG8gcGFzcyB0byBzZXQgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBjb25maWdcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIExpc3Qgb2Ygb3B0aW9uczpcblxuXHQtIHtudW1iZXJ9IDxiPnRpbWVvdXQ8L2I+XG5cblx0LSB7c3RyaW5nfSA8Yj5jd2Q8L2I+IFNldHMgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeS4gU2VydmVyIHNpZGUgc2NyaXB0cyBvbmx5LlxuXG5cdC0ge2Jvb2xlYW59IDxiPmRlYnVnX21vZGU8L2I+XG5cbiAqIEByZXR1cm5zIHtvYmplY3R9IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3NcbiAqL1xuX3B1YmxpYy5jb25maWcgPSBmdW5jdGlvbihvYmope1xuXG5cdFx0aWYodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpe1xuXHRcdFx0XHRmb3IodmFyIGkgaW4gb2JqKXtcblx0XHRcdFx0XHRfcHVibGljLnNldHRpbmdzW2ldID0gb2JqW2ldO1xuXHRcdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIF9wdWJsaWMuc2V0dGluZ3M7XG59O1xuXG5cbi8qKlxuICogRGVidWdnaW5nIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gbXNnXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuX3B1YmxpYy5kZWJ1ZyA9IGZ1bmN0aW9uKG1zZyxkZWYpe1xuXG5cdFx0dmFyIG1zZ3MgPSAobXNnIGluc3RhbmNlb2YgQXJyYXkpID8gbXNnLmpvaW4oXCJcXG5cIikgOiBbbXNnXTtcblxuXHRcdHZhciBlID0gbmV3IEVycm9yKG1zZ3MpO1xuXHRcdGNvbnNvbGUubG9nKGUuc3RhY2spO1xuXG5cblx0XHRpZih0aGlzLnNldHRpbmdzLmRlYnVnX21vZGUpe1xuXHRcdFx0Ly90dXJuIG9mZiBkZWJ1Z19tb2RlIHRvIGF2b2lkIGhpdHRpbmcgZGVidWdnZXJcblx0XHRcdGRlYnVnZ2VyO1xuXHRcdH1cblxuXHRcdGlmKF9wdWJsaWMuc2V0dGluZ3MubW9kZSA9PT0gJ2Jyb3dzZXInKXtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRlbHNle1xuXHRcdFx0XHRwcm9jZXNzLmV4aXQoKTtcblx0XHR9XG59O1xuXG5cbi8qKlxuICogVGFrZSBhbiBhcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyBhbmQgYW4gYXJyYXkgb2YgcHJvcGVydHkgb2JqZWN0cyxcbiAqIG1lcmdlcyBlYWNoLCBhbmQgcmV0dXJucyBhIHNoYWxsb3cgY29weS5cbiAqXG4gKiBAcGFyYW0ge2FycmF5fSBwcm90b09iakFyciBBcnJheSBvZiBwcm90b3R5cGUgb2JqZWN0cyB3aGljaCBhcmUgb3ZlcndyaXR0ZW4gZnJvbSByaWdodCB0byBsZWZ0XG4gKiBAcGFyYW0ge2FycmF5fSBwcm9wc09iakFyciBBcnJheSBvZiBkZXNpcmVkIHByb3BlcnR5IG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuICogQHJldHVybnMge29iamVjdH0gb2JqZWN0XG4gKi9cbl9wdWJsaWMubmFpdmVfY2xvbmVyID0gZnVuY3Rpb24ocHJvdG9PYmpBcnIscHJvcHNPYmpBcnIpe1xuXG5cdFx0ZnVuY3Rpb24gbWVyZ2UoZG9ub3JzKXtcblx0XHRcdHZhciBvID0ge307XG5cdFx0XHRmb3IodmFyIGEgaW4gZG9ub3JzKXtcblx0XHRcdFx0XHRmb3IodmFyIGIgaW4gZG9ub3JzW2FdKXtcblx0XHRcdFx0XHRcdFx0aWYoZG9ub3JzW2FdW2JdIGluc3RhbmNlb2YgQXJyYXkpe1xuXHRcdFx0XHRcdFx0XHRcdFx0b1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRlbHNlIGlmKHR5cGVvZiBkb25vcnNbYV1bYl0gPT09ICdvYmplY3QnKXtcblx0XHRcdFx0XHRcdFx0XHR0cnl7XG5cdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkb25vcnNbYV1bYl0pKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0Y2F0Y2goZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGVidWdnZXI7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdFx0XHRvW2JdID0gZG9ub3JzW2FdW2JdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG87XG5cdFx0fVxuXG5cdFx0dmFyIHByb3RvID0gbWVyZ2UocHJvdG9PYmpBcnIpLFxuXHRcdFx0XHRwcm9wcyA9IG1lcmdlKHByb3BzT2JqQXJyKTtcblxuXHRcdC8vQHRvZG8gY29uc2lkZXIgbWFudWFsbHkgc2V0dGluZyB0aGUgcHJvdG90eXBlIGluc3RlYWRcblx0XHR2YXIgZmluYWxPYmplY3QgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcblx0XHRmb3IodmFyIGkgaW4gcHJvcHMpe1xuXHRcdFx0ZmluYWxPYmplY3RbaV0gPSBwcm9wc1tpXTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmluYWxPYmplY3Q7XG59O1xuXG5cbl9wdWJsaWMuZ2VuZXJhdGVfaWQgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgKyAnLScgKyAoKyt0aGlzLmkpO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCJ2YXIgQ29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG4vKipcbiogQG5hbWVzcGFjZSBvcmd5L2RlZmVycmVkXG4qL1xuXG4vKipcbiogQ3JlYXRlcyBhIG5ldyBkZWZlcnJlZCBvYmplY3Qgb3IgaWYgb25lIGV4aXN0cyBieSB0aGUgc2FtZSBpZCxcbiogcmV0dXJucyBpdC5cblxuPGI+VXNhZ2U6PC9iPlxuYGBgXG52YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxucSA9IE9yZ3kuZGVmZXJyZWQoe1xuaWQgOiBcInExXCJcbn0pO1xuYGBgXG5cbiogQG1lbWJlcm9mIG9yZ3lcbiogQGZ1bmN0aW9uIGRlZmVycmVkXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIExpc3Qgb2Ygb3B0aW9uczpcbipcbiogIC0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuKiAgIC0gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuXG4qICAgLSBPcHRpb25hbC5cbipcbipcbiogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkIGlmIG5vdCB5ZXQgcmVzb2x2ZWQuXG4tIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dC5cbi0gRGVsYXlzIGluIG9iamVjdC50aGVuKCkgYW5kIG9iamVjdC5kb25lKCkgd29uJ3Qgbm90IHRyaWdnZXIgdGhpcywgYmVjYXVzZSB0aG9zZSBtZXRob2RzIHJ1biBhZnRlciByZXNvbHZlLlxuKlxuKiBAcmV0dXJucyB7b2JqZWN0fSB7QGxpbmsgb3JneS9kZWZlcnJlZH1cbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXG5cdHZhciBfbztcblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0aWYob3B0aW9ucy5pZCAmJiBDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cdFx0X28gPSBDb25maWcubGlzdFtvcHRpb25zLmlkXTtcblx0fVxuXHRlbHNle1xuXHRcdC8vQ3JlYXRlIGEgbmV3IGRlZmVycmVkIGNsYXNzIGluc3RhbmNlXG5cdFx0dmFyIERlZmVycmVkU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5zY2hlbWEuanMnKSgpO1xuXHRcdF9vID0gX3ByaXZhdGUuZmFjdG9yeShbRGVmZXJyZWRTY2hlbWFdLFtvcHRpb25zXSk7XG5cblx0XHQvL0FDVElWQVRFIERFRkVSUkVEXG5cdFx0X28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyk7XG5cdH1cblxuXHRyZXR1cm4gX287XG59O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgRmlsZV9sb2FkZXIgPSByZXF1aXJlKCcuL2ZpbGVfbG9hZGVyLmpzJyk7XG5cblxudmFyIF9wdWJsaWMgPSB7fTtcblxuXG4vKipcbiAqIEBwYXJhbSBhcnJheSBvcHRpb25zIFByb3RvdHlwZSBvYmplY3RzXG4qKi9cbl9wdWJsaWMuZmFjdG9yeSA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLG9wdGlvbnNPYmpBcnIpe1xuXG5cdFx0Ly9NZXJnZSBhcnJheSBvZiBvYmplY3RzIGludG8gYSBzaW5nbGUsIHNoYWxsb3cgY2xvbmVcblx0XHR2YXIgX28gPSBDb25maWcubmFpdmVfY2xvbmVyKHByb3RvT2JqQXJyLG9wdGlvbnNPYmpBcnIpO1xuXG5cdFx0Ly9pZiBubyBpZCwgZ2VuZXJhdGUgb25lXG5cdFx0aWYoIV9vLmlkKXtcblx0XHRcdF9vLmlkID0gQ29uZmlnLmdlbmVyYXRlX2lkKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIF9vO1xufTtcblxuXG5fcHVibGljLmFjdGl2YXRlID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdC8vTUFLRSBTVVJFIE5BTUlORyBDT05GTElDVCBET0VTIE5PVCBFWElTVFxuXHRcdGlmKENvbmZpZy5saXN0W29iai5pZF0gJiYgIUNvbmZpZy5saXN0W29iai5pZF0ub3ZlcndyaXRhYmxlKXtcblx0XHRcdFx0Q29uZmlnLmRlYnVnKFwiVHJpZWQgaWxsZWdhbCBvdmVyd3JpdGUgb2YgXCIrb2JqLmlkK1wiLlwiKTtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5saXN0W29iai5pZF07XG5cdFx0fVxuXG5cdFx0Ly9TQVZFIFRPIE1BU1RFUiBMSVNUXG5cdFx0Ly9AdG9kbyBvbmx5IHNhdmUgaWYgd2FzIGFzc2lnbmVkIGFuIGlkLFxuXHRcdC8vd2hpY2ggaW1wbGllcyB1c2VyIGludGVuZHMgdG8gYWNjZXNzIHNvbWV3aGVyZSBlbHNlIG91dHNpZGUgb2Ygc2NvcGVcblx0XHRDb25maWcubGlzdFtvYmouaWRdID0gb2JqO1xuXG5cdFx0Ly9BVVRPIFRJTUVPVVRcblx0XHRfcHVibGljLmF1dG9fdGltZW91dC5jYWxsKG9iaik7XG5cblx0XHQvL0NhbGwgaG9va1xuXHRcdGlmKENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKXtcblx0XHRcdENvbmZpZy5zZXR0aW5ncy5ob29rcy5vbkFjdGl2YXRlKG9iaik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9iajtcbn07XG5cblxuX3B1YmxpYy5zZXR0bGUgPSBmdW5jdGlvbihkZWYpe1xuXG5cdFx0Ly9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG5cdFx0aWYoZGVmLnRpbWVvdXRfaWQpe1xuXHRcdFx0Y2xlYXJUaW1lb3V0KGRlZi50aW1lb3V0X2lkKTtcblx0XHR9XG5cblx0XHQvL1NldCBzdGF0ZSB0byByZXNvbHZlZFxuXHRcdF9wdWJsaWMuc2V0X3N0YXRlKGRlZiwxKTtcblxuXHRcdC8vQ2FsbCBob29rXG5cdFx0aWYoQ29uZmlnLnNldHRpbmdzLmhvb2tzLm9uU2V0dGxlKXtcblx0XHRcdENvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZShkZWYpO1xuXHRcdH1cblxuXHRcdC8vQWRkIGRvbmUgYXMgYSBjYWxsYmFjayB0byB0aGVuIGNoYWluIGNvbXBsZXRpb24uXG5cdFx0ZGVmLmNhbGxiYWNrcy50aGVuLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbihkMixpdGluZXJhcnksbGFzdCl7XG5cdFx0XHRcdGRlZi5jYWJvb3NlID0gbGFzdDtcblxuXHRcdFx0XHQvL1J1biBkb25lXG5cdFx0XHRcdF9wdWJsaWMucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHQsZGVmLmNhbGxiYWNrcy5kb25lXG5cdFx0XHRcdFx0XHQsZGVmLmNhYm9vc2Vcblx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0KTtcblx0XHR9KTtcblxuXHRcdC8vUnVuIHRoZW4gcXVldWVcblx0XHRfcHVibGljLnJ1bl90cmFpbihcblx0XHRcdFx0ZGVmXG5cdFx0XHRcdCxkZWYuY2FsbGJhY2tzLnRoZW5cblx0XHRcdFx0LGRlZi52YWx1ZVxuXHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogdHJ1ZX1cblx0XHQpO1xuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cblxuLyoqXG4gKiBSdW5zIGFuIGFycmF5IG9mIGZ1bmN0aW9ucyBzZXF1ZW50aWFsbHkgYXMgYSBwYXJ0aWFsIGZ1bmN0aW9uLlxuICogRWFjaCBmdW5jdGlvbidzIGFyZ3VtZW50IGlzIHRoZSByZXN1bHQgb2YgaXRzIHByZWRlY2Vzc29yIGZ1bmN0aW9uLlxuICpcbiAqIEJ5IGRlZmF1bHQsIGV4ZWN1dGlvbiBjaGFpbiBpcyBwYXVzZWQgd2hlbiBhbnkgZnVuY3Rpb25cbiAqIHJldHVybnMgYW4gdW5yZXNvbHZlZCBkZWZlcnJlZC4gKHBhdXNlX29uX2RlZmVycmVkKSBbT1BUSU9OQUxdXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZiAgL2RlZmVycmVkIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iaiAgL2l0aW5lcmFyeVxuICogICAgICB0cmFpbiAgICAgICB7YXJyYXl9XG4gKiAgICAgIGhvb2tzICAgICAgIHtvYmplY3R9XG4gKiAgICAgICAgICBvbkJlZm9yZSAgICAgICAge2FycmF5fVxuICogICAgICAgICAgb25Db21wbGV0ZSAgICAgIHthcnJheX1cbiAqIEBwYXJhbSB7bWl4ZWR9IHBhcmFtIC9wYXJhbSB0byBwYXNzIHRvIGZpcnN0IGNhbGxiYWNrXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogICAgICBwYXVzZV9vbl9kZWZlcnJlZCAgIHtib29sZWFufVxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5fcHVibGljLnJ1bl90cmFpbiA9IGZ1bmN0aW9uKGRlZixvYmoscGFyYW0sb3B0aW9ucyl7XG5cblx0XHQvL2FsbG93IHByZXZpb3VzIHJldHVybiB2YWx1ZXMgdG8gYmUgcGFzc2VkIGRvd24gY2hhaW5cblx0XHR2YXIgciA9IHBhcmFtIHx8IGRlZi5jYWJvb3NlIHx8IGRlZi52YWx1ZTtcblxuXHRcdC8vb25CZWZvcmUgZXZlbnRcblx0XHRpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQmVmb3JlLnRyYWluLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRfcHVibGljLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0LG9iai5ob29rcy5vbkJlZm9yZVxuXHRcdFx0XHRcdFx0LHBhcmFtXG5cdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0d2hpbGUob2JqLnRyYWluLmxlbmd0aCA+IDApe1xuXG5cdFx0XHRcdC8vcmVtb3ZlIGZuIHRvIGV4ZWN1dGVcblx0XHRcdFx0dmFyIGxhc3QgPSBvYmoudHJhaW4uc2hpZnQoKTtcblx0XHRcdFx0ZGVmLmV4ZWN1dGlvbl9oaXN0b3J5LnB1c2gobGFzdCk7XG5cblx0XHRcdFx0Ly9kZWYuY2Fib29zZSBuZWVkZWQgZm9yIHRoZW4gY2hhaW4gZGVjbGFyZWQgYWZ0ZXIgcmVzb2x2ZWQgaW5zdGFuY2Vcblx0XHRcdFx0ciA9IGRlZi5jYWJvb3NlID0gbGFzdC5jYWxsKGRlZixkZWYudmFsdWUsZGVmLHIpO1xuXG5cdFx0XHRcdC8vaWYgcmVzdWx0IGlzIGFuIHRoZW5hYmxlLCBoYWx0IGV4ZWN1dGlvblxuXHRcdFx0XHQvL2FuZCBydW4gdW5maXJlZCBhcnIgd2hlbiB0aGVuYWJsZSBzZXR0bGVzXG5cdFx0XHRcdGlmKG9wdGlvbnMucGF1c2Vfb25fZGVmZXJyZWQpe1xuXG5cdFx0XHRcdFx0XHQvL0lmIHIgaXMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRpZihyICYmIHIudGhlbiAmJiByLnNldHRsZWQgIT09IDEpe1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlciByIHJlc29sdmVzXG5cdFx0XHRcdFx0XHRcdFx0ci5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRfcHVibGljLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0LHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly90ZXJtaW5hdGUgZXhlY3V0aW9uXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvL0lmIGlzIGFuIGFycmF5IHRoYW4gY29udGFpbnMgYW4gdW5zZXR0bGVkIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRlbHNlIGlmKHIgaW5zdGFuY2VvZiBBcnJheSl7XG5cblx0XHRcdFx0XHRcdFx0XHR2YXIgdGhlbmFibGVzID0gW107XG5cblx0XHRcdFx0XHRcdFx0XHRmb3IodmFyIGkgaW4gcil7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYocltpXS50aGVuICYmIHJbaV0uc2V0dGxlZCAhPT0gMSl7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoZW5hYmxlcy5wdXNoKHJbaV0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR2YXIgZm4gPSAoZnVuY3Rpb24odCxkZWYsb2JqLHBhcmFtKXtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbigpe1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vQmFpbCBpZiBhbnkgdGhlbmFibGVzIHVuc2V0dGxlZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmb3IodmFyIGkgaW4gdCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZih0W2ldLnNldHRsZWQgIT09IDEpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdF9wdWJsaWMucnVuX3RyYWluKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQsb2JqXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQscGFyYW1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiB0cnVlfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pKHRoZW5hYmxlcyxkZWYsb2JqLHBhcmFtKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9leGVjdXRlIHJlc3Qgb2YgdGhpcyB0cmFpbiBhZnRlclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly9hbGwgdGhlbmFibGVzIGZvdW5kIGluIHIgcmVzb2x2ZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cltpXS5jYWxsYmFja3MucmVzb2x2ZS5ob29rcy5vbkNvbXBsZXRlLnRyYWluLnB1c2goZm4pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvL3Rlcm1pbmF0ZSBleGVjdXRpb25cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vb25Db21wbGV0ZSBldmVudFxuXHRcdGlmKG9iai5ob29rcyAmJiBvYmouaG9va3Mub25Db21wbGV0ZS50cmFpbi5sZW5ndGggPiAwKXtcblx0XHRcdFx0X3B1YmxpYy5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9KTtcblx0XHR9XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHBhcmFtIHtudW1iZXJ9IGludFxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMuc2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmLGludCl7XG5cblx0XHRkZWYuc3RhdGUgPSBpbnQ7XG5cblx0XHQvL0lGIFJFU09MVkVEIE9SIFJFSkVDVEVELCBTRVRUTEVcblx0XHRpZihpbnQgPT09IDEgfHwgaW50ID09PSAyKXtcblx0XHRcdFx0ZGVmLnNldHRsZWQgPSAxO1xuXHRcdH1cblxuXHRcdGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpe1xuXHRcdFx0XHRfcHVibGljLnNpZ25hbF9kb3duc3RyZWFtKGRlZik7XG5cdFx0fVxufTtcblxuXG4vKipcbiAqIEdldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuX3B1YmxpYy5nZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYpe1xuXHRcdHJldHVybiBkZWYuc3RhdGU7XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgYXV0b21hdGljIHRpbWVvdXQgb24gYSBwcm9taXNlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHRpbWVvdXQgKG9wdGlvbmFsKVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbl9wdWJsaWMuYXV0b190aW1lb3V0ID0gZnVuY3Rpb24odGltZW91dCl7XG5cblx0XHR0aGlzLnRpbWVvdXQgPSAodHlwZW9mIHRpbWVvdXQgPT09ICd1bmRlZmluZWQnKVxuXHRcdD8gdGhpcy50aW1lb3V0IDogdGltZW91dDtcblxuXHRcdC8vQVVUTyBSRUpFQ1QgT04gdGltZW91dFxuXHRcdGlmKCF0aGlzLnR5cGUgfHwgdGhpcy50eXBlICE9PSAndGltZXInKXtcblxuXHRcdFx0XHQvL0RFTEVURSBQUkVWSU9VUyBUSU1FT1VUIElGIEVYSVNUU1xuXHRcdFx0XHRpZih0aGlzLnRpbWVvdXRfaWQpe1xuXHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZih0eXBlb2YgdGhpcy50aW1lb3V0ID09PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0XHRDb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFx0XHRcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuXHRcdFx0XHRcdFx0XHQsdGhpcy5pZFxuXHRcdFx0XHRcdFx0XSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy50aW1lb3V0ID09PSAtMSl7XG5cdFx0XHRcdFx0XHQvL05PIEFVVE8gVElNRU9VVCBTRVRcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgc2NvcGUgPSB0aGlzO1xuXG5cdFx0XHRcdHRoaXMudGltZW91dF9pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdF9wdWJsaWMuYXV0b190aW1lb3V0X2NiLmNhbGwoc2NvcGUpO1xuXHRcdFx0XHR9LCB0aGlzLnRpbWVvdXQpO1xuXG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRcdC8vQHRvZG8gV0hFTiBBIFRJTUVSLCBBREQgRFVSQVRJT04gVE8gQUxMIFVQU1RSRUFNIEFORCBMQVRFUkFMP1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqIENhbGxiYWNrIGZvciBhdXRvdGltZW91dC4gRGVjbGFyYXRpb24gaGVyZSBhdm9pZHMgbWVtb3J5IGxlYWsuXG4gKlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbl9wdWJsaWMuYXV0b190aW1lb3V0X2NiID0gZnVuY3Rpb24oKXtcblxuXHRcdGlmKHRoaXMuc3RhdGUgIT09IDEpe1xuXG5cdFx0XHRcdC8vR0VUIFRIRSBVUFNUUkVBTSBFUlJPUiBJRFxuXHRcdFx0XHR2YXIgbXNncyA9IFtdO1xuXHRcdFx0XHR2YXIgc2NvcGUgPSB0aGlzO1xuXG5cdFx0XHRcdHZhciBmbiA9IGZ1bmN0aW9uKG9iail7XG5cdFx0XHRcdFx0XHRpZihvYmouc3RhdGUgIT09IDEpe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBvYmouaWQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksXG5cdFx0XHRcdCAqIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG5cdFx0XHRcdCAqIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRpZihDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG5cdFx0XHRcdFx0XHR2YXIgciA9IF9wdWJsaWMuc2VhcmNoX29ial9yZWN1cnNpdmVseSh0aGlzLCd1cHN0cmVhbScsZm4pO1xuXHRcdFx0XHRcdFx0bXNncy5wdXNoKHNjb3BlLmlkICsgXCI6IHJlamVjdGVkIGJ5IGF1dG8gdGltZW91dCBhZnRlciBcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHQrIHRoaXMudGltZW91dCArIFwibXNcIik7XG5cdFx0XHRcdFx0XHRtc2dzLnB1c2goXCJDYXVzZTpcIik7XG5cdFx0XHRcdFx0XHRtc2dzLnB1c2gocik7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzLG1zZ3MpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzKTtcblx0XHRcdFx0fVxuXHRcdH1cbn07XG5cblxuX3B1YmxpYy5lcnJvciA9IGZ1bmN0aW9uKGNiKXtcblxuXHRcdC8vSUYgRVJST1IgQUxSRUFEWSBUSFJPV04sIEVYRUNVVEUgQ0IgSU1NRURJQVRFTFlcblx0XHRpZih0aGlzLnN0YXRlID09PSAyKXtcblx0XHRcdFx0Y2IoKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdFx0dGhpcy5yZWplY3RfcS5wdXNoKGNiKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTaWduYWxzIGFsbCBkb3duc3RyZWFtIHByb21pc2VzIHRoYXQgX3B1YmxpYyBwcm9taXNlIG9iamVjdCdzXG4gKiBzdGF0ZSBoYXMgY2hhbmdlZC5cbiAqXG4gKiBAdG9kbyBTaW5jZSB0aGUgc2FtZSBxdWV1ZSBtYXkgaGF2ZSBiZWVuIGFzc2lnbmVkIHR3aWNlIGRpcmVjdGx5IG9yXG4gKiBpbmRpcmVjdGx5IHZpYSBzaGFyZWQgZGVwZW5kZW5jaWVzLCBtYWtlIHN1cmUgbm90IHRvIGRvdWJsZSByZXNvbHZlXG4gKiAtIHdoaWNoIHRocm93cyBhbiBlcnJvci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IGRlZmVycmVkL3F1ZXVlXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuX3B1YmxpYy5zaWduYWxfZG93bnN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldCl7XG5cblx0XHQvL01BS0UgU1VSRSBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRURcblx0XHRmb3IodmFyIGkgaW4gdGFyZ2V0LmRvd25zdHJlYW0pe1xuXHRcdFx0XHRpZih0YXJnZXQuZG93bnN0cmVhbVtpXS5zZXR0bGVkID09PSAxKXtcblxuXHRcdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnN0YXRlICE9PSAxKXtcblx0XHRcdFx0XHRcdC8vdHJpZWQgdG8gc2V0dGxlIGEgcmVqZWN0ZWQgZG93bnN0cmVhbVxuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHQvL3RyaWVkIHRvIHNldHRsZSBhIHN1Y2Nlc3NmdWxseSBzZXR0bGVkIGRvd25zdHJlYW1cblx0XHRcdFx0XHRcdENvbmZpZy5kZWJ1Zyh0YXJnZXQuaWQgKyBcIiB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBcIitcIidcIit0YXJnZXQuZG93bnN0cmVhbVtpXS5pZCtcIicgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWQuXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vTk9XIFRIQVQgV0UgS05PVyBBTEwgRE9XTlNUUkVBTSBJUyBVTlNFVFRMRUQsIFdFIENBTiBJR05PUkUgQU5ZXG5cdFx0Ly9TRVRUTEVEIFRIQVQgUkVTVUxUIEFTIEEgU0lERSBFRkZFQ1QgVE8gQU5PVEhFUiBTRVRUTEVNRU5UXG5cdFx0Zm9yICh2YXIgaSBpbiB0YXJnZXQuZG93bnN0cmVhbSl7XG5cdFx0XHRcdGlmKHRhcmdldC5kb3duc3RyZWFtW2ldLnNldHRsZWQgIT09IDEpe1xuXHRcdFx0XHRcdFx0X3B1YmxpYy5yZWNlaXZlX3NpZ25hbCh0YXJnZXQuZG93bnN0cmVhbVtpXSx0YXJnZXQuaWQpO1xuXHRcdFx0XHR9XG5cdFx0fVxufTtcblxuXG4vKipcbiogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG4qIGNhbGxiYWNrIHJldHVybnMgYSBub24tZmFsc2UgdmFsdWUuXG4qXG4qIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiogQHBhcmFtIHtzdHJpbmd9IHByb3BOYW1lICAgICAgICAgIFRoZSBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBhcnJheSB0byBidWJibGUgdXBcbiogQHBhcmFtIHtmdW5jdGlvbn0gZm4gICAgICAgICAgICAgIFRoZSB0ZXN0IGNhbGxiYWNrIHRvIGJlIGFwcGxpZWQgdG8gZWFjaCBvYmplY3RcbiogQHBhcmFtIHthcnJheX0gYnJlYWRjcnVtYiAgICAgICAgIFRoZSBicmVhZGNydW1iIHRocm91Z2ggdGhlIGNoYWluIG9mIHRoZSBmaXJzdCBtYXRjaFxuKiBAcmV0dXJucyB7bWl4ZWR9XG4qL1xuX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24ob2JqLHByb3BOYW1lLGZuLGJyZWFkY3J1bWIpe1xuXG5cdFx0aWYodHlwZW9mIGJyZWFkY3J1bWIgPT09ICd1bmRlZmluZWQnKXtcblx0XHRcdFx0YnJlYWRjcnVtYiA9IFtvYmouaWRdO1xuXHRcdH1cblxuXHRcdHZhciByMTtcblxuXHRcdGZvcih2YXIgaSBpbiBvYmpbcHJvcE5hbWVdKXtcblxuXHRcdFx0XHQvL1JVTiBURVNUXG5cdFx0XHRcdHIxID0gZm4ob2JqW3Byb3BOYW1lXVtpXSk7XG5cblx0XHRcdFx0aWYocjEgIT09IGZhbHNlKXtcblx0XHRcdFx0Ly9NQVRDSCBSRVRVUk5FRC4gUkVDVVJTRSBJTlRPIE1BVENIIElGIEhBUyBQUk9QRVJUWSBPRiBTQU1FIE5BTUUgVE8gU0VBUkNIXG5cdFx0XHRcdFx0XHQvL0NIRUNLIFRIQVQgV0UgQVJFTidUIENBVUdIVCBJTiBBIENJUkNVTEFSIExPT1Bcblx0XHRcdFx0XHRcdGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKXtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCJDaXJjdWxhciBjb25kaXRpb24gaW4gcmVjdXJzaXZlIHNlYXJjaCBvZiBvYmogcHJvcGVydHkgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrcHJvcE5hbWUrXCInIG9mIG9iamVjdCBcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KygodHlwZW9mIG9iai5pZCAhPT0gJ3VuZGVmaW5lZCcpID8gXCInXCIrb2JqLmlkK1wiJ1wiIDogJycpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQrXCIuIE9mZmVuZGluZyB2YWx1ZTogXCIrcjFcblx0XHRcdFx0XHRcdFx0XHRcdFx0LChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWRjcnVtYi5wdXNoKHIxKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBicmVhZGNydW1iLmpvaW4oXCIgW2RlcGVuZHMgb25dPT4gXCIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KSgpXG5cdFx0XHRcdFx0XHRcdFx0XSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGJyZWFkY3J1bWIucHVzaChyMSk7XG5cblx0XHRcdFx0XHRcdGlmKG9ialtwcm9wTmFtZV1baV1bcHJvcE5hbWVdKXtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gX3B1YmxpYy5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KG9ialtwcm9wTmFtZV1baV0scHJvcE5hbWUsZm4sYnJlYWRjcnVtYik7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gYnJlYWRjcnVtYjtcbn07XG5cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHByb21pc2UgZGVzY3JpcHRpb24gaW50byBhIHByb21pc2UuXG4gKlxuICogQHBhcmFtIHt0eXBlfSBvYmpcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbl9wdWJsaWMuY29udmVydF90b19wcm9taXNlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMpe1xuXG5cdFx0b2JqLmlkID0gb2JqLmlkIHx8IG9wdGlvbnMuaWQ7XG5cblx0XHQvL0F1dG9uYW1lXG5cdFx0aWYgKCFvYmouaWQpIHtcblx0XHRcdGlmIChvYmoudHlwZSA9PT0gJ3RpbWVyJykge1xuXHRcdFx0XHRvYmouaWQgPSBcInRpbWVyLVwiICsgb2JqLnRpbWVvdXQgKyBcIi1cIiArICgrK0NvbmZpZy5pKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHR5cGVvZiBvYmoudXJsID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRvYmouaWQgPSBvYmoudXJsLnNwbGl0KFwiL1wiKS5wb3AoKTtcblx0XHRcdFx0Ly9SRU1PVkUgLmpzIEZST00gSURcblx0XHRcdFx0aWYgKG9iai5pZC5zZWFyY2goXCIuanNcIikgIT09IC0xKSB7XG5cdFx0XHRcdFx0b2JqLmlkID0gb2JqLmlkLnNwbGl0KFwiLlwiKTtcblx0XHRcdFx0XHRvYmouaWQucG9wKCk7XG5cdFx0XHRcdFx0b2JqLmlkID0gb2JqLmlkLmpvaW4oXCIuXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly9SZXR1cm4gaWYgYWxyZWFkeSBleGlzdHNcblx0XHRpZihDb25maWcubGlzdFtvYmouaWRdICYmIG9iai50eXBlICE9PSAndGltZXInKXtcblx0XHRcdC8vQSBwcmV2aW91cyBwcm9taXNlIG9mIHRoZSBzYW1lIGlkIGV4aXN0cy5cblx0XHRcdC8vTWFrZSBzdXJlIHRoaXMgZGVwZW5kZW5jeSBvYmplY3QgZG9lc24ndCBoYXZlIGFcblx0XHRcdC8vcmVzb2x2ZXIgLSBpZiBpdCBkb2VzIGVycm9yXG5cdFx0XHRpZihvYmoucmVzb2x2ZXIpe1xuXHRcdFx0XHRDb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFwiWW91IGNhbid0IHNldCBhIHJlc29sdmVyIG9uIGEgcXVldWUgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkLiBZb3UgY2FuIG9ubHkgcmVmZXJlbmNlIHRoZSBvcmlnaW5hbC5cIlxuXHRcdFx0XHRcdCxcIkRldGVjdGVkIHJlLWluaXQgb2YgJ1wiICsgb2JqLmlkICsgXCInLlwiXG5cdFx0XHRcdFx0LFwiQXR0ZW1wdGVkOlwiXG5cdFx0XHRcdFx0LG9ialxuXHRcdFx0XHRcdCxcIkV4aXN0aW5nOlwiXG5cdFx0XHRcdFx0LENvbmZpZy5saXN0W29iai5pZF1cblx0XHRcdFx0XSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNle1xuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmxpc3Rbb2JqLmlkXTtcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdC8vQ29udmVydCBkZXBlbmRlbmN5IHRvIGFuIGluc3RhbmNlXG5cdFx0dmFyIGRlZjtcblx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdFx0Ly9FdmVudFxuXHRcdFx0XHRjYXNlKG9iai50eXBlID09PSAnZXZlbnQnKTpcblx0XHRcdFx0XHRcdGRlZiA9IF9wdWJsaWMud3JhcF9ldmVudChvYmopO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZShvYmoudHlwZSA9PT0gJ3F1ZXVlJyk6XG5cdFx0XHRcdFx0XHR2YXIgUXVldWUgPSByZXF1aXJlKCcuL3F1ZXVlLmpzJyk7XG5cdFx0XHRcdFx0XHRkZWYgPSBRdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iaik7XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHQvL0FscmVhZHkgYSB0aGVuYWJsZVxuXHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJyk6XG5cblx0XHRcdFx0XHRcdHN3aXRjaCh0cnVlKXtcblxuXHRcdFx0XHRcdFx0XHRcdC8vUmVmZXJlbmNlIHRvIGFuIGV4aXN0aW5nIGluc3RhbmNlXG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2Ygb2JqLmlkID09PSAnc3RyaW5nJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIidcIitvYmouaWQgK1wiJzogZGlkIG5vdCBleGlzdC4gQXV0byBjcmVhdGluZyBuZXcgZGVmZXJyZWQuXCIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBfcHVibGljLmRlZmVycmVkKHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlkIDogb2JqLmlkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vSWYgb2JqZWN0IHdhcyBhIHRoZW5hYmxlLCByZXNvbHZlIHRoZSBuZXcgZGVmZXJyZWQgd2hlbiB0aGVuIGNhbGxlZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZihvYmoudGhlbil7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b2JqLnRoZW4oZnVuY3Rpb24ocil7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZShyKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0XHRcdC8vT0JKRUNUIFBST1BFUlRZIC5wcm9taXNlIEVYUEVDVEVEIFRPIFJFVFVSTiBBIFBST01JU0Vcblx0XHRcdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBvYmoucHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyk6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmKG9iai5zY29wZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWYgPSBvYmoucHJvbWlzZS5jYWxsKG9iai5zY29wZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxzZXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IG9iai5wcm9taXNlKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHQvL09iamVjdCBpcyBhIHRoZW5hYmxlXG5cdFx0XHRcdFx0XHRcdFx0Y2FzZShvYmoudGhlbik6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlZiA9IG9iajtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vQ2hlY2sgaWYgaXMgYSB0aGVuYWJsZVxuXHRcdFx0XHRcdFx0aWYodHlwZW9mIGRlZiAhPT0gJ29iamVjdCcgfHwgIWRlZi50aGVuKXtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiRGVwZW5kZW5jeSBsYWJlbGVkIGFzIGEgcHJvbWlzZSBkaWQgbm90IHJldHVybiBhIHByb21pc2UuXCIsb2JqKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2Uob2JqLnR5cGUgPT09ICd0aW1lcicpOlxuXHRcdFx0XHRcdFx0ZGVmID0gX3B1YmxpYy53cmFwX3RpbWVyKG9iaik7XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHQvL0xvYWQgZmlsZVxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0b2JqLnR5cGUgPSBvYmoudHlwZSB8fCBcImRlZmF1bHRcIjtcblx0XHRcdFx0XHRcdC8vSW5oZXJpdCBwYXJlbnQncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5XG5cdFx0XHRcdFx0XHRpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2Qpe1xuXHRcdFx0XHRcdFx0XHRvYmouY3dkID0gb3B0aW9ucy5wYXJlbnQuY3dkO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGVmID0gX3B1YmxpYy53cmFwX3hocihvYmopO1xuXHRcdH1cblxuXHRcdC8vSW5kZXggcHJvbWlzZSBieSBpZCBmb3IgZnV0dXJlIHJlZmVyZW5jaW5nXG5cdFx0Q29uZmlnLmxpc3Rbb2JqLmlkXSA9IGRlZjtcblxuXHRcdHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogQHRvZG86IHJlZG8gdGhpc1xuICpcbiAqIENvbnZlcnRzIGEgcmVmZXJlbmNlIHRvIGEgRE9NIGV2ZW50IHRvIGEgcHJvbWlzZS5cbiAqIFJlc29sdmVkIG9uIGZpcnN0IGV2ZW50IHRyaWdnZXIuXG4gKlxuICogQHRvZG8gcmVtb3ZlIGpxdWVyeSBkZXBlbmRlbmN5XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9ialxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgb2JqZWN0XG4gKi9cbl9wdWJsaWMud3JhcF9ldmVudCA9IGZ1bmN0aW9uKG9iail7XG5cblx0XHR2YXIgRGVmZXJyZWQgPSByZXF1aXJlKCcuL2RlZmVycmVkLmpzJyk7XG5cdFx0dmFyIGRlZiA9IERlZmVycmVkKHtcblx0XHRcdFx0aWQgOiBvYmouaWRcblx0XHR9KTtcblxuXG5cdFx0aWYodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cblx0XHRcdFx0aWYodHlwZW9mICQgIT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdFx0dmFyIG1zZyA9ICd3aW5kb3cgYW5kIGRvY3VtZW50IGJhc2VkIGV2ZW50cyBkZXBlbmQgb24galF1ZXJ5Jztcblx0XHRcdFx0XHRcdGRlZi5yZWplY3QobXNnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdC8vRm9yIG5vdywgZGVwZW5kIG9uIGpxdWVyeSBmb3IgSUU4IERPTUNvbnRlbnRMb2FkZWQgcG9seWZpbGxcblx0XHRcdFx0XHRzd2l0Y2godHJ1ZSl7XG5cdFx0XHRcdFx0XHRjYXNlKG9iai5pZCA9PT0gJ3JlYWR5JyB8fCBvYmouaWQgPT09ICdET01Db250ZW50TG9hZGVkJyk6XG5cdFx0XHRcdFx0XHRcdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0ZGVmLnJlc29sdmUoMSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2Uob2JqLmlkID09PSAnbG9hZCcpOlxuXHRcdFx0XHRcdFx0XHQkKHdpbmRvdykubG9hZChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKDEpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5vbihvYmouaWQsXCJib2R5XCIsZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRkZWYucmVzb2x2ZSgxKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZjtcbn07XG5cblxuX3B1YmxpYy53cmFwX3RpbWVyID0gZnVuY3Rpb24ob2JqKXtcblxuXHRcdHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcblx0XHR2YXIgZGVmID0gRGVmZXJyZWQoKTtcblxuXHRcdChmdW5jdGlvbihkZWYpe1xuXG5cdFx0XHRcdHZhciBfc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0dmFyIF9lbmQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdFx0XHRcdGRlZi5yZXNvbHZlKHtcblx0XHRcdFx0XHRcdFx0XHRzdGFydCA6IF9zdGFydFxuXHRcdFx0XHRcdFx0XHRcdCxlbmQgOiBfZW5kXG5cdFx0XHRcdFx0XHRcdFx0LGVsYXBzZWQgOiBfZW5kIC0gX3N0YXJ0XG5cdFx0XHRcdFx0XHRcdFx0LHRpbWVvdXQgOiBvYmoudGltZW91dFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sb2JqLnRpbWVvdXQpO1xuXG5cdFx0fShkZWYpKTtcblxuXHRcdHJldHVybiBkZWY7XG59O1xuXG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlZmVycmVkIG9iamVjdCB0aGF0IGRlcGVuZHMgb24gdGhlIGxvYWRpbmcgb2YgYSBmaWxlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZXBcbiAqIEByZXR1cm5zIHtvYmplY3R9IGRlZmVycmVkIG9iamVjdFxuICovXG5fcHVibGljLndyYXBfeGhyID0gZnVuY3Rpb24oZGVwKXtcblxuXHRcdHZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vZGVmZXJyZWQuanMnKTtcblxuXHRcdHZhciByZXF1aXJlZCA9IFtcImlkXCIsXCJ1cmxcIl07XG5cdFx0Zm9yKHZhciBpIGluIHJlcXVpcmVkKXtcblx0XHRcdGlmKCFkZXBbcmVxdWlyZWRbaV1dKXtcblx0XHRcdFx0cmV0dXJuIENvbmZpZy5kZWJ1ZyhbXG5cdFx0XHRcdFx0XCJGaWxlIHJlcXVlc3RzIGNvbnZlcnRlZCB0byBwcm9taXNlcyByZXF1aXJlOiBcIiArIHJlcXVpcmVkW2ldXG5cdFx0XHRcdFx0LFwiTWFrZSBzdXJlIHlvdSB3ZXJlbid0IGV4cGVjdGluZyBkZXBlbmRlbmN5IHRvIGFscmVhZHkgaGF2ZSBiZWVuIHJlc29sdmVkIHVwc3RyZWFtLlwiXG5cdFx0XHRcdFx0LGRlcFxuXHRcdFx0XHRdKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvL0lGIFBST01JU0UgRk9SIFRISVMgVVJMIEFMUkVBRFkgRVhJU1RTLCBSRVRVUk4gSVRcblx0XHRpZihDb25maWcubGlzdFtkZXAuaWRdKXtcblx0XHRcdHJldHVybiBDb25maWcubGlzdFtkZXAuaWRdO1xuXHRcdH1cblxuXHRcdC8vQ09OVkVSVCBUTyBERUZFUlJFRDpcblx0XHR2YXIgZGVmID0gRGVmZXJyZWQoZGVwKTtcblxuXHRcdGlmKHR5cGVvZiBGaWxlX2xvYWRlcltDb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdICE9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRGaWxlX2xvYWRlcltDb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdKGRlcC51cmwsZGVmLGRlcCk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRGaWxlX2xvYWRlcltDb25maWcuc2V0dGluZ3MubW9kZV1bJ2RlZmF1bHQnXShkZXAudXJsLGRlZixkZXApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWY7XG59O1xuXG4vKipcbiogQSBcInNpZ25hbFwiIGhlcmUgY2F1c2VzIGEgcXVldWUgdG8gbG9vayB0aHJvdWdoIGVhY2ggaXRlbVxuKiBpbiBpdHMgdXBzdHJlYW0gYW5kIGNoZWNrIHRvIHNlZSBpZiBhbGwgYXJlIHJlc29sdmVkLlxuKlxuKiBTaWduYWxzIGNhbiBvbmx5IGJlIHJlY2VpdmVkIGJ5IGEgcXVldWUgaXRzZWxmIG9yIGFuIGluc3RhbmNlXG4qIGluIGl0cyB1cHN0cmVhbS5cbipcbiogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuKiBAcGFyYW0ge3N0cmluZ30gZnJvbV9pZFxuKiBAcmV0dXJucyB7dm9pZH1cbiovXG5fcHVibGljLnJlY2VpdmVfc2lnbmFsID0gZnVuY3Rpb24odGFyZ2V0LGZyb21faWQpe1xuXG5cdFx0aWYodGFyZ2V0LmhhbHRfcmVzb2x1dGlvbiA9PT0gMSkgcmV0dXJuO1xuXG5cdCAvL01BS0UgU1VSRSBUSEUgU0lHTkFMIFdBUyBGUk9NIEEgUFJPTUlTRSBCRUlORyBMSVNURU5FRCBUT1xuXHQgLy9CVVQgQUxMT1cgU0VMRiBTVEFUVVMgQ0hFQ0tcblx0IHZhciBzdGF0dXM7XG5cdCBpZihmcm9tX2lkICE9PSB0YXJnZXQuaWQgJiYgIXRhcmdldC51cHN0cmVhbVtmcm9tX2lkXSl7XG5cdFx0XHQgcmV0dXJuIENvbmZpZy5kZWJ1Zyhmcm9tX2lkICsgXCIgY2FuJ3Qgc2lnbmFsIFwiICsgdGFyZ2V0LmlkICsgXCIgYmVjYXVzZSBub3QgaW4gdXBzdHJlYW0uXCIpO1xuXHQgfVxuXHQgLy9SVU4gVEhST1VHSCBRVUVVRSBPRiBPQlNFUlZJTkcgUFJPTUlTRVMgVE8gU0VFIElGIEFMTCBET05FXG5cdCBlbHNle1xuXHRcdFx0IHN0YXR1cyA9IDE7XG5cdFx0XHQgZm9yKHZhciBpIGluIHRhcmdldC51cHN0cmVhbSl7XG5cdFx0XHRcdFx0IC8vU0VUUyBTVEFUVVMgVE8gMCBJRiBBTlkgT0JTRVJWSU5HIEhBVkUgRkFJTEVELCBCVVQgTk9UIElGIFBFTkRJTkcgT1IgUkVTT0xWRURcblx0XHRcdFx0XHQgaWYodGFyZ2V0LnVwc3RyZWFtW2ldLnN0YXRlICE9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdCBzdGF0dXMgPSB0YXJnZXQudXBzdHJlYW1baV0uc3RhdGU7XG5cdFx0XHRcdFx0XHRcdCBicmVhaztcblx0XHRcdFx0XHQgfVxuXHRcdFx0IH1cblx0IH1cblxuXHQgLy9SRVNPTFZFIFFVRVVFIElGIFVQU1RSRUFNIEZJTklTSEVEXG5cdCBpZihzdGF0dXMgPT09IDEpe1xuXG5cdFx0XHQvL0dFVCBSRVRVUk4gVkFMVUVTIFBFUiBERVBFTkRFTkNJRVMsIFdISUNIIFNBVkVTIE9SREVSIEFORFxuXHRcdFx0Ly9SRVBPUlRTIERVUExJQ0FURVNcblx0XHRcdHZhciB2YWx1ZXMgPSBbXTtcblx0XHRcdGZvcih2YXIgaSBpbiB0YXJnZXQuZGVwZW5kZW5jaWVzKXtcblx0XHRcdFx0dmFsdWVzLnB1c2godGFyZ2V0LmRlcGVuZGVuY2llc1tpXS52YWx1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRhcmdldC5yZXNvbHZlLmNhbGwodGFyZ2V0LHZhbHVlcyk7XG5cdCB9XG5cblx0IGlmKHN0YXR1cyA9PT0gMil7XG5cdFx0XHQgdmFyIGVyciA9IFtcblx0XHRcdFx0XHQgdGFyZ2V0LmlkK1wiIGRlcGVuZGVuY3kgJ1wiK3RhcmdldC51cHN0cmVhbVtpXS5pZCArIFwiJyB3YXMgcmVqZWN0ZWQuXCJcblx0XHRcdFx0XHQgLHRhcmdldC51cHN0cmVhbVtpXS5hcmd1bWVudHNcblx0XHRcdCBdO1xuXHRcdFx0IHRhcmdldC5yZWplY3QuYXBwbHkodGFyZ2V0LGVycik7XG5cdCB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9wdWJsaWM7XG4iLCIvKipcbiAqIERlZmF1bHQgcHJvcGVydGllcyBmb3IgYWxsIGRlZmVycmVkIG9iamVjdHMuXG4gKiBAaWdub3JlXG4gKi9cbnZhciBzY2hlbWEgPSBmdW5jdGlvbigpe1xuXG5cdHZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpLFxuXHRcdFx0X3B1YmxpYyA9IHt9O1xuXG5cdHRoaXMuZ2V0ID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gX3B1YmxpYztcblx0fTtcblxuXHRfcHVibGljLmlzX29yZ3kgPSB0cnVlO1xuXG5cdF9wdWJsaWMuaWQgPSBudWxsO1xuXG5cdC8vQSBDT1VOVEVSIEZPUiBBVVQwLUdFTkVSQVRFRCBQUk9NSVNFIElEJ1Ncblx0X3B1YmxpYy5zZXR0bGVkID0gMDtcblxuXHQvKipcblx0KiBTVEFURSBDT0RFUzpcblx0KiAtLS0tLS0tLS0tLS0tLS0tLS1cblx0KiAtMSAgID0+IFNFVFRMSU5HIFtFWEVDVVRJTkcgQ0FMTEJBQ0tTXVxuXHQqICAwICAgPT4gUEVORElOR1xuXHQqICAxICAgPT4gUkVTT0xWRUQgLyBGVUxGSUxMRURcblx0KiAgMiAgID0+IFJFSkVDVEVEXG5cdCovXG5cdF9wdWJsaWMuc3RhdGUgPSAwO1xuXG5cdF9wdWJsaWMudmFsdWUgPSBbXTtcblxuXHQvL1RoZSBtb3N0IHJlY2VudCB2YWx1ZSBnZW5lcmF0ZWQgYnkgdGhlIHRoZW4tPmRvbmUgY2hhaW4uXG5cdF9wdWJsaWMuY2Fib29zZSA9IG51bGw7XG5cblx0X3B1YmxpYy5tb2RlbCA9IFwiZGVmZXJyZWRcIjtcblxuXHRfcHVibGljLmRvbmVfZmlyZWQgPSAwO1xuXG5cdF9wdWJsaWMudGltZW91dF9pZCA9IG51bGw7XG5cblx0LyoqXG5cdCogRGVmYXVsdCB0aW1lb3V0IGZvciBhIGRlZmVycmVkXG5cdCogQHR5cGUgbnVtYmVyXG5cdCovXG5cdF9wdWJsaWMudGltZW91dCA9IChmdW5jdGlvbigpe1xuXHRcdHJldHVybiBDb25maWcuY29uZmlnKCkudGltZW91dDtcblx0fSgpKTtcblxuXHRfcHVibGljLmNhbGxiYWNrX3N0YXRlcyA9IHtcblx0XHRyZXNvbHZlIDogMFxuXHRcdCx0aGVuIDogMFxuXHRcdCxkb25lIDogMFxuXHRcdCxyZWplY3QgOiAwXG5cdH07XG5cblx0LyoqXG5cdCogU2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBjYWxsYmFjayBldmVudFxuXHQqIGxpc3QuXG5cdCpcblx0KiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIHByb3BlcnR5TmFtZXMgYXNcblx0KiBfcHVibGljLmNhbGxiYWNrX3N0YXRlczogYWRkaW5nIGJvaWxlcnBsYXRlXG5cdCogcHJvcGVydGllcyBmb3IgZWFjaFxuXHQqXG5cdCogQHJldHVybnMge29iamVjdH1cblx0Ki9cblx0X3B1YmxpYy5jYWxsYmFja3MgPSAoZnVuY3Rpb24oKXtcblxuXHRcdHZhciBvID0ge307XG5cblx0XHRmb3IodmFyIGkgaW4gX3B1YmxpYy5jYWxsYmFja19zdGF0ZXMpe1xuXHRcdFx0b1tpXSA9IHtcblx0XHRcdFx0dHJhaW4gOiBbXVxuXHRcdFx0XHQsaG9va3MgOiB7XG5cdFx0XHRcdFx0b25CZWZvcmUgOiB7XG5cdFx0XHRcdFx0XHR0cmFpbiA6IFtdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdCxvbkNvbXBsZXRlIDoge1xuXHRcdFx0XHRcdFx0dHJhaW4gOiBbXVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbztcblx0fSkoKTtcblxuXHQvL1BST01JU0UgSEFTIE9CU0VSVkVSUyBCVVQgRE9FUyBOT1QgT0JTRVJWRSBPVEhFUlNcblx0X3B1YmxpYy5kb3duc3RyZWFtID0ge307XG5cblx0X3B1YmxpYy5leGVjdXRpb25faGlzdG9yeSA9IFtdO1xuXG5cdC8vV0hFTiBUUlVFLCBBTExPV1MgUkUtSU5JVCBbRk9SIFVQR1JBREVTIFRPIEEgUVVFVUVdXG5cdF9wdWJsaWMub3ZlcndyaXRhYmxlID0gMDtcblxuXHQvKipcblx0KiBSRU1PVEVcblx0KlxuXHQqIFJFTU9URSA9PSAxICA9PiAgW0RFRkFVTFRdIE1ha2UgaHR0cCByZXF1ZXN0IGZvciBmaWxlXG5cdCpcblx0KiBSRU1PVEUgPT0gMCAgPT4gIFJlYWQgZmlsZSBkaXJlY3RseSBmcm9tIHRoZSBmaWxlc3lzdGVtXG5cdCpcblx0KiBPTkxZIEFQUExJRVMgVE8gU0NSSVBUUyBSVU4gVU5ERVIgTk9ERSBBUyBCUk9XU0VSIEhBUyBOT1xuXHQqIEZJTEVTWVNURU0gQUNDRVNTXG5cdCovXG5cdF9wdWJsaWMucmVtb3RlID0gMTtcblxuXHQvL0FERFMgVE8gTUFTVEVSIExJU1QuIEFMV0FZUyBUUlVFIFVOTEVTUyBVUEdSQURJTkcgQSBQUk9NSVNFIFRPIEEgUVVFVUVcblx0X3B1YmxpYy5saXN0ID0gMTtcblxuXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXHQvLyAgX3B1YmxpYyBNRVRIT0RTXG5cdC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cblx0LyoqXG5cdCogUmVzb2x2ZXMgYSBkZWZlcnJlZC9xdWV1ZS5cblx0KlxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZVxuXHQqXG5cdCogQHBhcmFtIHttaXhlZH0gdmFsdWUgUmVzb2x2ZXIgdmFsdWUuXG5cdCogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy5yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpe1xuXG5cdFx0dmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cblx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEpe1xuXHRcdFx0Q29uZmlnLmRlYnVnKFtcblx0XHRcdFx0dGhpcy5pZCArIFwiIGNhbid0IHJlc29sdmUuXCJcblx0XHRcdFx0LFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG5cdFx0XHRdKTtcblx0XHR9XG5cblx0XHQvL1NFVCBTVEFURSBUTyBTRVRUTEVNRU5UIElOIFBST0dSRVNTXG5cdFx0X3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsLTEpO1xuXG5cdFx0Ly9TRVQgVkFMVUVcblx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cblx0XHQvL1JVTiBSRVNPTFZFUiBCRUZPUkUgUFJPQ0VFRElOR1xuXHRcdC8vRVZFTiBJRiBUSEVSRSBJUyBOTyBSRVNPTFZFUiwgU0VUIElUIFRPIEZJUkVEIFdIRU4gQ0FMTEVEXG5cdFx0aWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09ICdmdW5jdGlvbicpe1xuXG5cdFx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMTtcblxuXHRcdFx0Ly9BZGQgcmVzb2x2ZXIgdG8gcmVzb2x2ZSB0cmFpblxuXHRcdFx0dHJ5e1xuXHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLnRyYWluLnB1c2goZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmVyKHZhbHVlLHRoaXMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0ZWxzZXtcblxuXHRcdFx0dGhpcy5yZXNvbHZlcl9maXJlZCA9IDE7XG5cblx0XHRcdC8vQWRkIHNldHRsZSB0byByZXNvbHZlIHRyYWluXG5cdFx0XHQvL0Fsd2F5cyBzZXR0bGUgYmVmb3JlIGFsbCBvdGhlciBjb21wbGV0ZSBjYWxsYmFja3Ncblx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi51bnNoaWZ0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdF9wcml2YXRlLnNldHRsZSh0aGlzKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vUnVuIHJlc29sdmVcblx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHR0aGlzXG5cdFx0XHQsdGhpcy5jYWxsYmFja3MucmVzb2x2ZVxuXHRcdFx0LHRoaXMudmFsdWVcblx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHQpO1xuXG5cdFx0Ly9yZXNvbHZlciBpcyBleHBlY3RlZCB0byBjYWxsIHJlc29sdmUgYWdhaW5cblx0XHQvL2FuZCB0aGF0IHdpbGwgZ2V0IHVzIHBhc3QgdGhpcyBwb2ludFxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogUmVqZWN0cyBhIGRlZmVycmVkL3F1ZXVlXG5cdCpcblx0KiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuXHQqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3JlamVjdFxuXHQqXG5cdCogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IGVyciBFcnJvciBpbmZvcm1hdGlvbi5cblx0KiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG5cdCovXG5cdF9wdWJsaWMucmVqZWN0ID0gZnVuY3Rpb24oZXJyKXtcblxuXHRcdHZhciBfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXG5cdFx0aWYoIShlcnIgaW5zdGFuY2VvZiBBcnJheSkpe1xuXHRcdFx0ZXJyID0gW2Vycl07XG5cdFx0fVxuXG5cdFx0dmFyIG1zZyA9IFwiUmVqZWN0ZWQgXCIrdGhpcy5tb2RlbCtcIjogJ1wiK3RoaXMuaWQrXCInLlwiXG5cblx0XHRpZihDb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSl7XG5cdFx0XHRlcnIudW5zaGlmdChtc2cpO1xuXHRcdFx0Q29uZmlnLmRlYnVnKGVycix0aGlzKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdG1zZyA9IG1zZyArIFwiIFR1cm4gb24gZGVidWcgbW9kZSBmb3IgbW9yZSBpbmZvLlwiO1xuXHRcdFx0Y29uc29sZS53YXJuKG1zZyk7XG5cdFx0fVxuXG5cdFx0Ly9SZW1vdmUgYXV0byB0aW1lb3V0IHRpbWVyXG5cdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vU2V0IHN0YXRlIHRvIHJlamVjdGVkXG5cdFx0X3ByaXZhdGUuc2V0X3N0YXRlKHRoaXMsMik7XG5cblx0XHQvL0V4ZWN1dGUgcmVqZWN0aW9uIHF1ZXVlXG5cdFx0X3ByaXZhdGUucnVuX3RyYWluKFxuXHRcdFx0dGhpc1xuXHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuXHRcdFx0LGVyclxuXHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IGZhbHNlfVxuXHRcdCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIENoYWluIG1ldGhvZFxuXG5cdDxiPlVzYWdlOjwvYj5cblx0YGBgXG5cdHZhciBPcmd5ID0gcmVxdWlyZShcIm9yZ3lcIiksXG5cdFx0XHRcdFx0cSA9IE9yZ3kuZGVmZXJyZWQoe1xuXHRcdFx0XHRcdFx0aWQgOiBcInExXCJcblx0XHRcdFx0XHR9KTtcblxuXHQvL1Jlc29sdmUgdGhlIGRlZmVycmVkXG5cdHEucmVzb2x2ZShcIlNvbWUgdmFsdWUuXCIpO1xuXG5cdHEudGhlbihmdW5jdGlvbihyKXtcblx0XHRjb25zb2xlLmxvZyhyKTsgLy9Tb21lIHZhbHVlLlxuXHR9KVxuXG5cdGBgYFxuXG5cdCogQG1lbWJlcm9mIG9yZ3kvZGVmZXJyZWRcblx0KiBAZnVuY3Rpb24gb3JneS9kZWZlcnJlZCN0aGVuXG5cdCpcblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvblxuXHQqIEBwYXJhbSB7ZnVuY3Rpb259IHJlamVjdG9yIFJlamVjdGlvbiBjYWxsYmFjayBmdW5jdGlvblxuXHQqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcblx0Ki9cblx0X3B1YmxpYy50aGVuID0gZnVuY3Rpb24oZm4scmVqZWN0b3Ipe1xuXG5cdFx0dmFyIF9wcml2YXRlID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG5cblx0XHRzd2l0Y2godHJ1ZSl7XG5cblx0XHRcdC8vQW4gZXJyb3Igd2FzIHByZXZpb3VzbHkgdGhyb3duLCBhZGQgcmVqZWN0b3IgJiBiYWlsIG91dFxuXHRcdFx0Y2FzZSh0aGlzLnN0YXRlID09PSAyKTpcblx0XHRcdFx0aWYodHlwZW9mIHJlamVjdG9yID09PSAnZnVuY3Rpb24nKXtcblx0XHRcdFx0XHR0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuXHRcdFx0Y2FzZSh0aGlzLmRvbmVfZmlyZWQgPT09IDEpOlxuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKHRoaXMuaWQrXCIgY2FuJ3QgYXR0YWNoIC50aGVuKCkgYmVjYXVzZSAuZG9uZSgpIGhhcyBhbHJlYWR5IGZpcmVkLCBhbmQgdGhhdCBtZWFucyB0aGUgZXhlY3V0aW9uIGNoYWluIGlzIGNvbXBsZXRlLlwiKTtcblxuXHRcdFx0ZGVmYXVsdDpcblxuXHRcdFx0XHQvL1B1c2ggY2FsbGJhY2sgdG8gdGhlbiBxdWV1ZVxuXHRcdFx0XHR0aGlzLmNhbGxiYWNrcy50aGVuLnRyYWluLnB1c2goZm4pO1xuXG5cdFx0XHRcdC8vUHVzaCByZWplY3QgY2FsbGJhY2sgdG8gdGhlIHJlamVjdGlvbiBxdWV1ZVxuXHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLnJlamVjdC50cmFpbi5wdXNoKHJlamVjdG9yKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuXHRcdFx0XHRpZih0aGlzLnNldHRsZWQgPT09IDEgJiYgdGhpcy5zdGF0ZSA9PT0gMSAmJiAhdGhpcy5kb25lX2ZpcmVkKXtcblx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHQsdGhpcy5jYWxsYmFja3MudGhlblxuXHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0LHtwYXVzZV9vbl9kZWZlcnJlZCA6IHRydWV9XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG5cdFx0XHRcdGVsc2V7fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cblx0LyoqXG5cdCogRG9uZSBjYWxsYmFjay5cblx0KlxuXHQqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG5cdCogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjZG9uZVxuXHQqXG5cdCogQHBhcmFtIHtmdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb25cblx0KiBAcGFyYW0ge2Z1bmN0aW9ufSByZWplY3RvciBSZWplY3Rpb24gY2FsbGJhY2sgZnVuY3Rpb25cblx0KiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuXHQqL1xuXHRfcHVibGljLmRvbmUgPSBmdW5jdGlvbihmbixyZWplY3Rvcil7XG5cblx0XHR2YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuXHRcdGlmKHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ubGVuZ3RoID09PSAwXG5cdFx0XHQmJiB0aGlzLmRvbmVfZmlyZWQgPT09IDApe1xuXHRcdFx0XHRpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpe1xuXG5cdFx0XHRcdFx0Ly93cmFwIGNhbGxiYWNrIHdpdGggc29tZSBvdGhlciBjb21tYW5kc1xuXHRcdFx0XHRcdHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3Qpe1xuXG5cdFx0XHRcdFx0XHQvL0RvbmUgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2UsIHNvIG5vdGUgdGhhdCBpdCBoYXMgYmVlblxuXHRcdFx0XHRcdFx0ZGVmZXJyZWQuZG9uZV9maXJlZCA9IDE7XG5cblx0XHRcdFx0XHRcdGZuKHIsZGVmZXJyZWQsbGFzdCk7XG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ucHVzaChmbjIpO1xuXG5cdFx0XHRcdFx0Ly9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcblx0XHRcdFx0XHRpZih0eXBlb2YgcmVqZWN0b3IgPT09ICdmdW5jdGlvbicpe1xuXHRcdFx0XHRcdFx0dGhpcy5jYWxsYmFja3MucmVqZWN0Lmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChyZWplY3Rvcik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly9TZXR0bGVkLCBydW4gdHJhaW4gbm93XG5cdFx0XHRcdFx0aWYodGhpcy5zZXR0bGVkID09PSAxKXtcblx0XHRcdFx0XHRcdGlmKHRoaXMuc3RhdGUgPT09IDEpe1xuXHRcdFx0XHRcdFx0XHRfcHJpdmF0ZS5ydW5fdHJhaW4oXG5cdFx0XHRcdFx0XHRcdFx0dGhpc1xuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhbGxiYWNrcy5kb25lXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2Fib29zZVxuXHRcdFx0XHRcdFx0XHRcdCx7cGF1c2Vfb25fZGVmZXJyZWQgOiBmYWxzZX1cblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2V7XG5cdFx0XHRcdFx0XHRcdF9wcml2YXRlLnJ1bl90cmFpbihcblx0XHRcdFx0XHRcdFx0XHR0aGlzXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuXHRcdFx0XHRcdFx0XHRcdCx0aGlzLmNhYm9vc2Vcblx0XHRcdFx0XHRcdFx0XHQse3BhdXNlX29uX2RlZmVycmVkIDogZmFsc2V9XG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vVW5zZXR0bGVkLCB0cmFpbiB3aWxsIGJlIHJ1biB3aGVuIHNldHRsZWRcblx0XHRcdFx0XHRlbHNle31cblx0XHRcdH1cblx0XHRcdGVsc2V7XG5cdFx0XHRcdHJldHVybiBDb25maWcuZGVidWcoXCJkb25lKCkgbXVzdCBiZSBwYXNzZWQgYSBmdW5jdGlvbi5cIik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2V7XG5cdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiZG9uZSgpIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLlwiKTtcblx0XHR9XG5cdH07XG59O1xuXG52YXIgZmFjdG9yeSA9IGZ1bmN0aW9uKCl7XG5cdHZhciBvID0gbmV3IHNjaGVtYSgpO1xuXHRyZXR1cm4gby5nZXQoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeTtcbiIsInZhciBDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xudmFyIF9wdWJsaWMgPSB7fSxcblx0XHRfcHJpdmF0ZSA9IHt9O1xuXG5fcHVibGljLmJyb3dzZXIgPSB7fTtcbl9wdWJsaWMubmF0aXZlID0ge307XG5fcHJpdmF0ZS5uYXRpdmUgPSB7fTtcblxuLy9Ccm93c2VyIGxvYWRcblxuX3B1YmxpYy5icm93c2VyLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXG5cdHZhciBoZWFkID0gIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG5cdGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblxuXHRlbGVtLnNldEF0dHJpYnV0ZShcImhyZWZcIixwYXRoKTtcblx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsXCJ0ZXh0L2Nzc1wiKTtcblx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJyZWxcIixcInN0eWxlc2hlZXRcIik7XG5cblx0aWYoZWxlbS5vbmxvYWQpe1xuXHRcdChmdW5jdGlvbihlbGVtLHBhdGgsZGVmZXJyZWQpe1xuXHRcdFx0XHRlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShlbGVtKTtcblx0XHRcdCB9O1xuXG5cdFx0XHQgZWxlbS5vbmVycm9yID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KFwiRmFpbGVkIHRvIGxvYWQgcGF0aDogXCIgKyBwYXRoKTtcblx0XHRcdCB9O1xuXG5cdFx0fShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuXHRcdGhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG5cdH1cblx0ZWxzZXtcblx0XHQvL0FERCBlbGVtIEJVVCBNQUtFIFhIUiBSRVFVRVNUIFRPIENIRUNLIEZJTEUgUkVDRUlWRURcblx0XHRoZWFkLmFwcGVuZENoaWxkKGVsZW0pO1xuXHRcdGNvbnNvbGUud2FybihcIk5vIG9ubG9hZCBhdmFpbGFibGUgZm9yIGxpbmsgdGFnLCBhdXRvcmVzb2x2aW5nLlwiKTtcblx0XHRkZWZlcnJlZC5yZXNvbHZlKGVsZW0pO1xuXHR9XG59O1xuXG5fcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cblx0dmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuXHRlbGVtLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0Jztcblx0ZWxlbS5zZXRBdHRyaWJ1dGUoXCJzcmNcIixwYXRoKTtcblxuXHQoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKXtcblx0XHRcdGVsZW0ub25sb2FkID0gZWxlbS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHQvL0F1dG9yZXNvbHZlIGJ5IGRlZmF1bHRcblx0XHRcdFx0aWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHRcdFx0fHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpe1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoKHR5cGVvZiBlbGVtLnZhbHVlICE9PSAndW5kZWZpbmVkJykgPyBlbGVtLnZhbHVlIDogZWxlbSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRlbGVtLm9uZXJyb3IgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoXCJFcnJvciBsb2FkaW5nOiBcIiArIHBhdGgpO1xuXHRcdFx0fTtcblx0fShlbGVtLHBhdGgsZGVmZXJyZWQpKTtcblxuXHR0aGlzLmhlYWQuYXBwZW5kQ2hpbGQoZWxlbSk7XG59O1xuXG5fcHVibGljLmJyb3dzZXIuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHR0aGlzLmRlZmF1bHQocGF0aCxkZWZlcnJlZCk7XG59O1xuXG5fcHVibGljLmJyb3dzZXIuZGVmYXVsdCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsb3B0aW9ucyl7XG5cdHZhciByLFxuXHRyZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0cmVxLm9wZW4oJ0dFVCcsIHBhdGgsIHRydWUpO1xuXG5cdChmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0XHRyZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcblx0XHRcdFx0aWYocmVxLnN0YXR1cyA9PT0gMjAwKXtcblx0XHRcdFx0XHRyID0gcmVxLnJlc3BvbnNlVGV4dDtcblx0XHRcdFx0XHRpZihvcHRpb25zLnR5cGUgJiYgb3B0aW9ucy50eXBlID09PSAnanNvbicpe1xuXHRcdFx0XHRcdFx0dHJ5e1xuXHRcdFx0XHRcdFx0XHRyID0gSlNPTi5wYXJzZShyKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNhdGNoKGUpe1xuXHRcdFx0XHRcdFx0XHRfcHVibGljLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcIkNvdWxkIG5vdCBkZWNvZGUgSlNPTlwiXG5cdFx0XHRcdFx0XHRcdFx0LHBhdGhcblx0XHRcdFx0XHRcdFx0XHQsclxuXHRcdFx0XHRcdFx0XHRdLGRlZmVycmVkKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNle1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlamVjdChcIkVycm9yIGxvYWRpbmc6IFwiICsgcGF0aCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9KHBhdGgsZGVmZXJyZWQpKTtcblxuXHRyZXEuc2VuZChudWxsKTtcbn07XG5cblxuXG4vL05hdGl2ZSBsb2FkXG5cbl9wdWJsaWMubmF0aXZlLmNzcyA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpe1xuXHRfcHVibGljLmJyb3dzZXIuY3NzKHBhdGgsZGVmZXJyZWQpO1xufTtcblxuX3B1YmxpYy5uYXRpdmUuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCl7XG5cdC8vbG9jYWwgcGFja2FnZVxuXHRpZihwYXRoWzBdPT09Jy4nKXtcblx0XHRwYXRoID0gX3ByaXZhdGUubmF0aXZlLnByZXBhcmVfcGF0aChwYXRoLGRlZmVycmVkKTtcblx0XHR2YXIgciA9IHJlcXVpcmUocGF0aCk7XG5cdFx0Ly9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG5cdFx0aWYodHlwZW9mIGRlZmVycmVkLmF1dG9yZXNvbHZlICE9PSAnYm9vbGVhbidcblx0XHR8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSl7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlKHIpO1xuXHRcdH1cblx0fVxuXHQvL3JlbW90ZSBzY3JpcHRcblx0ZWxzZXtcblx0XHQvL0NoZWNrIHRoYXQgd2UgaGF2ZSBjb25maWd1cmVkIHRoZSBlbnZpcm9ubWVudCB0byBhbGxvdyB0aGlzLFxuXHRcdC8vYXMgaXQgcmVwcmVzZW50cyBhIHNlY3VyaXR5IHRocmVhdCBhbmQgc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgZGVidWdnaW5nXG5cdFx0aWYoIUNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKXtfXG5cdFx0XHRDb25maWcuZGVidWcoXCJTZXQgY29uZmlnLmRlYnVnX21vZGU9MSB0byBydW4gcmVtb3RlIHNjcmlwdHMgb3V0c2lkZSBvZiBkZWJ1ZyBtb2RlLlwiKTtcblx0XHR9XG5cdFx0ZWxzZXtcblx0XHRcdF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKXtcblx0XHRcdFx0dmFyIFZtID0gcmVxdWlyZSgndm0nKTtcblx0XHRcdFx0ciA9IFZtLnJ1bkluVGhpc0NvbnRleHQoZGF0YSk7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn07XG5cbl9wdWJsaWMubmF0aXZlLmh0bWwgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0X3B1YmxpYy5uYXRpdmUuZGVmYXVsdChwYXRoLGRlZmVycmVkKTtcbn07XG5cbl9wdWJsaWMubmF0aXZlLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKXtcblx0KGZ1bmN0aW9uKGRlZmVycmVkKXtcblx0XHRfcHJpdmF0ZS5uYXRpdmUuZ2V0KHBhdGgsZGVmZXJyZWQsZnVuY3Rpb24ocil7XG5cdFx0XHRpZihkZWZlcnJlZC50eXBlID09PSAnanNvbicpe1xuXHRcdFx0XHRyID0gSlNPTi5wYXJzZShyKTtcblx0XHRcdH1cblx0XHRcdGRlZmVycmVkLnJlc29sdmUocik7XG5cdFx0fSk7XG5cdH0pKGRlZmVycmVkKTtcbn07XG5cbl9wcml2YXRlLm5hdGl2ZS5nZXQgPSBmdW5jdGlvbiAocGF0aCxkZWZlcnJlZCxjYWxsYmFjayl7XG5cdHBhdGggPSBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoKHBhdGgpO1xuXHRpZihwYXRoWzBdID09PSAnLicpe1xuXHRcdC8vZmlsZSBzeXN0ZW1cblx0XHR2YXIgRnMgPSByZXF1aXJlKCdmcycpO1xuXHRcdEZzLnJlYWRGaWxlKHBhdGgsIFwidXRmLThcIiwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuXHRcdFx0aWYgKGVycikgdGhyb3cgZXJyO1xuXHRcdFx0Y2FsbGJhY2soZGF0YSk7XG5cdFx0fSk7XG5cdH1cblx0ZWxzZXtcblx0XHQvL2h0dHBcblx0XHR2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcblx0XHRyZXF1ZXN0KHBhdGgsZnVuY3Rpb24oZXJyb3IscmVzcG9uc2UsYm9keSl7XG5cdFx0XHRpZiAoIWVycm9yICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGJvZHkpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZXtcblx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07XG5cbl9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGggPSBmdW5jdGlvbihwKXtcblx0cCA9IChwWzBdICE9PSAnLycgJiYgcFswXSAhPT0gJy4nKVxuXHQ/ICgocFswXS5pbmRleE9mKFwiaHR0cFwiKSE9PTApID8gJy4vJyArIHAgOiBwKSA6IHA7XG5cdHJldHVybiBwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgX3ByaXZhdGUgPSByZXF1aXJlKCcuL3F1ZXVlLnByaXZhdGUuanMnKTtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIG9yZ3kvcXVldWVcbiAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjdGhlbiBhcyAjdGhlblxuICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNkb25lIGFzICNkb25lXG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3JlamVjdCBhcyAjcmVqZWN0XG4gKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3Jlc29sdmUgYXMgI3Jlc29sdmVcbiAqXG4qL1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICogSWYgbm8gPGI+cmVzb2x2ZXI8L2I+IG9wdGlvbiBpcyBzZXQsIHJlc29sdmVkIHdoZW4gYWxsIGRlcGVuZGVuY2llcyBhcmUgcmVzb2x2ZWQuIEVsc2UsIHJlc29sdmVkIHdoZW4gdGhlIGRlZmVycmVkIHBhcmFtIHBhc3NlZCB0byB0aGUgcmVzb2x2ZXIgb3B0aW9uXG4gKiBpcyByZXNvbHZlZC5cblxuIDxiPlVzYWdlOjwvYj5cbiBgYGBcbiB2YXIgT3JneSA9IHJlcXVpcmUoXCJvcmd5XCIpLFxuXHRcdFx0XHRxID0gT3JneS5xdWV1ZShbXG5cdFx0XHRcdFx0IHtcblx0XHRcdFx0XHRcdCBjb21tZW50IDogXCJUaGlzIGlzIGEgbmVzdGVkIHF1ZXVlIGNyZWF0ZWQgb24gdGhlIGZseS5cIlxuXHRcdFx0XHRcdFx0ICx0eXBlIDogXCJqc29uXCJcblx0XHRcdFx0XHRcdCAsdXJsIDogXCIvYXBpL2pzb24vc29tbnVtc1wiXG5cdFx0XHRcdFx0XHQgLHJlc29sdmVyIDogZnVuY3Rpb24ocixkZWZlcnJlZCl7XG5cdFx0XHRcdFx0XHRcdCAvL0ZpbHRlciBvdXQgZXZlbiBudW1iZXJzXG5cdFx0XHRcdFx0XHRcdCB2YXIgb2RkID0gYXJyLmZpbHRlcihmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0XHRcdFx0XHQgcmV0dXJuIDAgIT0gdmFsICUgMjtcblx0XHRcdFx0XHRcdFx0IH0pO1xuXHRcdFx0XHRcdFx0XHQgZGVmZXJyZWQucmVzb2x2ZShvZGQpO1xuXHRcdFx0XHRcdFx0IH1cblx0XHRcdFx0XHQgfVxuXHRcdFx0XHQgXSx7XG5cdFx0XHRcdFx0IGlkIDogXCJxMVwiLFxuXHRcdFx0XHRcdCByZXNvbHZlciA6IGZ1bmN0aW9uKHIsZGVmZXJyZWQpe1xuXHRcdFx0XHRcdFx0IHZhciBwcmltZXMgPSByWzBdLmZpbHRlcihmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0XHRcdFx0IGhpZ2ggPSBNYXRoLmZsb29yKE1hdGguc3FydCh2YWwpKSArIDE7XG5cdFx0XHRcdFx0XHRcdCBmb3IgKHZhciBkaXYgPSAyOyBkaXYgPD0gaGlnaDsgZGl2KyspIHtcblx0XHRcdFx0XHRcdFx0XHQgaWYgKHZhbHVlICUgZGl2ID09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRcdCByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0IH1cblx0XHRcdFx0XHRcdFx0IH1cblx0XHRcdFx0XHRcdFx0IHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0IH0pO1xuXHRcdFx0XHRcdFx0IGRlZmVycmVkLnJlc29sdmUocHJpbWVzKTtcblx0XHRcdFx0XHQgfSlcblx0XHRcdFx0IH0pO1xuXG4gYGBgXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIHF1ZXVlXG4gKlxuICogQHBhcmFtIHthcnJheX0gZGVwcyBBcnJheSBvZiBkZXBlbmRlbmNpZXMgdGhhdCBtdXN0IGJlIHJlc29sdmVkIGJlZm9yZSA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIGNhbGxlZC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zICBMaXN0IG9mIG9wdGlvbnM6XG5cbi0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuXHQtIENhbiBiZSB1c2VkIHdpdGggT3JneS5nZXQoaWQpLlxuXHQtIE9wdGlvbmFsLlxuXG5cbi0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkLlxuXHQtIERlZmF1bHRzIHRvIE9yZ3kuY29uZmlnKCkudGltZW91dCBbNTAwMF0uXG5cdC0gTm90ZSB0aGUgdGltZW91dCBpcyBvbmx5IGFmZmVjdGVkIGJ5IGRlcGVuZGVuY2llcyBhbmQvb3IgdGhlIHJlc29sdmVyIGNhbGxiYWNrLlxuXHQtIFRoZW4sZG9uZSBkZWxheXMgd2lsbCBub3QgZmxhZyBhIHRpbWVvdXQgYmVjYXVzZSB0aGV5IGFyZSBjYWxsZWQgYWZ0ZXIgdGhlIGluc3RhbmNlIGlzIGNvbnNpZGVyZWQgcmVzb2x2ZWQuXG5cblxuLSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPnJlc3VsdDwvaT4sPGk+ZGVmZXJyZWQ8L2k+KX0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuXG5cdC0gPGk+cmVzdWx0PC9pPiBpcyBhbiBhcnJheSBvZiB0aGUgcXVldWUncyByZXNvbHZlZCBkZXBlbmRlbmN5IHZhbHVlcy5cblx0LSA8aT5kZWZlcnJlZDwvaT4gaXMgdGhlIHF1ZXVlIG9iamVjdC5cblx0LSBUaGUgcXVldWUgd2lsbCBvbmx5IHJlc29sdmUgd2hlbiA8aT5kZWZlcnJlZDwvaT4ucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnKCkudGltZW91dC5cblxuXHQqIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L3F1ZXVlfVxuICpcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkZXBzLG9wdGlvbnMpe1xuXG5cdHZhciBfbztcblx0aWYoIShkZXBzIGluc3RhbmNlb2YgQXJyYXkpKXtcblx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpO1xuXHR9XG5cblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0Ly9ET0VTIE5PVCBBTFJFQURZIEVYSVNUXG5cdGlmKCFDb25maWcubGlzdFtvcHRpb25zLmlkXSl7XG5cblx0XHR2YXIgRGVmZXJyZWRTY2hlbWEgPSByZXF1aXJlKCcuL2RlZmVycmVkLnNjaGVtYS5qcycpKCk7XG5cdFx0dmFyIFF1ZXVlU2NoZW1hID0gcmVxdWlyZSgnLi9xdWV1ZS5zY2hlbWEuanMnKSgpO1xuXG5cdFx0Ly9QYXNzIGFycmF5IG9mIHByb3RvdHlwZXMgdG8gcXVldWUgZmFjdG9yeVxuXHRcdF9vID0gX3ByaXZhdGUuZmFjdG9yeShbRGVmZXJyZWRTY2hlbWEsUXVldWVTY2hlbWFdLFtvcHRpb25zXSk7XG5cblx0XHQvL0FjdGl2YXRlIHF1ZXVlXG5cdFx0X28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbyxvcHRpb25zLGRlcHMpO1xuXG5cdH1cblx0Ly9BTFJFQURZIEVYSVNUU1xuXHRlbHNlIHtcblxuXHRcdF9vID0gQ29uZmlnLmxpc3Rbb3B0aW9ucy5pZF07XG5cblx0XHRpZihfby5tb2RlbCAhPT0gJ3F1ZXVlJyl7XG5cdFx0Ly9NQVRDSCBGT1VORCBCVVQgTk9UIEEgUVVFVUUsIFVQR1JBREUgVE8gT05FXG5cblx0XHRcdG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMTtcblxuXHRcdFx0X28gPSBfcHJpdmF0ZS51cGdyYWRlKF9vLG9wdGlvbnMsZGVwcyk7XG5cdFx0fVxuXHRcdGVsc2V7XG5cblx0XHRcdC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG5cdFx0XHRmb3IodmFyIGkgaW4gb3B0aW9ucyl7XG5cdFx0XHRcdF9vW2ldID0gb3B0aW9uc1tpXTtcblx0XHRcdH1cblxuXHRcdFx0Ly9BREQgQURESVRJT05BTCBERVBFTkRFTkNJRVMgSUYgTk9UIFJFU09MVkVEXG5cdFx0XHRpZihkZXBzLmxlbmd0aCA+IDApe1xuXHRcdFx0XHRfcHJpdmF0ZS50cGwuYWRkLmNhbGwoX28sZGVwcyk7XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHQvL1JFU1VNRSBSRVNPTFVUSU9OIFVOTEVTUyBTUEVDSUZJRUQgT1RIRVJXSVNFXG5cdFx0X28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID9cblx0XHRvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDA7XG5cdH1cblxuXHRyZXR1cm4gX287XG59O1xuIiwidmFyIENvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG52YXIgUXVldWVTY2hlbWEgPSByZXF1aXJlKCcuL3F1ZXVlLnNjaGVtYS5qcycpKCk7XG52YXIgX3Byb3RvID0gcmVxdWlyZSgnLi9kZWZlcnJlZC5wcml2YXRlLmpzJyk7XG52YXIgX3B1YmxpYyA9IE9iamVjdC5jcmVhdGUoX3Byb3RvLHt9KTtcblxuXG4vKipcbiAqIEFjdGl2YXRlcyBhIHF1ZXVlIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7YXJyYXl9IGRlcHNcbiAqIEByZXR1cm5zIHtvYmplY3R9IHF1ZXVlXG4gKi9cbl9wdWJsaWMuYWN0aXZhdGUgPSBmdW5jdGlvbihvLG9wdGlvbnMsZGVwcyl7XG5cblx0XHQvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcblx0XHQvL3ZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKTtcblx0XHRvID0gX3Byb3RvLmFjdGl2YXRlKG8pO1xuXG5cdFx0Ly9AdG9kbyByZXRoaW5rIHRoaXNcblx0XHQvL1RoaXMgdGltZW91dCBnaXZlcyBkZWZpbmVkIHByb21pc2VzIHRoYXQgYXJlIGRlZmluZWRcblx0XHQvL2Z1cnRoZXIgZG93biB0aGUgc2FtZSBzY3JpcHQgYSBjaGFuY2UgdG8gZGVmaW5lIHRoZW1zZWx2ZXNcblx0XHQvL2FuZCBpbiBjYXNlIHRoaXMgcXVldWUgaXMgYWJvdXQgdG8gcmVxdWVzdCB0aGVtIGZyb20gYVxuXHRcdC8vcmVtb3RlIHNvdXJjZSBoZXJlLlxuXHRcdC8vVGhpcyBpcyBpbXBvcnRhbnQgaW4gdGhlIGNhc2Ugb2YgY29tcGlsZWQganMgZmlsZXMgdGhhdCBjb250YWluXG5cdFx0Ly9tdWx0aXBsZSBtb2R1bGVzIHdoZW4gZGVwZW5kIG9uIGVhY2ggb3RoZXIuXG5cblx0XHQvL3RlbXBvcmFyaWx5IGNoYW5nZSBzdGF0ZSB0byBwcmV2ZW50IG91dHNpZGUgcmVzb2x1dGlvblxuXHRcdG8uc3RhdGUgPSAtMTtcblxuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuXHRcdFx0Ly9SZXN0b3JlIHN0YXRlXG5cdFx0XHRvLnN0YXRlID0gMDtcblxuXHRcdFx0Ly9BREQgREVQRU5ERU5DSUVTIFRPIFFVRVVFXG5cdFx0XHRRdWV1ZVNjaGVtYS5hZGQuY2FsbChvLGRlcHMpO1xuXG5cdFx0XHQvL1NFRSBJRiBDQU4gQkUgSU1NRURJQVRFTFkgUkVTT0xWRUQgQlkgQ0hFQ0tJTkcgVVBTVFJFQU1cblx0XHRcdHNlbGYucmVjZWl2ZV9zaWduYWwobyxvLmlkKTtcblxuXHRcdFx0Ly9BU1NJR04gVEhJUyBRVUVVRSBVUFNUUkVBTSBUTyBPVEhFUiBRVUVVRVNcblx0XHRcdGlmKG8uYXNzaWduKXtcblx0XHRcdFx0XHRmb3IodmFyIGEgaW4gby5hc3NpZ24pe1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFzc2lnbihvLmFzc2lnblthXSxbb10sdHJ1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sMSk7XG5cblx0XHRyZXR1cm4gbztcbn07XG5cblxuLyoqXG4qIFVwZ3JhZGVzIGEgcHJvbWlzZSBvYmplY3QgdG8gYSBxdWV1ZS5cbipcbiogQHBhcmFtIHtvYmplY3R9IG9ialxuKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuKiBAcGFyYW0ge2FycmF5fSBkZXBzIFxcZGVwZW5kZW5jaWVzXG4qIEByZXR1cm5zIHtvYmplY3R9IHF1ZXVlIG9iamVjdFxuKi9cbl9wdWJsaWMudXBncmFkZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zLGRlcHMpe1xuXG5cdFx0aWYob2JqLnNldHRsZWQgIT09IDAgfHwgKG9iai5tb2RlbCAhPT0gJ3Byb21pc2UnICYmIG9iai5tb2RlbCAhPT0gJ2RlZmVycmVkJykpe1xuXHRcdFx0XHRyZXR1cm4gQ29uZmlnLmRlYnVnKCdDYW4gb25seSB1cGdyYWRlIHVuc2V0dGxlZCBwcm9taXNlIG9yIGRlZmVycmVkIGludG8gYSBxdWV1ZS4nKTtcblx0XHR9XG5cblx0IC8vR0VUIEEgTkVXIFFVRVVFIE9CSkVDVCBBTkQgTUVSR0UgSU5cblx0XHR2YXIgX28gPSBDb25maWcubmFpdmVfY2xvbmVyKFtcblx0XHRcdFx0UXVldWVTY2hlbWFcblx0XHRcdFx0LG9wdGlvbnNcblx0XHRdKTtcblxuXHRcdGZvcih2YXIgaSBpbiBfbyl7XG5cdFx0XHQgb2JqW2ldID0gX29baV07XG5cdFx0fVxuXG5cdFx0Ly9kZWxldGUgX287XG5cblx0XHQvL0NSRUFURSBORVcgSU5TVEFOQ0UgT0YgUVVFVUVcblx0XHRvYmogPSB0aGlzLmFjdGl2YXRlKG9iaixvcHRpb25zLGRlcHMpO1xuXG5cdFx0Ly9SRVRVUk4gUVVFVUUgT0JKRUNUXG5cdFx0cmV0dXJuIG9iajtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBfcHVibGljO1xuIiwidmFyIHNjaGVtYSA9IGZ1bmN0aW9uKCl7XG5cblx0dmFyIF9wcml2YXRlID0gdGhpcyxcblx0XHRcdF9wdWJsaWMgPSB7fTtcblxuXHRfcHJpdmF0ZS5jb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpLFxuXG5cdHRoaXMuZ2V0ID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gX3B1YmxpYztcblx0fTtcblxuXHRfcHVibGljLm1vZGVsID0gJ3F1ZXVlJztcblxuXHQvL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG5cdF9wdWJsaWMucmVzb2x2ZXJfZmlyZWQgPSAwO1xuXG5cdC8vUFJFVkVOVFMgQSBRVUVVRSBGUk9NIFJFU09MVklORyBFVkVOIElGIEFMTCBERVBFTkRFTkNJRVMgTUVUXG5cdC8vUFVSUE9TRTogUFJFVkVOVFMgUVVFVUVTIENSRUFURUQgQlkgQVNTSUdOTUVOVCBGUk9NIFJFU09MVklOR1xuXHQvL0JFRk9SRSBUSEVZIEFSRSBGT1JNQUxMWSBJTlNUQU5USUFURURcblx0X3B1YmxpYy5oYWx0X3Jlc29sdXRpb24gPSAwO1xuXG5cdC8vVVNFRCBUTyBDSEVDSyBTVEFURSwgRU5TVVJFUyBPTkUgQ09QWVxuXHRfcHVibGljLnVwc3RyZWFtID0ge307XG5cblx0Ly9VU0VEIFJFVFVSTiBWQUxVRVMsIEVOU1VSRVMgT1JERVJcblx0X3B1YmxpYy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblx0Ly8gIFFVRVVFIElOU1RBTkNFIE1FVEhPRFNcblx0Ly8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblx0LyoqXG5cdCogQWRkIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIGEgcXVldWUncyB1cHN0cmVhbSBhcnJheS5cblx0KlxuXHQqIFRoZSBxdWV1ZSB3aWxsIHJlc29sdmUgb25jZSBhbGwgdGhlIHByb21pc2VzIGluIGl0c1xuXHQqIHVwc3RyZWFtIGFycmF5IGFyZSByZXNvbHZlZC5cblx0KlxuXHQqIFdoZW4gX3B1YmxpYy5fcHJpdmF0ZS5jb25maWcuZGVidWcgPT0gMSwgbWV0aG9kIHdpbGwgdGVzdCBlYWNoXG5cdCogZGVwZW5kZW5jeSBpcyBub3QgcHJldmlvdXNseSBzY2hlZHVsZWQgdG8gcmVzb2x2ZVxuXHQqIGRvd25zdHJlYW0gZnJvbSB0aGUgdGFyZ2V0LCBpbiB3aGljaFxuXHQqIGNhc2UgaXQgd291bGQgbmV2ZXIgcmVzb2x2ZSBiZWNhdXNlIGl0cyB1cHN0cmVhbSBkZXBlbmRzIG9uIGl0LlxuXHQqXG5cdCogQHBhcmFtIHthcnJheX0gYXJyICAvYXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRvIGFkZFxuXHQqIEByZXR1cm5zIHthcnJheX0gdXBzdHJlYW1cblx0Ki9cblx0X3B1YmxpYy5hZGQgPSBmdW5jdGlvbihhcnIpe1xuXG5cdFx0dmFyIF9kZWZlcnJlZF9wcml2YXRlID0gcmVxdWlyZSgnLi9xdWV1ZS5wcml2YXRlLmpzJyk7XG5cblx0XHR0cnl7XG5cdFx0XHRcdGlmKGFyci5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLnVwc3RyZWFtO1xuXHRcdH1cblx0XHRjYXRjaChlcnIpe1xuXHRcdFx0XHRfcHJpdmF0ZS5jb25maWcuZGVidWcoZXJyKTtcblx0XHR9XG5cblx0XHQvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgVE8gQUREXG5cdFx0aWYodGhpcy5zdGF0ZSAhPT0gMCl7XG5cdFx0XHRcdHJldHVybiBfcHJpdmF0ZS5jb25maWcuZGVidWcoW1xuXHRcdFx0XHRcdFwiQ2Fubm90IGFkZCBkZXBlbmRlbmN5IGxpc3QgdG8gcXVldWUgaWQ6J1wiK3RoaXMuaWRcblx0XHRcdFx0XHQrXCInLiBRdWV1ZSBzZXR0bGVkL2luIHRoZSBwcm9jZXNzIG9mIGJlaW5nIHNldHRsZWQuXCJcblx0XHRcdFx0XSxhcnIsdGhpcyk7XG5cdFx0fVxuXG5cdFx0Zm9yKHZhciBhIGluIGFycil7XG5cblx0XHRcdFx0c3dpdGNoKHRydWUpe1xuXG5cdFx0XHRcdFx0XHQvL0NIRUNLIElGIEVYSVNUU1xuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgX3ByaXZhdGUuY29uZmlnLmxpc3RbYXJyW2FdLmlkXSA9PT0gJ29iamVjdCcpOlxuXHRcdFx0XHRcdFx0XHRcdGFyclthXSA9IF9wcml2YXRlLmNvbmZpZy5saXN0W2FyclthXS5pZF07XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdC8vSUYgTk9ULCBBVFRFTVBUIFRPIENPTlZFUlQgSVQgVE8gQU4gT1JHWSBQUk9NSVNFXG5cdFx0XHRcdFx0XHRjYXNlKHR5cGVvZiBhcnJbYV0gPT09ICdvYmplY3QnICYmICghYXJyW2FdLmlzX29yZ3kpKTpcblx0XHRcdFx0XHRcdFx0XHRhcnJbYV0gPSBfZGVmZXJyZWRfcHJpdmF0ZS5jb252ZXJ0X3RvX3Byb21pc2UoYXJyW2FdLHtcblx0XHRcdFx0XHRcdFx0XHRcdHBhcmVudCA6IHRoaXNcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Ly9SRUYgSVMgQSBQUk9NSVNFLlxuXHRcdFx0XHRcdFx0Y2FzZSh0eXBlb2YgYXJyW2FdLnRoZW4gPT09ICdmdW5jdGlvbicpOlxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJPYmplY3QgY291bGQgbm90IGJlIGNvbnZlcnRlZCB0byBwcm9taXNlLlwiKTtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGFyclthXSk7XG5cdFx0XHRcdFx0XHRcdFx0ZGVidWdnZXI7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL211c3QgY2hlY2sgdGhlIHRhcmdldCB0byBzZWUgaWYgdGhlIGRlcGVuZGVuY3kgZXhpc3RzIGluIGl0cyBkb3duc3RyZWFtXG5cdFx0XHRcdGZvcih2YXIgYiBpbiB0aGlzLmRvd25zdHJlYW0pe1xuXHRcdFx0XHRcdFx0aWYoYiA9PT0gYXJyW2FdLmlkKXtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gX3ByaXZhdGUuY29uZmlnLmRlYnVnKFtcblx0XHRcdFx0XHRcdFx0XHRcdFwiRXJyb3IgYWRkaW5nIHVwc3RyZWFtIGRlcGVuZGVuY3kgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQrYXJyW2FdLmlkK1wiJyB0byBxdWV1ZVwiK1wiICdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0K3RoaXMuaWQrXCInLlxcbiBQcm9taXNlIG9iamVjdCBmb3IgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQrYXJyW2FdLmlkK1wiJyBpcyBzY2hlZHVsZWQgdG8gcmVzb2x2ZSBkb3duc3RyZWFtIGZyb20gcXVldWUgJ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQrdGhpcy5pZCtcIicgc28gaXQgY2FuJ3QgYmUgYWRkZWQgdXBzdHJlYW0uXCJcblx0XHRcdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0XHRcdFx0LHRoaXMpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9BREQgVE8gVVBTVFJFQU0sIERPV05TVFJFQU0sIERFUEVOREVOQ0lFU1xuXHRcdFx0XHR0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0gPSBhcnJbYV07XG5cdFx0XHRcdGFyclthXS5kb3duc3RyZWFtW3RoaXMuaWRdID0gdGhpcztcblx0XHRcdFx0dGhpcy5kZXBlbmRlbmNpZXMucHVzaChhcnJbYV0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnVwc3RyZWFtO1xuXHR9O1xuXG5cdC8qKlxuXHQqIFJlbW92ZSBsaXN0IGZyb20gYSBxdWV1ZS5cblx0KlxuXHQqIEBwYXJhbSB7YXJyYXl9IGFyclxuXHQqIEByZXR1cm5zIHthcnJheX0gYXJyYXkgb2YgbGlzdCB0aGUgcXVldWUgaXMgdXBzdHJlYW1cblx0Ki9cblx0X3B1YmxpYy5yZW1vdmUgPSBmdW5jdGlvbihhcnIpe1xuXG5cdFx0Ly9JRiBOT1QgUEVORElORywgRE8gTk9UIEFMTE9XIFJFTU9WQUxcblx0XHRpZih0aGlzLnN0YXRlICE9PSAwKXtcblx0XHRcdFx0cmV0dXJuIF9wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbm5vdCByZW1vdmUgbGlzdCBmcm9tIHF1ZXVlIGlkOidcIit0aGlzLmlkK1wiJy4gUXVldWUgc2V0dGxlZC9pbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBzZXR0bGVkLlwiKTtcblx0XHR9XG5cblx0XHRmb3IodmFyIGEgaW4gYXJyKXtcblx0XHRcdGlmKHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXSl7XG5cdFx0XHRcdFx0ZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXTtcblx0XHRcdFx0XHRkZWxldGUgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQqIFJlc2V0cyBhbiBleGlzdGluZyxzZXR0bGVkIHF1ZXVlIGJhY2sgdG8gT3JneWluZyBzdGF0ZS5cblx0KiBDbGVhcnMgb3V0IHRoZSBkb3duc3RyZWFtLlxuXHQqIEZhaWxzIGlmIG5vdCBzZXR0bGVkLlxuXHQqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG5cdCogQHJldHVybnMge19kZWZlcnJlZF9wcml2YXRlLnRwbHxCb29sZWFufVxuXHQqL1xuXHRfcHVibGljLnJlc2V0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XG5cblx0XHR2YXIgX2RlZmVycmVkX3ByaXZhdGUgPSByZXF1aXJlKCcuL2RlZmVycmVkLnByaXZhdGUuanMnKTtcblxuXHRcdGlmKHRoaXMuc2V0dGxlZCAhPT0gMSB8fCB0aGlzLnN0YXRlICE9PSAxKXtcblx0XHRcdHJldHVybiBfcHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4gb25seSByZXNldCBhIHF1ZXVlIHNldHRsZWQgd2l0aG91dCBlcnJvcnMuXCIpO1xuXHRcdH1cblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0dGhpcy5zZXR0bGVkID0gMDtcblx0XHR0aGlzLnN0YXRlID0gMDtcblx0XHR0aGlzLnJlc29sdmVyX2ZpcmVkID0gMDtcblx0XHR0aGlzLmRvbmVfZmlyZWQgPSAwO1xuXG5cdFx0Ly9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG5cdFx0aWYodGhpcy50aW1lb3V0X2lkKXtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRfaWQpO1xuXHRcdH1cblxuXHRcdC8vQ0xFQVIgT1VUIFRIRSBET1dOU1RSRUFNXG5cdFx0dGhpcy5kb3duc3RyZWFtID0ge307XG5cdFx0dGhpcy5kZXBlbmRlbmNpZXMgPSBbXTtcblxuXHRcdC8vU0VUIE5FVyBBVVRPIFRJTUVPVVRcblx0XHRfZGVmZXJyZWRfcHJpdmF0ZS5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dCk7XG5cblx0XHQvL1BPSU5UTEVTUyAtIFdJTEwgSlVTVCBJTU1FRElBVEVMWSBSRVNPTFZFIFNFTEZcblx0XHQvL3RoaXMuY2hlY2tfc2VsZigpXG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXG5cdC8qKlxuXHQqIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcblx0KiBjYW4gYmUgcmVzb2x2ZWQuXG5cdCpcblx0KiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2Fkcyxcblx0KiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcblx0KlxuXHQqIC1kZWJ1Z2dpbmdcblx0KlxuXHQqIC10aGUgcXVldWUgaGFzIGJlZW4gcmVzZXQgYW5kIG5vIG5ld1xuXHQqIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuXHQqXG5cdCogQHJldHVybnMge2ludH0gU3RhdGUgb2YgdGhlIHF1ZXVlLlxuXHQqL1xuXHRfcHVibGljLmNoZWNrX3NlbGYgPSBmdW5jdGlvbigpe1xuXHRcdHZhciBfZGVmZXJyZWRfcHJpdmF0ZSA9IHJlcXVpcmUoJy4vZGVmZXJyZWQucHJpdmF0ZS5qcycpO1xuXHRcdF9kZWZlcnJlZF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRoaXMsdGhpcy5pZCk7XG5cdFx0cmV0dXJuIHRoaXMuc3RhdGU7XG5cdH07XG59O1xuXG52YXIgZmFjdG9yeSA9IGZ1bmN0aW9uKCl7XG5cdHZhciBvID0gbmV3IHNjaGVtYSgpO1xuXHRyZXR1cm4gby5nZXQoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZmFjdG9yeTtcbiJdfQ==
