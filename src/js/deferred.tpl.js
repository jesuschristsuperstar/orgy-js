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
        
private.deferred.tpl.model = "deferred";

//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
private.deferred.tpl.settled = 0;

private.deferred.tpl.id = null;

private.deferred.tpl.done_fired = 0;

private.deferred.tpl._is_orgy_module = 0;

/**
 * STATE CODES:
 * ------------------
 * -1   => SETTLING [EXECUTING CALLBACKS]
 *  0   => PENDING
 *  1   => RESOLVED / FULFILLED
 *  2   => REJECTED 
 */
private.deferred.tpl.state = 0;

private.deferred.tpl.timeout_id = null;

private.deferred.tpl.value = [];

private.dererred.tpl.callbacks = {
    then : []
    ,done : []
    ,reject : []
    ,settle : []
};
    
//PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
private.dererred.tpl.downstream = {};


private.dererred.tpl.execution_history = [];

//WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]          
private.dererred.tpl.overwritable = 0; 

//Default timeout for a deferred
private.dererred.tpl.timeout = 5000;

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
private.dererred.tpl.remote = 1;

//ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
private.dererred.tpl.list = 1;


//////////////////////////////////////////
//  PUBLIC METHODS
//////////////////////////////////////////


/**
 * desolves a deferred.
 * 
 * @param {mixed} value
 * @returns {void}
 */
private.dererred.tpl.resolve = function(value){

    if(this.settled === 1){
        public.debug([
            this.id + " can't resolve."
            ,"Only unsettled Orgy objects resolvable."
        ]);
    }

    //SET STATE TO SETTLEMENT IN PROGRESS
    this.state = -1; 

    //SET VALUE
    this.value = value;

    //RUN RESOLVER BEFORE PROCEEDING
    //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
    if(!this.resolver_fired){

        this.resolver_fired = 1;

        //If a resolver exists, execute it and 
        //expect it to call back to this point
        if(typeof this.resolver === 'function'){
            return this.resolver(value,this);
        }
        else{
            //settle
            return private.deferred.settle(this);
        }

    }
    else{
        //settle
        return private.deferred.settle(this);
    }
};


private.dererred.tpl.reject = function(err){

    if(!(err instanceof Array)){
        err = [err];
    }

    err.unshift("REJECTED "+this.model+": '"+this.id+"'");

    public.debug(err);

    //REMOVE AUTO TIMEOUT TIMER
    if(this.timeout_id){
        clearTimeout(this.timeout_id);
    }

    //SAVE ERROR OBJECT TO MEMORY FOR USE IN CATCH CALLBACK
    this.catch_params = err;

    //SET STATE TO REJECTED
    private.deferred.set_state(this,2);

    //EXECUTE REJECTION QUEUE
    for(var i in this.reject_q){
        this.value.push(this.reject_q[i].apply(this,arguments));
    }

    return this;
};


private.dererred.tpl.then = function(fn,rejector){

    switch(true){

        //ERROR WAS PREVIOUSLY THROWN
        case(this.state === 2):
            break;

        case(this.done_fired === 1):
            public.debug(this.id+" can't attach .then() after .done() has fired.");
            break;

        case(this.settled === 1 && this.state === 1 && !this.done_fired):
            var r = fn.call(this,this.value,this);
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
};


private.dererred.tpl.done = function(fn){

    if(this.done_fn === null){
        if(fn){
            this.done_fn = fn;
        }
    }
    else if(fn){
        public.debug("done() can only be called once.");
        return;
    }

    if(this.settled === 1 && this.state === 1 && this.done_fn){
        this.done_fired = 1;
        this.done_fn.call(this,this.value,this);
    }
};

private.dererred.tpl.onSettle = function(fn){

    if(this.settled !== 1){
        this.settlement_q.push(fn);
    }
    else{
        public.debug("Can't add settlement callback. Already settled.");
    }
};