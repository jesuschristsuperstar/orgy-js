public.queue = {};
private.queue = {};


//////////////////////////////////////////
//  PUBLIC VARIABLES
//////////////////////////////////////////


//////////////////////////////////////////
//  PRIVATE VARIABLES
//////////////////////////////////////////


/**
* Template object for all queues
* 
* @type object
*/
private.queue.tpl = {

   model : 'queue'


   //SET TRUE AFTER RESOLVER FIRED
   ,resolver_fired : 0


   //PREVENTS A QUEUE FROM RESOLVING EVEN IF ALL DEPENDENCIES MET
   //PURPOSE: PREVENTS QUEUES CREATED BY ASSIGNMENT FROM RESOLVING 
   //BEFORE THEY ARE FORMALLY INSTANTIATED
   ,halt_resolution : 0


   //USED TO CHECK STATE, ENSURES ONE COPY
   ,upstream : {}


   //USED RETURN VALUES, ENSURES ORDER
   ,dependencies : []


   ///////////////////////////////////////////////////
   //  QUEUE INSTANCE METHODS
   ///////////////////////////////////////////////////


   /**
    * Add list of dependencies to a queue's upstream array.
    * 
    * The queue will resolve once all the promises in its 
    * upstream array are resolved.
    * 
    * When public.config.debug == 1, method will test each dependency is not
    * previously scheduled to resolve downstream from the target, in which 
    * case it would never resolve because its upstream depends on it.
    * 
    * @param {array} array of dependencies to add
    * @returns {array} upstream
    */
   ,add : function(arr){

       try{
           if(arr.length === 0) return this.upstream;
       }
       catch(err){
           public.debug(err);
       }

       //IF NOT PENDING, DO NOT ALLOW TO ADD
       if(this.state !== 0){
           return public.debug("Cannot add list to queue id:'"+this.id
           +"'. Queue settled/in the process of being settled.");
       }

       for(var a in arr){

           switch(true){

               //CHECK IF EXISTING PROMISE
               case(typeof public.list[arr[a]['id']] === 'object'):
                   arr[a] = public.list[arr[a]['id']];
                   break;

               //IF NOT, ATTEMPT TO CONVERT IT TO A PROMISE
               case(typeof arr[a] === 'object' && typeof arr[a].then !== 'function'):
                   arr[a] = private.deferred.convert_to_promise(arr[a]);
                   break;

               //REF IS A PROMISE.
               case(typeof arr[a].then === 'function'):
                   break;

               default:
                   console.error("Object could not be converted to promise.");
                   console.error(arr[a]);
                   debugger;
                   continue;
           }

           //must check the target to see if the dependency exists in its downstream
           for(var b in this.downstream){
               if(b === arr[a].id){
                   return public.debug("Error adding upstream dependency '"+arr[a].id+"' to queue"+" '"+this.id+"'.\n Promise object for '"+arr[a].id+"' is scheduled to resolve downstream from queue '"+this.id+"' so it can't be added upstream.");
               }
           }

           //ADD TO UPSTREAM, DOWNSTREAM, DEPENDENCIES
           this.upstream[arr[a].id] = arr[a];
           arr[a].downstream[this.id] = this;
           this.dependencies.push(arr[a]);

       }

       return this.upstream;
   }


   /**
    * Remove list from a queue.
    * 
    * @param {array} arr
    * @returns {array} array of list the queue is upstream
    */
   ,remove : function(arr){

       //IF NOT PENDING, DO NOT ALLOW REMOVAL
       if(this.state !== 0){
           console.error("Cannot remove list from queue id:'"+this.id+"'. Queue settled/in the process of being settled.");
           return false;
       }

       for(var a in arr){
           if(this.upstream[arr[a].id]){
               delete this.upstream[arr[a].id];
               delete arr[a].downstream[this.id];
           }
       }
   }


   /**
    * Resets an existing,settled queue back to Orgying state.
    * Clears out the downstream.
    * Fails if not settled.
    * 
    * @returns {obj}
    */
   ,reset : function(options){

       if(this.settled !== 1 || this.state !== 1){
           public.debug("Can only reset a queue settled without errors.");
       }

       options = options || {};

       this.settled = 0;
       this.state = 0; 
       this.resolver_fired = 0;
       this.done_fired = 0;

       //REMOVE AUTO TIMEOUT TIMER
       if(this.timeout_id){
           clearTimeout(this.timeout_id);
       }

       //CLEAR OUT THE DOWNSTREAM
       this.downstream = {};
       this.dependencies = [];

       //SET NEW AUTO TIMEOUT
       private.deferred.auto_timeout.call(this,options.timeout);

       //POINTLESS - WILL JUST IMMEDIATELY RESOLVE SELF
       //this.check_self()

       return this;
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
   ,check_self : function(){
       private.queue.receive_signal(this,this.id);
       return this.state;
   }
}


//////////////////////////////////////////
//  PUBLIC METHODS
//////////////////////////////////////////


public.queue = function(deps,options){

    var _o;
    if(!(deps instanceof Array)){
        return public.debug("Queue dependencies must be an array.");
    }
    
    options = options || {};
    
    //DOES NOT ALREADY EXIST
    if(!public.list[options.id]){
        
        //CREATE NEW QUEUE OBJECT
        var _o = private.queue.factory(options);

        //ACTIVATE QUEUE
        _o = private.queue.activate(_o,options,deps);

    }
    //ALREADY EXISTS
    else {
        
        _o = public.list[options.id];
        
        if(_o.model !== 'queue'){
        //MATCH FOUND BUT NOT A QUEUE, UPGRADE TO ONE

            options.overwritable = 1;

            _o = private.queue.upgrade(_o,options,deps);
        }
        else{
            
            //OVERWRITE ANY EXISTING OPTIONS
            for(var i in options){
                _o[i] = options[i];
            }
            
            //ADD ADDITIONAL DEPENDENCIES IF NOT RESOLVED
            if(deps.length > 0){
                private.queue.tpl.add.call(_o,deps);
            }
            
        }
        
        //RESUME RESOLUTION UNLESS SPECIFIED OTHERWISE
        _o.halt_resolution = (typeof options.halt_resolution !== 'undefined') ?
        options.halt_resolution : 0;
    }
    
    return _o;
};


//////////////////////////////////////////
//  PRIVATE METHODS
//////////////////////////////////////////


private.queue.factory = function(options){

    //CREATE A NEW QUEUE OBJECT
    var _o = public.naive_cloner([
        private.deferred.tpl
        ,private.queue.tpl
        ,options
    ]);

    //Save backtrace for async debugging
    var l = new Error().stack.split("public.queue")[1].split("//")[2].split(" ")[0].trim();
    _o.origin_line = l;
    
    //if no id, use origin
    if(!options.id){
        _o.id = _o.origin_line;
    }
    
    return _o;
}    
    
    
/**
 * Activates a queue object.
 * 
 * @param {object} o
 * @param {object} options
 * @param {array} deps
 * @returns {object} queue
 */
private.queue.activate = function(o,options,deps){

    //ACTIVATE AS A DEFERRED
    o = private.deferred.activate(o);

    //ADD ANY DEFERREDS TO QUEUE
    private.queue.tpl.add.call(o,deps);

    //SEE IF CAN BE IMMEDIATELY RESOLVED BY CHECKING UPSTREAM
    private.queue.receive_signal(o,o.id);

    //ASSIGN THIS QUEUE UPSTREAM TO OTHER QUEUES
    if(o.assign){
        for(var a in o.assign){
            public.assign(o.assign[a],[o],true);
        }
    }

    return o;
};
    
    
/**
* A "signal" here causes a queue to look through each item in its upstream and 
* check to see if all are resolved. 
* 
* Signals can only be received by a queue itself or a promise/deferred/queue
* in its upstream.
* 
* @param {string} from_id
* @returns {void}
*/
private.queue.receive_signal = function(target,from_id){

    if(target.halt_resolution === 1) return;

   //MAKE SURE THE SIGNAL WAS FROM A PROMISE BEING LISTENED TO
   //BUT ALLOW SELF STATUS CHECK
   if(from_id !== target.id && !target.upstream[from_id]){
       console.error(from_id + " can't signal " + target.id + " because not in upstream.");
       debugger;
       return;
   }
   //RUN THROUGH QUEUE OF OBSERVING PROMISES TO SEE IF ALL DONE
   else{
       var status = 1;
       for(var i in target.upstream){
           //SETS STATUS TO 0 IF ANY OBSERVING HAVE FAILED, BUT NOT IF PENDING OR RESOLVED
           if(target.upstream[i].state !== 1) {
               status = target.upstream[i].state;
               break;
           }
       }
   }

   //RESOLVE QUEUE IF UPSTREAM FINISHED
   if(status === 1){

        //GET RETURN VALUES PER DEPENDENCIES, WHICH SAVES ORDER AND 
        //REPORTS DUPLICATES
        var values = [];
        for(var i in target.dependencies){
            values.push(target.dependencies[i].value);
        }

        private.deferred.tpl.resolve.call(target,values);
   }

   if(status === 2){
       var err = [
           target.id+" dependency '"+target.upstream[i].id + "' was rejected."
           ,target.upstream[i].arguments
       ];
       private.deferred.tpl.reject.apply(target,err);
   }
};


/**
* Upgrades a promise object to a queue.
* 
* @param {object} prom
* @param {object} options
* @param {array} dependencies
* @returns {object} queue object
*/
private.queue.upgrade = function(obj,options,deps){

    if(obj.settled !== 0 || (obj.model !== 'promise' && obj.model !== 'deferred')){
        return public.debug('Can only upgrade unsettled promise or deferred into a queue.');
    }

   //GET A NEW QUEUE OBJECT AND MERGE IN
    var _o = public.naive_cloner([
        private.queue.tpl
        ,options
    ]);

    for(var i in _o){
       obj[i] = _o[i];
    }

    delete _o;

    //CREATE NEW INSTANCE OF QUEUE
    obj = private.queue.activate(obj,options,deps);

    //RETURN QUEUE OBJECT
    return obj;
};