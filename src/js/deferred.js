/**
 * Deferred class.
 * 
 */

private.deferred = {};


//////////////////////////////////////////
//  PUBLIC VARIABLES
//////////////////////////////////////////


//////////////////////////////////////////
//  PRIVATE VARIABLES
//////////////////////////////////////////


//////////////////////////////////////////
//  PUBLIC METHODS
//////////////////////////////////////////


/**
 * Creates a new deferred object. 
 * 
 * @param {object} options
 *          {string}  id  /Optional. Use the id with Orgy.get(id). Defaults to line number of instantiation, plus an iterator.
 *          {number} timeout /time in ms after which reject is called. Defaults to Orgy.config().timeout [5000]. Note the timeout is only affected by dependencies and/or the resolver callback. Then,done delays will not flag a timeout because they are called after the instance is considered resolved.
 * @returns {object}
 */
public.deferred = function(options){
    
    options = options || {};
    
    if(options.id && public.list[options.id]){
        _o = public.list[options.id];
    }
    else{
        //CREATE NEW INSTANCE OF DEFERRED CLASS
        var _o = private.deferred.factory(options);

        //ACTIVATE DEFERRED
        _o = private.deferred.activate(_o);
    }
    
    return _o;
};


////////////////////////////////////////
//  PRIVATE METHODS
////////////////////////////////////////


private.deferred.factory = function(options){
        
    var _o = public.naive_cloner([
        private.deferred.tpl
        ,options
    ]);

    //Get backtrace info if none found [may be set @ public.define]
    if(!_o.backtrace){
      _o.backtrace = private.get_backtrace_info('public.deferred');
    }
    
    //if no id, use backtrace origin
    if(!options.id){
      _o.id = _o.backtrace.origin + '-' + (++public.i);
    }
    
    return _o;
};
    

private.deferred.settle = function(def){
    
    //REMOVE AUTO TIMEOUT TIMER
    if(def.timeout_id){
        clearTimeout(def.timeout_id);
    }
    
    
    //Set state to resolved
    private.deferred.set_state(def,1);
    
    
    //Call hook
    if(private.config.hooks.onSettle){
      private.config.hooks.onSettle(def);
    }
    
    
    //Add done as a callback to then chain completion.
    def.callbacks.then.hooks.onComplete.train.push(function(d2,itinerary,last){
        def.caboose = last;
        
        //Run done
        private.deferred.run_train(
            def
            ,def.callbacks.done
            ,def.caboose
            ,{pause_on_deferred : false}
        );

    });
    
  
    //Run then queue
    private.deferred.run_train(
        def
        ,def.callbacks.then
        ,def.value
        ,{pause_on_deferred : true}
    );
    
    
    return def;
};


/**
 * Runs an array of functions sequentially as a partial function.
 * Each function's argument is the result of its predecessor function.
 * 
 * By default, execution chain is paused when any function 
 * returns an unresolved deferred. (pause_on_deferred) [OPTIONAL]
 * 
 * @param {object} def  /deferred object
 * @param {object} obj  /itinerary
 *      train       {array}
 *      hooks       {object}    
 *          onBefore        {array}
 *          onComplete      {array}
 * @param {mixed} param /param to pass to first callback
 * @param {object} options
 *      pause_on_deferred   {boolean}
 *      
 * @returns {void}
 */
private.deferred.run_train = function(def,obj,param,options){
    
    //allow previous return values to be passed down chain
    var r = param || def.caboose || def.value;
    
    //onBefore event
    if(obj.hooks && obj.hooks.onBefore.train.length > 0){
        private.deferred.run_train(
            def
            ,obj.hooks.onBefore
            ,param
            ,{pause_on_deferred : false}
        );
    }
    
    while(obj.train.length > 0){
        
        //remove fn to execute
        var last = obj.train.shift();
        def.execution_history.push(last);
  
        r = last.call(def,def.value,def,r);

        //if result is an thenable, halt execution 
        //and run unfired arr when thenable settles
        if(options.pause_on_deferred){
            
            //If r is an unsettled thenable
            if(r && r.then && r.settled !== 1){

                //execute rest of this train after r resolves
                r.callbacks.resolve.hooks.onComplete.train.push(function(){

                    private.deferred.run_train(
                        def
                        ,obj
                        ,param
                        ,{pause_on_deferred : true}
                    );
                });

                //terminate execution
                return;
            }
            
            //If is an array than contains an unsettled thenable
            else if(r instanceof Array){

                var thenables = [];

                for(var i in r){
                    
                    if(r[i].then && r[i].settled !== 1){
                        
                        thenables.push(r[i]);
           
                        var fn = (function(t,def,obj,param){
                    
                            return function(){
      
                                //Bail if any thenables unsettled
                                for(var i in t){
                                    if(t[i].settled !== 1){
                                        return;
                                    }
                                }

                                private.deferred.run_train(
                                    def
                                    ,obj
                                    ,param
                                    ,{pause_on_deferred : true}
                                );
                            };
                            
                        })(thenables,def,obj,param);
                        
                        //execute rest of this train after
                        //all thenables found in r resolve
                        r[i].callbacks.resolve.hooks.onComplete.train.push(fn);

                        //terminate execution
                        return;
                    }
                }
            }
        }
    }
    
    //onComplete event
    if(obj.hooks && obj.hooks.onComplete.train.length > 0){
        private.deferred.run_train(def
                                ,obj.hooks.onComplete
                                ,r
                                ,{pause_on_deferred : false});
    }
};


