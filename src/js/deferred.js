public.deferred = {};
private.deferred = {};


//////////////////////////////////////////
//  PUBLIC VARIABLES
//////////////////////////////////////////


//////////////////////////////////////////
//  PRIVATE VARIABLES
//////////////////////////////////////////


private.deferred.tpl = {
        
    model : "deferred"

    //A COUNTER FOR AUT0-GENERATED PROMISE ID'S
    ,settled : 0 
    ,id : null
    ,done_fired : 0
    ,_is_orgy_module : 0

    /**
     * STATE CODES:
     * ------------------
     * -1   => SETTLING [EXECUTING CALLBACKS]
     *  0   => PENDING
     *  1   => RESOLVED / FULFILLED
     *  2   => REJECTED 
     */
    ,_state : 0
    ,_timeout_id : null
    ,value : []

    ,error_q : []  
    ,then_q : []
    ,done_fn : null
    ,reject_q : []

    //PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
    ,downstream : {}
    ,execution_history : []
    ,overwritable : 0   //WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]          
    ,timeout : 5000

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
    ,remote : 1

    //ADDS TO MASTER LIST. ALWAYS DO THIS UNLESS UPGRADING A PROMISE TO A QUEUE
    ,list : 1   

    ,resolve : function(value){

        if(this.settled !== 0){
            public.debug(this.id + " can't resolve. Only unsettled promise objects resolvable.");
        }

        //SET STATE TO SETTLEMENT IN PROGRESS
        this._state = -1; 

        //SET VALUE
        this.value = value;

        //RUN RESOLVER BEFORE PROCEEDING
        //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
        if(!this.resolver_fired){

            this.resolver_fired = 1;

            //FIRE THE RESOLVER IF SET
            if(typeof this.resolver === 'function'){
                return private.deferred.hook_before_success.call(this,this.resolver,value);
            }

        }

        //Allows .then chain to be held up by new async events created as the chain executes.
        var v,fn,l=this.then_q.length;
        for(var i = 0; i<l; i++){     

            //REMOVE fn FROM THEN QUEUE. 
            //WHEN A PROMISE OBJ IS RETURNED, AND EXECUTION STOPPED WE
            //DONT WANT TO REPEAAT A CALL TO SAME fn
            fn = this.then_q.splice(0,1);

            //CALL fn WITH PRECEDING RESULT OR IF NONE EXISTS, THE RESOLVER VALUE 
            v = private.deferred.hook_before_success.call(this,fn[0],v || this.value);
            //v = fn[0].call(this, v || this.value);

            //SAVE fn TO EXECUTION HISTORY
            this.execution_history.push(fn[0]);

            //Pause execution chain if callback returned 
            //array of thenables
            if(typeof v !== 'undefined'){

                //CHECK IF V IS THENABLE
                if(v.then){

                    //SET QUEUE STATE BACK TO WAITING
                    this._state = 0;

                    //ADD THENABLE TO QUEUE'S UPSTREAM
                    this.add([v]);

                    //END RESOLUTION ATTEMPT AND Orgy FOR v TO RESOLVE
                    return;
                }
                else{

                    //IF RETURNED ARRAY, CHECK FOR THENABLES
                    if(v instanceof Array){

                        var thenables = [];

                        for(var i in v){
                            if(v[i].then){
                                thenables.push(v[i]);
                            }
                        }

                        //IF THENABLE FOUND, ADD IN TO DEPS AND BAIL
                        if(thenables.length > 0){

                            //SET QUEUE STATE BACK TO WAITING
                            this._state = 0;

                            this.add(thenables,true);

                            this.value = v;

                            return;
                        }
                        else{
                            this.value = v;
                        }

                    }
                    else{
                        //IF V RETURNED A VALUE, PUSH TO EXISTING QUEUE VALUE
                        this.value = v;
                    }
                }

            }
        }

        //SET RETURN VALUE TO A GIVEN OBJECT PROPERTY
        if(this.set){
            //ARRAY IS TRANSORMED INTO A PATH TO POINT TO
            if(this.set instanceof Array){
                //@todo make property of private to avoid external dependency
                var tgt = public.array_to_function(this.set);
                tgt.parent[tgt.args] = this.value;
            }
            //OTHErWISE ASSUMED TO BE AN OBJECT PROPERTY
            else if (typeof this.set === 'function'){
                this.set(this.value);
            }
        }

        //EXECUTE ANY GLOBALLY REGISTERED CALLBACKS
        for (var i in public.registered_callbacks){

            //SKIP IF FILTER RETURNS TRUE
            if(typeof public.registered_callbacks[i].filter === 'function'
                    && public.registered_callbacks[i].filter.call(this)){
                continue;
            }

            if(public.config().debug_mode){
                console.log("Orgy.js executing registered callback '"+i+"' on " + this.id);
            }

            public.registered_callbacks[i].fn.call(this);
        }

        //REMOVE AUTO TIMEOUT TIMER
        if(this._timeout_id){
            clearTimeout(this._timeout_id);
        }

        //SET STATE TO RESOLVED
        private.deferred._set_state.call(this,1);

        this.done();

        return this;
    }

    ,reject : function(err){

        if(!(err instanceof Array)){
            err = [err]
        }

        err.unshift("REJECTED "+this.model+": '"+this.id+"'");

        public.debug(err);

        //REMOVE AUTO TIMEOUT TIMER
        if(this._timeout_id){
            clearTimeout(this._timeout_id);
        }

        //SAVE ERROR OBJECT TO MEMORY FOR USE IN CATCH CALLBACK
        this.catch_params = err;

        //SET STATE TO REJECTED
        private.deferred._set_state.call(this,2);

        //EXECUTE REJECTION QUEUE
        for(var i in this.reject_q){
            this.value.push(this.reject_q[i].apply(this,arguments));
        }

        return this;
    }

    ,then : function(fn,rejector){

        switch(true){

            //ERROR WAS PREVIOUSLY THROWN
            case(this._state === 2):
                break;

            case(this.done_fired === 1):
                public.debug(this.id+" can't attach .then() after .done() has fired.");
                break;

            case(this.settled === 1 && this._state === 1 && !this.done_fired):
                var r = private.deferred.hook_before_success.call(this,fn,this.value);
                if(typeof r !== 'undefined'){
                    this.value = r;
                }
                break;

            default:

                //PUSH CALLBACK TO THEN QUEUE
                this.then_q.push(fn);

                //PUSH REJECT CALLBACK TO REJECTION QUEUE
                if(typeof rejector === 'function'){
                    this.reject_q.push(rejector);
                }
                break;
        }

        return this;
    }

    ,done : function(fn){

        if(this.done_fn === null){
            if(fn){
                this.done_fn = fn
            }
        }
        else if(fn){
            public.debug("done() can only be called once.");
            return;
        }

        if(this.settled === 1 && this._state === 1 && this.done_fn){
            this.done_fired = 1;
            private.deferred.hook_before_success.call(this,this.done_fn,this.value);
        }
    }

};


