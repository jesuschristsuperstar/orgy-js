var public = {};
var private = {};


////////////////////////////////////////
//  PUBLIC VARIABLES
////////////////////////////////////////


/**
 * A directory of all promises, deferreds, and queues.
 * @type object
 */
public.list = {};


/**
 * Array of all exported modules
 * @type Array
 */
public.modules_exported = [];


/**
 * Index number of last module loaded in public.modules_exported
 * @type Number
 */
public.modules_loaded = 0;


/**
 * iterator for ids
 * @type integer
 */
public.i = 0;


////////////////////////////////////////
//  PRIVATE VARIABLES
////////////////////////////////////////


/**
 * Configuration values.
 * 
 * @type object
 */
private.config = {
    
    autopath : ''
    ,document : null
    ,debug_mode : 0
    //set the current working directory of the callee script,
    //because node has no constant for this
    ,cwd : false
    ,mode : (function(){
        if(typeof process === 'object' && process + '' === '[object process]'){
            // is node
            return "node";
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
//  PUBLIC METHODS
////////////////////////////////////////


/**
 * Configuration setter.
 * 
 * @param {object} obj
 * @returns {object}
 */
public.config = function(obj){
    
    if(typeof obj === 'object'){
        for(var i in obj){
          private.config[i] = obj[i];
        }
    }
    
    return private.config;
};


/**
* Creates a new promise from a value and an id and automatically 
* resolves it.
* 
* @param {string} id
* @param {mixed} data
* @returns {object} resolved promise
*/
public.define = function(id,data){

    var def;

    //MAKE SURE NOT TRYING TO RESOLVE EXISTING DEF
    if(public.list[id] && public.list[id].settled === 1){
        return public.debug("Can't define " + id + ". Already resolved.");
    }
    
    //Get backtrace info, here - so origin points to callee
    data.backtrace = private.get_backtrace_info('public.define');
    
    //Aliases
    data.id = data.id || data.__id;
    data.dependencies = data.dependencies || data.__dependencies;
    data.resolver = data.resolver || data.__resolver;
    data.resolver = (typeof data.resolver === 'function')
        ? data.resolver.bind(data) : null;
        
    if(typeof data === 'object' 
      && typeof data.id === 'string'
      && data.dependencies instanceof Array){
        
        def = public.queue(data.dependencies,data);
    }
    else{

        //CREATE/GET DEFERRED
        def = public.deferred(data);

        //SETTLE 
        if(data.resolver === null 
          && (typeof data.autoresolve !== 'boolean' 
          || data.autoresolve === true)){
          
          def.resolve(data);
        }
       
    }
    
    return def;
};


/**
 * Getter.
 * 
 * @param {string} id
 * @returns {object}
 */
public.get = function(id){
  if(public.list[id]){
    return public.list[id];
  }
  else{
    return public.debug([
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
public.assign = function(tgt,arr,add){

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
            return public.debug("Assign target must be a queue object or the id of a queue.",this);
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

        q = public.queue(arr,{
            id : id
        });
    }
    //ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
    else{
        return public.debug("Cannot remove dependencies from a queue that does not exist.",this);
    }

    return q;
};


/**
 * Makes a shallow copy of an array. 
 * Makes a copy of an object so long as it is JSON
 * 
 * @param {array} donors /array of donor objects, 
 *                overwritten from right to left
 * @returns {object}
 */
public.naive_cloner = function(donors){
    var o = {};
    for(var a in donors){
        for(var b in donors[a]){
            if(donors[a][b] instanceof Array){
                o[b] = donors[a][b].slice(0);
            }
            else if(typeof donors[a][b] === 'object'){
                o[b] = JSON.parse(JSON.stringify(donors[a][b]));
            }
            else{
                o[b] = donors[a][b];
            }
        }
    }
    return o;
};
        

/**
 * Debugging method.
 * 
 * @param {string|array} msg
 * @param {object} def
 * @returns {Boolean}
 */
public.debug = function(msg,def){
    
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
    
    if(private.config.debug_mode){
      //turn off debug_mode to avoid hitting debugger
      debugger;
    }
    
    if(private.config.mode === 'browser'){
        return false;
    }
    else{
        process.exit();
    }
};


////////////////////////////////////////
//  PUBLIC METHODS
////////////////////////////////////////


private.get_backtrace_info = function(ss){

    //Origin is the call immediately preceding"ss"
          
    var r = {},
    l;
    l = r.stack = new Error().stack;
    
    
    if(private.config.mode === 'browser'){
      l = l.split(ss)[1].trim().split("\n").pop();
      l = window.location.protocol + "//" + l.split("//")[1];
    }
    else{
      l = l.split(ss + " ")[1].split("\n")[1];
      l = l.match(/\(([^)]+)\)/)[1];
    }

    //Set origin
    r.origin = l;
    
    return r;
};