/**
 * Sets the state of an Orgy object.
 * 
 * @param {object} def
 * @param {number} int
 * @returns {void}
 */
private.deferred.set_state = function(def,int){

    def.state = int;

    //IF RESOLVED OR REJECTED, SETTLE
    if(int === 1 || int === 2){
        def.settled = 1;
    }

    if(int === 1 || int === 2){
        private.deferred.signal_downstream(def);
    }
};
    
   
/**
 * Gets the state of an Orgy object
 * 
 * @param {object} def
 * @returns {number} 
 */
private.deferred.get_state = function(def){
    return def.state;
};


private.deferred.activate = function(obj){
    
    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if(public.list[obj.id] && !public.list[obj.id].overwritable){
        public.debug("Tried to overwrite "+obj.id+" without overwrite permissions.");
        return public.list[obj.id];
    }

    //SAVE TO MASTER LIST
    public.list[obj.id] = obj;

    //AUTO TIMEOUT
    private.deferred.auto_timeout.call(obj);

    //Call hook
    if(private.config.hooks.onActivate){
      private.config.hooks.onActivate(obj);
    }
    
    return obj;
};


/**
 * Sets the automatic timeout on a promise object.
 * 
 * @param {integer} timeout (optional)
 * @returns {Boolean}
 */
private.deferred.auto_timeout = function(timeout){

    this.timeout = (typeof timeout === 'undefined') 
    ? this.timeout : timeout;

    //AUTO REJECT ON timeout
    if(!this.type || this.type !== 'timer'){

        //DELETE PREVIOUS TIMEOUT IF EXISTS
        if(this.timeout_id){
            clearTimeout(this.timeout_id);
        }

        if(typeof this.timeout === 'undefined'){
            public.debug([
              "Auto timeout this.timeout cannot be undefined."
              ,this.id
            ]);
        }
        else if (this.timeout === -1){
            //NO AUTO TIMEOUT SET
            return false;
        }
        var scope = this;

        this.timeout_id = setTimeout(function(){
            private.deferred.auto_timeout_cb.call(scope);
        }, this.timeout);

    }
    else{
        //@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?
    }
    
    return true;
};


/**
 * Callback for autotimeout. Declaration here avoids memory leak.
 * 
 * @returns {void}
 */
private.deferred.auto_timeout_cb = function(){

    if(this.state !== 1){

        //GET THE UPSTREAM ERROR ID
        var msgs = [];
        var scope = this;

        var fn = function(obj){
            if(obj.state !== 1){
                return obj.id;
            }
            else{
                return false;
            }
        };

        /**
         * Run over a given object property recursively, 
         * applying callback until 
         * callback returns a non-false value.
         */
        if(private.config.debug_mode){
            var r = private.deferred.search_obj_recursively(this,'upstream',fn);
            msgs.push(scope.id + ": rejected by auto timeout after " 
                    + this.timeout + "ms");
            msgs.push("Cause:");
            msgs.push(r);
            return private.deferred.tpl.reject.call(this,msgs);
        }
        else{
            return private.deferred.tpl.reject.call(this);
        }
    }
};


private.deferred.error = function(cb){

    //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
    if(this.state === 2){
        cb();
    }
    else{
        this.reject_q.push(cb);
    }

    return this;
};


