var Config = require('./config.js'),
    Queue = require('./queue.js'),
    Deferred = require('./deferred.js'),
    Cast = require('./cast.js');

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
_public.define = function(id,data,options){

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
  if(Config.list[id]){
    return Config.list[id];
  }
  else{
    return Config.debug([
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
};


_public.deferred = Deferred.deferred;
_public.queue = Queue.queue;
_public.cast = Cast.cast;
_public.config = Config.config;

module.exports = _public;
