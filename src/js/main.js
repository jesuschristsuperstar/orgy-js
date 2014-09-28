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
 * Callbacks that are run on every resolved item
 * 
 */
public.registered_callbacks = {};


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
    ,debug_mode : 1
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
    
    if(obj){
        for(var i in obj){
            if(typeof private.config[i] !== 'undefined'){
                private.config[i] = obj[i];
            }
            else{
                return public.debug("Property '"+i+"' is not configurable.");
            }
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

    data.__dependencies = (typeof data.__dependencies === 'function') 
        ? data.__dependencies.call(data) 
        : data.__dependencies;
    
    //ORGY MODULE HANDLING
    if(typeof data === 'object' && typeof data.__id === 'string'){
        
        def = public.queue(data.__dependencies || [],{
            id : id
            ,__ui : (typeof data.__ui !== 'undefined') ? data.__ui : 1
            ,_is_orgy_module : 1
            ,resolver : (typeof data.__resolver === 'function')
            ? data.__resolver.bind(data) : null
        });
    }
    else{

        //CREATE/GET DEFERRED
        def = public.deferred({
           id : id
        });

        //SETTLE 
        def.resolve(data);
       
    }
    
    return def;
};


/**
 * Getter.
 * 
 * @param {string} id
 * @param {object} options
 * @returns {object}
 */
public.get = function(id,options){
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


public.register_callback = function(obj){
    
    var req = ['id','fn'];
    for(var i in req){
        if(typeof obj[req[i]] === 'undefined'){
            return public.debug("registered callbacks require property: "+req[i]);
        }
    }
    
    public.registered_callbacks[obj.id] = obj;
};

    
/**
 * Converts a specially formatted array into a function.
 * 
 * 
 * @param {type} target
 * @returns {object}
 */
public.array_to_function = function(target){

    //CLONE TARGET
    var clone = target.slice(0);
    
    //Make a string copy for debugging.
    var pathstr = clone.join(".");

    var root_id = clone[0];
    clone.splice(0,1);

    var root;
    if(public.list[root_id] && public.list[root_id].hasOwnProperty("value")){
        root = public.list[root_id].value; 
    }
    else{
        root = window[root_id];
    }


    if(typeof root === 'undefined'){
        return public.debug(root_id + " not found on window or public.list");
    }


    var x,y;
    x = y = root;

    //REMOVE LAST ARRAY ELEMENT (ARGS)
    var l = clone.length;
    var args = clone[l-1];

    //POINTER TO A FUNCTION WILL HAVE AN ARRAY AS LAST ELEMENT
    var end;
    if(args instanceof Array){
        end = l - 1;
    }
    //POINTER TO AN ARRAY WILL NOT
    else{
        end = l;
    }

    var parent;
    for(var b=0; b < end; b++){
        var key = clone[b];

        if(b === end - 1 || l === 1){
           parent = x; 
        }

        if(typeof x[key] === 'undefined'){
            return public.debug([
                "Property '"+key+"' undefined @"
                ,pathstr
                ,clone
            ]);
        }
        x = x[key];
        y = x;
    }    

    return {
        constructor : x
        ,args : args
        ,parent : parent
    };
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
    if(def && def.origin_stack){
        console.log("Backtrace:");
        for(var i in def.origin_stack){
          console.log(def.origin_stack[i]);
        }
    }
    
    debugger;
    
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


private.origin_stack = function(ss){

    var l = new Error().stack.split(ss)[1].trim();

    if(private.config.mode === 'browser'){
        l = l.split("//");
        l = l.slice(1);
        for(var i in l){
          l[i] = window.location.protocol + "//" + l[i].split(" ")[0];
        }//[2].split(" ")[0].trim();
    }
    else{
        l = '/' + l.split("(/")[2].split(" ")[0].trim().slice(0,-1);
    }
    
    return l;
};