/**
 * Signals all downstream promises that private promise object's state has changed.
 * 
 * 
 * @todo Since the same queue may have been assigned twice directly or 
 * indirectly via shared dependencies, make sure not to double resolve
 * - which throws an error.
 *     
 * @param {object} target deferred/queue
 * @returns {void}
 */
private.deferred.signal_downstream = function(target){

    //MAKE SURE ALL DOWNSTREAM IS UNSETTLED
    for(var i in target.downstream){
        if(target.downstream[i].settled === 1){

          if(target.downstream[i].state !== 1){
            //tried to settle a rejected downstream
            continue;
          }
          else{
            //tried to settle a successfully settled downstream
            public.debug(target.id + " tried to settle promise "+"'"+target.downstream[i].id+"' that has already been settled.");
          }
        }
    }

    //NOW THAT WE KNOW ALL DOWNSTREAM IS UNSETTLED, WE CAN IGNORE ANY
    //SETTLED THAT RESULT AS A SIDE EFFECT TO ANOTHER SETTLEMENT
    for (var i in target.downstream){
        if(target.downstream[i].settled !== 1){
            private.queue.receive_signal(target.downstream[i],target.id);
        }
    }
};
    
    
/**
* Run over a given object property recursively, applying callback until 
* callback returns a non-false value.
* 
* @param {object} obj      
* @param {string} propName          The property name of the array to bubble up
* @param {function} fn              The test callback to be applied to each object
* @param {array} breadcrumb         The breadcrumb through the chain of the first match
* @returns {mixed}
*/
private.deferred.search_obj_recursively = function(obj,propName,fn,breadcrumb){

    if(typeof breadcrumb === 'undefined'){
        breadcrumb = [obj.id];
    }

    var r1;

    for(var i in obj[propName]){

        //RUN TEST
        r1 = fn(obj[propName][i]);

        if(r1 !== false){
        //MATCH RETURNED. RECURSE INTO MATCH IF HAS PROPERTY OF SAME NAME TO SEARCH
            //CHECK THAT WE AREN'T CAUGHT IN A CIRCULAR LOOP
            if(breadcrumb.indexOf(r1) !== -1){
                return public.debug([
                    "Circular condition in recursive search of obj property '"
                        +propName+"' of object "
                        +((typeof obj.id !== 'undefined') ? "'"+obj.id+"'" : '')
                        +". Offending value: "+r1
                    ,(function(){
                        breadcrumb.push(r1);
                        return breadcrumb.join(" [depends on]=> ");
                    })()
                ]);
            }

            breadcrumb.push(r1);

            if(obj[propName][i][propName]){
                return private.deferred.search_obj_recursively(obj[propName][i],propName,fn,breadcrumb);
            }

            break;
        }

    }

    return breadcrumb;
};
    
    
/**
 * Converts a promise description into a promise.
 * 
 * @param {type} obj
 * @returns {undefined}
 */
