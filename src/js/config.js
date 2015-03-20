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
 * Configuration setter.
 * 
 * @memberof orgy
 * @function config
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

    var msgs;
    if(msg instanceof Array){
        msgs = msg.join("\n");
    }

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
 * Makes a shallow copy of an array.
 * Makes a copy of an object so long as it is JSON
 *
 * @param {array} donors /array of donor objects,
 *                overwritten from right to left
 * @returns {object}
 */
_public.naive_cloner = function(donors){
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
};


_public.generate_id = function(){
  return new Date().getTime() + '-' + (++this.i);  
}


module.exports = _public;
