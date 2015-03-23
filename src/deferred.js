var Config = require('./config.js');
var _private = require('./deferred.private.js');
var DeferredSchema = require('./deferred.schema.js');

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
        _o = _private.factory([DeferredSchema],[options]);

        //ACTIVATE DEFERRED
        _o = _private.activate(_o);
    }

    return _o;
};
