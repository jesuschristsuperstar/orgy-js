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
//  PUBLIC METHODS
////////////////////////////////////////


/**
 * Stores document context for nodejs.
 * 
 * @type string
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
}


public.export = function(s){
    
    //IF RESOLVER EXISTS, LOAD ONCE RESOLVED
    if(typeof s === 'object' && s.__dependencies instanceof Array){

        //PREVENTS FROM CALLER DOCUMENT'S ONLOAD EVENT RESOLVING 
        s._was_defined = 1;

        //AUTO SET ID PROPERTY ON MODULE
        s.__id = deferred.id;

        public.queue(s.__dependencies,{
            id : s.__id
            ,resolver : (function(){
                if(typeof s.__resolver === 'function'){
                    return function(){
                        s.__resolver.call(s,s,deferred);
                    }
                }
                else{
                    return null;
                }
            }())
        });
    }
    else{

        //ELSE RESOLVE NOW
        deferred.resolve(s)
    }

/*    
    obj.__has_ui = (typeof obj.__has_ui !== 'undefined') ? false : obj.__has_ui;
*/
    return s;
}


/**
* Creates a new promise from a value and an id and automatically resolves it.
* 
* @param {string} id
* @param {mixed} data
* @returns {object} resolved promise
*/
public.define = function(id,data){

   //ALLOW OVERWRITING OF UNSETTLED PROMISES
   //GOOD FOR WHEN A FILE IS NOT RESOLVED-ON-LOAD 
   if(!public.list[id] || public.list[id].settled !== 1){
       
       //GET DEFERRED
       var def = public.deferred({
           id : id
       });

       //SETTLE 
       def.resolve(data);
       
       return def;
   }
   else{
       public.debug("Can't define "+id + ". Already resolved.");
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
            return public.debug("Assign target must be a queue object or the id of a queue.");
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
        public.debug("Cannot remove dependencies from a queue that does not exist.");
    }

    return q;
};


public.register_callback = function(name,fn){
    public.registered_callbacks[name] = fn;
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
        console.error(root_id + " not found on window or public.list");
        debugger;
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
            console.error("Property '"+key+"' not found on object:", x);
            debugger;
            return;
        }
        x = x[key];
        y = x;
    }    

    return {
        constructor : x
        ,args : args
        ,parent : parent
    };
}


/**
 * Makes a shallow copy of an array. 
 * Makes a copy of an object so long as it is JSON
 * 
 * @param {array} array of donor objects, overwritten from right to left
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
}
        

/**
 * Debugging method.
 * 
 * @param {string|array} msg
 * @param {boolean} force_debug_mode   Forces debugger when set to true. 
 * @returns {Boolean}
 */
public.debug = function(msg,force_debug_mode){
    if(msg instanceof Array){
        for(var i in msg){
            console.error("ERROR-"+i+": "+msg[i]);
        }
    }
    else{
        console.error("ERROR: "+msg);
    }
    if(private.config.debug_mode == 1 || force_debug_mode){
        debugger;
    }
    if(private.config.mode === 'browser'){
        return false;
    }
    else{
        process.exit();
    }
}


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
            return "node"
        }
        else{
            // not node
            return "browser"
        }
    }())
};