private.deferred.convert_to_promise = function(obj){

    //IF ALREADY EXISTS, RETURN EXISTING
    if(!obj.id){

        if(obj.type === 'timer'){
            obj.id = "timer-" + obj.timeout + "-"+(++public.i);
        }
        else if(typeof obj.url === 'string'){
            obj.id = obj.url.split("/").pop();
            //REMOVE .js FROM ID
            if(obj.id.search(".js")!== -1){
                obj.id = obj.id.split(".");
                obj.id.pop();
                obj.id = obj.id.join(".");
            }
        }
        else{
            return public.debug([
                "Dependencies without a 'url' property require 'id' property be set."
                ,"'"+obj.type+"' id undefined."
                ,obj
            ]);
        }
    }

    if(obj.type !== 'timer'){
        //RETURN THE PROMISE IF IT ALREADY EXISTS
        if(typeof public.list[obj.id] !== 'undefined'){
          //A previous promise of the same id exists. 
          //Make sure this dependency object doesn't have a
          //resolver - if it does error
          if(obj.resolver){
            public.debug([
              "You can't set a resolver on a queue that has already been declared. You can only reference the original."
              ,"Detected re-init of '" + obj.id + "'."
              ,"Attempted:"
              ,obj
              ,"Existing:"
              ,public.list[obj.id]
            ]);
          }
          else{
            return public.list[obj.id];
          }
        }
    }

    //CONVERT DEPENDENCY TO PROMISE
    var prom;
    switch(true){

        //EVENT
        case(obj.type === 'event'):
            prom = private.deferred._wrap_event(obj);
            break;

        //ALREADY A PROMISE
        case(obj.type === 'deferred'):
        case(obj.type === 'promise' || obj.then):   

            switch(true){

                //OBJECT IS A REFERENCE TO A PROMISE
                case(typeof obj.id === 'string'):
                    console.warn("Promise '"+obj.id +"': did not exist. Auto creating new deferred.");
                    prom = public.deferred({
                        id : obj.id
                    });
                    break;

                //OBJECT PROPERTY .promise EXPECTED TO RETURN A PROMISE
                case(typeof obj.promise === 'function'):
                    if(obj.scope){
                        prom = obj.promise.call(obj.scope);
                    }
                    else{
                        prom = obj.promise();
                    }
                    break;

                //OBJECT IS A PROMISE
                case(obj.then):
                    prom = obj;
                    break;

                default:

            }

            //MAKE SURE IS PROMISE
            if(typeof prom !== 'object' || !prom.then){
                return public.debug("Dependency labeled as a promise did not return a promise.",obj);
            }
            break;

        case(obj.type === 'timer'):
            prom = private.deferred._wrap_timer(obj);
            break;

        //XHR
        default:
            obj.type = obj.type || "default";
            prom = private.deferred._wrap_xhr(obj);
    }

    //INDEX PROMISE BY ID FOR FUTURE REFERENCING
    public.list[obj.id] = prom;

    return prom;
};
    
    
/**
 * Converts a reference to a DOM event to a promise.
 * Resolved on first event trigger.
 * 
 * @todo remove jquery dependency
 * 
 * @param {object} obj
 * @returns {object} deferred object
 */
private.deferred._wrap_event = function(obj){

    var def = public.deferred({
        id : obj.id
    });

    //BROWSER
    if(typeof document !== 'undefined' && typeof window !== 'undefined'){

        if(typeof $ !== 'function'){
            var msg = 'window and document based events depend on jQuery';
            def.reject(msg);
        }
        else{
            //For now, depend on jquery for IE8 DOMContentLoaded polyfill
            switch(true){
                case(obj.id === 'ready' || obj.id === 'DOMContentLoaded'):
                    $(document).ready(function(){
                        def.resolve(1);
                    });
                    break;
                case(obj.id === 'load'):
                    $(window).load(function(){
                        def.resolve(1);
                    });
                    break;
                default:
                    $(document).on(obj.id,"body",function(){
                        def.resolve(1);
                    });
            }
        }
    }

    return def;
};
    

private.deferred._wrap_timer = function(obj){

    var prom = public.deferred(obj);

    (function(prom){

        var _start = new Date().getTime();      
        setTimeout(function(){
            var _end = new Date().getTime();
            prom.resolve({
                start : _start
                ,end : _end
                ,elapsed : _end - _start
                ,timeout : obj.timeout
            });
        },obj.timeout);

    }(prom));

    return prom;
};
    
    
/**
 * Creates a deferred object that depends on the loading of a file.
 * 
 * @param {object} dep
 * @returns {object} deferred object
 */
private.deferred._wrap_xhr = function(dep){


    var required = ["id","url"];
    for(var i in required){
        if(!dep[required[i]]){
            return public.debug([
                "File requests converted to promises require: " + required[i]
                ,"Make sure you weren't expecting dependency to already have been resolved upstream."
                ,dep
            ]
            );
        }
    }


    //IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
    if(public.list[dep.id]){
        return public.list[dep.id];
    }


    //CONVERT TO DEFERRED:
    var deferred;
    deferred = public.deferred(dep);
    deferred = private.deferred.attach_xhr(deferred,dep);
    return deferred;
};
    
    
/**
 *    
 * 
 * @param {type} deferred
 * @param {type} dep
 * 
 * dep:
 * =========
 *                  
 * <fs> boolean. Filesystem. Whether to loda the file from server filesytem or via http server
 *                  
 * @returns {unresolved}
 */
