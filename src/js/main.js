module.exports = {

/**
 * Direct the pleasure.
 * @namespace orgy
 *
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
 * Defines a module.
 * 
 * @memberof orgy 
 * 
 * @param {string} id
 * @param {object} obj
 * @param {array} deps
 */
define_module : function(id,obj,deps){

  var options = {};

  if(typeof Config.list[id] === 'undefined'
  || Config.list[id].state === 0){
    if(deps){
      options.dependencies = deps;
    }

    if(obj.__resolver){
      options.resolver = obj.__resolver.bind(obj);
    };

    if(Config.settings.mode === 'native'){
      options.cwd = __dirname;
      var def = this.define(id,obj,options);
      return def;
    }
    else{
      this.define(id,obj,options);
    }
  }
  else{
    return Config.list[id];
  }
},


/**
 * Getter.
 *
 * @memberof orgy 
 * 
 * @param {string} id
 * @returns {object}
 */
get : function(id){
  if(Config.list[id]){
    return Config.list[id];
  }
  else{
    return Config.debug([
      "No instance exists: "+id
    ]);
  }
},


/**
 * Add/remove an upstream dependency to/from a queue.
 *
 * Can use a queue id, even for a queue that is yet to be created.
 *
 * @memberof orgy 
 * 
 * @param {string} tgt | queue / queue id
 * @param {array}  arr | list/promise ids,dependencies
 * @param {boolean} add | add if true, remove if false
 *
 * @return {array} queue of list
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
deferred : function(){
  return require('./deferred.js');
},

/**
* Documented in required file. 
* @ignore
*/
queue : function(){
  return require('./queue.js');
},

/**
* Documented in required file. 
* @ignore
*/
cast : function(){
  return require('./cast.js');
},

/**
* Documented in required file. 
* @ignore
*/
config : function(){
  return require('./config.js').config;
}

};
