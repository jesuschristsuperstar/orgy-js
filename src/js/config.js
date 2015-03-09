var _public = {},
    _private = {};


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
 * Configuration setter.
 *
 * @param {object} obj
 * @returns {object}
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


_public.get_backtrace_info = function(ss){

    var r = {}
    ,l
    ,str;

    l = r.stack = new Error().stack;

    if(this.settings.mode === 'browser'){
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


module.exports = _public;