private.deferred.attach_xhr = function(deferred,dep){

    //BROWSER
    if(typeof process !== 'object' || process + '' !== '[object process]'){
      
      //replace node style './' with '/'
      if(dep.url[0] === "." && dep.url[1] === "/"){
        dep.url = dep.url.substring(1);
      }

      this.head = this.head || document.getElementsByTagName("head")[0] || document.documentElement;

      switch(true){

            case(dep.type==='script'):

                var node = document.createElement("script");
                node.type = 'text/javascript';
                node.setAttribute("src",dep.url);
                node.setAttribute("id",dep.id);

                (function(node,dep,deferred){

                    node.onload = node.onreadystatechange = function(){
                        //Autoresolve if no resolver expected in script
                        if(deferred.resolver === null){
                            deferred.resolve((typeof node.value !== 'undefined') ? node.value : node);
                        }
                    };
                    node.onerror = function(){
                        deferred.reject("Error loading: " + dep.url);
                    };
                }(node,dep,deferred));

                //put scripts before <base> elements, after <meta>
                this.head.appendChild(node);
                break;

            case(dep.type==='css' || dep.type==='link'):

                var node = document.createElement("link");
                node.setAttribute("href",dep.url);
                node.setAttribute("type","text/css");
                node.setAttribute("rel","stylesheet");

                if(node.onload){
                    (function(node,dep,deferred){
                        node.onload = node.onreadystatechange = function(){
                           deferred.resolve(node);
                       };

                       node.onerror = function(){
                           deferred.reeject("Failed to load path: " + dep.url);
                       };

                    }(node,dep,deferred));

                    this.head.appendChild(node);
                    break;
                }
                else{
                    //ADD NODE BUT MAKE XHR REQUEST TO CHECK FILE RECEIVED
                    this.head.appendChild(node);
                }

            case(dep.type==='json'):
            default:

                var r;
                var req = new XMLHttpRequest();
                req.open('GET', dep.url, true);

                if(typeof dep.show_messages !== 'undefined'){
                    req.setRequestHeader('show-messages', dep.show_messages);
                }
                if(typeof dep.return_packet !== 'undefined'){
                    req.setRequestHeader('return-packet', dep.return_packet);
                }

                (function(dep,deferred){
                    req.onreadystatechange = function() {
                        if (req.readyState === 4) {
                            if(req.status === 200){
                                r = req.responseText;
                                if(dep.type === 'json'){
                                    try{
                                        r = JSON.parse(r);
                                    }
                                    catch(e){
                                        public.debug([
                                            "Could not decode JSON"
                                            ,dep.url
                                            ,r
                                        ],deferred);
                                    }
                                }
                                //WE WANT TO RESOLVE WITH DOM NODE FOR CSS FILES
                                deferred.resolve(node || r);
                            }
                            else{
                                deferred.reject("Error loading: " + dep.url);
                            }
                        }
                    };
                }(dep,deferred));

                req.send(null);
        }
    }
    //NODEJS
    else{
        
        
      function process_result(deferred,data,dep){

          switch(true){

              case(dep.type === 'json'):
                  data = JSON.parse(data);
                  deferred.resolve(data);
                  break;

              default:
                  deferred.resolve(data);

          }
      }     

      if(dep.remote){
        var request = require('request');
        request.get(dep.url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                process_result(deferred,body,dep);
            };
        });
      }
      else{

        var cwd = process.cwd();
        var path = require("path");
        dep.url = path.resolve(dep.url);

        //Get scripts
        if(dep.type === 'script'){

            //get dest dir
            var dd = dep.url.split("/");
            dd.pop();
            dd = dd.join("/");
            if(dd !== cwd){
              //Make working directory relative to 
              //included script
              process.chdir(dd);
            }

            var data = require(dep.url);

            //Change back to saved cwd
            process.chdir(cwd);

            //Autoresolve if no resolver expected in script
            if(deferred.resolver === null){
                deferred.resolve(data);
            }
        }
        //DON'T GET CSS, JUST ADD NODE
        else if(dep.type === 'css'){

          if(private.config.document !== null){
            var node = private.config.document('head').append('<link rel="stylesheet" href="'+dep.url+'" type="text/css" />');
            deferred.resolve(node);
          }
          else{
              return public.debug([
                  dep.url
                  ,"Must pass html document to Orgy.config() before attempting to add DOM nodes [i.e. css] as dependencies."
              ],deferred);
          }
        }
        else{

          var fs = require('fs');

          (function(deferred,dep){

                fs.readFile(dep.url, 'utf8', function (err, data) {

                    if (err){
                        public.debug([
                            "File " + dep.url + " not found @ local dep.url '" + dep.url +"'"
                            ,"CWD: "+process.cwd()
                        ],deferred);

                        process.exit();
                    }

                    process_result(deferred,data,dep);
                });

            }(deferred,dep));

        }
      }
    }

    return deferred;
};