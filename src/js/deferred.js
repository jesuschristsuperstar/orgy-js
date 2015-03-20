var Config = require('./config.js');
var _private = require('./deferred.private.js');

/**
 * Creates a new deferred object.
 * @memberof orgy
 * @function deferred
 * 
 * @param {object} options List of options:
 *  - {string} <b>id</b>  Unique id of the object. Can be used with Orgy.get(id). Optional.
 *  
 *  - {number} <b>timeout</b> Time in ms after which reject is called. Defaults to Orgy.config().timeout [5000]. 
 *  Note the timeout is only affected by dependencies and/or the resolver callback. 
 *  Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
 *  
 * @returns {object} deferred
 */
module.exports = function(options){

    var _o;
    options = options || {};

    if(options.id && Config.list[options.id]){
        _o = Config.list[options.id];
    }
    else{
        //CREATE NEW INSTANCE OF DEFERRED CLASS
        _o = _private.factory(options);

        //ACTIVATE DEFERRED
        _o = _private.activate(_o);
    }

    return _o;
};