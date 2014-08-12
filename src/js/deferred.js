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



private.deferred = {
    
    factory : function(options){
        
        var _o = public.naive_cloner([
            private.deferred.tpl
            ,options
        ]);

        //YOU NOW HAVE A DEFERRED OBJECT THAT IS INACTIVE ON THE WAITLIST
        return _o;
    }
    
    
    ,tpl : {
        
        model : "deferred"

        //A COUNTER FOR AUT0-GENERATED PROMISE ID'S
        ,settled : 0 
        ,id : null
        ,done_fired : 0

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
        ,reject_q : []
        ,done_q : []

        //PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
        ,downstream : {}
        ,execution_history : []
        ,overwritable : 0   //WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]          
        ,timeout : 5000

        /**
         * RESOLVE-ON-LOAD. Whether to resolve the promise on load.
         * 
         * ROL == 1     =>  Promise is resolved onload.
         *                  No value can be set to promise object.
         *                  Must define itself into global space. 
         *                  
         * ROL == 0     =>  Promise NOT resolved onload. 
         *                  Value can be set to promise object.
         *                  Must define itself into global space.
         */          
        ,rol : 1

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
            this.value  = value;

            //RUN RESOLVER BEFORE PROCEEDING
            //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
            if(!this.resolver_fired){

                this.resolver_fired = 1;

                //FIRE THE RESOLVER IF SET
                if(this.resolver){
                    this.resolver(this,value);
                    return this;
                }

            }

            //Allows .then chain to be held up by new async events created as the chain executes.
            var v,fn,l=this.then_q.length;
            for(var i = 0; i<l; i++){     

                //REMOVE fn FROM THEN QUEUE. 
                //WHEN A PROMISE OBJ IS RETURNED, AND EXECUTION STOPPED WE
                //DONT WANT TO REPEAAT A CALL TO SAME fn
                fn = this.then_q.splice(0,1);

                //CALL fn WITH PRECEDING RESULT OR IF NONE EXISTS, RESOLVER VALUE
                v = fn[0].call(this, v || this.value);
                
                //SAVE fn TO EXECUTION HISTORY
                this.execution_history.push(fn[0]);

                //IF fn RETURNED AN UNSETTLED PROMISE
                //WAIT FOR IT TO RESOLVE BEFORE PROCEEDING
                if(v && v.then){
                    
                    //SET THE STATE BACK TO WAITING
                    this._state = 0;
                    
                    //ADD IT TO QUEUE'S UPSTREAM
                    this.add([v]);
                    
                    //END RESOLUTION ATTEMPT AND WAIT FOR v TO RESOLVE
                    return;
                }
            }


            //RUN DONE FUNCTION[S] IF THEY EXIST
            this.done_fired = 1;
            for(var i in this.done_q){
                
                this.done_q[i].call(this,this.value);
                
                //REMOVE fn AND PLACE IN EXECUTION HISTORY
                this.execution_history.push(this.done_q[i]);
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
                console.log("Orgy.js executing registered callback '"+i+"' on " + this.id);
                public.registered_callbacks[i].call(this);
            }
           
            //REMOVE AUTO TIMEOUT TIMER
            if(this._timeout_id){
                clearTimeout(this._timeout_id);
            }

            //SET STATE TO RESOLVED
            private.deferred._set_state.call(this,1);

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

                case(this.settled === 1 && this._state === 1 && this.done_fired === 0):
                    var r = fn.call(this,this.value);
                    this.value.push(r);
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


        /**
         * Executes fn immediately if target is settled,
         * otherwise adds to an array of callbacks that will execute upon
         * settlement.
         * 
         * @param {type} fn
         * @returns {private.deferred.tpl}
         */
        ,done : function(fn){

            if(this.settled === 1){
                this.done_fired = 1;
                fn.call(this,this.value); 
            }
            else{
                this.done_q.push(fn);
            }

            return this;
        }

    }

    
    ///////////////////////////////////////////////////
    //  METHODS
    ///////////////////////////////////////////////////
    
    
    /**
     * 
     * @param {type} int
     * @returns {undefined}
     */
    ,_set_state : function(int){

        this._state = int;

        //IF RESOLVED OR REJECTED, SETTLE
        if(int === 1 || int === 2){
            this.settled = 1;
        }

        private.deferred._signal_downstream.call(this,this);
    }
    
    
    ,_get_state : function(){
        return this._state;
    }


    ,activate : function(obj){

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
    }


    /**
     * Sets the automatic timeout on a promise object.
     * 
     * @param {integer} optional. timeout
     * @returns {Boolean}
     */
    ,auto_timeout : function(timeout){

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
    ,auto_timeout_cb : function(){
        
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


    ,error : function(cb){

        //IF ERROR ALREADY THROWN, EXECUTE CB IMMEDIATELY
        if(this._state === 2){
            cb();
        }
        else{
            this.error_q.push(cb);
        }

        return this;
    }


    ,_make_id : function(model){
        return "anonymous-" + model + "-" + (public.i++);
    }


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
    ,_signal_downstream : function(target){

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
    }
    
    
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
    ,search_obj_recursively : function(obj,propName,fn,breadcrumb){
      
        if(typeof breadcrumb === 'undefined'){
            breadcrumb = [obj.id];
        }
      
        var r1;

//debugger;
        
        for(var i in obj[propName]){

            //RUN TEST
            r1 = fn(obj[propName][i]);
            
            if(r1 !== false){
            //MATCH RETURNED. RECURSE INTO MATCH IF HAS PROPERTY OF SAME NAME TO SEARCH
                //CHECK THAT WE AREN'T CAUGHT IN A CIRCULAR LOOP
                if(breadcrumb.indexOf(r1) !== -1){
                    return public.debug([
                        "Circular condition in recursive search of obj property '"
                            +propName+"'. Offending value: "+r1
                        ,breadcrumb
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
    ,convert_to_promise : function(obj){
 
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
                console.error("Dependency type "+obj.type+" requires id, but id undefined.",obj);
                debugger;
                return false;
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
            case(obj.type === 'promise' || obj.then):   

                switch(true){
                    
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
                    
                    //OBJECT IS A REFERENCE TO A PROMISE
                    case(typeof obj.id === 'string'):
                        //GET EXISTING
                        if(public.list[obj.id]){
                            prom = public.list[obj.id];
                        }
                        //CREATE DEFERRED
                        else{
                            console.warn("Promise '"+obj.id +"': did not exist. Auto creating new deferred.");
                            prom = public.deferred({
                                id : obj.id
                            });
                        };
                        break;
                        
                    default:
                        
                }

                //MAKE SURE IS PROMISE
                if(typeof prom !== 'object' || !prom.then){
                    console.error("Dependency labeled as a promise did not return a promise.");
                    console.error(obj);
                    debugger;
                    return false;
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
    }
    
    
    /**
     * Converts a reference to a DOM event to a promise.
     * Resolved on first event trigger.
     * 
     * @todo remove jquery dependency
     * 
     * @param {object} obj
     * @returns {object} deferred object
     */
    ,_wrap_event : function(obj){

        var def = public.deferred({
            id : obj.id
        });
        
        var resolver = function(){
            private.deferred.tpl.resolve.call(def,1);
        };

        //BROWSER
        if(typeof document !== 'undefined' && typeof window !== 'undefined'){
            
            if(typeof $ !== 'function'){
                var msg = 'window and document based events depend on jQuery';
                console.error(msg);
                debugger;
                def.reject(msg);
            }
            else{
                //For now, depend on jquery for IE8 DOMContentLoaded polyfill
                switch(true){
                    case(obj.id === 'ready' || obj.id === 'DOMContentLoaded'):
                        $(document).ready(resolver);
                        break;
                    case(obj.id === 'load'):
                        $(window).load(resolver);
                        break;
                    default:
                        $(document).on(obj.id,"body",resolver);
                }
            }
        }

        return def;
    }
    

    ,_wrap_timer : function(obj){

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
    }
    
    
    /**
     * Creates a deferred object that depends on the loading of a file.
     * 
     * @param {object} obj
     * @returns {object} deferred object
     */
    ,_wrap_xhr : function(obj){
        
        
        var required = ["id","url"];
        for(var i in required){
            if(!obj[required[i]]){
                return public.debug("File requests converted to promises require: " + required[i]);
            }
        }

        
        //IF PROMISE FOR THIS URL ALREADY EXISTS, RETURN IT
        if(public.list[obj.id]){
            return public.list[obj.id];
        }
        

        //CONVERT TO DEFERRED:
        var deferred;
        deferred = public.deferred(obj);
        deferred = private.deferred.attach_xhr(deferred,obj);
        return deferred;
    }
    
    
    /**
     *    
     * 
     * @param {type} deferred
     * @param {type} obj
     * 
     * obj:
     * =========
     * <rol> boolean. RESOLVE-ON-LOAD. Whether to resolve the XHR / included file on  load.
     * 
     * rol == 1     =>  Promise is resolved onload.
     *                  No value can be set to promise object.
     *                  Must define itself into global space. 
     *                  
     * rol == 0     =>  Promise NOT resolved onload. 
     *                  Value can be set to promise object.
     *                  Must define itself into global space.
     *                  
     * <fs> boolean. Filesystem. Whether to loda the file from server filesytem or via http server
     *                  
     * @returns {unresolved}
     */
    ,attach_xhr : function(deferred,obj){

        //DEFAULT ALL TO RESOLVE-ON-LOAD
        obj.rol = (typeof obj.rol !== 'undefined') ? obj.rol : 1;

        //BROWSER
        if(typeof process !== 'object' || process + '' !== '[object process]'){
            
            this.head = this.head || document.getElementsByTagName("head")[0] || document.documentElement;

            switch(true){

                case(obj.type==='css' || obj.type==='link'):

                    var node = document.createElement("link");
                    node.setAttribute("href",obj.url);
                    node.setAttribute("type","text/css");
                    node.setAttribute("rel","stylesheet");
                    (function(){
                        node.onload = node.onreadystatechange = function(){
                           deferred.resolve(node);
                       };
                    }(node));
                    this.head.appendChild(node);
                    break;

                case(obj.type==='script'):
                    
                    var node = document.createElement("script");
                    node.type = 'text/javascript';
                    node.setAttribute("src",obj.url);
                    node.setAttribute("id",obj.id);
                    node.onerror = function(){
                        deferred.reject("Failed to load path: " + obj.url);
                    };
                    
                    if(obj.rol === 1){
                        (function(node){
                            node.onload = node.onreadystatechange = function(){
                                if(deferred.settled !== 1){
                                    deferred.resolve(node);
                                }
                            };
                        }(node))
                    }
                    
                    //put scripts before <base> elements, after <meta>
                    this.head.appendChild(node);
                    break;

                case(obj.type==='json'):
                default:
                    
                    var r;
                    var req = new XMLHttpRequest();
                    req.open('GET', obj.url, true);

                    if(typeof obj.show_messages !== 'undefined'){
                        req.setRequestHeader('show-messages', obj.show_messages);
                    }
                    if(typeof obj.return_packet !== 'undefined'){
                        req.setRequestHeader('return-packet', obj.return_packet);
                    }

                    req.onreadystatechange = function() {
                        if (req.readyState === 4) {
                            if(req.status === 200){
                                r = req.responseText;
                                if(obj.type === 'json'){
                                    try{
                                        r = JSON.parse(r);
                                    }
                                    catch(e){
                                        public.debug(["Could not decode JSON",obj.url,r]);

                                    }
                                }
                                deferred.resolve(r);
                            }
                            else{
                                deferred.reject("Error loading "+obj.url);
                            }
                        }
                    };
                    req.send(null);
            }
        }
        //NODEJS
        else{
            
            function process_result(deferred,data,obj){

                switch(true){

                    case(obj.type==='script'):
                        
                        //INTERPRET STRING AS JS
                        data = require(data);

                        //RESOLVE ON LOAD?
                        if(obj.rol === 1){
                            if(!deferred.settled){
                                deferred.resolve(data);
                            }
                        }
                        break;

                    case(obj.type === 'json'):
                        data = JSON.parse(data);
                        deferred.resolve(data);
                        break;
                        
                    case(obj.type==='css' || obj.type==='link'):
                    default:
                        deferred.resolve(data);
                }
            }
            
            
            if(obj.remote){
                var request = require('request');
                request.get(obj.url, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        process_result(deferred,body,obj);
                    }
                });

            }
            else{
                var fs = require('fs');
                var cwd = process.cwd();
                
                (function(deferred,obj){
                    
                    //PREPEND PATH WITH CURRENT WORKING DIRECTORY OF PROCESS
                    var path = obj.url;
                    
                    //REMOVE ANY RELATIVE PATH CHARACTERS 
                    //AS LONG AS PATH DOES NOT START WITH *
                    //WHICH INDICATES ABSOLUTE PATH
                    while (path.substring(0, 1) === "."
                    || path.substring(0, 1) === "/") {
                        path = path.substring(1);
                    }

                    path = cwd + '/' + path;
                     
                    fs.readFile(path, 'utf8', function (err, data) {

                        if (err){
                            public.debug("File " + obj.url + " not found @ local path '" + path +"'");
                            process.exit();
                        }

                        process_result(deferred,data,obj);
                    });

                }(deferred,obj));
                    
            }

        }
        
        return deferred;
    }
};