//////////////////////////////////////////
//  PUBLIC METHODS
//////////////////////////////////////////


public.deferred = function(options){
    
    if(!options || typeof options.id !== 'string'){
        return public.debug("Must set id.");
    }
    
    if(!public.list[options.id]){
        //CREATE NEW INSTANCE OF DEFERRED CLASS
        var _o = private.deferred.factory(options);

        //ACTIVATE DEFERRED
        _o = private.deferred.activate(_o);
    }
    else{
        _o = public.list[options.id];
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

    //YOU NOW HAVE A DEFERRED OBJECT THAT IS INACTIVE ON THE OrgyLIST
    return _o;
};
    
    
/**
 * Methods to run before then(), done() 
 * 
 * @param {function} fn
 * @param {array}
 * @returns {mixed}
 */
private.deferred.hook_before_success = function(fn,arr){

    return fn(arr,this);

};
    
    
/**
 * 
 * @param {type} int
 * @returns {undefined}
 */
private.deferred._set_state = function(int){

    this._state = int;

    //IF RESOLVED OR REJECTED, SETTLE
    if(int === 1 || int === 2){
        this.settled = 1;
    }

    private.deferred._signal_downstream.call(this,this);
};
    
    
private.deferred._get_state = function(){
    return this._state;
};


private.deferred.activate = function(obj){

    //SET ID
    if(!obj.id){
        obj.id = private.deferred._make_id(obj.model);
        obj.autonamed = true;
    }

    //MAKE SURE NAMING CONFLICT DOES NOT EXIST
    if(public.list[obj.id] && !public.list[obj.id].overwritable){
        public.debug("Tried to overwrite "+obj.id+" without overwrite permissions.");
        return public.list[obj.id];
    }
    else{
        //SAVE TO MASTER LIST
        public.list[obj.id] = obj;
    }

    //AUTO TIMEOUT
    private.deferred.auto_timeout.call(obj);

    return obj;
};


/**
 * Sets the automatic timeout on a promise object.
 * 
 * @param {integer} optional. timeout
 * @returns {Boolean}
 */
private.deferred.auto_timeout = function(timeout){

    this.timeout = (typeof timeout === 'undefined') ? this.timeout : timeout;

    //AUTO REJECT ON timeout
    if(!this.type || this.type !== 'timer'){

        //DELETE PREVIOUS TIMEOUT IF EXISTS
        if(this._timeout_id){
            clearTimeout(this._timeout_id);
        }

        if(typeof this.timeout === 'undefined'){
            public.debug(this.id+" Auto timeout this.timeout cannot be undefined.");
        }
        else if (this.timeout === -1){
            //NO AUTO TIMEOUT SET
            return false;
        }
        var scope = this;

        this._timeout_id = setTimeout(function(){
            private.deferred.auto_timeout_cb.call(scope);
        }, this.timeout);
    }
    else{
        //@todo WHEN A TIMER, ADD DURATION TO ALL UPSTREAM AND LATERAL?
    }
    return true;
}


/**
 * Callback for autotimeout. Declaration here avoids memory leak.
 * 
 * @param {type} exp
 * @returns {undefined}
 */
private.deferred.auto_timeout_cb = function(){

    if(this._state !== 1){

        //GET THE UPSTREAM ERROR ID
        var msgs = [];
        var scope = this;

        var fn = function(obj){
            if(obj._state !== 1){
                return obj.id
            }
            else{
                return false;
            }
        };

        /**
         * Run over a given object property recursively, applying callback until 
         * callback returns a non-false value.
         */
        var r = private.deferred.search_obj_recursively(this,'upstream',fn);
        msgs.push(scope.id + ": rejected by auto timeout after " + this.timeout + "ms");
        msgs.push("Cause:");
        msgs.push(r);
        return private.deferred.tpl.reject.call(this,msgs);

    }
}


private.deferred.error = function(cb){

    //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
    if(this._state === 2){
        cb();
    }
    else{
        this.error_q.push(cb);
    }

    return this;
};


private.deferred._make_id = function(model){
    return "anonymous-" + model + "-" + (public.i++);
};


/**
 * Signals all downstream promises that private promise object's state has changed.
 * 
 * 
 * @todo Since the same queue may have been assigned twice directly or 
 * indirectly via shared dependencies, make sure not to double resolve
 * - which throws an error.
 *     
 * @returns {void}
 */
private.deferred._signal_downstream = function(target){

    //MAKE SURE ALL DOWNSTREAM IS UNSETTLED
    for(var i in target.downstream){
        if(target.downstream[i].settled === 1){
            public.debug(target.id + " tried to settle promise "+"'"+target.downstream[i].id+"' that has already been settled.");
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
}
    
    
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
            obj.id = "timer-" + obj.timeout + "-"+public.i++;
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
            return public.list[obj.id];
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

    //GET AUTOPATH
    if(dep.url[0] === "*"){

        var autopath = Orgy.config().autopath;

        if(typeof autopath !== 'string'){
            public.debug([
                    "config.autopath must be set to a string."
                ]
                ,[
                    "When a dependency url begins with *, it is replaced by the config property 'autopath'."
            ]);
        }
        else{
            dep.url = dep.url.replace(/\*/,autopath);
        }
    }


    //BROWSER
    if(typeof process !== 'object' || process + '' !== '[object process]'){

        this.head = this.head || document.getElementsByTagName("head")[0] || document.documentElement;

        switch(true){

            case(dep.type==='script'):

                var node = document.createElement("script");
                node.type = 'text/javascript';
                node.setAttribute("src",dep.url);
                node.setAttribute("id",dep.id);

                (function(node,dep,deferred){

                    node.onload = node.onreadystatechange = function(){
                        //Do not autoresolve modules, which are
                        //self-resolved via Orgy.export
                        if(!deferred._is_orgy_module){
                            deferred.resolve((typeof node.value !== 'undefined') ? node.value : node)
                        }
                    };
                    node.onerror = function(){
                        deferred.reject("Failed to load path: " + dep.url);
                    };
                }(node,dep,deferred))

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
                       }

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
                                        public.debug(["Could not decode JSON",dep.url,r]);

                                    }
                                }
                                //WE WANT TO RESOLVE WITH DOM NODE FOR CSS FILES
                                deferred.resolve(node || r);
                            }
                            else{
                                deferred.reject("Error loading "+dep.url);
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
                }
            });

        }
        else{

            //DON'T GET SCRIPTS AS TEXT
            if(dep.type === 'script'){
                var data = require(dep.url);

                if(!deferred._is_orgy_module){
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
                    return public.debug([dep.url,"Must pass html document to Orgy.config() before attempting to add DOM nodes [i.e. css] as dependencies."]);
                }
            }
            else{

                var fs = require('fs');

                (function(deferred,dep){

                    fs.readFile(dep.url, 'utf8', function (err, data) {

                        if (err){
                            public.debug(["File " + dep.url + " not found @ local dep.url '" + dep.url +"'","CWD: "+process.cwd()]);
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