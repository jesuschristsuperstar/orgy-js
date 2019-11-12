require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
module.exports = function(Cls) {

  /**
   * Casts a thenable object into an Orgy deferred object.
   *
   * > To qualify as a <b>thenable</b>, the object to be casted must have the following properties:
   * >
   * > - id
   * >
   * > - then()
   * >
   * > - error()
   *
   * @memberof orgy
   * @function cast
   *
   * @param {object} obj A thenable with the following properties:
   *  - {string} <b>id</b>  Unique id of the object.
   *
   *  - {function} <b>then</b>
   *
   *  - {function} <b>error</b>
   *
   * @returns {object} deferred
   */
  Cls.public.cast = function(obj) {

    var required = ["then","error","id"]
    for(var i in required) {
      if(!Object.prototype.hasOwnProperty.call(obj, required[i]))
        return Cls.private.config.debug(`Cast method missing property '${  required[i] }'`)
    }

    var options = {}
    options.id = obj.id

    //Make sure id does not conflict with existing
    if(Cls.private.config.list[options.id])
      return Cls.private.config.debug(`Id ${options.id} conflicts with existing id.`)


    //Create a deferred
    var def = Cls.public.deferred(options)

    //Create resolver
    var resolver = function() {
      def.resolve.call(def,arguments[0])
    }

    //Set Resolver
    obj.then(resolver)

    //Reject deferred on .error
    var err = function(err) {
      def.reject(err)
    }
    obj.error(err)

    //Return deferred
    return def
  }

  return Cls
}

},{}],3:[function(require,module,exports){
(function (process){
module.exports = function(Cls) {

  var _private = {}


  ////////////////////////////////////////
  //  _private VARIABLES
  ////////////////////////////////////////


  /**
   * A directory of all promises, deferreds, and queues.
   * @type object
   */
  _private.list = {}


  /**
   * iterator for ids
   * @type integer
   */
  _private.i = 0


  /**
   * Configuration values.
   *
   * @type object
   */
  _private.settings = {

    debug_mode: false
    //set the current working directory of the callee script,
    //because node has no constant for this
    ,cwd: false
    ,mode: (function() {
      if(typeof process === "object" && `${process  }` === "[object process]") {
        // is node
        return "native"
      } else{
        // not node
        return "browser"
      }
    }())
    /**
       * - onActivate /when each instance activated
       * - onSettle    /when each instance settles
       *
       * @type object
       */
    ,hooks: {
    }
    ,timeout: -1 //no default timeout
  }


  ////////////////////////////////////////
  //  _private VARIABLES
  ////////////////////////////////////////


  ////////////////////////////////////////
  //  _private METHODS
  ////////////////////////////////////////


  /**
   * Options you wish to pass to set the global configuration
   *
   * @memberof orgy
   * @function config
   *
   * @param {object} options List of options:
   *
    *  - <b>timeout</b> {number} default: -1
   *   - Setting this value to <b>-1</b> will result in no timeout.
    *   - Sets the global defaul for the number of milliseconds before all queues/deferreds automatically are rejected by timeout.
    *
   *
    *  - <b>cwd</b> {string}
    *   - Sets current working directory. Server side scripts only.
    *
   *
    *  - <b>debug_mode</b> {boolean} default: false
    *   - When a queue or deferred is "rejected", shows stack trace and other debugging information if true.
   * @returns {object} configuration settings
   */
  Cls.public.config = function(obj) {

    if(typeof obj === "object") {
      for(var i in obj)
        _private.settings[i] = obj[i]

    }

    return _private.settings
  }


  /**
   * Debugging method.
   *
   * @param {string|array} msg
   * @param {object} def
   * @returns {Boolean}
   */
  _private.debug = function(msg) {

    var msgs = (msg instanceof Array) ? msg.join("\n") : [msg]

    var e = new Error(msgs)
    console.log(e.stack)

    if(this.settings.debug_mode) {
      //turn off debug_mode to avoid hitting debugger
      debugger
    }

    if(_private.settings.mode === "browser")
      return false
    else
      process.exit()

  }


  /**
   * Take an array of prototype objects and an array of property objects,
   * merges each, and returns a shallow copy.
   *
   * @param {array} protoObjArr Array of prototype objects which are overwritten from right to left
   * @param {array} propsObjArr Array of desired property objects which are overwritten from right to left
   * @returns {object} object
   */
  _private.naive_cloner = function(protoObjArr,propsObjArr) {

    function merge(donors) {
      var o = {}
      for(var a in donors) {
        for(var b in donors[a]) {
          if(donors[a][b] instanceof Array)
            o[b] = donors[a][b].slice(0)
          else if(typeof donors[a][b] === "object") {
            try{
              o[b] = JSON.parse(JSON.stringify(donors[a][b]))
            } catch(e) {
              console.error(e)
            }
          } else
            o[b] = donors[a][b]

        }
      }
      return o
    }

    var proto = merge(protoObjArr),
      props = merge(propsObjArr)

    //@todo consider manually setting the prototype instead
    var finalObject = Object.create(proto)
    for(var i in props)
      finalObject[i] = props[i]


    return finalObject
  }


  _private.generate_id = function() {
    return `${new Date().getTime()  }-${  ++this.i}`
  }


  //Save for re-use
  Cls.private.config = _private

  return Cls
}

}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9jb25maWcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpIHtcblxuICB2YXIgX3ByaXZhdGUgPSB7fVxuXG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyAgX3ByaXZhdGUgVkFSSUFCTEVTXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4gIC8qKlxuICAgKiBBIGRpcmVjdG9yeSBvZiBhbGwgcHJvbWlzZXMsIGRlZmVycmVkcywgYW5kIHF1ZXVlcy5cbiAgICogQHR5cGUgb2JqZWN0XG4gICAqL1xuICBfcHJpdmF0ZS5saXN0ID0ge31cblxuXG4gIC8qKlxuICAgKiBpdGVyYXRvciBmb3IgaWRzXG4gICAqIEB0eXBlIGludGVnZXJcbiAgICovXG4gIF9wcml2YXRlLmkgPSAwXG5cblxuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiB2YWx1ZXMuXG4gICAqXG4gICAqIEB0eXBlIG9iamVjdFxuICAgKi9cbiAgX3ByaXZhdGUuc2V0dGluZ3MgPSB7XG5cbiAgICBkZWJ1Z19tb2RlOiBmYWxzZVxuICAgIC8vc2V0IHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IG9mIHRoZSBjYWxsZWUgc2NyaXB0LFxuICAgIC8vYmVjYXVzZSBub2RlIGhhcyBubyBjb25zdGFudCBmb3IgdGhpc1xuICAgICxjd2Q6IGZhbHNlXG4gICAgLG1vZGU6IChmdW5jdGlvbigpIHtcbiAgICAgIGlmKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIGAke3Byb2Nlc3MgIH1gID09PSBcIltvYmplY3QgcHJvY2Vzc11cIikge1xuICAgICAgICAvLyBpcyBub2RlXG4gICAgICAgIHJldHVybiBcIm5hdGl2ZVwiXG4gICAgICB9IGVsc2V7XG4gICAgICAgIC8vIG5vdCBub2RlXG4gICAgICAgIHJldHVybiBcImJyb3dzZXJcIlxuICAgICAgfVxuICAgIH0oKSlcbiAgICAvKipcbiAgICAgICAqIC0gb25BY3RpdmF0ZSAvd2hlbiBlYWNoIGluc3RhbmNlIGFjdGl2YXRlZFxuICAgICAgICogLSBvblNldHRsZSAgICAvd2hlbiBlYWNoIGluc3RhbmNlIHNldHRsZXNcbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgICAqL1xuICAgICxob29rczoge1xuICAgIH1cbiAgICAsdGltZW91dDogLTEgLy9ubyBkZWZhdWx0IHRpbWVvdXRcbiAgfVxuXG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyAgX3ByaXZhdGUgVkFSSUFCTEVTXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gIF9wcml2YXRlIE1FVEhPRFNcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbiAgLyoqXG4gICAqIE9wdGlvbnMgeW91IHdpc2ggdG8gcGFzcyB0byBzZXQgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uXG4gICAqXG4gICAqIEBtZW1iZXJvZiBvcmd5XG4gICAqIEBmdW5jdGlvbiBjb25maWdcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuICAgKlxuICAgICogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gZGVmYXVsdDogLTFcbiAgICogICAtIFNldHRpbmcgdGhpcyB2YWx1ZSB0byA8Yj4tMTwvYj4gd2lsbCByZXN1bHQgaW4gbm8gdGltZW91dC5cbiAgICAqICAgLSBTZXRzIHRoZSBnbG9iYWwgZGVmYXVsIGZvciB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgYWxsIHF1ZXVlcy9kZWZlcnJlZHMgYXV0b21hdGljYWxseSBhcmUgcmVqZWN0ZWQgYnkgdGltZW91dC5cbiAgICAqXG4gICAqXG4gICAgKiAgLSA8Yj5jd2Q8L2I+IHtzdHJpbmd9XG4gICAgKiAgIC0gU2V0cyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LiBTZXJ2ZXIgc2lkZSBzY3JpcHRzIG9ubHkuXG4gICAgKlxuICAgKlxuICAgICogIC0gPGI+ZGVidWdfbW9kZTwvYj4ge2Jvb2xlYW59IGRlZmF1bHQ6IGZhbHNlXG4gICAgKiAgIC0gV2hlbiBhIHF1ZXVlIG9yIGRlZmVycmVkIGlzIFwicmVqZWN0ZWRcIiwgc2hvd3Mgc3RhY2sgdHJhY2UgYW5kIG90aGVyIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiBpZiB0cnVlLlxuICAgKiBAcmV0dXJucyB7b2JqZWN0fSBjb25maWd1cmF0aW9uIHNldHRpbmdzXG4gICAqL1xuICBDbHMucHVibGljLmNvbmZpZyA9IGZ1bmN0aW9uKG9iaikge1xuXG4gICAgaWYodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgZm9yKHZhciBpIGluIG9iailcbiAgICAgICAgX3ByaXZhdGUuc2V0dGluZ3NbaV0gPSBvYmpbaV1cblxuICAgIH1cblxuICAgIHJldHVybiBfcHJpdmF0ZS5zZXR0aW5nc1xuICB9XG5cblxuICAvKipcbiAgICogRGVidWdnaW5nIG1ldGhvZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IG1zZ1xuICAgKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgX3ByaXZhdGUuZGVidWcgPSBmdW5jdGlvbihtc2cpIHtcblxuICAgIHZhciBtc2dzID0gKG1zZyBpbnN0YW5jZW9mIEFycmF5KSA/IG1zZy5qb2luKFwiXFxuXCIpIDogW21zZ11cblxuICAgIHZhciBlID0gbmV3IEVycm9yKG1zZ3MpXG4gICAgY29uc29sZS5sb2coZS5zdGFjaylcblxuICAgIGlmKHRoaXMuc2V0dGluZ3MuZGVidWdfbW9kZSkge1xuICAgICAgLy90dXJuIG9mZiBkZWJ1Z19tb2RlIHRvIGF2b2lkIGhpdHRpbmcgZGVidWdnZXJcbiAgICAgIGRlYnVnZ2VyXG4gICAgfVxuXG4gICAgaWYoX3ByaXZhdGUuc2V0dGluZ3MubW9kZSA9PT0gXCJicm93c2VyXCIpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICBlbHNlXG4gICAgICBwcm9jZXNzLmV4aXQoKVxuXG4gIH1cblxuXG4gIC8qKlxuICAgKiBUYWtlIGFuIGFycmF5IG9mIHByb3RvdHlwZSBvYmplY3RzIGFuZCBhbiBhcnJheSBvZiBwcm9wZXJ0eSBvYmplY3RzLFxuICAgKiBtZXJnZXMgZWFjaCwgYW5kIHJldHVybnMgYSBzaGFsbG93IGNvcHkuXG4gICAqXG4gICAqIEBwYXJhbSB7YXJyYXl9IHByb3RvT2JqQXJyIEFycmF5IG9mIHByb3RvdHlwZSBvYmplY3RzIHdoaWNoIGFyZSBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAgICogQHBhcmFtIHthcnJheX0gcHJvcHNPYmpBcnIgQXJyYXkgb2YgZGVzaXJlZCBwcm9wZXJ0eSBvYmplY3RzIHdoaWNoIGFyZSBvdmVyd3JpdHRlbiBmcm9tIHJpZ2h0IHRvIGxlZnRcbiAgICogQHJldHVybnMge29iamVjdH0gb2JqZWN0XG4gICAqL1xuICBfcHJpdmF0ZS5uYWl2ZV9jbG9uZXIgPSBmdW5jdGlvbihwcm90b09iakFycixwcm9wc09iakFycikge1xuXG4gICAgZnVuY3Rpb24gbWVyZ2UoZG9ub3JzKSB7XG4gICAgICB2YXIgbyA9IHt9XG4gICAgICBmb3IodmFyIGEgaW4gZG9ub3JzKSB7XG4gICAgICAgIGZvcih2YXIgYiBpbiBkb25vcnNbYV0pIHtcbiAgICAgICAgICBpZihkb25vcnNbYV1bYl0gaW5zdGFuY2VvZiBBcnJheSlcbiAgICAgICAgICAgIG9bYl0gPSBkb25vcnNbYV1bYl0uc2xpY2UoMClcbiAgICAgICAgICBlbHNlIGlmKHR5cGVvZiBkb25vcnNbYV1bYl0gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgb1tiXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZG9ub3JzW2FdW2JdKSlcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICBvW2JdID0gZG9ub3JzW2FdW2JdXG5cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9cbiAgICB9XG5cbiAgICB2YXIgcHJvdG8gPSBtZXJnZShwcm90b09iakFyciksXG4gICAgICBwcm9wcyA9IG1lcmdlKHByb3BzT2JqQXJyKVxuXG4gICAgLy9AdG9kbyBjb25zaWRlciBtYW51YWxseSBzZXR0aW5nIHRoZSBwcm90b3R5cGUgaW5zdGVhZFxuICAgIHZhciBmaW5hbE9iamVjdCA9IE9iamVjdC5jcmVhdGUocHJvdG8pXG4gICAgZm9yKHZhciBpIGluIHByb3BzKVxuICAgICAgZmluYWxPYmplY3RbaV0gPSBwcm9wc1tpXVxuXG5cbiAgICByZXR1cm4gZmluYWxPYmplY3RcbiAgfVxuXG5cbiAgX3ByaXZhdGUuZ2VuZXJhdGVfaWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYCR7bmV3IERhdGUoKS5nZXRUaW1lKCkgIH0tJHsgICsrdGhpcy5pfWBcbiAgfVxuXG5cbiAgLy9TYXZlIGZvciByZS11c2VcbiAgQ2xzLnByaXZhdGUuY29uZmlnID0gX3ByaXZhdGVcblxuICByZXR1cm4gQ2xzXG59XG4iXX0=
},{"_process":1}],4:[function(require,module,exports){
module.exports = function(Cls) {

  /**
  * @namespace orgy/deferred
  */


  var _private = {}


  _private.activate = function(obj) {

    //if no id, generate one
    if(!obj.id)
      obj.id = Cls.private.config.generate_id()


    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if(Cls.private.config.list[obj.id] && !Cls.private.config.list[obj.id].overwritable) {
      Cls.private.config.debug(`Tried illegal overwrite of ${obj.id}.`)
      return Cls.private.config.list[obj.id]
    }

    //SAVE TO MASTER LIST
    //@todo only save if was assigned an id,
    //which implies user intends to access somewhere else outside of scope
    Cls.private.config.list[obj.id] = obj

    //AUTO TIMEOUT
    _private.auto_timeout.call(obj)

    //Call hook
    if(Cls.private.config.settings.hooks.onActivate)
      Cls.private.config.settings.hooks.onActivate(obj)


    return obj
  }


  _private.settle = function(def) {

    //REMOVE AUTO TIMEOUT TIMER
    if(def.timeout_id)
      clearTimeout(def.timeout_id)


    //Set state to resolved
    _private.set_state(def,1)

    //Call hook
    if(Cls.private.config.settings.hooks.onSettle)
      Cls.private.config.settings.hooks.onSettle(def)


    //Add done as a callback to then chain completion.
    def.callbacks.then.hooks.onComplete.train.push(function(d2,itinerary,last) {
      def.caboose = last

      //Run done
      _private.run_train(
        def
        ,def.callbacks.done
        ,def.caboose
        ,{pause_on_deferred: false}
      )
    })

    //Run then queue
    _private.run_train(
      def
      ,def.callbacks.then
      ,def.value
      ,{pause_on_deferred: true}
    )

    return def
  }


  /**
   * Runs an array of functions sequentially as a partial function.
   * Each function's argument is the result of its predecessor function.
   *
   * By default, execution chain is paused when any function
   * returns an unresolved deferred. (pause_on_deferred) [OPTIONAL]
   *
   * @param {object} def  /deferred object
   * @param {object} obj  /itinerary
   *      train        {array}
   *      hooks        {object}
   *          onBefore        {array}
   *          onComplete      {array}
   * @param {mixed} param /param to pass to first callback
   * @param {object} options
   *      pause_on_deferred    {boolean}
   *
   * @returns {void}
   */
  _private.run_train = function(def,obj,param,options) {

    //allow previous return values to be passed down chain
    var r = param || def.caboose || def.value

    //onBefore event
    if(obj.hooks && obj.hooks.onBefore.train.length > 0) {
      _private.run_train(
        def
        ,obj.hooks.onBefore
        ,param
        ,{pause_on_deferred: false}
      )
    }

    while(obj.train.length > 0) {

      //remove fn to execute
      var last = obj.train.shift()
      def.execution_history.push(last)

      //def.caboose needed for then chain declared after resolved instance
      r = def.caboose = last.call(def,def.value,def,r)

      //if result is an thenable, halt execution
      //and run unfired arr when thenable settles
      if(options.pause_on_deferred) {

        //If r is an unsettled thenable
        if(r && r.then && r.settled !== 1) {

          //execute rest of this train after r resolves
          r.callbacks.resolve.hooks.onComplete.train.push(function() {
            _private.run_train(
              def
              ,obj
              ,r
              ,{pause_on_deferred: true}
            )
          })

          //terminate execution
          return
        } else if(r instanceof Array) {
          //If is an array, contains an unsettled thenable

          var thenables = []

          for(var i in r) {

            if(r[i].then && r[i].settled !== 1) {

              thenables.push(r[i])

              var fn = (function(t,def,obj,param) {

                return function() {

                  //Bail if any thenables unsettled
                  for(var i in t) {
                    if(t[i].settled !== 1)
                      return

                  }

                  _private.run_train(
                    def
                    ,obj
                    ,param
                    ,{pause_on_deferred: true}
                  )
                }

              })(thenables,def,obj,param)

              //execute rest of this train after
              //all thenables found in r resolve
              r[i].callbacks.resolve.hooks.onComplete.train.push(fn)

              //terminate execution
              return
            }
          }
        }
      }
    }

    //onComplete event
    if(obj.hooks && obj.hooks.onComplete.train.length > 0)
      _private.run_train(def,obj.hooks.onComplete,r,{pause_on_deferred: false})

  }


  /**
   * Sets the state of an Orgy object.
   *
   * @param {object} def
   * @param {number} int
   * @returns {void}
   */
  _private.set_state = function(def,int) {

    def.state = int

    //IF RESOLVED OR REJECTED, SETTLE
    if(int === 1 || int === 2)
      def.settled = 1


    if(int === 1 || int === 2)
      _private.signal_downstream(def)

  }


  /**
   * Gets the state of an Orgy object
   *
   * @param {object} def
   * @returns {number}
   */
  _private.get_state = function(def) {
    return def.state
  }


  /**
   * Sets the automatic timeout on a promise object.
   *
   * @returns {Boolean}
   */
  _private.auto_timeout = function() {

    this.timeout = (typeof this.timeout !== "undefined")
      ? this.timeout : Cls.private.config.settings.timeout

    //AUTO REJECT ON timeout
    if(!this.type || this.type !== "timer") {

      //DELETE PREVIOUS TIMEOUT IF EXISTS
      if(this.timeout_id)
        clearTimeout(this.timeout_id)


      if(typeof this.timeout === "undefined") {
        Cls.private.config.debug([
          "Auto timeout this.timeout cannot be undefined."
          ,this.id
        ])
      } else if (this.timeout === -1) {
        //NO AUTO TIMEOUT SET
        return false
      }
      var scope = this

      this.timeout_id = setTimeout(function() {
        _private.auto_timeout_cb.call(scope)
      }, this.timeout)

    }
    //else{
    //@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?
    //}

    return true
  }


  /**
   * Callback for autotimeout. Declaration here avoids memory leak.
   *
   * @returns {void}
   */
  _private.auto_timeout_cb = function() {

    if(this.state !== 1) {

      //GET THE UPSTREAM ERROR ID
      var msgs = []
      var scope = this

      var fn = function(obj) {
        if(obj.state !== 1)
          return obj.id
        else
          return false

      }

      /**
      * Run over a given object property recursively,
      * applying callback until
      * callback returns a non-false value.
      */
      if(Cls.private.config.settings.debug_mode) {
        var r = _private.search_obj_recursively(this,"upstream",fn)
        msgs.push(`${scope.id  }: rejected by auto timeout after ${this.timeout}ms. To turn off timeouts set config option: "{timeout:1}"`)
        msgs.push("Cause:")
        msgs.push(r)
        return this.reject.call(this,msgs)
      } else
        return this.reject.call(this)


    }
  }


  _private.error = function(cb) {

    //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
    if(this.state === 2)
      cb()
    else
      this.reject_q.push(cb)


    return this
  }


  /**
   * Signals all downstream promises that _private promise object's
   * state has changed.
   *
   * @todo Since the same queue may have been assigned twice directly or
   * indirectly via shared dependencies, make sure not to double resolve
   * - which throws an error.
   *
   * @param {object} target deferred/queue
   * @returns {void}
   */
  _private.signal_downstream = function(target) {

    //MAKE SURE ALL DOWNSTREAM IS UNSETTLED
    for(let a in target.downstream) {
      if(target.downstream[a].settled === 1) {

        if(target.downstream[a].state !== 1) {
          //tried to settle a rejected downstream
          continue
        } else{
          //tried to settle a successfully settled downstream
          Cls.private.config.debug(`${target.id  } tried to settle promise `+`'${target.downstream[a].id}' that has already been settled.`)
        }
      }
    }

    //NOW THAT WE KNOW ALL DOWNSTREAM IS UNSETTLED, WE CAN IGNORE ANY
    //SETTLED THAT RESULT AS A SIDE EFFECT TO ANOTHER SETTLEMENT
    for (let b in target.downstream) {
      if(target.downstream[b].settled !== 1)
        _private.receive_signal(target.downstream[b],target.id)

    }
  }


  /**
  * Run over a given object property recursively, applying callback until
  * callback returns a non-false value.
  *
  * @param {object} obj
  * @param {string} propName          The property name of the array to bubble up
  * @param {function} fn              The test callback to be applied to each object
  * @param {array} breadcrumb          The breadcrumb through the chain of the first match
  * @returns {mixed}
  */
  _private.search_obj_recursively = function(obj,propName,fn,breadcrumb) {

    if(typeof breadcrumb === "undefined")
      breadcrumb = [obj.id]


    var r1

    for(var i in obj[propName]) {

      //RUN TEST
      r1 = fn(obj[propName][i])

      if(r1 !== false) {
        //MATCH RETURNED. RECURSE INTO MATCH IF HAS PROPERTY OF SAME NAME TO SEARCH
        //CHECK THAT WE AREN'T CAUGHT IN A CIRCULAR LOOP
        if(breadcrumb.indexOf(r1) !== -1) {
          return Cls.private.config.debug([
            `Circular condition in recursive search of obj property '${
              propName}' of object ${
              (typeof obj.id !== "undefined") ? `'${obj.id}'` : ""
            }. Offending value: ${r1}`
            ,(function() {
              breadcrumb.push(r1)
              return breadcrumb.join(" [depends on]=> ")
            })()
          ])
        }

        breadcrumb.push(r1)

        if(obj[propName][i][propName])
          return _private.search_obj_recursively(obj[propName][i],propName,fn,breadcrumb)


        break
      }

    }

    return breadcrumb
  }


  /**
   * Converts a promise description into a promise.
   *
   * @param {type} obj
   * @returns {undefined}
   */
  _private.convert_to_promise = function(obj,options) {

    obj.id = obj.id || options.id

    //Autoname
    if (!obj.id) {
      if (obj.type === "timer")
        obj.id = `timer-${  obj.timeout  }-${  ++Cls.private.config.i}`
      else if (typeof obj.url === "string") {
        obj.id = obj.url.split("/").pop()
        //REMOVE .js FROM ID
        if (obj.id.search(".js") !== -1) {
          obj.id = obj.id.split(".")
          obj.id.pop()
          obj.id = obj.id.join(".")
        }
      }
    }

    //Return if already exists
    if(Cls.private.config.list[obj.id] && obj.type !== "timer") {
      //A previous promise of the same id exists.
      //Make sure this dependency object doesn't have a
      //resolver - if it does error
      if(obj.resolver) {
        Cls.private.config.debug([
          "You can't set a resolver on a queue that has already been declared. You can only reference the original."
          ,`Detected re-init of '${  obj.id  }'.`
          ,"Attempted:"
          ,obj
          ,"Existing:"
          ,Cls.private.config.list[obj.id]
        ])
      } else
        return Cls.private.config.list[obj.id]

    }


    //Convert dependency to an instance
    var def
    switch(true) {

      //Event
      case(obj.type === "event"):
        def = _private.wrap_event(obj)
        break

      case(obj.type === "queue"):
        def = Cls.public.queue(obj.dependencies,obj)
        break

        //Already a thenable
      case(typeof obj.then === "function"):

        switch(true) {

          //Reference to an existing instance
          case(typeof obj.id === "string"):
            console.warn(`'${obj.id }': did not exist. Auto creating new deferred.`)
            def = _private.deferred({
              id: obj.id
            })

            //If object was a thenable, resolve the new deferred when then called
            if(obj.then) {
              obj.then(function(r) {
                def.resolve(r)
              })
            }
            break

            //OBJECT PROPERTY .promise EXPECTED TO RETURN A PROMISE
          case(typeof obj.promise === "function"):
            if(obj.scope)
              def = obj.promise.call(obj.scope)
            else
              def = obj.promise()

            break

            //Object is a thenable
          case(obj.then):
            def = obj
            break

          default:

        }

        //Check if is a thenable
        if(typeof def !== "object" || !def.then)
          return Cls.private.config.debug("Dependency labeled as a promise did not return a promise.",obj)

        break

      case(obj.type === "timer"):
        def = _private.wrap_timer(obj)
        break

        //Load file
      default:
        obj.type = obj.type || "default"
        //Inherit parent's current working directory
        if(options.parent && options.parent.cwd)
          obj.cwd = options.parent.cwd

        def = _private.wrap_xhr(obj)
    }

    //Index promise by id for future referencing
    Cls.private.config.list[obj.id] = def

    return def
  }


  /**
   * @todo: redo this
   *
   * Converts a reference to a DOM event to a promise.
   * Resolved on first event trigger.
   *
   * @todo remove jquery dependency
   *
   * @param {object} obj
   * @returns {object} deferred object
   */
  _private.wrap_event = function(obj) {

    var def = Cls.public.deferred({
      id: obj.id
    })


    if(typeof document !== "undefined" && typeof window !== "undefined") {

      if(typeof $ !== "function") {
        var msg = "window and document based events depend on jQuery"
        def.reject(msg)
      } else{
        //For now, depend on jquery for IE8 DOMContentLoaded polyfill
        switch(true) {
          case(obj.id === "ready" || obj.id === "DOMContentLoaded"):
            $(document).ready(function() {
              def.resolve(1)
            })
            break
          case(obj.id === "load"):
            $(window).load(function() {
              def.resolve(1)
            })
            break
          default:
            $(document).on(obj.id,"body",function() {
              def.resolve(1)
            })
        }
      }
    }

    return def
  }


  _private.wrap_timer = function(obj) {

    var def = Cls.public.deferred();

    (function(def) {
      var _start = new Date().getTime()
      setTimeout(function() {
        var _end = new Date().getTime()
        def.resolve({
          start: _start
          ,end: _end
          ,elapsed: _end - _start
          ,timeout: obj.timeout
        })
      },obj.timeout)
    }(def))

    return def
  }


  /**
   * Creates a deferred object that depends on the loading of a file.
   *
   * @param {object} dep
   * @returns {object} deferred object
   */
  _private.wrap_xhr = function(dep) {

    var required = ["id","url"]
    for(var i in required) {
      if(!dep[required[i]]) {
        return Cls.private.config.debug([
          `File requests converted to promises require: ${  required[i]}`
          ,"Make sure you weren't expecting dependency to already have been resolved upstream."
          ,dep
        ])
      }
    }

    //IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
    if(Cls.private.config.list[dep.id])
      return Cls.private.config.list[dep.id]


    //CONVERT TO DEFERRED:
    var def = Cls.public.deferred(dep)

    if(typeof Cls.public.file_loader[Cls.private.config.settings.mode][dep.type] !== "undefined")
      Cls.public.file_loader[Cls.private.config.settings.mode][dep.type](dep.url,def,dep)
    else
      Cls.public.file_loader[Cls.private.config.settings.mode]["default"](dep.url,def,dep)


    return def
  }

  /**
  * A "signal" here causes a queue to look through each item
  * in its upstream and check to see if all are resolved.
  *
  * Signals can only be received by a queue itself or an instance
  * in its upstream.
  *
  * @param {object} target
  * @param {string} from_id
  * @returns {void}
  */
  _private.receive_signal = function(target,from_id) {

    if(target.halt_resolution === 1) return

    //MAKE SURE THE SIGNAL WAS FROM A PROMISE BEING LISTENED TO
    //BUT ALLOW SELF STATUS CHECK
    var status
    if(from_id !== target.id && !target.upstream[from_id])
      return Cls.private.config.debug(`${from_id} can't signal ${target.id} because not in upstream.`)

    //RUN THROUGH QUEUE OF OBSERVING PROMISES TO SEE IF ALL DONE
    else{
      status = 1
      for(let i in target.upstream) {
        //SETS STATUS TO 0 IF ANY OBSERVING HAVE FAILED, BUT NOT IF PENDING OR RESOLVED
        if(target.upstream[i].state !== 1) {
          status = target.upstream[i].state
          break
        }
      }
    }

    //RESOLVE QUEUE IF UPSTREAM FINISHED
    if(status === 1) {

      //GET RETURN VALUES PER DEPENDENCIES, WHICH SAVES ORDER AND
      //REPORTS DUPLICATES
      var values = []
      for(let i in target.dependencies)
        values.push(target.dependencies[i].value)

      target.resolve.call(target,values)
    }

    if(status === 2) {
      var err = [`${target} dependency '${from_id}' was rejected.`]
      target.reject.apply(target,err)
    }
  }




  var _public = {}

  _public.is_orgy = true

  _public.id = null

  //A COUNTER FOR AUT0-GENERATED PROMISE ID'S
  _public.settled = 0

  /**
  * STATE CODES:
  * ------------------
  * -1   => SETTLING [EXECUTING CALLBACKS]
  *  0   => PENDING
  *  1   => RESOLVED / FULFILLED
  *  2   => REJECTED
  */
  _public.state = 0

  _public.value = []

  //The most recent value generated by the then->done chain.
  _public.caboose = null

  _public.model = "deferred"

  _public.done_fired = 0

  _public.timeout_id = null

  _public.callback_states = {
    resolve: 0
    ,then: 0
    ,done: 0
    ,reject: 0
  }

  /**
  * Self executing function to initialize callback event
  * list.
  *
  * Returns an object with the same propertyNames as
  * _public.callback_states: adding boilerplate
  * properties for each
  *
  * @returns {object}
  */
  _public.callbacks = (function() {

    var o = {}

    for(var i in _public.callback_states) {
      o[i] = {
        train: []
        ,hooks: {
          onBefore: {
            train: []
          }
          ,onComplete: {
            train: []
          }
        }
      }
    }

    return o
  })()

  //PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
  _public.downstream = {}

  _public.execution_history = []

  //WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]
  _public.overwritable = 0

  /**
  * REMOTE
  *
  * REMOTE == 1  =>  [DEFAULT] Make http request for file
  *
  * REMOTE == 0  =>  Read file directly from the filesystem
  *
  * ONLY APPLIES TO SCRIPTS RUN UNDER NODE AS BROWSER HAS NO
  * FILESYSTEM ACCESS
  */
  _public.remote = 1

  //ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
  _public.list = 1


  //////////////////////////////////////////
  //  _public METHODS
  //////////////////////////////////////////


  /**
  * Resolves a deferred/queue.
  *
  * @memberof orgy/deferred
  * @function orgy/deferred#resolve
  *
  * @param {mixed} value Resolver value.
  * @returns {object} deferred/queue
  */
  _public.resolve = function(value) {

    if(this.settled === 1) {
      Cls.private.config.debug([
        `${this.id  } can't resolve.`
        ,"Only unsettled deferreds are resolvable."
      ])
    }

    //SET STATE TO SETTLEMENT IN PROGRESS
    _private.set_state(this,-1)

    //SET VALUE
    this.value = value

    //RUN RESOLVER BEFORE PROCEEDING
    //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
    if(!this.resolver_fired && typeof this.resolver === "function") {

      this.resolver_fired = 1

      //Add resolver to resolve train
      try{
        this.callbacks.resolve.train.push(function() {
          this.resolver(value,this)
        })
      } catch(e) {
        Cls.private.config.debug(e)
      }
    } else{

      this.resolver_fired = 1

      //Add settle to resolve train
      //Always settle before all other complete callbacks
      this.callbacks.resolve.hooks.onComplete.train.unshift(function() {
        _private.settle(this)
      })
    }

    //Run resolve
    _private.run_train(
      this
      ,this.callbacks.resolve
      ,this.value
      ,{pause_on_deferred: false}
    )

    //resolver is expected to call resolve again
    //and that will get us past this point
    return this
  }


  /**
  * Rejects a deferred/queue
  *
  * @memberof orgy/deferred
  * @function orgy/deferred#reject
  *
  * @param {string|array} err Error information.
  * @return {object} deferred/queue
  */
  _public.reject = function(err) {

    if(!(err instanceof Array))
      err = [err]


    var msg = `Rejected ${this.model}: '${this.id}'.`

    if(Cls.private.config.settings.debug_mode) {
      err.unshift(msg)
      Cls.private.config.debug(err,this)
    }

    //Remove auto timeout timer
    if(this.timeout_id)
      clearTimeout(this.timeout_id)


    //Set state to rejected
    _private.set_state(this,2)

    //Execute rejection queue
    _private.run_train(
      this
      ,this.callbacks.reject
      ,err
      ,{pause_on_deferred: false}
    )

    return this
  }


  /**
  * Chain method

  <b>Usage:</b>
  ```
  var Orgy = require("orgy"),
          q = Orgy.deferred({
            id : "q1"
          });

  //Resolve the deferred
  q.resolve("Some value.");

  q.then(function(r){
    console.log(r); //Some value.
  })

  ```

  * @memberof orgy/deferred
  * @function orgy/deferred#then
  *
  * @param {function} fn Callback function
  * @param {function} rejector Rejection callback function
  * @return {object} deferred/queue
  */
  _public.then = function(fn,rejector) {

    switch(true) {

      //An error was previously thrown, add rejector & bail out
      case(this.state === 2):
        if(typeof rejector === "function")
          this.callbacks.reject.train.push(rejector)

        break

        //Execution chain already finished. Bail out.
      case(this.done_fired === 1):
        return Cls.private.config.debug(`${this.id} can't attach .then() because .done() has already fired, and that means the execution chain is complete.`)

      default:

        //Push callback to then queue
        this.callbacks.then.train.push(fn)

        //Push reject callback to the rejection queue
        if(typeof rejector === "function")
          this.callbacks.reject.train.push(rejector)


        //Settled, run train now
        if(this.settled === 1 && this.state === 1 && !this.done_fired) {
          _private.run_train(
            this
            ,this.callbacks.then
            ,this.caboose
            ,{pause_on_deferred: true}
          )
        }
        //Unsettled, train will be run when settled
        //else{}
    }

    return this
  }


  /**
  * Done callback.
  *
  * @memberof orgy/deferred
  * @function orgy/deferred#done
  *
  * @param {function} fn Callback function
  * @param {function} rejector Rejection callback function
  * @returns {object} deferred/queue
  */
  _public.done = function(fn,rejector) {

    if(this.callbacks.done.train.length === 0
      && this.done_fired === 0) {
      if(typeof fn === "function") {

        //wrap callback with some other commands
        var fn2 = function(r,deferred,last) {

          //Done can only be called once, so note that it has been
          deferred.done_fired = 1

          fn(r,deferred,last)
        }

        this.callbacks.done.train.push(fn2)

        //Push reject callback to the rejection queue onComplete
        if(typeof rejector === "function")
          this.callbacks.reject.hooks.onComplete.train.push(rejector)


        //Settled, run train now
        if(this.settled === 1) {
          if(this.state === 1) {
            _private.run_train(
              this
              ,this.callbacks.done
              ,this.caboose
              ,{pause_on_deferred: false}
            )
          } else{
            _private.run_train(
              this
              ,this.callbacks.reject
              ,this.caboose
              ,{pause_on_deferred: false}
            )
          }
        }
        //Unsettled, train will be run when settled
        //else{}
      } else
        return Cls.private.config.debug("done() must be passed a function.")

    } else
      return Cls.private.config.debug("done() can only be called once.")


    return this
  }


  /**
   * Allows a preprocessor to set backrace data on an Orgy object.
   * @param  {string} str filename:line number
   * @return {object} deferred/queue
   */
  _public._btrc = function(str) {
    this.backtrace = str
    return this
  }


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
  *    - Can be used with Orgy.get(id).
  *    - Optional.
  *
  *
  *  - <b>timeout</b> {number} Time in ms after which reject is called if not yet resolved.
  - Defaults to Orgy.config().timeout.
  - Delays in object.then() and object.done() won't not trigger this, because those methods run after resolve.
  *
  * @returns {object} {@link orgy/deferred}
  */
  Cls.public.deferred = function(options) {

    var _o
    options = options || {}

    if(options.id && Cls.private.config.list[options.id])
      _o = Cls.private.config.list[options.id]
    else{

      //Create a new deferred object
      _o = Cls.private.config.naive_cloner([_public],[options])

      //ACTIVATE DEFERRED
      _o = _private.activate(_o)
    }

    return _o
  }

  _private.public = _public

  //Save for re-use
  Cls.private.deferred = _private

  return Cls
}

},{}],5:[function(require,module,exports){
module.exports = function(Cls) {

  var _public = {},
    _private = {}

  _public.browser = {}
  _public.native = {}
  _private.native = {}

  //Browser load

  _public.browser.css = function(path,deferred) {

    var head =  document.getElementsByTagName("head")[0] || document.documentElement,
      elem = document.createElement("link")

    elem.setAttribute("href",path)
    elem.setAttribute("type","text/css")
    elem.setAttribute("rel","stylesheet")

    if(elem.onload) {
      (function(elem) {
        elem.onload = elem.onreadystatechange = function(path,deferred) {
          deferred.resolve(elem)
        }

        elem.onerror = function(path,deferred) {
          deferred.reject(`Failed to load path: ${  path}`)
        }

      }(elem,path,deferred))

      head.appendChild(elem)
    } else{
      //ADD elem BUT MAKE XHR REQUEST TO CHECK FILE RECEIVED
      head.appendChild(elem)
      console.warn("No onload available for link tag, autoresolving.")
      deferred.resolve(elem)
    }
  }

  _public.browser.script = function(path,deferred) {

    var elem = document.createElement("script")
    elem.type = "text/javascript"
    elem.setAttribute("src",path);

    (function(elem,path,deferred) {
      elem.onload = elem.onreadystatechange = function() {
        //Autoresolve by default
        if(typeof deferred.autoresolve !== "boolean"
          || deferred.autoresolve === true)
          deferred.resolve((typeof elem.value !== "undefined") ? elem.value : elem)

      }
      elem.onerror = function() {
        deferred.reject(`Error loading: ${  path}`)
      }
    }(elem,path,deferred))

    this.head.appendChild(elem)
  }

  _public.browser.html = function(path,deferred,dep) {
    this.default(path,deferred,dep)
  }

  _public.browser.default = function(path,deferred,options) {
    var r,
      req = new XMLHttpRequest()
    req.open("GET", path, true);

    (function(path,deferred) {
      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if(req.status === 200) {
            r = req.responseText
            if(options.type && options.type === "json") {
              try{
                r = JSON.parse(r)
              } catch(e) {
                _public.debug([
                  "Could not decode JSON"
                  ,path
                  ,r
                ],deferred)
              }
            }
            deferred.resolve(r)
          } else
            deferred.reject(`Error loading: ${  path}`)

        }
      }
    }(path,deferred))

    req.send(null)
  }



  //Native load

  _public.native.css = function(path,deferred) {
    _public.browser.css(path,deferred)
  }

  _public.native.script = function(path,deferred) {
    //local package
    if(path[0]===".") {
      path = _private.native.prepare_path(path,deferred)
      var r = require(path)
      //Autoresolve by default
      if(typeof deferred.autoresolve !== "boolean"
      || deferred.autoresolve === true)
        deferred.resolve(r)

    } else{
      //remote script
      //Check that we have configured the environment to allow this,
      //as it represents a security threat and should only be used for debugging
      if(!Cls.private.config.settings.debug_mode)
        Cls.private.config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.")
      else{
        _private.native.get(path,deferred,function(data) {
          var Vm = require("vm")
          r = Vm.runInThisContext(data)
          deferred.resolve(r)
        })
      }
    }
  }

  _public.native.html = function(path,deferred) {
    _public.native.default(path,deferred)
  }

  _public.native.default = function(path,deferred) {
    (function(deferred) {
      _private.native.get(path,deferred,function(r) {
        if(deferred.type === "json")
          r = JSON.parse(r)

        deferred.resolve(r)
      })
    })(deferred)
  }

  _private.native.get = function (path,deferred,callback) {
    path = _private.native.prepare_path(path)
    if(path[0] === ".") {
      //file system
      var Fs = require("fs")
      Fs.readFile(path, "utf-8", function (err, data) {
        if (err)
          throw err
        else
          callback(data)

      })
    } else{
      //http
      var request = require("request")
      request(path,function(error,response,body) {
        if (!error && response.statusCode === 200)
          callback(body)
        else
          throw error

      })
    }
  }

  _private.native.prepare_path = function(p) {
    p = (p[0] !== "/" && p[0] !== ".")
      ? ((p[0].indexOf("http")!==0) ? `./${  p}` : p) : p
    return p
  }

  Cls.public.file_loader = _public

  Cls.private.file_loader = _private

  return Cls
}

},{"fs":1,"request":1,"vm":1}],6:[function(require,module,exports){
module.exports = function(Cls) {


  /**
   * @namespace orgy/queue
   * @borrows orgy/deferred#then as #then
   * @borrows orgy/deferred#done as #done
   * @borrows orgy/deferred#reject as #reject
   * @borrows orgy/deferred#resolve as #resolve
   *
  */

  var _private = {}

  /**
   * Activates a queue object.
   *
   * @param {object} o
   * @param {object} options
   * @param {array} deps
   * @returns {object} queue
   */
  _private.activate = function(o,options,deps) {

    //ACTIVATE AS A DEFERRED
    //var proto = Object.getPrototypeOf(this);
    o = Cls.private.deferred.activate(o)

    //@todo rethink this
    //This timeout gives defined promises that are defined
    //further down the same script a chance to define themselves
    //and in case this queue is about to request them from a
    //remote source here.
    //This is important in the case of compiled js files that contain
    //multiple modules when depend on each other.

    //temporarily change state to prevent outside resolution
    o.state = -1

    var self = this

    setTimeout(function() {

      //Restore state
      o.state = 0

      //ADD DEPENDENCIES TO QUEUE
      _public.add.call(o,deps)

      //SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
      Cls.private.deferred.receive_signal(o,o.id)

      //ASSIGN THIS QUEUE UPSTREAM TO OTHER QUEUES
      if(o.assign) {
        for(var a in o.assign)
          self.assign(o.assign[a],[o],true)

      }
    },1)

    return o
  }


  /**
  * Upgrades a promise object to a queue.
  *
  * @param {object} obj
  * @param {object} options
  * @param {array} deps \dependencies
  * @returns {object} queue object
  */
  _private.upgrade = function(obj,options,deps) {

    if(obj.settled !== 0 || (obj.model !== "promise" && obj.model !== "deferred"))
      return Cls.private.config.debug("Can only upgrade unsettled promise or deferred into a queue.")


    //GET A NEW QUEUE OBJECT AND MERGE IN
    var _o = Cls.private.config.naive_cloner([_public],[options])

    for(var i in _o)
      obj[i] = _o[i]


    //delete _o;

    //CREATE NEW INSTANCE OF QUEUE
    obj = this.activate(obj,options,deps)

    //RETURN QUEUE OBJECT
    return obj
  }




  var _public = {}

  _public.model = "queue"

  //SET TRUE AFTER RESOLVER FIRED
  _public.resolver_fired = 0

  //PREVENTS A QUEUE FROM RESOLVING EVEN IF ALL DEPENDENCIES MET
  //PURPOSE: PREVENTS QUEUES CREATED BY ASSIGNMENT FROM RESOLVING
  //BEFORE THEY ARE FORMALLY INSTANTIATED
  _public.halt_resolution = 0

  //USED TO CHECK STATE, ENSURES ONE COPY
  _public.upstream = {}

  //USED RETURN VALUES, ENSURES ORDER
  _public.dependencies = []

  ///////////////////////////////////////////////////
  //  QUEUE INSTANCE METHODS
  ///////////////////////////////////////////////////

  /**
  * Add list of dependencies to a queue's upstream array.
  *
  * The queue will resolve once all the promises in its
  * upstream array are resolved.
  *
  * When _public.Cls.private.config.debug == 1, method will test each
  * dependency is not previously scheduled to resolve
  * downstream from the target, in which
  * case it would never resolve because its upstream depends on it.
  *
  * @param {array} arr  /array of dependencies to add
  * @returns {array} upstream
  */
  _public.add = function(arr) {

    try{
      if(arr.length === 0)
        return this.upstream

    } catch(err) {
      Cls.private.config.debug(err)
    }

    //IF NOT PENDING, DO NOT ALLOW TO ADD
    if(this.state !== 0) {
      return Cls.private.config.debug([
        `Cannot add dependency list to queue id:'${this.id
        }'. Queue settled/in the process of being settled.`
      ],arr,this)
    }

    for(var a in arr) {

      switch(true) {

        //CHECK IF EXISTS
        case(typeof Cls.private.config.list[arr[a].id] === "object"):
          arr[a] = Cls.private.config.list[arr[a].id]
          break

          //IF NOT, ATTEMPT TO CONVERT IT TO AN ORGY PROMISE
        case(typeof arr[a] === "object" && (!arr[a].is_orgy)):
          arr[a] = Cls.private.deferred.convert_to_promise(arr[a],{
            parent: this
          })
          break

          //REF IS A PROMISE.
        case(typeof arr[a].then === "function"):
          break

        default:
          Cls.private.config.debug([
            "Object could not be converted to promise.",
            arr[a]
          ])
          continue
      }

      //must check the target to see if the dependency exists in its downstream
      for(var b in this.downstream) {
        if(b === arr[a].id) {
          return Cls.private.config.debug([
            `Error adding upstream dependency '${
              arr[a].id}' to queue`+` '${
              this.id}'.\n Promise object for '${
              arr[a].id}' is scheduled to resolve downstream from queue '${
              this.id}' so it can't be added upstream.`
          ]
          ,this)
        }
      }

      //ADD TO UPSTREAM, DOWNSTREAM, DEPENDENCIES
      this.upstream[arr[a].id] = arr[a]
      arr[a].downstream[this.id] = this
      this.dependencies.push(arr[a])
    }

    return this.upstream
  }

  /**
  * Remove list from a queue.
  *
  * @param {array} arr
  * @returns {array} array of list the queue is upstream
  */
  _public.remove = function(arr) {

    //IF NOT PENDING, DO NOT ALLOW REMOVAL
    if(this.state !== 0)
      return Cls.private.config.debug(`Cannot remove list from queue id:'${this.id}'. Queue settled/in the process of being settled.`)


    for(var a in arr) {
      if(this.upstream[arr[a].id]) {
        delete this.upstream[arr[a].id]
        delete arr[a].downstream[this.id]
      }
    }
  }

  /**
  * Resets an existing,settled queue back to Orgying state.
  * Clears out the downstream.
  * Fails if not settled.
  * @param {object} options
  * @returns {Cls.private.deferred.tpl|Boolean}
  */
  _public.reset = function(options) {

    if(this.settled !== 1 || this.state !== 1)
      return Cls.private.config.debug("Can only reset a queue settled without errors.")


    options = options || {}

    this.settled = 0
    this.state = 0
    this.resolver_fired = 0
    this.done_fired = 0

    //REMOVE AUTO TIMEOUT TIMER
    if(this.timeout_id)
      clearTimeout(this.timeout_id)


    //CLEAR OUT THE DOWNSTREAM
    this.downstream = {}
    this.dependencies = []

    //SET NEW AUTO TIMEOUT
    Cls.private.deferred.auto_timeout.call(this,options.timeout)

    //POINTLESS - WILL JUST IMMEDIATELY RESOLVE SELF
    //this.check_self()

    return this
  }


  /**
  * Cauaes a queue to look over its dependencies and see if it
  * can be resolved.
  *
  * This is done automatically by each dependency that loads,
  * so is not needed unless:
  *
  * -debugging
  *
  * -the queue has been reset and no new
  * dependencies were since added.
  *
  * @returns {int} State of the queue.
  */
  _public.check_self = function() {
    Cls.private.deferred.receive_signal(this,this.id)
    return this.state
  }


  /**
   * Creates a new queue object.
   * If no <b>resolver</b> option is set, resolved when all dependencies are resolved. Else, resolved when the deferred param passed to the resolver option
   * is resolved.
   *
   * @memberof orgy
   * @function queue
   *
   * @param {array} deps Array of dependencies that must be resolved before <b>resolver</b> option is called.
   *
   * @param {object} options  List of options:
    *
    *  - <b>id</b> {string} Unique id of the object.
    *   - Can be used with Orgy.get(id).
    *   - Optional.
    *
   *
    *  - <b>timeout</b> {number} Time in ms after which reject is called.
    *   - Defaults to Orgy.config().timeout [5000].
    *   - Note the timeout is only affected by dependencies and/or the resolver callback.
    *   - Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
    *
   *
    *  - <b>resolver</b> {function(<i>result</i>,<i>deferred</i>)} Callback function to execute after all dependencies have resolved.
    *   - <i>result</i> is an array of the queue's resolved dependency values.
    *   - <i>deferred</i> is the queue object.
    *   - The queue will only resolve when <i>deferred</i>.resolve() is called. If not, it will timeout to options.timeout || Orgy.config().timeout.
   *
   * @returns {object} {@link orgy/queue}
   */
  Cls.public.queue = function(deps,options) {

    var _o
    if(!(deps instanceof Array))
      return Cls.private.config.debug("Queue dependencies must be an array.")


    options = options || {}

    if(!Cls.private.config.list[options.id]) {
      //DOES NOT ALREADY EXIST

      //Pass array of prototypes to queue factory
      _o = Cls.private.config.naive_cloner([Cls.private.deferred.public,_public],[options])

      //Activate queue
      _o = _private.activate(_o,options,deps)

    } else {
      //ALREADY EXISTS

      _o = Cls.private.config.list[options.id]

      if(_o.model !== "queue") {
        //MATCH FOUND BUT NOT A QUEUE, UPGRADE TO ONE

        options.overwritable = 1

        _o = _private.upgrade(_o,options,deps)
      } else {

        //OVERWRITE ANY EXISTING OPTIONS
        options.forEach(function(value,key) {
          _o[key] = value
        })

        //ADD ADDITIONAL DEPENDENCIES IF NOT RESOLVED
        if(deps.length > 0)
          _private.tpl.add.call(_o,deps)


      }

      //RESUME RESOLUTION UNLESS SPECIFIED OTHERWISE
      _o.halt_resolution = (typeof options.halt_resolution !== "undefined") ?
        options.halt_resolution : 0
    }

    return _o
  }

  //save for re-use
  Cls.private.queue = _private

  return Cls
}

},{}],"orgy":[function(require,module,exports){
var Cls = Object.create({
  private: {},
  public: {}
})

require("./config.js")(Cls)
require("./file_loader.js")(Cls)
require("./deferred.js")(Cls)
require("./queue.js")(Cls)
require("./cast.js")(Cls)

/**
 * @namespace orgy
 */

/**
* Creates a new deferred from a value and an id and automatically
* resolves it.
*
* @memberof orgy
* @function define
*
* @param {string} id A unique id you give to the object
* @param {mixed}  data The value that the object is assigned
* @param {object} options
- <b>dependencies</b> {array}
- <b>resolver</b> {function(<i>assignedValue</i>,<i>deferred</i>}
* @returns {object} resolved deferred
*/
Cls.public.define = function(id,data,options) {

  var def
  options = options || {}
  options.dependencies = options.dependencies || null
  options.resolver = options.resolver || null

  //test for a valid id
  if(typeof id !== "string")
    Cls.private.config.debug("Must set id when defining an instance.")


  //Check no existing instance defined with same id
  if(Cls.private.config.list[id] && Cls.private.config.list[id].settled === 1)
    return Cls.private.config.debug(`Can't define ${  id  }. Already resolved.`)


  options.id = id

  if(options.dependencies !== null
      && options.dependencies instanceof Array) {
    //Define as a queue - can't autoresolve because we have deps
    var deps = options.dependencies
    delete options.dependencies
    def = Cls.public.queue(deps,options)
  } else{
    //Define as a deferred
    def = Cls.public.deferred(options)

    //Try to immediately settle [define]
    if(options.resolver === null
        && (typeof options.autoresolve !== "boolean"
        || options.autoresolve === true)) {
      //prevent future autoresove attempts [i.e. from xhr response]
      def.autoresolve = false
      def.resolve(data)
    }
  }

  return def
}


/**
 * Gets an exisiting deferred / queue object from global store.
 * Returns null if none found.
 *
 * @memberof orgy
 * @function get
 *
 * @param {string} id Id of deferred or queue object.
 * @returns {object} deferred | queue | null
 */
Cls.public.get = function(id) {
  if(Cls.private.config.list[id])
    return Cls.private.config.list[id]
  else
    return null

}


/**
 * Add/remove an upstream dependency to/from a queue.
 *
 * Can use a queue id, even for a queue that is yet to be created.
 *
 * @memberof orgy
 * @function assign
 *
 * @param {string|object} tgt Cls.public.queue id / queue object
 * @param {array}  arr  Array of promise ids or dependency objects
 * @param {boolean} add  If true <b>ADD</b> array to queue dependencies, If false <b>REMOVE</b> array from queue dependencies
 *
 * @return {object} queue
 */
Cls.public.assign = function(tgt,arr,add) {

  add = (typeof add === "boolean") ? add : 1

  var id,q
  switch(true) {
    case(typeof tgt === "object" && typeof tgt.then === "function"):
      id = tgt.id
      break
    case(typeof tgt === "string"):
      id = tgt
      break
    default:
      return Cls.private.config.debug("Assign target must be a queue object or the id of a queue.",this)
  }

  //IF TARGET ALREADY LISTED
  if(Cls.private.config.list[id] && Cls.private.config.list[id].model === "queue") {
    q = Cls.private.config.list[id]

    //=> ADD TO QUEUE'S UPSTREAM
    if(add)
      q.add(arr)

    //=> REMOVE FROM QUEUE'S UPSTREAM
    else
      q.remove(arr)

  } else if(add) {
    //CREATE NEW QUEUE AND ADD DEPENDENCIES
    q = Cls.public.queue(arr,{
      id: id
    })
  } else
    //ERROR: CAN'T REMOVE FROM A QUEUE THAT DOES NOT EXIST
    return Cls.private.config.debug("Cannot remove dependencies from a queue that does not exist.",this)


  return q
}

module.exports = Cls.public

},{"./cast.js":2,"./config.js":3,"./deferred.js":4,"./file_loader.js":5,"./queue.js":6}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2Nhc3QuanMiLCJzcmMvY29uZmlnLmpzIiwic3JjL2RlZmVycmVkLmpzIiwic3JjL2ZpbGVfbG9hZGVyLmpzIiwic3JjL3F1ZXVlLmpzIiwic3JjL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BrQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsbnVsbCwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpIHtcblxuICAvKipcbiAgICogQ2FzdHMgYSB0aGVuYWJsZSBvYmplY3QgaW50byBhbiBPcmd5IGRlZmVycmVkIG9iamVjdC5cbiAgICpcbiAgICogPiBUbyBxdWFsaWZ5IGFzIGEgPGI+dGhlbmFibGU8L2I+LCB0aGUgb2JqZWN0IHRvIGJlIGNhc3RlZCBtdXN0IGhhdmUgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgKiA+XG4gICAqID4gLSBpZFxuICAgKiA+XG4gICAqID4gLSB0aGVuKClcbiAgICogPlxuICAgKiA+IC0gZXJyb3IoKVxuICAgKlxuICAgKiBAbWVtYmVyb2Ygb3JneVxuICAgKiBAZnVuY3Rpb24gY2FzdFxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb2JqIEEgdGhlbmFibGUgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqICAtIHtzdHJpbmd9IDxiPmlkPC9iPiAgVW5pcXVlIGlkIG9mIHRoZSBvYmplY3QuXG4gICAqXG4gICAqICAtIHtmdW5jdGlvbn0gPGI+dGhlbjwvYj5cbiAgICpcbiAgICogIC0ge2Z1bmN0aW9ufSA8Yj5lcnJvcjwvYj5cbiAgICpcbiAgICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWRcbiAgICovXG4gIENscy5wdWJsaWMuY2FzdCA9IGZ1bmN0aW9uKG9iaikge1xuXG4gICAgdmFyIHJlcXVpcmVkID0gW1widGhlblwiLFwiZXJyb3JcIixcImlkXCJdXG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKSB7XG4gICAgICBpZighT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcmVxdWlyZWRbaV0pKVxuICAgICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGBDYXN0IG1ldGhvZCBtaXNzaW5nIHByb3BlcnR5ICckeyAgcmVxdWlyZWRbaV0gfSdgKVxuICAgIH1cblxuICAgIHZhciBvcHRpb25zID0ge31cbiAgICBvcHRpb25zLmlkID0gb2JqLmlkXG5cbiAgICAvL01ha2Ugc3VyZSBpZCBkb2VzIG5vdCBjb25mbGljdCB3aXRoIGV4aXN0aW5nXG4gICAgaWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pXG4gICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGBJZCAke29wdGlvbnMuaWR9IGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIGlkLmApXG5cblxuICAgIC8vQ3JlYXRlIGEgZGVmZXJyZWRcbiAgICB2YXIgZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZChvcHRpb25zKVxuXG4gICAgLy9DcmVhdGUgcmVzb2x2ZXJcbiAgICB2YXIgcmVzb2x2ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIGRlZi5yZXNvbHZlLmNhbGwoZGVmLGFyZ3VtZW50c1swXSlcbiAgICB9XG5cbiAgICAvL1NldCBSZXNvbHZlclxuICAgIG9iai50aGVuKHJlc29sdmVyKVxuXG4gICAgLy9SZWplY3QgZGVmZXJyZWQgb24gLmVycm9yXG4gICAgdmFyIGVyciA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgZGVmLnJlamVjdChlcnIpXG4gICAgfVxuICAgIG9iai5lcnJvcihlcnIpXG5cbiAgICAvL1JldHVybiBkZWZlcnJlZFxuICAgIHJldHVybiBkZWZcbiAgfVxuXG4gIHJldHVybiBDbHNcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENscykge1xuXG4gIHZhciBfcHJpdmF0ZSA9IHt9XG5cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbiAgLyoqXG4gICAqIEEgZGlyZWN0b3J5IG9mIGFsbCBwcm9taXNlcywgZGVmZXJyZWRzLCBhbmQgcXVldWVzLlxuICAgKiBAdHlwZSBvYmplY3RcbiAgICovXG4gIF9wcml2YXRlLmxpc3QgPSB7fVxuXG5cbiAgLyoqXG4gICAqIGl0ZXJhdG9yIGZvciBpZHNcbiAgICogQHR5cGUgaW50ZWdlclxuICAgKi9cbiAgX3ByaXZhdGUuaSA9IDBcblxuXG4gIC8qKlxuICAgKiBDb25maWd1cmF0aW9uIHZhbHVlcy5cbiAgICpcbiAgICogQHR5cGUgb2JqZWN0XG4gICAqL1xuICBfcHJpdmF0ZS5zZXR0aW5ncyA9IHtcblxuICAgIGRlYnVnX21vZGU6IGZhbHNlXG4gICAgLy9zZXQgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIGNhbGxlZSBzY3JpcHQsXG4gICAgLy9iZWNhdXNlIG5vZGUgaGFzIG5vIGNvbnN0YW50IGZvciB0aGlzXG4gICAgLGN3ZDogZmFsc2VcbiAgICAsbW9kZTogKGZ1bmN0aW9uKCkge1xuICAgICAgaWYodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgYCR7cHJvY2VzcyAgfWAgPT09IFwiW29iamVjdCBwcm9jZXNzXVwiKSB7XG4gICAgICAgIC8vIGlzIG5vZGVcbiAgICAgICAgcmV0dXJuIFwibmF0aXZlXCJcbiAgICAgIH0gZWxzZXtcbiAgICAgICAgLy8gbm90IG5vZGVcbiAgICAgICAgcmV0dXJuIFwiYnJvd3NlclwiXG4gICAgICB9XG4gICAgfSgpKVxuICAgIC8qKlxuICAgICAgICogLSBvbkFjdGl2YXRlIC93aGVuIGVhY2ggaW5zdGFuY2UgYWN0aXZhdGVkXG4gICAgICAgKiAtIG9uU2V0dGxlICAgIC93aGVuIGVhY2ggaW5zdGFuY2Ugc2V0dGxlc1xuICAgICAgICpcbiAgICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAgICovXG4gICAgLGhvb2tzOiB7XG4gICAgfVxuICAgICx0aW1lb3V0OiAtMSAvL25vIGRlZmF1bHQgdGltZW91dFxuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vICBfcHJpdmF0ZSBWQVJJQUJMRVNcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyAgX3ByaXZhdGUgTUVUSE9EU1xuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cblxuICAvKipcbiAgICogT3B0aW9ucyB5b3Ugd2lzaCB0byBwYXNzIHRvIHNldCB0aGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb25cbiAgICpcbiAgICogQG1lbWJlcm9mIG9yZ3lcbiAgICogQGZ1bmN0aW9uIGNvbmZpZ1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBMaXN0IG9mIG9wdGlvbnM6XG4gICAqXG4gICAgKiAgLSA8Yj50aW1lb3V0PC9iPiB7bnVtYmVyfSBkZWZhdWx0OiAtMVxuICAgKiAgIC0gU2V0dGluZyB0aGlzIHZhbHVlIHRvIDxiPi0xPC9iPiB3aWxsIHJlc3VsdCBpbiBubyB0aW1lb3V0LlxuICAgICogICAtIFNldHMgdGhlIGdsb2JhbCBkZWZhdWwgZm9yIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSBhbGwgcXVldWVzL2RlZmVycmVkcyBhdXRvbWF0aWNhbGx5IGFyZSByZWplY3RlZCBieSB0aW1lb3V0LlxuICAgICpcbiAgICpcbiAgICAqICAtIDxiPmN3ZDwvYj4ge3N0cmluZ31cbiAgICAqICAgLSBTZXRzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuIFNlcnZlciBzaWRlIHNjcmlwdHMgb25seS5cbiAgICAqXG4gICAqXG4gICAgKiAgLSA8Yj5kZWJ1Z19tb2RlPC9iPiB7Ym9vbGVhbn0gZGVmYXVsdDogZmFsc2VcbiAgICAqICAgLSBXaGVuIGEgcXVldWUgb3IgZGVmZXJyZWQgaXMgXCJyZWplY3RlZFwiLCBzaG93cyBzdGFjayB0cmFjZSBhbmQgb3RoZXIgZGVidWdnaW5nIGluZm9ybWF0aW9uIGlmIHRydWUuXG4gICAqIEByZXR1cm5zIHtvYmplY3R9IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3NcbiAgICovXG4gIENscy5wdWJsaWMuY29uZmlnID0gZnVuY3Rpb24ob2JqKSB7XG5cbiAgICBpZih0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBmb3IodmFyIGkgaW4gb2JqKVxuICAgICAgICBfcHJpdmF0ZS5zZXR0aW5nc1tpXSA9IG9ialtpXVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIF9wcml2YXRlLnNldHRpbmdzXG4gIH1cblxuXG4gIC8qKlxuICAgKiBEZWJ1Z2dpbmcgbWV0aG9kLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gbXNnXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBfcHJpdmF0ZS5kZWJ1ZyA9IGZ1bmN0aW9uKG1zZykge1xuXG4gICAgdmFyIG1zZ3MgPSAobXNnIGluc3RhbmNlb2YgQXJyYXkpID8gbXNnLmpvaW4oXCJcXG5cIikgOiBbbXNnXVxuXG4gICAgdmFyIGUgPSBuZXcgRXJyb3IobXNncylcbiAgICBjb25zb2xlLmxvZyhlLnN0YWNrKVxuXG4gICAgaWYodGhpcy5zZXR0aW5ncy5kZWJ1Z19tb2RlKSB7XG4gICAgICAvL3R1cm4gb2ZmIGRlYnVnX21vZGUgdG8gYXZvaWQgaGl0dGluZyBkZWJ1Z2dlclxuICAgICAgZGVidWdnZXJcbiAgICB9XG5cbiAgICBpZihfcHJpdmF0ZS5zZXR0aW5ncy5tb2RlID09PSBcImJyb3dzZXJcIilcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIGVsc2VcbiAgICAgIHByb2Nlc3MuZXhpdCgpXG5cbiAgfVxuXG5cbiAgLyoqXG4gICAqIFRha2UgYW4gYXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgYW5kIGFuIGFycmF5IG9mIHByb3BlcnR5IG9iamVjdHMsXG4gICAqIG1lcmdlcyBlYWNoLCBhbmQgcmV0dXJucyBhIHNoYWxsb3cgY29weS5cbiAgICpcbiAgICogQHBhcmFtIHthcnJheX0gcHJvdG9PYmpBcnIgQXJyYXkgb2YgcHJvdG90eXBlIG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuICAgKiBAcGFyYW0ge2FycmF5fSBwcm9wc09iakFyciBBcnJheSBvZiBkZXNpcmVkIHByb3BlcnR5IG9iamVjdHMgd2hpY2ggYXJlIG92ZXJ3cml0dGVuIGZyb20gcmlnaHQgdG8gbGVmdFxuICAgKiBAcmV0dXJucyB7b2JqZWN0fSBvYmplY3RcbiAgICovXG4gIF9wcml2YXRlLm5haXZlX2Nsb25lciA9IGZ1bmN0aW9uKHByb3RvT2JqQXJyLHByb3BzT2JqQXJyKSB7XG5cbiAgICBmdW5jdGlvbiBtZXJnZShkb25vcnMpIHtcbiAgICAgIHZhciBvID0ge31cbiAgICAgIGZvcih2YXIgYSBpbiBkb25vcnMpIHtcbiAgICAgICAgZm9yKHZhciBiIGluIGRvbm9yc1thXSkge1xuICAgICAgICAgIGlmKGRvbm9yc1thXVtiXSBpbnN0YW5jZW9mIEFycmF5KVxuICAgICAgICAgICAgb1tiXSA9IGRvbm9yc1thXVtiXS5zbGljZSgwKVxuICAgICAgICAgIGVsc2UgaWYodHlwZW9mIGRvbm9yc1thXVtiXSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBvW2JdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkb25vcnNbYV1bYl0pKVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgIG9bYl0gPSBkb25vcnNbYV1bYl1cblxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb1xuICAgIH1cblxuICAgIHZhciBwcm90byA9IG1lcmdlKHByb3RvT2JqQXJyKSxcbiAgICAgIHByb3BzID0gbWVyZ2UocHJvcHNPYmpBcnIpXG5cbiAgICAvL0B0b2RvIGNvbnNpZGVyIG1hbnVhbGx5IHNldHRpbmcgdGhlIHByb3RvdHlwZSBpbnN0ZWFkXG4gICAgdmFyIGZpbmFsT2JqZWN0ID0gT2JqZWN0LmNyZWF0ZShwcm90bylcbiAgICBmb3IodmFyIGkgaW4gcHJvcHMpXG4gICAgICBmaW5hbE9iamVjdFtpXSA9IHByb3BzW2ldXG5cblxuICAgIHJldHVybiBmaW5hbE9iamVjdFxuICB9XG5cblxuICBfcHJpdmF0ZS5nZW5lcmF0ZV9pZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBgJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAgfS0keyAgKyt0aGlzLml9YFxuICB9XG5cblxuICAvL1NhdmUgZm9yIHJlLXVzZVxuICBDbHMucHJpdmF0ZS5jb25maWcgPSBfcHJpdmF0ZVxuXG4gIHJldHVybiBDbHNcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldDp1dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbk55WXk5amIyNW1hV2N1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2liVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQm1kVzVqZEdsdmJpaERiSE1wSUh0Y2JseHVJQ0IyWVhJZ1gzQnlhWFpoZEdVZ1BTQjdmVnh1WEc1Y2JpQWdMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2TDF4dUlDQXZMeUFnWDNCeWFYWmhkR1VnVmtGU1NVRkNURVZUWEc0Z0lDOHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTljYmx4dVhHNGdJQzhxS2x4dUlDQWdLaUJCSUdScGNtVmpkRzl5ZVNCdlppQmhiR3dnY0hKdmJXbHpaWE1zSUdSbFptVnljbVZrY3l3Z1lXNWtJSEYxWlhWbGN5NWNiaUFnSUNvZ1FIUjVjR1VnYjJKcVpXTjBYRzRnSUNBcUwxeHVJQ0JmY0hKcGRtRjBaUzVzYVhOMElEMGdlMzFjYmx4dVhHNGdJQzhxS2x4dUlDQWdLaUJwZEdWeVlYUnZjaUJtYjNJZ2FXUnpYRzRnSUNBcUlFQjBlWEJsSUdsdWRHVm5aWEpjYmlBZ0lDb3ZYRzRnSUY5d2NtbDJZWFJsTG1rZ1BTQXdYRzVjYmx4dUlDQXZLaXBjYmlBZ0lDb2dRMjl1Wm1sbmRYSmhkR2x2YmlCMllXeDFaWE11WEc0Z0lDQXFYRzRnSUNBcUlFQjBlWEJsSUc5aWFtVmpkRnh1SUNBZ0tpOWNiaUFnWDNCeWFYWmhkR1V1YzJWMGRHbHVaM01nUFNCN1hHNWNiaUFnSUNCa1pXSjFaMTl0YjJSbE9pQm1ZV3h6WlZ4dUlDQWdJQzh2YzJWMElIUm9aU0JqZFhKeVpXNTBJSGR2Y210cGJtY2daR2x5WldOMGIzSjVJRzltSUhSb1pTQmpZV3hzWldVZ2MyTnlhWEIwTEZ4dUlDQWdJQzh2WW1WallYVnpaU0J1YjJSbElHaGhjeUJ1YnlCamIyNXpkR0Z1ZENCbWIzSWdkR2hwYzF4dUlDQWdJQ3hqZDJRNklHWmhiSE5sWEc0Z0lDQWdMRzF2WkdVNklDaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJR2xtS0hSNWNHVnZaaUJ3Y205alpYTnpJRDA5UFNCY0ltOWlhbVZqZEZ3aUlDWW1JR0FrZTNCeWIyTmxjM01nSUgxZ0lEMDlQU0JjSWx0dlltcGxZM1FnY0hKdlkyVnpjMTFjSWlrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJwY3lCdWIyUmxYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmNJbTVoZEdsMlpWd2lYRzRnSUNBZ0lDQjlJR1ZzYzJWN1hHNGdJQ0FnSUNBZ0lDOHZJRzV2ZENCdWIyUmxYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmNJbUp5YjNkelpYSmNJbHh1SUNBZ0lDQWdmVnh1SUNBZ0lIMG9LU2xjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdJQ0FxSUMwZ2IyNUJZM1JwZG1GMFpTQXZkMmhsYmlCbFlXTm9JR2x1YzNSaGJtTmxJR0ZqZEdsMllYUmxaRnh1SUNBZ0lDQWdJQ29nTFNCdmJsTmxkSFJzWlNBZ0lDQXZkMmhsYmlCbFlXTm9JR2x1YzNSaGJtTmxJSE5sZEhSc1pYTmNiaUFnSUNBZ0lDQXFYRzRnSUNBZ0lDQWdLaUJBZEhsd1pTQnZZbXBsWTNSY2JpQWdJQ0FnSUNBcUwxeHVJQ0FnSUN4b2IyOXJjem9nZTF4dUlDQWdJSDFjYmlBZ0lDQXNkR2x0Wlc5MWREb2dMVEVnTHk5dWJ5QmtaV1poZFd4MElIUnBiV1Z2ZFhSY2JpQWdmVnh1WEc1Y2JpQWdMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2TDF4dUlDQXZMeUFnWDNCeWFYWmhkR1VnVmtGU1NVRkNURVZUWEc0Z0lDOHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTljYmx4dVhHNGdJQzh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk5Y2JpQWdMeThnSUY5d2NtbDJZWFJsSUUxRlZFaFBSRk5jYmlBZ0x5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMeTh2THk4dkx5OHZMMXh1WEc1Y2JpQWdMeW9xWEc0Z0lDQXFJRTl3ZEdsdmJuTWdlVzkxSUhkcGMyZ2dkRzhnY0dGemN5QjBieUJ6WlhRZ2RHaGxJR2RzYjJKaGJDQmpiMjVtYVdkMWNtRjBhVzl1WEc0Z0lDQXFYRzRnSUNBcUlFQnRaVzFpWlhKdlppQnZjbWQ1WEc0Z0lDQXFJRUJtZFc1amRHbHZiaUJqYjI1bWFXZGNiaUFnSUNwY2JpQWdJQ29nUUhCaGNtRnRJSHR2WW1wbFkzUjlJRzl3ZEdsdmJuTWdUR2x6ZENCdlppQnZjSFJwYjI1ek9seHVJQ0FnS2x4dUlDQWdJQ29nSUMwZ1BHSStkR2x0Wlc5MWREd3ZZajRnZTI1MWJXSmxjbjBnWkdWbVlYVnNkRG9nTFRGY2JpQWdJQ29nSUNBdElGTmxkSFJwYm1jZ2RHaHBjeUIyWVd4MVpTQjBieUE4WWo0dE1Ud3ZZajRnZDJsc2JDQnlaWE4xYkhRZ2FXNGdibThnZEdsdFpXOTFkQzVjYmlBZ0lDQXFJQ0FnTFNCVFpYUnpJSFJvWlNCbmJHOWlZV3dnWkdWbVlYVnNJR1p2Y2lCMGFHVWdiblZ0WW1WeUlHOW1JRzFwYkd4cGMyVmpiMjVrY3lCaVpXWnZjbVVnWVd4c0lIRjFaWFZsY3k5a1pXWmxjbkpsWkhNZ1lYVjBiMjFoZEdsallXeHNlU0JoY21VZ2NtVnFaV04wWldRZ1lua2dkR2x0Wlc5MWRDNWNiaUFnSUNBcVhHNGdJQ0FxWEc0Z0lDQWdLaUFnTFNBOFlqNWpkMlE4TDJJK0lIdHpkSEpwYm1kOVhHNGdJQ0FnS2lBZ0lDMGdVMlYwY3lCamRYSnlaVzUwSUhkdmNtdHBibWNnWkdseVpXTjBiM0o1TGlCVFpYSjJaWElnYzJsa1pTQnpZM0pwY0hSeklHOXViSGt1WEc0Z0lDQWdLbHh1SUNBZ0tseHVJQ0FnSUNvZ0lDMGdQR0krWkdWaWRXZGZiVzlrWlR3dllqNGdlMkp2YjJ4bFlXNTlJR1JsWm1GMWJIUTZJR1poYkhObFhHNGdJQ0FnS2lBZ0lDMGdWMmhsYmlCaElIRjFaWFZsSUc5eUlHUmxabVZ5Y21Wa0lHbHpJRndpY21WcVpXTjBaV1JjSWl3Z2MyaHZkM01nYzNSaFkyc2dkSEpoWTJVZ1lXNWtJRzkwYUdWeUlHUmxZblZuWjJsdVp5QnBibVp2Y20xaGRHbHZiaUJwWmlCMGNuVmxMbHh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdiMkpxWldOMGZTQmpiMjVtYVdkMWNtRjBhVzl1SUhObGRIUnBibWR6WEc0Z0lDQXFMMXh1SUNCRGJITXVjSFZpYkdsakxtTnZibVpwWnlBOUlHWjFibU4wYVc5dUtHOWlhaWtnZTF4dVhHNGdJQ0FnYVdZb2RIbHdaVzltSUc5aWFpQTlQVDBnWENKdlltcGxZM1JjSWlrZ2UxeHVJQ0FnSUNBZ1ptOXlLSFpoY2lCcElHbHVJRzlpYWlsY2JpQWdJQ0FnSUNBZ1gzQnlhWFpoZEdVdWMyVjBkR2x1WjNOYmFWMGdQU0J2WW1wYmFWMWNibHh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCZmNISnBkbUYwWlM1elpYUjBhVzVuYzF4dUlDQjlYRzVjYmx4dUlDQXZLaXBjYmlBZ0lDb2dSR1ZpZFdkbmFXNW5JRzFsZEdodlpDNWNiaUFnSUNwY2JpQWdJQ29nUUhCaGNtRnRJSHR6ZEhKcGJtZDhZWEp5WVhsOUlHMXpaMXh1SUNBZ0tpQkFjR0Z5WVcwZ2UyOWlhbVZqZEgwZ1pHVm1YRzRnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnS2k5Y2JpQWdYM0J5YVhaaGRHVXVaR1ZpZFdjZ1BTQm1kVzVqZEdsdmJpaHRjMmNwSUh0Y2JseHVJQ0FnSUhaaGNpQnRjMmR6SUQwZ0tHMXpaeUJwYm5OMFlXNWpaVzltSUVGeWNtRjVLU0EvSUcxelp5NXFiMmx1S0Z3aVhGeHVYQ0lwSURvZ1cyMXpaMTFjYmx4dUlDQWdJSFpoY2lCbElEMGdibVYzSUVWeWNtOXlLRzF6WjNNcFhHNGdJQ0FnWTI5dWMyOXNaUzVzYjJjb1pTNXpkR0ZqYXlsY2JseHVJQ0FnSUdsbUtIUm9hWE11YzJWMGRHbHVaM011WkdWaWRXZGZiVzlrWlNrZ2UxeHVJQ0FnSUNBZ0x5OTBkWEp1SUc5bVppQmtaV0oxWjE5dGIyUmxJSFJ2SUdGMmIybGtJR2hwZEhScGJtY2daR1ZpZFdkblpYSmNiaUFnSUNBZ0lHUmxZblZuWjJWeVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnYVdZb1gzQnlhWFpoZEdVdWMyVjBkR2x1WjNNdWJXOWtaU0E5UFQwZ1hDSmljbTkzYzJWeVhDSXBYRzRnSUNBZ0lDQnlaWFIxY200Z1ptRnNjMlZjYmlBZ0lDQmxiSE5sWEc0Z0lDQWdJQ0J3Y205alpYTnpMbVY0YVhRb0tWeHVYRzRnSUgxY2JseHVYRzRnSUM4cUtseHVJQ0FnS2lCVVlXdGxJR0Z1SUdGeWNtRjVJRzltSUhCeWIzUnZkSGx3WlNCdlltcGxZM1J6SUdGdVpDQmhiaUJoY25KaGVTQnZaaUJ3Y205d1pYSjBlU0J2WW1wbFkzUnpMRnh1SUNBZ0tpQnRaWEpuWlhNZ1pXRmphQ3dnWVc1a0lISmxkSFZ5Ym5NZ1lTQnphR0ZzYkc5M0lHTnZjSGt1WEc0Z0lDQXFYRzRnSUNBcUlFQndZWEpoYlNCN1lYSnlZWGw5SUhCeWIzUnZUMkpxUVhKeUlFRnljbUY1SUc5bUlIQnliM1J2ZEhsd1pTQnZZbXBsWTNSeklIZG9hV05vSUdGeVpTQnZkbVZ5ZDNKcGRIUmxiaUJtY205dElISnBaMmgwSUhSdklHeGxablJjYmlBZ0lDb2dRSEJoY21GdElIdGhjbkpoZVgwZ2NISnZjSE5QWW1wQmNuSWdRWEp5WVhrZ2IyWWdaR1Z6YVhKbFpDQndjbTl3WlhKMGVTQnZZbXBsWTNSeklIZG9hV05vSUdGeVpTQnZkbVZ5ZDNKcGRIUmxiaUJtY205dElISnBaMmgwSUhSdklHeGxablJjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMjlpYW1WamRIMGdiMkpxWldOMFhHNGdJQ0FxTDF4dUlDQmZjSEpwZG1GMFpTNXVZV2wyWlY5amJHOXVaWElnUFNCbWRXNWpkR2x2Ymlod2NtOTBiMDlpYWtGeWNpeHdjbTl3YzA5aWFrRnljaWtnZTF4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnYldWeVoyVW9aRzl1YjNKektTQjdYRzRnSUNBZ0lDQjJZWElnYnlBOUlIdDlYRzRnSUNBZ0lDQm1iM0lvZG1GeUlHRWdhVzRnWkc5dWIzSnpLU0I3WEc0Z0lDQWdJQ0FnSUdadmNpaDJZWElnWWlCcGJpQmtiMjV2Y25OYllWMHBJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppaGtiMjV2Y25OYllWMWJZbDBnYVc1emRHRnVZMlZ2WmlCQmNuSmhlU2xjYmlBZ0lDQWdJQ0FnSUNBZ0lHOWJZbDBnUFNCa2IyNXZjbk5iWVYxYllsMHVjMnhwWTJVb01DbGNiaUFnSUNBZ0lDQWdJQ0JsYkhObElHbG1LSFI1Y0dWdlppQmtiMjV2Y25OYllWMWJZbDBnUFQwOUlGd2liMkpxWldOMFhDSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnllWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdiMXRpWFNBOUlFcFRUMDR1Y0dGeWMyVW9TbE5QVGk1emRISnBibWRwWm5rb1pHOXViM0p6VzJGZFcySmRLU2xjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdZMkYwWTJnb1pTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmpiMjV6YjJ4bExtVnljbTl5S0dVcFhHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sWEc0Z0lDQWdJQ0FnSUNBZ0lDQnZXMkpkSUQwZ1pHOXViM0p6VzJGZFcySmRYRzVjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJRzljYmlBZ0lDQjlYRzVjYmlBZ0lDQjJZWElnY0hKdmRHOGdQU0J0WlhKblpTaHdjbTkwYjA5aWFrRnljaWtzWEc0Z0lDQWdJQ0J3Y205d2N5QTlJRzFsY21kbEtIQnliM0J6VDJKcVFYSnlLVnh1WEc0Z0lDQWdMeTlBZEc5a2J5QmpiMjV6YVdSbGNpQnRZVzUxWVd4c2VTQnpaWFIwYVc1bklIUm9aU0J3Y205MGIzUjVjR1VnYVc1emRHVmhaRnh1SUNBZ0lIWmhjaUJtYVc1aGJFOWlhbVZqZENBOUlFOWlhbVZqZEM1amNtVmhkR1VvY0hKdmRHOHBYRzRnSUNBZ1ptOXlLSFpoY2lCcElHbHVJSEJ5YjNCektWeHVJQ0FnSUNBZ1ptbHVZV3hQWW1wbFkzUmJhVjBnUFNCd2NtOXdjMXRwWFZ4dVhHNWNiaUFnSUNCeVpYUjFjbTRnWm1sdVlXeFBZbXBsWTNSY2JpQWdmVnh1WEc1Y2JpQWdYM0J5YVhaaGRHVXVaMlZ1WlhKaGRHVmZhV1FnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCeVpYUjFjbTRnWUNSN2JtVjNJRVJoZEdVb0tTNW5aWFJVYVcxbEtDa2dJSDB0SkhzZ0lDc3JkR2hwY3k1cGZXQmNiaUFnZlZ4dVhHNWNiaUFnTHk5VFlYWmxJR1p2Y2lCeVpTMTFjMlZjYmlBZ1EyeHpMbkJ5YVhaaGRHVXVZMjl1Wm1sbklEMGdYM0J5YVhaaGRHVmNibHh1SUNCeVpYUjFjbTRnUTJ4elhHNTlYRzRpWFgwPSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2xzKSB7XG5cbiAgLyoqXG4gICogQG5hbWVzcGFjZSBvcmd5L2RlZmVycmVkXG4gICovXG5cblxuICB2YXIgX3ByaXZhdGUgPSB7fVxuXG5cbiAgX3ByaXZhdGUuYWN0aXZhdGUgPSBmdW5jdGlvbihvYmopIHtcblxuICAgIC8vaWYgbm8gaWQsIGdlbmVyYXRlIG9uZVxuICAgIGlmKCFvYmouaWQpXG4gICAgICBvYmouaWQgPSBDbHMucHJpdmF0ZS5jb25maWcuZ2VuZXJhdGVfaWQoKVxuXG5cbiAgICAvL01BS0UgU1VSRSBOQU1JTkcgQ09ORkxJQ1QgRE9FUyBOT1QgRVhJU1RcbiAgICBpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdICYmICFDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdLm92ZXJ3cml0YWJsZSkge1xuICAgICAgQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGBUcmllZCBpbGxlZ2FsIG92ZXJ3cml0ZSBvZiAke29iai5pZH0uYClcbiAgICAgIHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdXG4gICAgfVxuXG4gICAgLy9TQVZFIFRPIE1BU1RFUiBMSVNUXG4gICAgLy9AdG9kbyBvbmx5IHNhdmUgaWYgd2FzIGFzc2lnbmVkIGFuIGlkLFxuICAgIC8vd2hpY2ggaW1wbGllcyB1c2VyIGludGVuZHMgdG8gYWNjZXNzIHNvbWV3aGVyZSBlbHNlIG91dHNpZGUgb2Ygc2NvcGVcbiAgICBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvYmouaWRdID0gb2JqXG5cbiAgICAvL0FVVE8gVElNRU9VVFxuICAgIF9wcml2YXRlLmF1dG9fdGltZW91dC5jYWxsKG9iailcblxuICAgIC8vQ2FsbCBob29rXG4gICAgaWYoQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmhvb2tzLm9uQWN0aXZhdGUpXG4gICAgICBDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuaG9va3Mub25BY3RpdmF0ZShvYmopXG5cblxuICAgIHJldHVybiBvYmpcbiAgfVxuXG5cbiAgX3ByaXZhdGUuc2V0dGxlID0gZnVuY3Rpb24oZGVmKSB7XG5cbiAgICAvL1JFTU9WRSBBVVRPIFRJTUVPVVQgVElNRVJcbiAgICBpZihkZWYudGltZW91dF9pZClcbiAgICAgIGNsZWFyVGltZW91dChkZWYudGltZW91dF9pZClcblxuXG4gICAgLy9TZXQgc3RhdGUgdG8gcmVzb2x2ZWRcbiAgICBfcHJpdmF0ZS5zZXRfc3RhdGUoZGVmLDEpXG5cbiAgICAvL0NhbGwgaG9va1xuICAgIGlmKENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZSlcbiAgICAgIENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5ob29rcy5vblNldHRsZShkZWYpXG5cblxuICAgIC8vQWRkIGRvbmUgYXMgYSBjYWxsYmFjayB0byB0aGVuIGNoYWluIGNvbXBsZXRpb24uXG4gICAgZGVmLmNhbGxiYWNrcy50aGVuLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmdW5jdGlvbihkMixpdGluZXJhcnksbGFzdCkge1xuICAgICAgZGVmLmNhYm9vc2UgPSBsYXN0XG5cbiAgICAgIC8vUnVuIGRvbmVcbiAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgZGVmXG4gICAgICAgICxkZWYuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgLGRlZi5jYWJvb3NlXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQ6IGZhbHNlfVxuICAgICAgKVxuICAgIH0pXG5cbiAgICAvL1J1biB0aGVuIHF1ZXVlXG4gICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgZGVmXG4gICAgICAsZGVmLmNhbGxiYWNrcy50aGVuXG4gICAgICAsZGVmLnZhbHVlXG4gICAgICAse3BhdXNlX29uX2RlZmVycmVkOiB0cnVlfVxuICAgIClcblxuICAgIHJldHVybiBkZWZcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJ1bnMgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIHNlcXVlbnRpYWxseSBhcyBhIHBhcnRpYWwgZnVuY3Rpb24uXG4gICAqIEVhY2ggZnVuY3Rpb24ncyBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IG9mIGl0cyBwcmVkZWNlc3NvciBmdW5jdGlvbi5cbiAgICpcbiAgICogQnkgZGVmYXVsdCwgZXhlY3V0aW9uIGNoYWluIGlzIHBhdXNlZCB3aGVuIGFueSBmdW5jdGlvblxuICAgKiByZXR1cm5zIGFuIHVucmVzb2x2ZWQgZGVmZXJyZWQuIChwYXVzZV9vbl9kZWZlcnJlZCkgW09QVElPTkFMXVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGVmICAvZGVmZXJyZWQgb2JqZWN0XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvYmogIC9pdGluZXJhcnlcbiAgICogICAgICB0cmFpbiAgICAgICAge2FycmF5fVxuICAgKiAgICAgIGhvb2tzICAgICAgICB7b2JqZWN0fVxuICAgKiAgICAgICAgICBvbkJlZm9yZSAgICAgICAge2FycmF5fVxuICAgKiAgICAgICAgICBvbkNvbXBsZXRlICAgICAge2FycmF5fVxuICAgKiBAcGFyYW0ge21peGVkfSBwYXJhbSAvcGFyYW0gdG8gcGFzcyB0byBmaXJzdCBjYWxsYmFja1xuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAgKiAgICAgIHBhdXNlX29uX2RlZmVycmVkICAgIHtib29sZWFufVxuICAgKlxuICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICovXG4gIF9wcml2YXRlLnJ1bl90cmFpbiA9IGZ1bmN0aW9uKGRlZixvYmoscGFyYW0sb3B0aW9ucykge1xuXG4gICAgLy9hbGxvdyBwcmV2aW91cyByZXR1cm4gdmFsdWVzIHRvIGJlIHBhc3NlZCBkb3duIGNoYWluXG4gICAgdmFyIHIgPSBwYXJhbSB8fCBkZWYuY2Fib29zZSB8fCBkZWYudmFsdWVcblxuICAgIC8vb25CZWZvcmUgZXZlbnRcbiAgICBpZihvYmouaG9va3MgJiYgb2JqLmhvb2tzLm9uQmVmb3JlLnRyYWluLmxlbmd0aCA+IDApIHtcbiAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgZGVmXG4gICAgICAgICxvYmouaG9va3Mub25CZWZvcmVcbiAgICAgICAgLHBhcmFtXG4gICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQ6IGZhbHNlfVxuICAgICAgKVxuICAgIH1cblxuICAgIHdoaWxlKG9iai50cmFpbi5sZW5ndGggPiAwKSB7XG5cbiAgICAgIC8vcmVtb3ZlIGZuIHRvIGV4ZWN1dGVcbiAgICAgIHZhciBsYXN0ID0gb2JqLnRyYWluLnNoaWZ0KClcbiAgICAgIGRlZi5leGVjdXRpb25faGlzdG9yeS5wdXNoKGxhc3QpXG5cbiAgICAgIC8vZGVmLmNhYm9vc2UgbmVlZGVkIGZvciB0aGVuIGNoYWluIGRlY2xhcmVkIGFmdGVyIHJlc29sdmVkIGluc3RhbmNlXG4gICAgICByID0gZGVmLmNhYm9vc2UgPSBsYXN0LmNhbGwoZGVmLGRlZi52YWx1ZSxkZWYscilcblxuICAgICAgLy9pZiByZXN1bHQgaXMgYW4gdGhlbmFibGUsIGhhbHQgZXhlY3V0aW9uXG4gICAgICAvL2FuZCBydW4gdW5maXJlZCBhcnIgd2hlbiB0aGVuYWJsZSBzZXR0bGVzXG4gICAgICBpZihvcHRpb25zLnBhdXNlX29uX2RlZmVycmVkKSB7XG5cbiAgICAgICAgLy9JZiByIGlzIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuICAgICAgICBpZihyICYmIHIudGhlbiAmJiByLnNldHRsZWQgIT09IDEpIHtcblxuICAgICAgICAgIC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXIgciByZXNvbHZlc1xuICAgICAgICAgIHIuY2FsbGJhY2tzLnJlc29sdmUuaG9va3Mub25Db21wbGV0ZS50cmFpbi5wdXNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgICAgICAgICBkZWZcbiAgICAgICAgICAgICAgLG9ialxuICAgICAgICAgICAgICAsclxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkOiB0cnVlfVxuICAgICAgICAgICAgKVxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICAvL3Rlcm1pbmF0ZSBleGVjdXRpb25cbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfSBlbHNlIGlmKHIgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgIC8vSWYgaXMgYW4gYXJyYXksIGNvbnRhaW5zIGFuIHVuc2V0dGxlZCB0aGVuYWJsZVxuXG4gICAgICAgICAgdmFyIHRoZW5hYmxlcyA9IFtdXG5cbiAgICAgICAgICBmb3IodmFyIGkgaW4gcikge1xuXG4gICAgICAgICAgICBpZihyW2ldLnRoZW4gJiYgcltpXS5zZXR0bGVkICE9PSAxKSB7XG5cbiAgICAgICAgICAgICAgdGhlbmFibGVzLnB1c2gocltpXSlcblxuICAgICAgICAgICAgICB2YXIgZm4gPSAoZnVuY3Rpb24odCxkZWYsb2JqLHBhcmFtKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgIC8vQmFpbCBpZiBhbnkgdGhlbmFibGVzIHVuc2V0dGxlZFxuICAgICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodFtpXS5zZXR0bGVkICE9PSAxKVxuICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgICAgICAgICAgZGVmXG4gICAgICAgICAgICAgICAgICAgICxvYmpcbiAgICAgICAgICAgICAgICAgICAgLHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQ6IHRydWV9XG4gICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIH0pKHRoZW5hYmxlcyxkZWYsb2JqLHBhcmFtKVxuXG4gICAgICAgICAgICAgIC8vZXhlY3V0ZSByZXN0IG9mIHRoaXMgdHJhaW4gYWZ0ZXJcbiAgICAgICAgICAgICAgLy9hbGwgdGhlbmFibGVzIGZvdW5kIGluIHIgcmVzb2x2ZVxuICAgICAgICAgICAgICByW2ldLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChmbilcblxuICAgICAgICAgICAgICAvL3Rlcm1pbmF0ZSBleGVjdXRpb25cbiAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9vbkNvbXBsZXRlIGV2ZW50XG4gICAgaWYob2JqLmhvb2tzICYmIG9iai5ob29rcy5vbkNvbXBsZXRlLnRyYWluLmxlbmd0aCA+IDApXG4gICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oZGVmLG9iai5ob29rcy5vbkNvbXBsZXRlLHIse3BhdXNlX29uX2RlZmVycmVkOiBmYWxzZX0pXG5cbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIG9mIGFuIE9yZ3kgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGVmXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBpbnRcbiAgICogQHJldHVybnMge3ZvaWR9XG4gICAqL1xuICBfcHJpdmF0ZS5zZXRfc3RhdGUgPSBmdW5jdGlvbihkZWYsaW50KSB7XG5cbiAgICBkZWYuc3RhdGUgPSBpbnRcblxuICAgIC8vSUYgUkVTT0xWRUQgT1IgUkVKRUNURUQsIFNFVFRMRVxuICAgIGlmKGludCA9PT0gMSB8fCBpbnQgPT09IDIpXG4gICAgICBkZWYuc2V0dGxlZCA9IDFcblxuXG4gICAgaWYoaW50ID09PSAxIHx8IGludCA9PT0gMilcbiAgICAgIF9wcml2YXRlLnNpZ25hbF9kb3duc3RyZWFtKGRlZilcblxuICB9XG5cblxuICAvKipcbiAgICogR2V0cyB0aGUgc3RhdGUgb2YgYW4gT3JneSBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGRlZlxuICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgKi9cbiAgX3ByaXZhdGUuZ2V0X3N0YXRlID0gZnVuY3Rpb24oZGVmKSB7XG4gICAgcmV0dXJuIGRlZi5zdGF0ZVxuICB9XG5cblxuICAvKipcbiAgICogU2V0cyB0aGUgYXV0b21hdGljIHRpbWVvdXQgb24gYSBwcm9taXNlIG9iamVjdC5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXQgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMudGltZW91dCA9ICh0eXBlb2YgdGhpcy50aW1lb3V0ICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgPyB0aGlzLnRpbWVvdXQgOiBDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MudGltZW91dFxuXG4gICAgLy9BVVRPIFJFSkVDVCBPTiB0aW1lb3V0XG4gICAgaWYoIXRoaXMudHlwZSB8fCB0aGlzLnR5cGUgIT09IFwidGltZXJcIikge1xuXG4gICAgICAvL0RFTEVURSBQUkVWSU9VUyBUSU1FT1VUIElGIEVYSVNUU1xuICAgICAgaWYodGhpcy50aW1lb3V0X2lkKVxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKVxuXG5cbiAgICAgIGlmKHR5cGVvZiB0aGlzLnRpbWVvdXQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcbiAgICAgICAgICBcIkF1dG8gdGltZW91dCB0aGlzLnRpbWVvdXQgY2Fubm90IGJlIHVuZGVmaW5lZC5cIlxuICAgICAgICAgICx0aGlzLmlkXG4gICAgICAgIF0pXG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGltZW91dCA9PT0gLTEpIHtcbiAgICAgICAgLy9OTyBBVVRPIFRJTUVPVVQgU0VUXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgICAgdmFyIHNjb3BlID0gdGhpc1xuXG4gICAgICB0aGlzLnRpbWVvdXRfaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXRfY2IuY2FsbChzY29wZSlcbiAgICAgIH0sIHRoaXMudGltZW91dClcblxuICAgIH1cbiAgICAvL2Vsc2V7XG4gICAgLy9AdG9kbyBXSEVOIEEgVElNRVIsIEFERCBEVVJBVElPTiBUTyBBTEwgVVBTVFJFQU0gQU5EIExBVEVSQUw/XG4gICAgLy99XG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cblxuICAvKipcbiAgICogQ2FsbGJhY2sgZm9yIGF1dG90aW1lb3V0LiBEZWNsYXJhdGlvbiBoZXJlIGF2b2lkcyBtZW1vcnkgbGVhay5cbiAgICpcbiAgICogQHJldHVybnMge3ZvaWR9XG4gICAqL1xuICBfcHJpdmF0ZS5hdXRvX3RpbWVvdXRfY2IgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmKHRoaXMuc3RhdGUgIT09IDEpIHtcblxuICAgICAgLy9HRVQgVEhFIFVQU1RSRUFNIEVSUk9SIElEXG4gICAgICB2YXIgbXNncyA9IFtdXG4gICAgICB2YXIgc2NvcGUgPSB0aGlzXG5cbiAgICAgIHZhciBmbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZihvYmouc3RhdGUgIT09IDEpXG4gICAgICAgICAgcmV0dXJuIG9iai5pZFxuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAqIFJ1biBvdmVyIGEgZ2l2ZW4gb2JqZWN0IHByb3BlcnR5IHJlY3Vyc2l2ZWx5LFxuICAgICAgKiBhcHBseWluZyBjYWxsYmFjayB1bnRpbFxuICAgICAgKiBjYWxsYmFjayByZXR1cm5zIGEgbm9uLWZhbHNlIHZhbHVlLlxuICAgICAgKi9cbiAgICAgIGlmKENscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5kZWJ1Z19tb2RlKSB7XG4gICAgICAgIHZhciByID0gX3ByaXZhdGUuc2VhcmNoX29ial9yZWN1cnNpdmVseSh0aGlzLFwidXBzdHJlYW1cIixmbilcbiAgICAgICAgbXNncy5wdXNoKGAke3Njb3BlLmlkICB9OiByZWplY3RlZCBieSBhdXRvIHRpbWVvdXQgYWZ0ZXIgJHt0aGlzLnRpbWVvdXR9bXMuIFRvIHR1cm4gb2ZmIHRpbWVvdXRzIHNldCBjb25maWcgb3B0aW9uOiBcInt0aW1lb3V0OjF9XCJgKVxuICAgICAgICBtc2dzLnB1c2goXCJDYXVzZTpcIilcbiAgICAgICAgbXNncy5wdXNoKHIpXG4gICAgICAgIHJldHVybiB0aGlzLnJlamVjdC5jYWxsKHRoaXMsbXNncylcbiAgICAgIH0gZWxzZVxuICAgICAgICByZXR1cm4gdGhpcy5yZWplY3QuY2FsbCh0aGlzKVxuXG5cbiAgICB9XG4gIH1cblxuXG4gIF9wcml2YXRlLmVycm9yID0gZnVuY3Rpb24oY2IpIHtcblxuICAgIC8vSUYgRVJST1IgQUxSRUFEWSBUSFJPV04sIEVYRUNVVEUgQ0IgSU1NRURJQVRFTFlcbiAgICBpZih0aGlzLnN0YXRlID09PSAyKVxuICAgICAgY2IoKVxuICAgIGVsc2VcbiAgICAgIHRoaXMucmVqZWN0X3EucHVzaChjYilcblxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFNpZ25hbHMgYWxsIGRvd25zdHJlYW0gcHJvbWlzZXMgdGhhdCBfcHJpdmF0ZSBwcm9taXNlIG9iamVjdCdzXG4gICAqIHN0YXRlIGhhcyBjaGFuZ2VkLlxuICAgKlxuICAgKiBAdG9kbyBTaW5jZSB0aGUgc2FtZSBxdWV1ZSBtYXkgaGF2ZSBiZWVuIGFzc2lnbmVkIHR3aWNlIGRpcmVjdGx5IG9yXG4gICAqIGluZGlyZWN0bHkgdmlhIHNoYXJlZCBkZXBlbmRlbmNpZXMsIG1ha2Ugc3VyZSBub3QgdG8gZG91YmxlIHJlc29sdmVcbiAgICogLSB3aGljaCB0aHJvd3MgYW4gZXJyb3IuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgZGVmZXJyZWQvcXVldWVcbiAgICogQHJldHVybnMge3ZvaWR9XG4gICAqL1xuICBfcHJpdmF0ZS5zaWduYWxfZG93bnN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldCkge1xuXG4gICAgLy9NQUtFIFNVUkUgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVEXG4gICAgZm9yKGxldCBhIGluIHRhcmdldC5kb3duc3RyZWFtKSB7XG4gICAgICBpZih0YXJnZXQuZG93bnN0cmVhbVthXS5zZXR0bGVkID09PSAxKSB7XG5cbiAgICAgICAgaWYodGFyZ2V0LmRvd25zdHJlYW1bYV0uc3RhdGUgIT09IDEpIHtcbiAgICAgICAgICAvL3RyaWVkIHRvIHNldHRsZSBhIHJlamVjdGVkIGRvd25zdHJlYW1cbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgLy90cmllZCB0byBzZXR0bGUgYSBzdWNjZXNzZnVsbHkgc2V0dGxlZCBkb3duc3RyZWFtXG4gICAgICAgICAgQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGAke3RhcmdldC5pZCAgfSB0cmllZCB0byBzZXR0bGUgcHJvbWlzZSBgK2AnJHt0YXJnZXQuZG93bnN0cmVhbVthXS5pZH0nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBzZXR0bGVkLmApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL05PVyBUSEFUIFdFIEtOT1cgQUxMIERPV05TVFJFQU0gSVMgVU5TRVRUTEVELCBXRSBDQU4gSUdOT1JFIEFOWVxuICAgIC8vU0VUVExFRCBUSEFUIFJFU1VMVCBBUyBBIFNJREUgRUZGRUNUIFRPIEFOT1RIRVIgU0VUVExFTUVOVFxuICAgIGZvciAobGV0IGIgaW4gdGFyZ2V0LmRvd25zdHJlYW0pIHtcbiAgICAgIGlmKHRhcmdldC5kb3duc3RyZWFtW2JdLnNldHRsZWQgIT09IDEpXG4gICAgICAgIF9wcml2YXRlLnJlY2VpdmVfc2lnbmFsKHRhcmdldC5kb3duc3RyZWFtW2JdLHRhcmdldC5pZClcblxuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICogUnVuIG92ZXIgYSBnaXZlbiBvYmplY3QgcHJvcGVydHkgcmVjdXJzaXZlbHksIGFwcGx5aW5nIGNhbGxiYWNrIHVudGlsXG4gICogY2FsbGJhY2sgcmV0dXJucyBhIG5vbi1mYWxzZSB2YWx1ZS5cbiAgKlxuICAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAgKiBAcGFyYW0ge3N0cmluZ30gcHJvcE5hbWUgICAgICAgICAgVGhlIHByb3BlcnR5IG5hbWUgb2YgdGhlIGFycmF5IHRvIGJ1YmJsZSB1cFxuICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuICAgICAgICAgICAgICBUaGUgdGVzdCBjYWxsYmFjayB0byBiZSBhcHBsaWVkIHRvIGVhY2ggb2JqZWN0XG4gICogQHBhcmFtIHthcnJheX0gYnJlYWRjcnVtYiAgICAgICAgICBUaGUgYnJlYWRjcnVtYiB0aHJvdWdoIHRoZSBjaGFpbiBvZiB0aGUgZmlyc3QgbWF0Y2hcbiAgKiBAcmV0dXJucyB7bWl4ZWR9XG4gICovXG4gIF9wcml2YXRlLnNlYXJjaF9vYmpfcmVjdXJzaXZlbHkgPSBmdW5jdGlvbihvYmoscHJvcE5hbWUsZm4sYnJlYWRjcnVtYikge1xuXG4gICAgaWYodHlwZW9mIGJyZWFkY3J1bWIgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICBicmVhZGNydW1iID0gW29iai5pZF1cblxuXG4gICAgdmFyIHIxXG5cbiAgICBmb3IodmFyIGkgaW4gb2JqW3Byb3BOYW1lXSkge1xuXG4gICAgICAvL1JVTiBURVNUXG4gICAgICByMSA9IGZuKG9ialtwcm9wTmFtZV1baV0pXG5cbiAgICAgIGlmKHIxICE9PSBmYWxzZSkge1xuICAgICAgICAvL01BVENIIFJFVFVSTkVELiBSRUNVUlNFIElOVE8gTUFUQ0ggSUYgSEFTIFBST1BFUlRZIE9GIFNBTUUgTkFNRSBUTyBTRUFSQ0hcbiAgICAgICAgLy9DSEVDSyBUSEFUIFdFIEFSRU4nVCBDQVVHSFQgSU4gQSBDSVJDVUxBUiBMT09QXG4gICAgICAgIGlmKGJyZWFkY3J1bWIuaW5kZXhPZihyMSkgIT09IC0xKSB7XG4gICAgICAgICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgICBgQ2lyY3VsYXIgY29uZGl0aW9uIGluIHJlY3Vyc2l2ZSBzZWFyY2ggb2Ygb2JqIHByb3BlcnR5ICcke1xuICAgICAgICAgICAgICBwcm9wTmFtZX0nIG9mIG9iamVjdCAke1xuICAgICAgICAgICAgICAodHlwZW9mIG9iai5pZCAhPT0gXCJ1bmRlZmluZWRcIikgPyBgJyR7b2JqLmlkfSdgIDogXCJcIlxuICAgICAgICAgICAgfS4gT2ZmZW5kaW5nIHZhbHVlOiAke3IxfWBcbiAgICAgICAgICAgICwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGJyZWFkY3J1bWIucHVzaChyMSlcbiAgICAgICAgICAgICAgcmV0dXJuIGJyZWFkY3J1bWIuam9pbihcIiBbZGVwZW5kcyBvbl09PiBcIilcbiAgICAgICAgICAgIH0pKClcbiAgICAgICAgICBdKVxuICAgICAgICB9XG5cbiAgICAgICAgYnJlYWRjcnVtYi5wdXNoKHIxKVxuXG4gICAgICAgIGlmKG9ialtwcm9wTmFtZV1baV1bcHJvcE5hbWVdKVxuICAgICAgICAgIHJldHVybiBfcHJpdmF0ZS5zZWFyY2hfb2JqX3JlY3Vyc2l2ZWx5KG9ialtwcm9wTmFtZV1baV0scHJvcE5hbWUsZm4sYnJlYWRjcnVtYilcblxuXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gYnJlYWRjcnVtYlxuICB9XG5cblxuICAvKipcbiAgICogQ29udmVydHMgYSBwcm9taXNlIGRlc2NyaXB0aW9uIGludG8gYSBwcm9taXNlLlxuICAgKlxuICAgKiBAcGFyYW0ge3R5cGV9IG9ialxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgX3ByaXZhdGUuY29udmVydF90b19wcm9taXNlID0gZnVuY3Rpb24ob2JqLG9wdGlvbnMpIHtcblxuICAgIG9iai5pZCA9IG9iai5pZCB8fCBvcHRpb25zLmlkXG5cbiAgICAvL0F1dG9uYW1lXG4gICAgaWYgKCFvYmouaWQpIHtcbiAgICAgIGlmIChvYmoudHlwZSA9PT0gXCJ0aW1lclwiKVxuICAgICAgICBvYmouaWQgPSBgdGltZXItJHsgIG9iai50aW1lb3V0ICB9LSR7ICArK0Nscy5wcml2YXRlLmNvbmZpZy5pfWBcbiAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmoudXJsID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIG9iai5pZCA9IG9iai51cmwuc3BsaXQoXCIvXCIpLnBvcCgpXG4gICAgICAgIC8vUkVNT1ZFIC5qcyBGUk9NIElEXG4gICAgICAgIGlmIChvYmouaWQuc2VhcmNoKFwiLmpzXCIpICE9PSAtMSkge1xuICAgICAgICAgIG9iai5pZCA9IG9iai5pZC5zcGxpdChcIi5cIilcbiAgICAgICAgICBvYmouaWQucG9wKClcbiAgICAgICAgICBvYmouaWQgPSBvYmouaWQuam9pbihcIi5cIilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vUmV0dXJuIGlmIGFscmVhZHkgZXhpc3RzXG4gICAgaWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXSAmJiBvYmoudHlwZSAhPT0gXCJ0aW1lclwiKSB7XG4gICAgICAvL0EgcHJldmlvdXMgcHJvbWlzZSBvZiB0aGUgc2FtZSBpZCBleGlzdHMuXG4gICAgICAvL01ha2Ugc3VyZSB0aGlzIGRlcGVuZGVuY3kgb2JqZWN0IGRvZXNuJ3QgaGF2ZSBhXG4gICAgICAvL3Jlc29sdmVyIC0gaWYgaXQgZG9lcyBlcnJvclxuICAgICAgaWYob2JqLnJlc29sdmVyKSB7XG4gICAgICAgIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhbXG4gICAgICAgICAgXCJZb3UgY2FuJ3Qgc2V0IGEgcmVzb2x2ZXIgb24gYSBxdWV1ZSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQuIFlvdSBjYW4gb25seSByZWZlcmVuY2UgdGhlIG9yaWdpbmFsLlwiXG4gICAgICAgICAgLGBEZXRlY3RlZCByZS1pbml0IG9mICckeyAgb2JqLmlkICB9Jy5gXG4gICAgICAgICAgLFwiQXR0ZW1wdGVkOlwiXG4gICAgICAgICAgLG9ialxuICAgICAgICAgICxcIkV4aXN0aW5nOlwiXG4gICAgICAgICAgLENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF1cbiAgICAgICAgXSlcbiAgICAgIH0gZWxzZVxuICAgICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb2JqLmlkXVxuXG4gICAgfVxuXG5cbiAgICAvL0NvbnZlcnQgZGVwZW5kZW5jeSB0byBhbiBpbnN0YW5jZVxuICAgIHZhciBkZWZcbiAgICBzd2l0Y2godHJ1ZSkge1xuXG4gICAgICAvL0V2ZW50XG4gICAgICBjYXNlKG9iai50eXBlID09PSBcImV2ZW50XCIpOlxuICAgICAgICBkZWYgPSBfcHJpdmF0ZS53cmFwX2V2ZW50KG9iailcbiAgICAgICAgYnJlYWtcblxuICAgICAgY2FzZShvYmoudHlwZSA9PT0gXCJxdWV1ZVwiKTpcbiAgICAgICAgZGVmID0gQ2xzLnB1YmxpYy5xdWV1ZShvYmouZGVwZW5kZW5jaWVzLG9iailcbiAgICAgICAgYnJlYWtcblxuICAgICAgICAvL0FscmVhZHkgYSB0aGVuYWJsZVxuICAgICAgY2FzZSh0eXBlb2Ygb2JqLnRoZW4gPT09IFwiZnVuY3Rpb25cIik6XG5cbiAgICAgICAgc3dpdGNoKHRydWUpIHtcblxuICAgICAgICAgIC8vUmVmZXJlbmNlIHRvIGFuIGV4aXN0aW5nIGluc3RhbmNlXG4gICAgICAgICAgY2FzZSh0eXBlb2Ygb2JqLmlkID09PSBcInN0cmluZ1wiKTpcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgJyR7b2JqLmlkIH0nOiBkaWQgbm90IGV4aXN0LiBBdXRvIGNyZWF0aW5nIG5ldyBkZWZlcnJlZC5gKVxuICAgICAgICAgICAgZGVmID0gX3ByaXZhdGUuZGVmZXJyZWQoe1xuICAgICAgICAgICAgICBpZDogb2JqLmlkXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAvL0lmIG9iamVjdCB3YXMgYSB0aGVuYWJsZSwgcmVzb2x2ZSB0aGUgbmV3IGRlZmVycmVkIHdoZW4gdGhlbiBjYWxsZWRcbiAgICAgICAgICAgIGlmKG9iai50aGVuKSB7XG4gICAgICAgICAgICAgIG9iai50aGVuKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgICAgICBkZWYucmVzb2x2ZShyKVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICAgICAgLy9PQkpFQ1QgUFJPUEVSVFkgLnByb21pc2UgRVhQRUNURUQgVE8gUkVUVVJOIEEgUFJPTUlTRVxuICAgICAgICAgIGNhc2UodHlwZW9mIG9iai5wcm9taXNlID09PSBcImZ1bmN0aW9uXCIpOlxuICAgICAgICAgICAgaWYob2JqLnNjb3BlKVxuICAgICAgICAgICAgICBkZWYgPSBvYmoucHJvbWlzZS5jYWxsKG9iai5zY29wZSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgZGVmID0gb2JqLnByb21pc2UoKVxuXG4gICAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgICAvL09iamVjdCBpcyBhIHRoZW5hYmxlXG4gICAgICAgICAgY2FzZShvYmoudGhlbik6XG4gICAgICAgICAgICBkZWYgPSBvYmpcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBkZWZhdWx0OlxuXG4gICAgICAgIH1cblxuICAgICAgICAvL0NoZWNrIGlmIGlzIGEgdGhlbmFibGVcbiAgICAgICAgaWYodHlwZW9mIGRlZiAhPT0gXCJvYmplY3RcIiB8fCAhZGVmLnRoZW4pXG4gICAgICAgICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkRlcGVuZGVuY3kgbGFiZWxlZCBhcyBhIHByb21pc2UgZGlkIG5vdCByZXR1cm4gYSBwcm9taXNlLlwiLG9iailcblxuICAgICAgICBicmVha1xuXG4gICAgICBjYXNlKG9iai50eXBlID09PSBcInRpbWVyXCIpOlxuICAgICAgICBkZWYgPSBfcHJpdmF0ZS53cmFwX3RpbWVyKG9iailcbiAgICAgICAgYnJlYWtcblxuICAgICAgICAvL0xvYWQgZmlsZVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgb2JqLnR5cGUgPSBvYmoudHlwZSB8fCBcImRlZmF1bHRcIlxuICAgICAgICAvL0luaGVyaXQgcGFyZW50J3MgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICBpZihvcHRpb25zLnBhcmVudCAmJiBvcHRpb25zLnBhcmVudC5jd2QpXG4gICAgICAgICAgb2JqLmN3ZCA9IG9wdGlvbnMucGFyZW50LmN3ZFxuXG4gICAgICAgIGRlZiA9IF9wcml2YXRlLndyYXBfeGhyKG9iailcbiAgICB9XG5cbiAgICAvL0luZGV4IHByb21pc2UgYnkgaWQgZm9yIGZ1dHVyZSByZWZlcmVuY2luZ1xuICAgIENscy5wcml2YXRlLmNvbmZpZy5saXN0W29iai5pZF0gPSBkZWZcblxuICAgIHJldHVybiBkZWZcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEB0b2RvOiByZWRvIHRoaXNcbiAgICpcbiAgICogQ29udmVydHMgYSByZWZlcmVuY2UgdG8gYSBET00gZXZlbnQgdG8gYSBwcm9taXNlLlxuICAgKiBSZXNvbHZlZCBvbiBmaXJzdCBldmVudCB0cmlnZ2VyLlxuICAgKlxuICAgKiBAdG9kbyByZW1vdmUganF1ZXJ5IGRlcGVuZGVuY3lcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAgICovXG4gIF9wcml2YXRlLndyYXBfZXZlbnQgPSBmdW5jdGlvbihvYmopIHtcblxuICAgIHZhciBkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKHtcbiAgICAgIGlkOiBvYmouaWRcbiAgICB9KVxuXG5cbiAgICBpZih0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuXG4gICAgICBpZih0eXBlb2YgJCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHZhciBtc2cgPSBcIndpbmRvdyBhbmQgZG9jdW1lbnQgYmFzZWQgZXZlbnRzIGRlcGVuZCBvbiBqUXVlcnlcIlxuICAgICAgICBkZWYucmVqZWN0KG1zZylcbiAgICAgIH0gZWxzZXtcbiAgICAgICAgLy9Gb3Igbm93LCBkZXBlbmQgb24ganF1ZXJ5IGZvciBJRTggRE9NQ29udGVudExvYWRlZCBwb2x5ZmlsbFxuICAgICAgICBzd2l0Y2godHJ1ZSkge1xuICAgICAgICAgIGNhc2Uob2JqLmlkID09PSBcInJlYWR5XCIgfHwgb2JqLmlkID09PSBcIkRPTUNvbnRlbnRMb2FkZWRcIik6XG4gICAgICAgICAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2Uob2JqLmlkID09PSBcImxvYWRcIik6XG4gICAgICAgICAgICAkKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZGVmLnJlc29sdmUoMSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAkKGRvY3VtZW50KS5vbihvYmouaWQsXCJib2R5XCIsZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZi5yZXNvbHZlKDEpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZlxuICB9XG5cblxuICBfcHJpdmF0ZS53cmFwX3RpbWVyID0gZnVuY3Rpb24ob2JqKSB7XG5cbiAgICB2YXIgZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZCgpO1xuXG4gICAgKGZ1bmN0aW9uKGRlZikge1xuICAgICAgdmFyIF9zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgX2VuZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICAgIGRlZi5yZXNvbHZlKHtcbiAgICAgICAgICBzdGFydDogX3N0YXJ0XG4gICAgICAgICAgLGVuZDogX2VuZFxuICAgICAgICAgICxlbGFwc2VkOiBfZW5kIC0gX3N0YXJ0XG4gICAgICAgICAgLHRpbWVvdXQ6IG9iai50aW1lb3V0XG4gICAgICAgIH0pXG4gICAgICB9LG9iai50aW1lb3V0KVxuICAgIH0oZGVmKSlcblxuICAgIHJldHVybiBkZWZcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkZWZlcnJlZCBvYmplY3QgdGhhdCBkZXBlbmRzIG9uIHRoZSBsb2FkaW5nIG9mIGEgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGRlcFxuICAgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZCBvYmplY3RcbiAgICovXG4gIF9wcml2YXRlLndyYXBfeGhyID0gZnVuY3Rpb24oZGVwKSB7XG5cbiAgICB2YXIgcmVxdWlyZWQgPSBbXCJpZFwiLFwidXJsXCJdXG4gICAgZm9yKHZhciBpIGluIHJlcXVpcmVkKSB7XG4gICAgICBpZighZGVwW3JlcXVpcmVkW2ldXSkge1xuICAgICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcbiAgICAgICAgICBgRmlsZSByZXF1ZXN0cyBjb252ZXJ0ZWQgdG8gcHJvbWlzZXMgcmVxdWlyZTogJHsgIHJlcXVpcmVkW2ldfWBcbiAgICAgICAgICAsXCJNYWtlIHN1cmUgeW91IHdlcmVuJ3QgZXhwZWN0aW5nIGRlcGVuZGVuY3kgdG8gYWxyZWFkeSBoYXZlIGJlZW4gcmVzb2x2ZWQgdXBzdHJlYW0uXCJcbiAgICAgICAgICAsZGVwXG4gICAgICAgIF0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9JRiBQUk9NSVNFIEZPUiBUSElTIFVSTCBBTFJFQURZIEVYSVNUUywgUkVUVVJOIElUXG4gICAgaWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbZGVwLmlkXSlcbiAgICAgIHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtkZXAuaWRdXG5cblxuICAgIC8vQ09OVkVSVCBUTyBERUZFUlJFRDpcbiAgICB2YXIgZGVmID0gQ2xzLnB1YmxpYy5kZWZlcnJlZChkZXApXG5cbiAgICBpZih0eXBlb2YgQ2xzLnB1YmxpYy5maWxlX2xvYWRlcltDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgQ2xzLnB1YmxpYy5maWxlX2xvYWRlcltDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MubW9kZV1bZGVwLnR5cGVdKGRlcC51cmwsZGVmLGRlcClcbiAgICBlbHNlXG4gICAgICBDbHMucHVibGljLmZpbGVfbG9hZGVyW0Nscy5wcml2YXRlLmNvbmZpZy5zZXR0aW5ncy5tb2RlXVtcImRlZmF1bHRcIl0oZGVwLnVybCxkZWYsZGVwKVxuXG5cbiAgICByZXR1cm4gZGVmXG4gIH1cblxuICAvKipcbiAgKiBBIFwic2lnbmFsXCIgaGVyZSBjYXVzZXMgYSBxdWV1ZSB0byBsb29rIHRocm91Z2ggZWFjaCBpdGVtXG4gICogaW4gaXRzIHVwc3RyZWFtIGFuZCBjaGVjayB0byBzZWUgaWYgYWxsIGFyZSByZXNvbHZlZC5cbiAgKlxuICAqIFNpZ25hbHMgY2FuIG9ubHkgYmUgcmVjZWl2ZWQgYnkgYSBxdWV1ZSBpdHNlbGYgb3IgYW4gaW5zdGFuY2VcbiAgKiBpbiBpdHMgdXBzdHJlYW0uXG4gICpcbiAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4gICogQHBhcmFtIHtzdHJpbmd9IGZyb21faWRcbiAgKiBAcmV0dXJucyB7dm9pZH1cbiAgKi9cbiAgX3ByaXZhdGUucmVjZWl2ZV9zaWduYWwgPSBmdW5jdGlvbih0YXJnZXQsZnJvbV9pZCkge1xuXG4gICAgaWYodGFyZ2V0LmhhbHRfcmVzb2x1dGlvbiA9PT0gMSkgcmV0dXJuXG5cbiAgICAvL01BS0UgU1VSRSBUSEUgU0lHTkFMIFdBUyBGUk9NIEEgUFJPTUlTRSBCRUlORyBMSVNURU5FRCBUT1xuICAgIC8vQlVUIEFMTE9XIFNFTEYgU1RBVFVTIENIRUNLXG4gICAgdmFyIHN0YXR1c1xuICAgIGlmKGZyb21faWQgIT09IHRhcmdldC5pZCAmJiAhdGFyZ2V0LnVwc3RyZWFtW2Zyb21faWRdKVxuICAgICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhgJHtmcm9tX2lkfSBjYW4ndCBzaWduYWwgJHt0YXJnZXQuaWR9IGJlY2F1c2Ugbm90IGluIHVwc3RyZWFtLmApXG5cbiAgICAvL1JVTiBUSFJPVUdIIFFVRVVFIE9GIE9CU0VSVklORyBQUk9NSVNFUyBUTyBTRUUgSUYgQUxMIERPTkVcbiAgICBlbHNle1xuICAgICAgc3RhdHVzID0gMVxuICAgICAgZm9yKGxldCBpIGluIHRhcmdldC51cHN0cmVhbSkge1xuICAgICAgICAvL1NFVFMgU1RBVFVTIFRPIDAgSUYgQU5ZIE9CU0VSVklORyBIQVZFIEZBSUxFRCwgQlVUIE5PVCBJRiBQRU5ESU5HIE9SIFJFU09MVkVEXG4gICAgICAgIGlmKHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZSAhPT0gMSkge1xuICAgICAgICAgIHN0YXR1cyA9IHRhcmdldC51cHN0cmVhbVtpXS5zdGF0ZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1JFU09MVkUgUVVFVUUgSUYgVVBTVFJFQU0gRklOSVNIRURcbiAgICBpZihzdGF0dXMgPT09IDEpIHtcblxuICAgICAgLy9HRVQgUkVUVVJOIFZBTFVFUyBQRVIgREVQRU5ERU5DSUVTLCBXSElDSCBTQVZFUyBPUkRFUiBBTkRcbiAgICAgIC8vUkVQT1JUUyBEVVBMSUNBVEVTXG4gICAgICB2YXIgdmFsdWVzID0gW11cbiAgICAgIGZvcihsZXQgaSBpbiB0YXJnZXQuZGVwZW5kZW5jaWVzKVxuICAgICAgICB2YWx1ZXMucHVzaCh0YXJnZXQuZGVwZW5kZW5jaWVzW2ldLnZhbHVlKVxuXG4gICAgICB0YXJnZXQucmVzb2x2ZS5jYWxsKHRhcmdldCx2YWx1ZXMpXG4gICAgfVxuXG4gICAgaWYoc3RhdHVzID09PSAyKSB7XG4gICAgICB2YXIgZXJyID0gW2Ake3RhcmdldH0gZGVwZW5kZW5jeSAnJHtmcm9tX2lkfScgd2FzIHJlamVjdGVkLmBdXG4gICAgICB0YXJnZXQucmVqZWN0LmFwcGx5KHRhcmdldCxlcnIpXG4gICAgfVxuICB9XG5cblxuXG5cbiAgdmFyIF9wdWJsaWMgPSB7fVxuXG4gIF9wdWJsaWMuaXNfb3JneSA9IHRydWVcblxuICBfcHVibGljLmlkID0gbnVsbFxuXG4gIC8vQSBDT1VOVEVSIEZPUiBBVVQwLUdFTkVSQVRFRCBQUk9NSVNFIElEJ1NcbiAgX3B1YmxpYy5zZXR0bGVkID0gMFxuXG4gIC8qKlxuICAqIFNUQVRFIENPREVTOlxuICAqIC0tLS0tLS0tLS0tLS0tLS0tLVxuICAqIC0xICAgPT4gU0VUVExJTkcgW0VYRUNVVElORyBDQUxMQkFDS1NdXG4gICogIDAgICA9PiBQRU5ESU5HXG4gICogIDEgICA9PiBSRVNPTFZFRCAvIEZVTEZJTExFRFxuICAqICAyICAgPT4gUkVKRUNURURcbiAgKi9cbiAgX3B1YmxpYy5zdGF0ZSA9IDBcblxuICBfcHVibGljLnZhbHVlID0gW11cblxuICAvL1RoZSBtb3N0IHJlY2VudCB2YWx1ZSBnZW5lcmF0ZWQgYnkgdGhlIHRoZW4tPmRvbmUgY2hhaW4uXG4gIF9wdWJsaWMuY2Fib29zZSA9IG51bGxcblxuICBfcHVibGljLm1vZGVsID0gXCJkZWZlcnJlZFwiXG5cbiAgX3B1YmxpYy5kb25lX2ZpcmVkID0gMFxuXG4gIF9wdWJsaWMudGltZW91dF9pZCA9IG51bGxcblxuICBfcHVibGljLmNhbGxiYWNrX3N0YXRlcyA9IHtcbiAgICByZXNvbHZlOiAwXG4gICAgLHRoZW46IDBcbiAgICAsZG9uZTogMFxuICAgICxyZWplY3Q6IDBcbiAgfVxuXG4gIC8qKlxuICAqIFNlbGYgZXhlY3V0aW5nIGZ1bmN0aW9uIHRvIGluaXRpYWxpemUgY2FsbGJhY2sgZXZlbnRcbiAgKiBsaXN0LlxuICAqXG4gICogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2FtZSBwcm9wZXJ0eU5hbWVzIGFzXG4gICogX3B1YmxpYy5jYWxsYmFja19zdGF0ZXM6IGFkZGluZyBib2lsZXJwbGF0ZVxuICAqIHByb3BlcnRpZXMgZm9yIGVhY2hcbiAgKlxuICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICovXG4gIF9wdWJsaWMuY2FsbGJhY2tzID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIG8gPSB7fVxuXG4gICAgZm9yKHZhciBpIGluIF9wdWJsaWMuY2FsbGJhY2tfc3RhdGVzKSB7XG4gICAgICBvW2ldID0ge1xuICAgICAgICB0cmFpbjogW11cbiAgICAgICAgLGhvb2tzOiB7XG4gICAgICAgICAgb25CZWZvcmU6IHtcbiAgICAgICAgICAgIHRyYWluOiBbXVxuICAgICAgICAgIH1cbiAgICAgICAgICAsb25Db21wbGV0ZToge1xuICAgICAgICAgICAgdHJhaW46IFtdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9cbiAgfSkoKVxuXG4gIC8vUFJPTUlTRSBIQVMgT0JTRVJWRVJTIEJVVCBET0VTIE5PVCBPQlNFUlZFIE9USEVSU1xuICBfcHVibGljLmRvd25zdHJlYW0gPSB7fVxuXG4gIF9wdWJsaWMuZXhlY3V0aW9uX2hpc3RvcnkgPSBbXVxuXG4gIC8vV0hFTiBUUlVFLCBBTExPV1MgUkUtSU5JVCBbRk9SIFVQR1JBREVTIFRPIEEgUVVFVUVdXG4gIF9wdWJsaWMub3ZlcndyaXRhYmxlID0gMFxuXG4gIC8qKlxuICAqIFJFTU9URVxuICAqXG4gICogUkVNT1RFID09IDEgID0+ICBbREVGQVVMVF0gTWFrZSBodHRwIHJlcXVlc3QgZm9yIGZpbGVcbiAgKlxuICAqIFJFTU9URSA9PSAwICA9PiAgUmVhZCBmaWxlIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW1cbiAgKlxuICAqIE9OTFkgQVBQTElFUyBUTyBTQ1JJUFRTIFJVTiBVTkRFUiBOT0RFIEFTIEJST1dTRVIgSEFTIE5PXG4gICogRklMRVNZU1RFTSBBQ0NFU1NcbiAgKi9cbiAgX3B1YmxpYy5yZW1vdGUgPSAxXG5cbiAgLy9BRERTIFRPIE1BU1RFUiBMSVNULiBBTFdBWVMgVFJVRSBVTkxFU1MgVVBHUkFESU5HIEEgUFJPTUlTRSBUTyBBIFFVRVVFXG4gIF9wdWJsaWMubGlzdCA9IDFcblxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyAgX3B1YmxpYyBNRVRIT0RTXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5cbiAgLyoqXG4gICogUmVzb2x2ZXMgYSBkZWZlcnJlZC9xdWV1ZS5cbiAgKlxuICAqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG4gICogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjcmVzb2x2ZVxuICAqXG4gICogQHBhcmFtIHttaXhlZH0gdmFsdWUgUmVzb2x2ZXIgdmFsdWUuXG4gICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQvcXVldWVcbiAgKi9cbiAgX3B1YmxpYy5yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpIHtcblxuICAgIGlmKHRoaXMuc2V0dGxlZCA9PT0gMSkge1xuICAgICAgQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcbiAgICAgICAgYCR7dGhpcy5pZCAgfSBjYW4ndCByZXNvbHZlLmBcbiAgICAgICAgLFwiT25seSB1bnNldHRsZWQgZGVmZXJyZWRzIGFyZSByZXNvbHZhYmxlLlwiXG4gICAgICBdKVxuICAgIH1cblxuICAgIC8vU0VUIFNUQVRFIFRPIFNFVFRMRU1FTlQgSU4gUFJPR1JFU1NcbiAgICBfcHJpdmF0ZS5zZXRfc3RhdGUodGhpcywtMSlcblxuICAgIC8vU0VUIFZBTFVFXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlXG5cbiAgICAvL1JVTiBSRVNPTFZFUiBCRUZPUkUgUFJPQ0VFRElOR1xuICAgIC8vRVZFTiBJRiBUSEVSRSBJUyBOTyBSRVNPTFZFUiwgU0VUIElUIFRPIEZJUkVEIFdIRU4gQ0FMTEVEXG4gICAgaWYoIXRoaXMucmVzb2x2ZXJfZmlyZWQgJiYgdHlwZW9mIHRoaXMucmVzb2x2ZXIgPT09IFwiZnVuY3Rpb25cIikge1xuXG4gICAgICB0aGlzLnJlc29sdmVyX2ZpcmVkID0gMVxuXG4gICAgICAvL0FkZCByZXNvbHZlciB0byByZXNvbHZlIHRyYWluXG4gICAgICB0cnl7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLnJlc29sdmUudHJhaW4ucHVzaChmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLnJlc29sdmVyKHZhbHVlLHRoaXMpXG4gICAgICAgIH0pXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGUpXG4gICAgICB9XG4gICAgfSBlbHNle1xuXG4gICAgICB0aGlzLnJlc29sdmVyX2ZpcmVkID0gMVxuXG4gICAgICAvL0FkZCBzZXR0bGUgdG8gcmVzb2x2ZSB0cmFpblxuICAgICAgLy9BbHdheXMgc2V0dGxlIGJlZm9yZSBhbGwgb3RoZXIgY29tcGxldGUgY2FsbGJhY2tzXG4gICAgICB0aGlzLmNhbGxiYWNrcy5yZXNvbHZlLmhvb2tzLm9uQ29tcGxldGUudHJhaW4udW5zaGlmdChmdW5jdGlvbigpIHtcbiAgICAgICAgX3ByaXZhdGUuc2V0dGxlKHRoaXMpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vUnVuIHJlc29sdmVcbiAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICB0aGlzXG4gICAgICAsdGhpcy5jYWxsYmFja3MucmVzb2x2ZVxuICAgICAgLHRoaXMudmFsdWVcbiAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQ6IGZhbHNlfVxuICAgIClcblxuICAgIC8vcmVzb2x2ZXIgaXMgZXhwZWN0ZWQgdG8gY2FsbCByZXNvbHZlIGFnYWluXG4gICAgLy9hbmQgdGhhdCB3aWxsIGdldCB1cyBwYXN0IHRoaXMgcG9pbnRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvKipcbiAgKiBSZWplY3RzIGEgZGVmZXJyZWQvcXVldWVcbiAgKlxuICAqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG4gICogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjcmVqZWN0XG4gICpcbiAgKiBAcGFyYW0ge3N0cmluZ3xhcnJheX0gZXJyIEVycm9yIGluZm9ybWF0aW9uLlxuICAqIEByZXR1cm4ge29iamVjdH0gZGVmZXJyZWQvcXVldWVcbiAgKi9cbiAgX3B1YmxpYy5yZWplY3QgPSBmdW5jdGlvbihlcnIpIHtcblxuICAgIGlmKCEoZXJyIGluc3RhbmNlb2YgQXJyYXkpKVxuICAgICAgZXJyID0gW2Vycl1cblxuXG4gICAgdmFyIG1zZyA9IGBSZWplY3RlZCAke3RoaXMubW9kZWx9OiAnJHt0aGlzLmlkfScuYFxuXG4gICAgaWYoQ2xzLnByaXZhdGUuY29uZmlnLnNldHRpbmdzLmRlYnVnX21vZGUpIHtcbiAgICAgIGVyci51bnNoaWZ0KG1zZylcbiAgICAgIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhlcnIsdGhpcylcbiAgICB9XG5cbiAgICAvL1JlbW92ZSBhdXRvIHRpbWVvdXQgdGltZXJcbiAgICBpZih0aGlzLnRpbWVvdXRfaWQpXG4gICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0X2lkKVxuXG5cbiAgICAvL1NldCBzdGF0ZSB0byByZWplY3RlZFxuICAgIF9wcml2YXRlLnNldF9zdGF0ZSh0aGlzLDIpXG5cbiAgICAvL0V4ZWN1dGUgcmVqZWN0aW9uIHF1ZXVlXG4gICAgX3ByaXZhdGUucnVuX3RyYWluKFxuICAgICAgdGhpc1xuICAgICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICAgLGVyclxuICAgICAgLHtwYXVzZV9vbl9kZWZlcnJlZDogZmFsc2V9XG4gICAgKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgLyoqXG4gICogQ2hhaW4gbWV0aG9kXG5cbiAgPGI+VXNhZ2U6PC9iPlxuICBgYGBcbiAgdmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcbiAgICAgICAgICBxID0gT3JneS5kZWZlcnJlZCh7XG4gICAgICAgICAgICBpZCA6IFwicTFcIlxuICAgICAgICAgIH0pO1xuXG4gIC8vUmVzb2x2ZSB0aGUgZGVmZXJyZWRcbiAgcS5yZXNvbHZlKFwiU29tZSB2YWx1ZS5cIik7XG5cbiAgcS50aGVuKGZ1bmN0aW9uKHIpe1xuICAgIGNvbnNvbGUubG9nKHIpOyAvL1NvbWUgdmFsdWUuXG4gIH0pXG5cbiAgYGBgXG5cbiAgKiBAbWVtYmVyb2Ygb3JneS9kZWZlcnJlZFxuICAqIEBmdW5jdGlvbiBvcmd5L2RlZmVycmVkI3RoZW5cbiAgKlxuICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uXG4gICogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0b3IgUmVqZWN0aW9uIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICogQHJldHVybiB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuICAqL1xuICBfcHVibGljLnRoZW4gPSBmdW5jdGlvbihmbixyZWplY3Rvcikge1xuXG4gICAgc3dpdGNoKHRydWUpIHtcblxuICAgICAgLy9BbiBlcnJvciB3YXMgcHJldmlvdXNseSB0aHJvd24sIGFkZCByZWplY3RvciAmIGJhaWwgb3V0XG4gICAgICBjYXNlKHRoaXMuc3RhdGUgPT09IDIpOlxuICAgICAgICBpZih0eXBlb2YgcmVqZWN0b3IgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5yZWplY3QudHJhaW4ucHVzaChyZWplY3RvcilcblxuICAgICAgICBicmVha1xuXG4gICAgICAgIC8vRXhlY3V0aW9uIGNoYWluIGFscmVhZHkgZmluaXNoZWQuIEJhaWwgb3V0LlxuICAgICAgY2FzZSh0aGlzLmRvbmVfZmlyZWQgPT09IDEpOlxuICAgICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGAke3RoaXMuaWR9IGNhbid0IGF0dGFjaCAudGhlbigpIGJlY2F1c2UgLmRvbmUoKSBoYXMgYWxyZWFkeSBmaXJlZCwgYW5kIHRoYXQgbWVhbnMgdGhlIGV4ZWN1dGlvbiBjaGFpbiBpcyBjb21wbGV0ZS5gKVxuXG4gICAgICBkZWZhdWx0OlxuXG4gICAgICAgIC8vUHVzaCBjYWxsYmFjayB0byB0aGVuIHF1ZXVlXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLnRoZW4udHJhaW4ucHVzaChmbilcblxuICAgICAgICAvL1B1c2ggcmVqZWN0IGNhbGxiYWNrIHRvIHRoZSByZWplY3Rpb24gcXVldWVcbiAgICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0LnRyYWluLnB1c2gocmVqZWN0b3IpXG5cblxuICAgICAgICAvL1NldHRsZWQsIHJ1biB0cmFpbiBub3dcbiAgICAgICAgaWYodGhpcy5zZXR0bGVkID09PSAxICYmIHRoaXMuc3RhdGUgPT09IDEgJiYgIXRoaXMuZG9uZV9maXJlZCkge1xuICAgICAgICAgIF9wcml2YXRlLnJ1bl90cmFpbihcbiAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICx0aGlzLmNhbGxiYWNrcy50aGVuXG4gICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkOiB0cnVlfVxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICAgIC8vZWxzZXt9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgLyoqXG4gICogRG9uZSBjYWxsYmFjay5cbiAgKlxuICAqIEBtZW1iZXJvZiBvcmd5L2RlZmVycmVkXG4gICogQGZ1bmN0aW9uIG9yZ3kvZGVmZXJyZWQjZG9uZVxuICAqXG4gICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgKiBAcGFyYW0ge2Z1bmN0aW9ufSByZWplY3RvciBSZWplY3Rpb24gY2FsbGJhY2sgZnVuY3Rpb25cbiAgKiBAcmV0dXJucyB7b2JqZWN0fSBkZWZlcnJlZC9xdWV1ZVxuICAqL1xuICBfcHVibGljLmRvbmUgPSBmdW5jdGlvbihmbixyZWplY3Rvcikge1xuXG4gICAgaWYodGhpcy5jYWxsYmFja3MuZG9uZS50cmFpbi5sZW5ndGggPT09IDBcbiAgICAgICYmIHRoaXMuZG9uZV9maXJlZCA9PT0gMCkge1xuICAgICAgaWYodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHtcblxuICAgICAgICAvL3dyYXAgY2FsbGJhY2sgd2l0aCBzb21lIG90aGVyIGNvbW1hbmRzXG4gICAgICAgIHZhciBmbjIgPSBmdW5jdGlvbihyLGRlZmVycmVkLGxhc3QpIHtcblxuICAgICAgICAgIC8vRG9uZSBjYW4gb25seSBiZSBjYWxsZWQgb25jZSwgc28gbm90ZSB0aGF0IGl0IGhhcyBiZWVuXG4gICAgICAgICAgZGVmZXJyZWQuZG9uZV9maXJlZCA9IDFcblxuICAgICAgICAgIGZuKHIsZGVmZXJyZWQsbGFzdClcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLmRvbmUudHJhaW4ucHVzaChmbjIpXG5cbiAgICAgICAgLy9QdXNoIHJlamVjdCBjYWxsYmFjayB0byB0aGUgcmVqZWN0aW9uIHF1ZXVlIG9uQ29tcGxldGVcbiAgICAgICAgaWYodHlwZW9mIHJlamVjdG9yID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgdGhpcy5jYWxsYmFja3MucmVqZWN0Lmhvb2tzLm9uQ29tcGxldGUudHJhaW4ucHVzaChyZWplY3RvcilcblxuXG4gICAgICAgIC8vU2V0dGxlZCwgcnVuIHRyYWluIG5vd1xuICAgICAgICBpZih0aGlzLnNldHRsZWQgPT09IDEpIHtcbiAgICAgICAgICBpZih0aGlzLnN0YXRlID09PSAxKSB7XG4gICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLmRvbmVcbiAgICAgICAgICAgICAgLHRoaXMuY2Fib29zZVxuICAgICAgICAgICAgICAse3BhdXNlX29uX2RlZmVycmVkOiBmYWxzZX1cbiAgICAgICAgICAgIClcbiAgICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgICBfcHJpdmF0ZS5ydW5fdHJhaW4oXG4gICAgICAgICAgICAgIHRoaXNcbiAgICAgICAgICAgICAgLHRoaXMuY2FsbGJhY2tzLnJlamVjdFxuICAgICAgICAgICAgICAsdGhpcy5jYWJvb3NlXG4gICAgICAgICAgICAgICx7cGF1c2Vfb25fZGVmZXJyZWQ6IGZhbHNlfVxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL1Vuc2V0dGxlZCwgdHJhaW4gd2lsbCBiZSBydW4gd2hlbiBzZXR0bGVkXG4gICAgICAgIC8vZWxzZXt9XG4gICAgICB9IGVsc2VcbiAgICAgICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcImRvbmUoKSBtdXN0IGJlIHBhc3NlZCBhIGZ1bmN0aW9uLlwiKVxuXG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiZG9uZSgpIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLlwiKVxuXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvKipcbiAgICogQWxsb3dzIGEgcHJlcHJvY2Vzc29yIHRvIHNldCBiYWNrcmFjZSBkYXRhIG9uIGFuIE9yZ3kgb2JqZWN0LlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHN0ciBmaWxlbmFtZTpsaW5lIG51bWJlclxuICAgKiBAcmV0dXJuIHtvYmplY3R9IGRlZmVycmVkL3F1ZXVlXG4gICAqL1xuICBfcHVibGljLl9idHJjID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgdGhpcy5iYWNrdHJhY2UgPSBzdHJcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvKipcbiAgKiBDcmVhdGVzIGEgbmV3IGRlZmVycmVkIG9iamVjdCBvciBpZiBvbmUgZXhpc3RzIGJ5IHRoZSBzYW1lIGlkLFxuICAqIHJldHVybnMgaXQuXG5cbiAgPGI+VXNhZ2U6PC9iPlxuICBgYGBcbiAgdmFyIE9yZ3kgPSByZXF1aXJlKFwib3JneVwiKSxcbiAgcSA9IE9yZ3kuZGVmZXJyZWQoe1xuICBpZCA6IFwicTFcIlxuICB9KTtcbiAgYGBgXG5cbiAgKiBAbWVtYmVyb2Ygb3JneVxuICAqIEBmdW5jdGlvbiBkZWZlcnJlZFxuICAqXG4gICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgTGlzdCBvZiBvcHRpb25zOlxuICAqXG4gICogIC0gPGI+aWQ8L2I+IHtzdHJpbmd9IFVuaXF1ZSBpZCBvZiB0aGUgb2JqZWN0LlxuICAqICAgIC0gQ2FuIGJlIHVzZWQgd2l0aCBPcmd5LmdldChpZCkuXG4gICogICAgLSBPcHRpb25hbC5cbiAgKlxuICAqXG4gICogIC0gPGI+dGltZW91dDwvYj4ge251bWJlcn0gVGltZSBpbiBtcyBhZnRlciB3aGljaCByZWplY3QgaXMgY2FsbGVkIGlmIG5vdCB5ZXQgcmVzb2x2ZWQuXG4gIC0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0LlxuICAtIERlbGF5cyBpbiBvYmplY3QudGhlbigpIGFuZCBvYmplY3QuZG9uZSgpIHdvbid0IG5vdCB0cmlnZ2VyIHRoaXMsIGJlY2F1c2UgdGhvc2UgbWV0aG9kcyBydW4gYWZ0ZXIgcmVzb2x2ZS5cbiAgKlxuICAqIEByZXR1cm5zIHtvYmplY3R9IHtAbGluayBvcmd5L2RlZmVycmVkfVxuICAqL1xuICBDbHMucHVibGljLmRlZmVycmVkID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgdmFyIF9vXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuICAgIGlmKG9wdGlvbnMuaWQgJiYgQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pXG4gICAgICBfbyA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W29wdGlvbnMuaWRdXG4gICAgZWxzZXtcblxuICAgICAgLy9DcmVhdGUgYSBuZXcgZGVmZXJyZWQgb2JqZWN0XG4gICAgICBfbyA9IENscy5wcml2YXRlLmNvbmZpZy5uYWl2ZV9jbG9uZXIoW19wdWJsaWNdLFtvcHRpb25zXSlcblxuICAgICAgLy9BQ1RJVkFURSBERUZFUlJFRFxuICAgICAgX28gPSBfcHJpdmF0ZS5hY3RpdmF0ZShfbylcbiAgICB9XG5cbiAgICByZXR1cm4gX29cbiAgfVxuXG4gIF9wcml2YXRlLnB1YmxpYyA9IF9wdWJsaWNcblxuICAvL1NhdmUgZm9yIHJlLXVzZVxuICBDbHMucHJpdmF0ZS5kZWZlcnJlZCA9IF9wcml2YXRlXG5cbiAgcmV0dXJuIENsc1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDbHMpIHtcblxuICB2YXIgX3B1YmxpYyA9IHt9LFxuICAgIF9wcml2YXRlID0ge31cblxuICBfcHVibGljLmJyb3dzZXIgPSB7fVxuICBfcHVibGljLm5hdGl2ZSA9IHt9XG4gIF9wcml2YXRlLm5hdGl2ZSA9IHt9XG5cbiAgLy9Ccm93c2VyIGxvYWRcblxuICBfcHVibGljLmJyb3dzZXIuY3NzID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCkge1xuXG4gICAgdmFyIGhlYWQgPSAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJoZWFkXCIpWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICAgIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKVxuXG4gICAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJocmVmXCIscGF0aClcbiAgICBlbGVtLnNldEF0dHJpYnV0ZShcInR5cGVcIixcInRleHQvY3NzXCIpXG4gICAgZWxlbS5zZXRBdHRyaWJ1dGUoXCJyZWxcIixcInN0eWxlc2hlZXRcIilcblxuICAgIGlmKGVsZW0ub25sb2FkKSB7XG4gICAgICAoZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICBlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCkge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSlcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoYEZhaWxlZCB0byBsb2FkIHBhdGg6ICR7ICBwYXRofWApXG4gICAgICAgIH1cblxuICAgICAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKVxuXG4gICAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pXG4gICAgfSBlbHNle1xuICAgICAgLy9BREQgZWxlbSBCVVQgTUFLRSBYSFIgUkVRVUVTVCBUTyBDSEVDSyBGSUxFIFJFQ0VJVkVEXG4gICAgICBoZWFkLmFwcGVuZENoaWxkKGVsZW0pXG4gICAgICBjb25zb2xlLndhcm4oXCJObyBvbmxvYWQgYXZhaWxhYmxlIGZvciBsaW5rIHRhZywgYXV0b3Jlc29sdmluZy5cIilcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoZWxlbSlcbiAgICB9XG4gIH1cblxuICBfcHVibGljLmJyb3dzZXIuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCkge1xuXG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpXG4gICAgZWxlbS50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIlxuICAgIGVsZW0uc2V0QXR0cmlidXRlKFwic3JjXCIscGF0aCk7XG5cbiAgICAoZnVuY3Rpb24oZWxlbSxwYXRoLGRlZmVycmVkKSB7XG4gICAgICBlbGVtLm9ubG9hZCA9IGVsZW0ub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vQXV0b3Jlc29sdmUgYnkgZGVmYXVsdFxuICAgICAgICBpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09IFwiYm9vbGVhblwiXG4gICAgICAgICAgfHwgZGVmZXJyZWQuYXV0b3Jlc29sdmUgPT09IHRydWUpXG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgodHlwZW9mIGVsZW0udmFsdWUgIT09IFwidW5kZWZpbmVkXCIpID8gZWxlbS52YWx1ZSA6IGVsZW0pXG5cbiAgICAgIH1cbiAgICAgIGVsZW0ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoYEVycm9yIGxvYWRpbmc6ICR7ICBwYXRofWApXG4gICAgICB9XG4gICAgfShlbGVtLHBhdGgsZGVmZXJyZWQpKVxuXG4gICAgdGhpcy5oZWFkLmFwcGVuZENoaWxkKGVsZW0pXG4gIH1cblxuICBfcHVibGljLmJyb3dzZXIuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQsZGVwKSB7XG4gICAgdGhpcy5kZWZhdWx0KHBhdGgsZGVmZXJyZWQsZGVwKVxuICB9XG5cbiAgX3B1YmxpYy5icm93c2VyLmRlZmF1bHQgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkLG9wdGlvbnMpIHtcbiAgICB2YXIgcixcbiAgICAgIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgcmVxLm9wZW4oXCJHRVRcIiwgcGF0aCwgdHJ1ZSk7XG5cbiAgICAoZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCkge1xuICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZihyZXEuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHIgPSByZXEucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBpZihvcHRpb25zLnR5cGUgJiYgb3B0aW9ucy50eXBlID09PSBcImpzb25cIikge1xuICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgciA9IEpTT04ucGFyc2UocilcbiAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgX3B1YmxpYy5kZWJ1ZyhbXG4gICAgICAgICAgICAgICAgICBcIkNvdWxkIG5vdCBkZWNvZGUgSlNPTlwiXG4gICAgICAgICAgICAgICAgICAscGF0aFxuICAgICAgICAgICAgICAgICAgLHJcbiAgICAgICAgICAgICAgICBdLGRlZmVycmVkKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpXG4gICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoYEVycm9yIGxvYWRpbmc6ICR7ICBwYXRofWApXG5cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0ocGF0aCxkZWZlcnJlZCkpXG5cbiAgICByZXEuc2VuZChudWxsKVxuICB9XG5cblxuXG4gIC8vTmF0aXZlIGxvYWRcblxuICBfcHVibGljLm5hdGl2ZS5jc3MgPSBmdW5jdGlvbihwYXRoLGRlZmVycmVkKSB7XG4gICAgX3B1YmxpYy5icm93c2VyLmNzcyhwYXRoLGRlZmVycmVkKVxuICB9XG5cbiAgX3B1YmxpYy5uYXRpdmUuc2NyaXB0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCkge1xuICAgIC8vbG9jYWwgcGFja2FnZVxuICAgIGlmKHBhdGhbMF09PT1cIi5cIikge1xuICAgICAgcGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aCxkZWZlcnJlZClcbiAgICAgIHZhciByID0gcmVxdWlyZShwYXRoKVxuICAgICAgLy9BdXRvcmVzb2x2ZSBieSBkZWZhdWx0XG4gICAgICBpZih0eXBlb2YgZGVmZXJyZWQuYXV0b3Jlc29sdmUgIT09IFwiYm9vbGVhblwiXG4gICAgICB8fCBkZWZlcnJlZC5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSlcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyKVxuXG4gICAgfSBlbHNle1xuICAgICAgLy9yZW1vdGUgc2NyaXB0XG4gICAgICAvL0NoZWNrIHRoYXQgd2UgaGF2ZSBjb25maWd1cmVkIHRoZSBlbnZpcm9ubWVudCB0byBhbGxvdyB0aGlzLFxuICAgICAgLy9hcyBpdCByZXByZXNlbnRzIGEgc2VjdXJpdHkgdGhyZWF0IGFuZCBzaG91bGQgb25seSBiZSB1c2VkIGZvciBkZWJ1Z2dpbmdcbiAgICAgIGlmKCFDbHMucHJpdmF0ZS5jb25maWcuc2V0dGluZ3MuZGVidWdfbW9kZSlcbiAgICAgICAgQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiU2V0IGNvbmZpZy5kZWJ1Z19tb2RlPTEgdG8gcnVuIHJlbW90ZSBzY3JpcHRzIG91dHNpZGUgb2YgZGVidWcgbW9kZS5cIilcbiAgICAgIGVsc2V7XG4gICAgICAgIF9wcml2YXRlLm5hdGl2ZS5nZXQocGF0aCxkZWZlcnJlZCxmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgdmFyIFZtID0gcmVxdWlyZShcInZtXCIpXG4gICAgICAgICAgciA9IFZtLnJ1bkluVGhpc0NvbnRleHQoZGF0YSlcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX3B1YmxpYy5uYXRpdmUuaHRtbCA9IGZ1bmN0aW9uKHBhdGgsZGVmZXJyZWQpIHtcbiAgICBfcHVibGljLm5hdGl2ZS5kZWZhdWx0KHBhdGgsZGVmZXJyZWQpXG4gIH1cblxuICBfcHVibGljLm5hdGl2ZS5kZWZhdWx0ID0gZnVuY3Rpb24ocGF0aCxkZWZlcnJlZCkge1xuICAgIChmdW5jdGlvbihkZWZlcnJlZCkge1xuICAgICAgX3ByaXZhdGUubmF0aXZlLmdldChwYXRoLGRlZmVycmVkLGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgaWYoZGVmZXJyZWQudHlwZSA9PT0gXCJqc29uXCIpXG4gICAgICAgICAgciA9IEpTT04ucGFyc2UocilcblxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHIpXG4gICAgICB9KVxuICAgIH0pKGRlZmVycmVkKVxuICB9XG5cbiAgX3ByaXZhdGUubmF0aXZlLmdldCA9IGZ1bmN0aW9uIChwYXRoLGRlZmVycmVkLGNhbGxiYWNrKSB7XG4gICAgcGF0aCA9IF9wcml2YXRlLm5hdGl2ZS5wcmVwYXJlX3BhdGgocGF0aClcbiAgICBpZihwYXRoWzBdID09PSBcIi5cIikge1xuICAgICAgLy9maWxlIHN5c3RlbVxuICAgICAgdmFyIEZzID0gcmVxdWlyZShcImZzXCIpXG4gICAgICBGcy5yZWFkRmlsZShwYXRoLCBcInV0Zi04XCIsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrKGRhdGEpXG5cbiAgICAgIH0pXG4gICAgfSBlbHNle1xuICAgICAgLy9odHRwXG4gICAgICB2YXIgcmVxdWVzdCA9IHJlcXVpcmUoXCJyZXF1ZXN0XCIpXG4gICAgICByZXF1ZXN0KHBhdGgsZnVuY3Rpb24oZXJyb3IscmVzcG9uc2UsYm9keSkge1xuICAgICAgICBpZiAoIWVycm9yICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDIwMClcbiAgICAgICAgICBjYWxsYmFjayhib2R5KVxuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgZXJyb3JcblxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBfcHJpdmF0ZS5uYXRpdmUucHJlcGFyZV9wYXRoID0gZnVuY3Rpb24ocCkge1xuICAgIHAgPSAocFswXSAhPT0gXCIvXCIgJiYgcFswXSAhPT0gXCIuXCIpXG4gICAgICA/ICgocFswXS5pbmRleE9mKFwiaHR0cFwiKSE9PTApID8gYC4vJHsgIHB9YCA6IHApIDogcFxuICAgIHJldHVybiBwXG4gIH1cblxuICBDbHMucHVibGljLmZpbGVfbG9hZGVyID0gX3B1YmxpY1xuXG4gIENscy5wcml2YXRlLmZpbGVfbG9hZGVyID0gX3ByaXZhdGVcblxuICByZXR1cm4gQ2xzXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENscykge1xuXG5cbiAgLyoqXG4gICAqIEBuYW1lc3BhY2Ugb3JneS9xdWV1ZVxuICAgKiBAYm9ycm93cyBvcmd5L2RlZmVycmVkI3RoZW4gYXMgI3RoZW5cbiAgICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNkb25lIGFzICNkb25lXG4gICAqIEBib3Jyb3dzIG9yZ3kvZGVmZXJyZWQjcmVqZWN0IGFzICNyZWplY3RcbiAgICogQGJvcnJvd3Mgb3JneS9kZWZlcnJlZCNyZXNvbHZlIGFzICNyZXNvbHZlXG4gICAqXG4gICovXG5cbiAgdmFyIF9wcml2YXRlID0ge31cblxuICAvKipcbiAgICogQWN0aXZhdGVzIGEgcXVldWUgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb1xuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAgKiBAcGFyYW0ge2FycmF5fSBkZXBzXG4gICAqIEByZXR1cm5zIHtvYmplY3R9IHF1ZXVlXG4gICAqL1xuICBfcHJpdmF0ZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKG8sb3B0aW9ucyxkZXBzKSB7XG5cbiAgICAvL0FDVElWQVRFIEFTIEEgREVGRVJSRURcbiAgICAvL3ZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKTtcbiAgICBvID0gQ2xzLnByaXZhdGUuZGVmZXJyZWQuYWN0aXZhdGUobylcblxuICAgIC8vQHRvZG8gcmV0aGluayB0aGlzXG4gICAgLy9UaGlzIHRpbWVvdXQgZ2l2ZXMgZGVmaW5lZCBwcm9taXNlcyB0aGF0IGFyZSBkZWZpbmVkXG4gICAgLy9mdXJ0aGVyIGRvd24gdGhlIHNhbWUgc2NyaXB0IGEgY2hhbmNlIHRvIGRlZmluZSB0aGVtc2VsdmVzXG4gICAgLy9hbmQgaW4gY2FzZSB0aGlzIHF1ZXVlIGlzIGFib3V0IHRvIHJlcXVlc3QgdGhlbSBmcm9tIGFcbiAgICAvL3JlbW90ZSBzb3VyY2UgaGVyZS5cbiAgICAvL1RoaXMgaXMgaW1wb3J0YW50IGluIHRoZSBjYXNlIG9mIGNvbXBpbGVkIGpzIGZpbGVzIHRoYXQgY29udGFpblxuICAgIC8vbXVsdGlwbGUgbW9kdWxlcyB3aGVuIGRlcGVuZCBvbiBlYWNoIG90aGVyLlxuXG4gICAgLy90ZW1wb3JhcmlseSBjaGFuZ2Ugc3RhdGUgdG8gcHJldmVudCBvdXRzaWRlIHJlc29sdXRpb25cbiAgICBvLnN0YXRlID0gLTFcblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcblxuICAgICAgLy9SZXN0b3JlIHN0YXRlXG4gICAgICBvLnN0YXRlID0gMFxuXG4gICAgICAvL0FERCBERVBFTkRFTkNJRVMgVE8gUVVFVUVcbiAgICAgIF9wdWJsaWMuYWRkLmNhbGwobyxkZXBzKVxuXG4gICAgICAvL1NFRSBJRiBDQU4gQkUgSU1NRURJQVRFTFkgUkVTT0xWRUQgQlkgQ0hFQ0tJTkcgVVBTVFJFQU1cbiAgICAgIENscy5wcml2YXRlLmRlZmVycmVkLnJlY2VpdmVfc2lnbmFsKG8sby5pZClcblxuICAgICAgLy9BU1NJR04gVEhJUyBRVUVVRSBVUFNUUkVBTSBUTyBPVEhFUiBRVUVVRVNcbiAgICAgIGlmKG8uYXNzaWduKSB7XG4gICAgICAgIGZvcih2YXIgYSBpbiBvLmFzc2lnbilcbiAgICAgICAgICBzZWxmLmFzc2lnbihvLmFzc2lnblthXSxbb10sdHJ1ZSlcblxuICAgICAgfVxuICAgIH0sMSlcblxuICAgIHJldHVybiBvXG4gIH1cblxuXG4gIC8qKlxuICAqIFVwZ3JhZGVzIGEgcHJvbWlzZSBvYmplY3QgdG8gYSBxdWV1ZS5cbiAgKlxuICAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAqIEBwYXJhbSB7YXJyYXl9IGRlcHMgXFxkZXBlbmRlbmNpZXNcbiAgKiBAcmV0dXJucyB7b2JqZWN0fSBxdWV1ZSBvYmplY3RcbiAgKi9cbiAgX3ByaXZhdGUudXBncmFkZSA9IGZ1bmN0aW9uKG9iaixvcHRpb25zLGRlcHMpIHtcblxuICAgIGlmKG9iai5zZXR0bGVkICE9PSAwIHx8IChvYmoubW9kZWwgIT09IFwicHJvbWlzZVwiICYmIG9iai5tb2RlbCAhPT0gXCJkZWZlcnJlZFwiKSlcbiAgICAgIHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW4gb25seSB1cGdyYWRlIHVuc2V0dGxlZCBwcm9taXNlIG9yIGRlZmVycmVkIGludG8gYSBxdWV1ZS5cIilcblxuXG4gICAgLy9HRVQgQSBORVcgUVVFVUUgT0JKRUNUIEFORCBNRVJHRSBJTlxuICAgIHZhciBfbyA9IENscy5wcml2YXRlLmNvbmZpZy5uYWl2ZV9jbG9uZXIoW19wdWJsaWNdLFtvcHRpb25zXSlcblxuICAgIGZvcih2YXIgaSBpbiBfbylcbiAgICAgIG9ialtpXSA9IF9vW2ldXG5cblxuICAgIC8vZGVsZXRlIF9vO1xuXG4gICAgLy9DUkVBVEUgTkVXIElOU1RBTkNFIE9GIFFVRVVFXG4gICAgb2JqID0gdGhpcy5hY3RpdmF0ZShvYmosb3B0aW9ucyxkZXBzKVxuXG4gICAgLy9SRVRVUk4gUVVFVUUgT0JKRUNUXG4gICAgcmV0dXJuIG9ialxuICB9XG5cblxuXG5cbiAgdmFyIF9wdWJsaWMgPSB7fVxuXG4gIF9wdWJsaWMubW9kZWwgPSBcInF1ZXVlXCJcblxuICAvL1NFVCBUUlVFIEFGVEVSIFJFU09MVkVSIEZJUkVEXG4gIF9wdWJsaWMucmVzb2x2ZXJfZmlyZWQgPSAwXG5cbiAgLy9QUkVWRU5UUyBBIFFVRVVFIEZST00gUkVTT0xWSU5HIEVWRU4gSUYgQUxMIERFUEVOREVOQ0lFUyBNRVRcbiAgLy9QVVJQT1NFOiBQUkVWRU5UUyBRVUVVRVMgQ1JFQVRFRCBCWSBBU1NJR05NRU5UIEZST00gUkVTT0xWSU5HXG4gIC8vQkVGT1JFIFRIRVkgQVJFIEZPUk1BTExZIElOU1RBTlRJQVRFRFxuICBfcHVibGljLmhhbHRfcmVzb2x1dGlvbiA9IDBcblxuICAvL1VTRUQgVE8gQ0hFQ0sgU1RBVEUsIEVOU1VSRVMgT05FIENPUFlcbiAgX3B1YmxpYy51cHN0cmVhbSA9IHt9XG5cbiAgLy9VU0VEIFJFVFVSTiBWQUxVRVMsIEVOU1VSRVMgT1JERVJcbiAgX3B1YmxpYy5kZXBlbmRlbmNpZXMgPSBbXVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyAgUVVFVUUgSU5TVEFOQ0UgTUVUSE9EU1xuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgKiBBZGQgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gYSBxdWV1ZSdzIHVwc3RyZWFtIGFycmF5LlxuICAqXG4gICogVGhlIHF1ZXVlIHdpbGwgcmVzb2x2ZSBvbmNlIGFsbCB0aGUgcHJvbWlzZXMgaW4gaXRzXG4gICogdXBzdHJlYW0gYXJyYXkgYXJlIHJlc29sdmVkLlxuICAqXG4gICogV2hlbiBfcHVibGljLkNscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyA9PSAxLCBtZXRob2Qgd2lsbCB0ZXN0IGVhY2hcbiAgKiBkZXBlbmRlbmN5IGlzIG5vdCBwcmV2aW91c2x5IHNjaGVkdWxlZCB0byByZXNvbHZlXG4gICogZG93bnN0cmVhbSBmcm9tIHRoZSB0YXJnZXQsIGluIHdoaWNoXG4gICogY2FzZSBpdCB3b3VsZCBuZXZlciByZXNvbHZlIGJlY2F1c2UgaXRzIHVwc3RyZWFtIGRlcGVuZHMgb24gaXQuXG4gICpcbiAgKiBAcGFyYW0ge2FycmF5fSBhcnIgIC9hcnJheSBvZiBkZXBlbmRlbmNpZXMgdG8gYWRkXG4gICogQHJldHVybnMge2FycmF5fSB1cHN0cmVhbVxuICAqL1xuICBfcHVibGljLmFkZCA9IGZ1bmN0aW9uKGFycikge1xuXG4gICAgdHJ5e1xuICAgICAgaWYoYXJyLmxlbmd0aCA9PT0gMClcbiAgICAgICAgcmV0dXJuIHRoaXMudXBzdHJlYW1cblxuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoZXJyKVxuICAgIH1cblxuICAgIC8vSUYgTk9UIFBFTkRJTkcsIERPIE5PVCBBTExPVyBUTyBBRERcbiAgICBpZih0aGlzLnN0YXRlICE9PSAwKSB7XG4gICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFtcbiAgICAgICAgYENhbm5vdCBhZGQgZGVwZW5kZW5jeSBsaXN0IHRvIHF1ZXVlIGlkOicke3RoaXMuaWRcbiAgICAgICAgfScuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5gXG4gICAgICBdLGFycix0aGlzKVxuICAgIH1cblxuICAgIGZvcih2YXIgYSBpbiBhcnIpIHtcblxuICAgICAgc3dpdGNoKHRydWUpIHtcblxuICAgICAgICAvL0NIRUNLIElGIEVYSVNUU1xuICAgICAgICBjYXNlKHR5cGVvZiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFthcnJbYV0uaWRdID09PSBcIm9iamVjdFwiKTpcbiAgICAgICAgICBhcnJbYV0gPSBDbHMucHJpdmF0ZS5jb25maWcubGlzdFthcnJbYV0uaWRdXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIC8vSUYgTk9ULCBBVFRFTVBUIFRPIENPTlZFUlQgSVQgVE8gQU4gT1JHWSBQUk9NSVNFXG4gICAgICAgIGNhc2UodHlwZW9mIGFyclthXSA9PT0gXCJvYmplY3RcIiAmJiAoIWFyclthXS5pc19vcmd5KSk6XG4gICAgICAgICAgYXJyW2FdID0gQ2xzLnByaXZhdGUuZGVmZXJyZWQuY29udmVydF90b19wcm9taXNlKGFyclthXSx7XG4gICAgICAgICAgICBwYXJlbnQ6IHRoaXNcbiAgICAgICAgICB9KVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICAvL1JFRiBJUyBBIFBST01JU0UuXG4gICAgICAgIGNhc2UodHlwZW9mIGFyclthXS50aGVuID09PSBcImZ1bmN0aW9uXCIpOlxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuICAgICAgICAgICAgXCJPYmplY3QgY291bGQgbm90IGJlIGNvbnZlcnRlZCB0byBwcm9taXNlLlwiLFxuICAgICAgICAgICAgYXJyW2FdXG4gICAgICAgICAgXSlcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvL211c3QgY2hlY2sgdGhlIHRhcmdldCB0byBzZWUgaWYgdGhlIGRlcGVuZGVuY3kgZXhpc3RzIGluIGl0cyBkb3duc3RyZWFtXG4gICAgICBmb3IodmFyIGIgaW4gdGhpcy5kb3duc3RyZWFtKSB7XG4gICAgICAgIGlmKGIgPT09IGFyclthXS5pZCkge1xuICAgICAgICAgIHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoW1xuICAgICAgICAgICAgYEVycm9yIGFkZGluZyB1cHN0cmVhbSBkZXBlbmRlbmN5ICcke1xuICAgICAgICAgICAgICBhcnJbYV0uaWR9JyB0byBxdWV1ZWArYCAnJHtcbiAgICAgICAgICAgICAgdGhpcy5pZH0nLlxcbiBQcm9taXNlIG9iamVjdCBmb3IgJyR7XG4gICAgICAgICAgICAgIGFyclthXS5pZH0nIGlzIHNjaGVkdWxlZCB0byByZXNvbHZlIGRvd25zdHJlYW0gZnJvbSBxdWV1ZSAnJHtcbiAgICAgICAgICAgICAgdGhpcy5pZH0nIHNvIGl0IGNhbid0IGJlIGFkZGVkIHVwc3RyZWFtLmBcbiAgICAgICAgICBdXG4gICAgICAgICAgLHRoaXMpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy9BREQgVE8gVVBTVFJFQU0sIERPV05TVFJFQU0sIERFUEVOREVOQ0lFU1xuICAgICAgdGhpcy51cHN0cmVhbVthcnJbYV0uaWRdID0gYXJyW2FdXG4gICAgICBhcnJbYV0uZG93bnN0cmVhbVt0aGlzLmlkXSA9IHRoaXNcbiAgICAgIHRoaXMuZGVwZW5kZW5jaWVzLnB1c2goYXJyW2FdKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVwc3RyZWFtXG4gIH1cblxuICAvKipcbiAgKiBSZW1vdmUgbGlzdCBmcm9tIGEgcXVldWUuXG4gICpcbiAgKiBAcGFyYW0ge2FycmF5fSBhcnJcbiAgKiBAcmV0dXJucyB7YXJyYXl9IGFycmF5IG9mIGxpc3QgdGhlIHF1ZXVlIGlzIHVwc3RyZWFtXG4gICovXG4gIF9wdWJsaWMucmVtb3ZlID0gZnVuY3Rpb24oYXJyKSB7XG5cbiAgICAvL0lGIE5PVCBQRU5ESU5HLCBETyBOT1QgQUxMT1cgUkVNT1ZBTFxuICAgIGlmKHRoaXMuc3RhdGUgIT09IDApXG4gICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGBDYW5ub3QgcmVtb3ZlIGxpc3QgZnJvbSBxdWV1ZSBpZDonJHt0aGlzLmlkfScuIFF1ZXVlIHNldHRsZWQvaW4gdGhlIHByb2Nlc3Mgb2YgYmVpbmcgc2V0dGxlZC5gKVxuXG5cbiAgICBmb3IodmFyIGEgaW4gYXJyKSB7XG4gICAgICBpZih0aGlzLnVwc3RyZWFtW2FyclthXS5pZF0pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMudXBzdHJlYW1bYXJyW2FdLmlkXVxuICAgICAgICBkZWxldGUgYXJyW2FdLmRvd25zdHJlYW1bdGhpcy5pZF1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBSZXNldHMgYW4gZXhpc3Rpbmcsc2V0dGxlZCBxdWV1ZSBiYWNrIHRvIE9yZ3lpbmcgc3RhdGUuXG4gICogQ2xlYXJzIG91dCB0aGUgZG93bnN0cmVhbS5cbiAgKiBGYWlscyBpZiBub3Qgc2V0dGxlZC5cbiAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAqIEByZXR1cm5zIHtDbHMucHJpdmF0ZS5kZWZlcnJlZC50cGx8Qm9vbGVhbn1cbiAgKi9cbiAgX3B1YmxpYy5yZXNldCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgIGlmKHRoaXMuc2V0dGxlZCAhPT0gMSB8fCB0aGlzLnN0YXRlICE9PSAxKVxuICAgICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkNhbiBvbmx5IHJlc2V0IGEgcXVldWUgc2V0dGxlZCB3aXRob3V0IGVycm9ycy5cIilcblxuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuICAgIHRoaXMuc2V0dGxlZCA9IDBcbiAgICB0aGlzLnN0YXRlID0gMFxuICAgIHRoaXMucmVzb2x2ZXJfZmlyZWQgPSAwXG4gICAgdGhpcy5kb25lX2ZpcmVkID0gMFxuXG4gICAgLy9SRU1PVkUgQVVUTyBUSU1FT1VUIFRJTUVSXG4gICAgaWYodGhpcy50aW1lb3V0X2lkKVxuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dF9pZClcblxuXG4gICAgLy9DTEVBUiBPVVQgVEhFIERPV05TVFJFQU1cbiAgICB0aGlzLmRvd25zdHJlYW0gPSB7fVxuICAgIHRoaXMuZGVwZW5kZW5jaWVzID0gW11cblxuICAgIC8vU0VUIE5FVyBBVVRPIFRJTUVPVVRcbiAgICBDbHMucHJpdmF0ZS5kZWZlcnJlZC5hdXRvX3RpbWVvdXQuY2FsbCh0aGlzLG9wdGlvbnMudGltZW91dClcblxuICAgIC8vUE9JTlRMRVNTIC0gV0lMTCBKVVNUIElNTUVESUFURUxZIFJFU09MVkUgU0VMRlxuICAgIC8vdGhpcy5jaGVja19zZWxmKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuXG4gIC8qKlxuICAqIENhdWFlcyBhIHF1ZXVlIHRvIGxvb2sgb3ZlciBpdHMgZGVwZW5kZW5jaWVzIGFuZCBzZWUgaWYgaXRcbiAgKiBjYW4gYmUgcmVzb2x2ZWQuXG4gICpcbiAgKiBUaGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSBieSBlYWNoIGRlcGVuZGVuY3kgdGhhdCBsb2FkcyxcbiAgKiBzbyBpcyBub3QgbmVlZGVkIHVubGVzczpcbiAgKlxuICAqIC1kZWJ1Z2dpbmdcbiAgKlxuICAqIC10aGUgcXVldWUgaGFzIGJlZW4gcmVzZXQgYW5kIG5vIG5ld1xuICAqIGRlcGVuZGVuY2llcyB3ZXJlIHNpbmNlIGFkZGVkLlxuICAqXG4gICogQHJldHVybnMge2ludH0gU3RhdGUgb2YgdGhlIHF1ZXVlLlxuICAqL1xuICBfcHVibGljLmNoZWNrX3NlbGYgPSBmdW5jdGlvbigpIHtcbiAgICBDbHMucHJpdmF0ZS5kZWZlcnJlZC5yZWNlaXZlX3NpZ25hbCh0aGlzLHRoaXMuaWQpXG4gICAgcmV0dXJuIHRoaXMuc3RhdGVcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgcXVldWUgb2JqZWN0LlxuICAgKiBJZiBubyA8Yj5yZXNvbHZlcjwvYj4gb3B0aW9uIGlzIHNldCwgcmVzb2x2ZWQgd2hlbiBhbGwgZGVwZW5kZW5jaWVzIGFyZSByZXNvbHZlZC4gRWxzZSwgcmVzb2x2ZWQgd2hlbiB0aGUgZGVmZXJyZWQgcGFyYW0gcGFzc2VkIHRvIHRoZSByZXNvbHZlciBvcHRpb25cbiAgICogaXMgcmVzb2x2ZWQuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBvcmd5XG4gICAqIEBmdW5jdGlvbiBxdWV1ZVxuICAgKlxuICAgKiBAcGFyYW0ge2FycmF5fSBkZXBzIEFycmF5IG9mIGRlcGVuZGVuY2llcyB0aGF0IG11c3QgYmUgcmVzb2x2ZWQgYmVmb3JlIDxiPnJlc29sdmVyPC9iPiBvcHRpb24gaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAgTGlzdCBvZiBvcHRpb25zOlxuICAgICpcbiAgICAqICAtIDxiPmlkPC9iPiB7c3RyaW5nfSBVbmlxdWUgaWQgb2YgdGhlIG9iamVjdC5cbiAgICAqICAgLSBDYW4gYmUgdXNlZCB3aXRoIE9yZ3kuZ2V0KGlkKS5cbiAgICAqICAgLSBPcHRpb25hbC5cbiAgICAqXG4gICAqXG4gICAgKiAgLSA8Yj50aW1lb3V0PC9iPiB7bnVtYmVyfSBUaW1lIGluIG1zIGFmdGVyIHdoaWNoIHJlamVjdCBpcyBjYWxsZWQuXG4gICAgKiAgIC0gRGVmYXVsdHMgdG8gT3JneS5jb25maWcoKS50aW1lb3V0IFs1MDAwXS5cbiAgICAqICAgLSBOb3RlIHRoZSB0aW1lb3V0IGlzIG9ubHkgYWZmZWN0ZWQgYnkgZGVwZW5kZW5jaWVzIGFuZC9vciB0aGUgcmVzb2x2ZXIgY2FsbGJhY2suXG4gICAgKiAgIC0gVGhlbixkb25lIGRlbGF5cyB3aWxsIG5vdCBmbGFnIGEgdGltZW91dCBiZWNhdXNlIHRoZXkgYXJlIGNhbGxlZCBhZnRlciB0aGUgaW5zdGFuY2UgaXMgY29uc2lkZXJlZCByZXNvbHZlZC5cbiAgICAqXG4gICAqXG4gICAgKiAgLSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPnJlc3VsdDwvaT4sPGk+ZGVmZXJyZWQ8L2k+KX0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBhZnRlciBhbGwgZGVwZW5kZW5jaWVzIGhhdmUgcmVzb2x2ZWQuXG4gICAgKiAgIC0gPGk+cmVzdWx0PC9pPiBpcyBhbiBhcnJheSBvZiB0aGUgcXVldWUncyByZXNvbHZlZCBkZXBlbmRlbmN5IHZhbHVlcy5cbiAgICAqICAgLSA8aT5kZWZlcnJlZDwvaT4gaXMgdGhlIHF1ZXVlIG9iamVjdC5cbiAgICAqICAgLSBUaGUgcXVldWUgd2lsbCBvbmx5IHJlc29sdmUgd2hlbiA8aT5kZWZlcnJlZDwvaT4ucmVzb2x2ZSgpIGlzIGNhbGxlZC4gSWYgbm90LCBpdCB3aWxsIHRpbWVvdXQgdG8gb3B0aW9ucy50aW1lb3V0IHx8IE9yZ3kuY29uZmlnKCkudGltZW91dC5cbiAgICpcbiAgICogQHJldHVybnMge29iamVjdH0ge0BsaW5rIG9yZ3kvcXVldWV9XG4gICAqL1xuICBDbHMucHVibGljLnF1ZXVlID0gZnVuY3Rpb24oZGVwcyxvcHRpb25zKSB7XG5cbiAgICB2YXIgX29cbiAgICBpZighKGRlcHMgaW5zdGFuY2VvZiBBcnJheSkpXG4gICAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKFwiUXVldWUgZGVwZW5kZW5jaWVzIG11c3QgYmUgYW4gYXJyYXkuXCIpXG5cblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICBpZighQ2xzLnByaXZhdGUuY29uZmlnLmxpc3Rbb3B0aW9ucy5pZF0pIHtcbiAgICAgIC8vRE9FUyBOT1QgQUxSRUFEWSBFWElTVFxuXG4gICAgICAvL1Bhc3MgYXJyYXkgb2YgcHJvdG90eXBlcyB0byBxdWV1ZSBmYWN0b3J5XG4gICAgICBfbyA9IENscy5wcml2YXRlLmNvbmZpZy5uYWl2ZV9jbG9uZXIoW0Nscy5wcml2YXRlLmRlZmVycmVkLnB1YmxpYyxfcHVibGljXSxbb3B0aW9uc10pXG5cbiAgICAgIC8vQWN0aXZhdGUgcXVldWVcbiAgICAgIF9vID0gX3ByaXZhdGUuYWN0aXZhdGUoX28sb3B0aW9ucyxkZXBzKVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vQUxSRUFEWSBFWElTVFNcblxuICAgICAgX28gPSBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtvcHRpb25zLmlkXVxuXG4gICAgICBpZihfby5tb2RlbCAhPT0gXCJxdWV1ZVwiKSB7XG4gICAgICAgIC8vTUFUQ0ggRk9VTkQgQlVUIE5PVCBBIFFVRVVFLCBVUEdSQURFIFRPIE9ORVxuXG4gICAgICAgIG9wdGlvbnMub3ZlcndyaXRhYmxlID0gMVxuXG4gICAgICAgIF9vID0gX3ByaXZhdGUudXBncmFkZShfbyxvcHRpb25zLGRlcHMpXG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIC8vT1ZFUldSSVRFIEFOWSBFWElTVElORyBPUFRJT05TXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSxrZXkpIHtcbiAgICAgICAgICBfb1trZXldID0gdmFsdWVcbiAgICAgICAgfSlcblxuICAgICAgICAvL0FERCBBRERJVElPTkFMIERFUEVOREVOQ0lFUyBJRiBOT1QgUkVTT0xWRURcbiAgICAgICAgaWYoZGVwcy5sZW5ndGggPiAwKVxuICAgICAgICAgIF9wcml2YXRlLnRwbC5hZGQuY2FsbChfbyxkZXBzKVxuXG5cbiAgICAgIH1cblxuICAgICAgLy9SRVNVTUUgUkVTT0xVVElPTiBVTkxFU1MgU1BFQ0lGSUVEIE9USEVSV0lTRVxuICAgICAgX28uaGFsdF9yZXNvbHV0aW9uID0gKHR5cGVvZiBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiAhPT0gXCJ1bmRlZmluZWRcIikgP1xuICAgICAgICBvcHRpb25zLmhhbHRfcmVzb2x1dGlvbiA6IDBcbiAgICB9XG5cbiAgICByZXR1cm4gX29cbiAgfVxuXG4gIC8vc2F2ZSBmb3IgcmUtdXNlXG4gIENscy5wcml2YXRlLnF1ZXVlID0gX3ByaXZhdGVcblxuICByZXR1cm4gQ2xzXG59XG4iLCJ2YXIgQ2xzID0gT2JqZWN0LmNyZWF0ZSh7XG4gIHByaXZhdGU6IHt9LFxuICBwdWJsaWM6IHt9XG59KVxuXG5yZXF1aXJlKFwiLi9jb25maWcuanNcIikoQ2xzKVxucmVxdWlyZShcIi4vZmlsZV9sb2FkZXIuanNcIikoQ2xzKVxucmVxdWlyZShcIi4vZGVmZXJyZWQuanNcIikoQ2xzKVxucmVxdWlyZShcIi4vcXVldWUuanNcIikoQ2xzKVxucmVxdWlyZShcIi4vY2FzdC5qc1wiKShDbHMpXG5cbi8qKlxuICogQG5hbWVzcGFjZSBvcmd5XG4gKi9cblxuLyoqXG4qIENyZWF0ZXMgYSBuZXcgZGVmZXJyZWQgZnJvbSBhIHZhbHVlIGFuZCBhbiBpZCBhbmQgYXV0b21hdGljYWxseVxuKiByZXNvbHZlcyBpdC5cbipcbiogQG1lbWJlcm9mIG9yZ3lcbiogQGZ1bmN0aW9uIGRlZmluZVxuKlxuKiBAcGFyYW0ge3N0cmluZ30gaWQgQSB1bmlxdWUgaWQgeW91IGdpdmUgdG8gdGhlIG9iamVjdFxuKiBAcGFyYW0ge21peGVkfSAgZGF0YSBUaGUgdmFsdWUgdGhhdCB0aGUgb2JqZWN0IGlzIGFzc2lnbmVkXG4qIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4tIDxiPmRlcGVuZGVuY2llczwvYj4ge2FycmF5fVxuLSA8Yj5yZXNvbHZlcjwvYj4ge2Z1bmN0aW9uKDxpPmFzc2lnbmVkVmFsdWU8L2k+LDxpPmRlZmVycmVkPC9pPn1cbiogQHJldHVybnMge29iamVjdH0gcmVzb2x2ZWQgZGVmZXJyZWRcbiovXG5DbHMucHVibGljLmRlZmluZSA9IGZ1bmN0aW9uKGlkLGRhdGEsb3B0aW9ucykge1xuXG4gIHZhciBkZWZcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgb3B0aW9ucy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcyB8fCBudWxsXG4gIG9wdGlvbnMucmVzb2x2ZXIgPSBvcHRpb25zLnJlc29sdmVyIHx8IG51bGxcblxuICAvL3Rlc3QgZm9yIGEgdmFsaWQgaWRcbiAgaWYodHlwZW9mIGlkICE9PSBcInN0cmluZ1wiKVxuICAgIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIk11c3Qgc2V0IGlkIHdoZW4gZGVmaW5pbmcgYW4gaW5zdGFuY2UuXCIpXG5cblxuICAvL0NoZWNrIG5vIGV4aXN0aW5nIGluc3RhbmNlIGRlZmluZWQgd2l0aCBzYW1lIGlkXG4gIGlmKENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXSAmJiBDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0uc2V0dGxlZCA9PT0gMSlcbiAgICByZXR1cm4gQ2xzLnByaXZhdGUuY29uZmlnLmRlYnVnKGBDYW4ndCBkZWZpbmUgJHsgIGlkICB9LiBBbHJlYWR5IHJlc29sdmVkLmApXG5cblxuICBvcHRpb25zLmlkID0gaWRcblxuICBpZihvcHRpb25zLmRlcGVuZGVuY2llcyAhPT0gbnVsbFxuICAgICAgJiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIC8vRGVmaW5lIGFzIGEgcXVldWUgLSBjYW4ndCBhdXRvcmVzb2x2ZSBiZWNhdXNlIHdlIGhhdmUgZGVwc1xuICAgIHZhciBkZXBzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXNcbiAgICBkZWxldGUgb3B0aW9ucy5kZXBlbmRlbmNpZXNcbiAgICBkZWYgPSBDbHMucHVibGljLnF1ZXVlKGRlcHMsb3B0aW9ucylcbiAgfSBlbHNle1xuICAgIC8vRGVmaW5lIGFzIGEgZGVmZXJyZWRcbiAgICBkZWYgPSBDbHMucHVibGljLmRlZmVycmVkKG9wdGlvbnMpXG5cbiAgICAvL1RyeSB0byBpbW1lZGlhdGVseSBzZXR0bGUgW2RlZmluZV1cbiAgICBpZihvcHRpb25zLnJlc29sdmVyID09PSBudWxsXG4gICAgICAgICYmICh0eXBlb2Ygb3B0aW9ucy5hdXRvcmVzb2x2ZSAhPT0gXCJib29sZWFuXCJcbiAgICAgICAgfHwgb3B0aW9ucy5hdXRvcmVzb2x2ZSA9PT0gdHJ1ZSkpIHtcbiAgICAgIC8vcHJldmVudCBmdXR1cmUgYXV0b3Jlc292ZSBhdHRlbXB0cyBbaS5lLiBmcm9tIHhociByZXNwb25zZV1cbiAgICAgIGRlZi5hdXRvcmVzb2x2ZSA9IGZhbHNlXG4gICAgICBkZWYucmVzb2x2ZShkYXRhKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkZWZcbn1cblxuXG4vKipcbiAqIEdldHMgYW4gZXhpc2l0aW5nIGRlZmVycmVkIC8gcXVldWUgb2JqZWN0IGZyb20gZ2xvYmFsIHN0b3JlLlxuICogUmV0dXJucyBudWxsIGlmIG5vbmUgZm91bmQuXG4gKlxuICogQG1lbWJlcm9mIG9yZ3lcbiAqIEBmdW5jdGlvbiBnZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgSWQgb2YgZGVmZXJyZWQgb3IgcXVldWUgb2JqZWN0LlxuICogQHJldHVybnMge29iamVjdH0gZGVmZXJyZWQgfCBxdWV1ZSB8IG51bGxcbiAqL1xuQ2xzLnB1YmxpYy5nZXQgPSBmdW5jdGlvbihpZCkge1xuICBpZihDbHMucHJpdmF0ZS5jb25maWcubGlzdFtpZF0pXG4gICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXVxuICBlbHNlXG4gICAgcmV0dXJuIG51bGxcblxufVxuXG5cbi8qKlxuICogQWRkL3JlbW92ZSBhbiB1cHN0cmVhbSBkZXBlbmRlbmN5IHRvL2Zyb20gYSBxdWV1ZS5cbiAqXG4gKiBDYW4gdXNlIGEgcXVldWUgaWQsIGV2ZW4gZm9yIGEgcXVldWUgdGhhdCBpcyB5ZXQgdG8gYmUgY3JlYXRlZC5cbiAqXG4gKiBAbWVtYmVyb2Ygb3JneVxuICogQGZ1bmN0aW9uIGFzc2lnblxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGd0IENscy5wdWJsaWMucXVldWUgaWQgLyBxdWV1ZSBvYmplY3RcbiAqIEBwYXJhbSB7YXJyYXl9ICBhcnIgIEFycmF5IG9mIHByb21pc2UgaWRzIG9yIGRlcGVuZGVuY3kgb2JqZWN0c1xuICogQHBhcmFtIHtib29sZWFufSBhZGQgIElmIHRydWUgPGI+QUREPC9iPiBhcnJheSB0byBxdWV1ZSBkZXBlbmRlbmNpZXMsIElmIGZhbHNlIDxiPlJFTU9WRTwvYj4gYXJyYXkgZnJvbSBxdWV1ZSBkZXBlbmRlbmNpZXNcbiAqXG4gKiBAcmV0dXJuIHtvYmplY3R9IHF1ZXVlXG4gKi9cbkNscy5wdWJsaWMuYXNzaWduID0gZnVuY3Rpb24odGd0LGFycixhZGQpIHtcblxuICBhZGQgPSAodHlwZW9mIGFkZCA9PT0gXCJib29sZWFuXCIpID8gYWRkIDogMVxuXG4gIHZhciBpZCxxXG4gIHN3aXRjaCh0cnVlKSB7XG4gICAgY2FzZSh0eXBlb2YgdGd0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiB0Z3QudGhlbiA9PT0gXCJmdW5jdGlvblwiKTpcbiAgICAgIGlkID0gdGd0LmlkXG4gICAgICBicmVha1xuICAgIGNhc2UodHlwZW9mIHRndCA9PT0gXCJzdHJpbmdcIik6XG4gICAgICBpZCA9IHRndFxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIENscy5wcml2YXRlLmNvbmZpZy5kZWJ1ZyhcIkFzc2lnbiB0YXJnZXQgbXVzdCBiZSBhIHF1ZXVlIG9iamVjdCBvciB0aGUgaWQgb2YgYSBxdWV1ZS5cIix0aGlzKVxuICB9XG5cbiAgLy9JRiBUQVJHRVQgQUxSRUFEWSBMSVNURURcbiAgaWYoQ2xzLnByaXZhdGUuY29uZmlnLmxpc3RbaWRdICYmIENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXS5tb2RlbCA9PT0gXCJxdWV1ZVwiKSB7XG4gICAgcSA9IENscy5wcml2YXRlLmNvbmZpZy5saXN0W2lkXVxuXG4gICAgLy89PiBBREQgVE8gUVVFVUUnUyBVUFNUUkVBTVxuICAgIGlmKGFkZClcbiAgICAgIHEuYWRkKGFycilcblxuICAgIC8vPT4gUkVNT1ZFIEZST00gUVVFVUUnUyBVUFNUUkVBTVxuICAgIGVsc2VcbiAgICAgIHEucmVtb3ZlKGFycilcblxuICB9IGVsc2UgaWYoYWRkKSB7XG4gICAgLy9DUkVBVEUgTkVXIFFVRVVFIEFORCBBREQgREVQRU5ERU5DSUVTXG4gICAgcSA9IENscy5wdWJsaWMucXVldWUoYXJyLHtcbiAgICAgIGlkOiBpZFxuICAgIH0pXG4gIH0gZWxzZVxuICAgIC8vRVJST1I6IENBTidUIFJFTU9WRSBGUk9NIEEgUVVFVUUgVEhBVCBET0VTIE5PVCBFWElTVFxuICAgIHJldHVybiBDbHMucHJpdmF0ZS5jb25maWcuZGVidWcoXCJDYW5ub3QgcmVtb3ZlIGRlcGVuZGVuY2llcyBmcm9tIGEgcXVldWUgdGhhdCBkb2VzIG5vdCBleGlzdC5cIix0aGlzKVxuXG5cbiAgcmV0dXJuIHFcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDbHMucHVibGljXG4iXX0=
