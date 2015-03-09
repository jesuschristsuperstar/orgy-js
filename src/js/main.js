var Queue = require('./queue.js'),
    Deferred = require('./deferred.js'),
    Cast = require('./cast.js');


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

    autopath : ''
    ,document : null
    ,debug_mode : 1
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
//  _public METHODS
////////////////////////////////////////


/**
 * Configuration setter.
 *
 * @param {object} obj
 * @returns {object}
 */
_public.config = function(obj){

    if(typeof obj === 'object'){
        for(var i in obj){
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
_public.define = function(id,data,options){

    var def;
    options = options || {};
    options.dependencies = options.dependencies || null;
    options.resolver = options.resolver || null;

    //test for a valid id
    if(typeof id !== 'string'){
      _public.debug("Must set id when defining an instance.");
    }

    //Check no existing instance defined with same id
    if(_public.list[id] && _public.list[id].settled === 1){
      return _public.debug("Can't define " + id + ". Already resolved.");
    }

    options.id = id;

    //Set backtrace info, here - so origin points to callee
    options.backtrace = this.get_backtrace_info('define');

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
};


_public.define_module = function(obj){

  var options = {};
  var id = obj.q.__id;

  if(typeof Orgy.list[id] === 'undefined' || Orgy.list[id].state === 0){
    if(obj.q.__dependencies){
      options.dependencies = obj.q.__dependencies;
    }

    if(obj.q.__resolver){
      options.resolver = obj.q.__resolver.bind(obj);
    };

    if(_private.config.mode === 'native'){
      options.cwd = __dirname;
      var def = this.define(id,obj._public,options);
      return def;
    }
    else{
      this.define(id,obj._public,options);
    }
  }
};


/**
 * Getter.
 *
 * @param {string} id
 * @returns {object}
 */
_public.get = function(id){
  if(_public.list[id]){
    return _public.list[id];
  }
  else{
    return _public.debug([
      "No instance exists: "+id
    ]);
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
_public.assign = function(tgt,arr,add){

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
            return _public.debug("Assign target must be a queue object or the id of a queue.",this);
    }

    //IF TARGET ALREADY LISTED
    if(this.list[id] && this.list[id].model === 'queue'){
        q = this.list[id];

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
        return _public.debug("Cannot remove dependencies from a queue that does not exist.",this);
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
_public.debug = function(msg,def){

    if(! (msg instanceof Array)){
        msg = [msg];
    }

    for(var i in msg){
        if(typeof msg[i] === 'string'){
            console.error("ERROR-"+i+": "+msg[i]);
        }
        else{
            console.error(msg[i]);
        }
    }

    //if we saved a stack trace to connect async, push it
    if(def){
        console.log("Backtrace:");
        console.log(def.backtrace.stack);
    }

    if(_private.config.debug_mode){
      //turn off debug_mode to avoid hitting debugger
      debugger;
    }

    if(_private.config.mode === 'browser'){
        return false;
    }
    else{
        process.exit();
    }
};


_public.get_backtrace_info = function(ss){

    var r = {}
    ,l
    ,str;

    l = r.stack = new Error().stack;

    if(_private.config.mode === 'browser'){
      l = l.split(ss)[1].trim().split("\n");
      str = l.pop();
      while(str.search("orgy") !== -1 && l.length > 0){
        //iterate until outside of class
        str = l.pop();
      }
      str = window.location.protocol + "//" + str.split("//")[1];
    }
    else{
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
