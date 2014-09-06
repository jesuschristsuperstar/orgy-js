/**
 * Default properties for all deferred objects.
 * 
 */

//////////////////////////////////////////
//  PUBLIC VARIABLES
//////////////////////////////////////////


//////////////////////////////////////////
//  PRIVATE VARIABLES
//////////////////////////////////////////


private.deferred.tpl = {};

private.deferred.tpl.id = null;

//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
private.deferred.tpl.settled = 0;

/**
 * STATE CODES:
 * ------------------
 * -1   => SETTLING [EXECUTING CALLBACKS]
 *  0   => PENDING
 *  1   => RESOLVED / FULFILLED
 *  2   => REJECTED 
 */
private.deferred.tpl.state = 0;

private.deferred.tpl.value = [];

private.deferred.tpl.model = "deferred";

private.deferred.tpl.done_fired = 0;

private.deferred.tpl._is_orgy_module = 0;

private.deferred.tpl.timeout_id = null;

private.deferred.tpl.callback_states = {
    resolve : 0
    ,then : 0
    ,done : 0
    ,reject : 0
};

/**
 * Self executing function to initialize callback event
 * list.
 * 
 * Returns an object with the same propertyNames as 
 * private.deferred.tpl.callback_states: adding boilerplate
 * properties for each
 * 
 * @returns {object}
 */
private.deferred.tpl.callbacks = (function(){
    
    var o = {};
    
    for(var i in private.deferred.tpl.callback_states){
        o[i] = {
            train : []
            ,hooks : {
                onBefore : {
                    train : []
                }
                ,onComplete : {
                    train : []
                }
            }
        };
    }
    
    return o;
})();
    
//PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
private.deferred.tpl.downstream = {};

private.deferred.tpl.execution_history = [];

//WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]          
private.deferred.tpl.overwritable = 0; 

//Default timeout for a deferred
private.deferred.tpl.timeout = 5000;

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
private.deferred.tpl.remote = 1;

//ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
private.deferred.tpl.list = 1;


//////////////////////////////////////////
//  PUBLIC METHODS
//////////////////////////////////////////


/**
 * Resolves a deferred.
 * 
 * @param {mixed} value
 * @returns {void}
 */
private.deferred.tpl.resolve = function(value){

    if(this.settled === 1){
        public.debug([
            this.id + " can't resolve."
            ,"Only unsettled deferreds are resolvable."
        ]);
    }

    //SET STATE TO SETTLEMENT IN PROGRESS
    private.deferred.set_state(this,-1);

    //SET VALUE
    this.value = value;

    //RUN RESOLVER BEFORE PROCEEDING
    //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
    if(!this.resolver_fired && typeof this.resolver === 'function'){
        
        this.resolver_fired = 1;   
        
        //Add resolver to resolve train
        this.callbacks.resolve.train.push(function(){
            this.resolver(value,this);
        });
    }
    else{
        
        this.resolver_fired = 1;  
        
        //Add settle to resolve train
        this.callbacks.resolve.hooks.onComplete.train.push(function(){
            private.deferred.settle(this);
        });
    }

    //Run resolve [standard respect for any hooks]
    private.deferred.run_train(
        this
        ,this.callbacks.resolve
        ,this.value
        ,{pause_on_deferred : false}
    );

    //resolver is expected to call resolve again
    //and that will get us past this point
    return this;
};


private.deferred.tpl.reject = function(err){

    if(!(err instanceof Array)){
        err = [err];
    }

    err.unshift("REJECTED "+this.model+": '"+this.id+"'");

    public.debug(err);

    //Remove auto timeout timer
    if(this.timeout_id){
        clearTimeout(this.timeout_id);
    }

    //Set state to rejected
    private.deferred.set_state(this,2);

    //Execute rejection queue
    private.deferred.run_train(
        this
        ,this.callbacks.reject
        ,err
        ,{pause_on_deferred : false}
    );

    return this;
};


private.deferred.tpl.then = function(fn,rejector){

    switch(true){

        //An error was previously thrown, bail out
        case(this.state === 2):
            break;

        //Execution chain already finished. Bail out.
        case(this.done_fired === 1):
            public.debug(this.id+" can't attach .then() because .done() has already fired, and that means the execution chain is complete.");
            break;

        //Settled, but execution chain not finished
        case(this.settled === 1 && this.state === 1 && !this.done_fired):
        default:

            //Push callback to then queue
            this.callbacks.then.train.push(fn);

            //Push reject callback to the rejection queue
            if(typeof rejector === 'function'){
                this.callbacks.reject.train.push(rejector);
            }
            break;
    }

    return this;
};


private.deferred.tpl.done = function(fn){

    if(this.callbacks.done.train.length === 0
       && this.done_fired === 0){
        if(fn){
            this.callbacks.done.train.push(fn);
        }
    }
    else if(fn){
        public.debug("done() can only be called once.");
        return;
    }
};