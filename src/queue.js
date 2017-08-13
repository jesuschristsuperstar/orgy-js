module.exports.queue = function(passedDeferreds){

  //public props
  const self = this;
  this.state = 'pending';

  //private props
  let config = {};
  config.checkInterval = 100; //time to wait between queue checks
  config.upstream = {};
  config.returnValues = [];
  config.thenArray = [];
  config.done = function(){};
  config.error = function(){};

  this.add = function(deferred){
    config.upstream[deferred.id] = deferred;
    return self;
  }

  this.remove = function(deferred){
    //get id of deferred
    let id = deferred.id; 

    //remove from upstream
    delete config.upstream[id]; 
    return self;
  }

  this.then = function(callback){
    config.thenArray.push(callback);
    return self;
  }

  this.done = function(callback){
    config.done = callback;
    return self;
  }

  this.error = function(callback){
    config.error = callback;
    return self;
  }

  function updateState(){
    
    let keys = Object.getOwnPropertySymbols(config.upstream);

    //check rejections
    for(let i = 0; i < keys.length; i++){
      //run error callback and exit if any deps rejected
      if (config.upstream[keys[i]].state === 'rejected'){
        self.state = 'rejected';
        runErrorCallback(config.upstream[keys[i]]); 
        return;
      }
    }

    //check pendings
    for(let i = 0; i < keys.length; i++){
      //run error callback and exit if any deps rejected
      if (config.upstream[keys[i]].state === 'pending'){
        //set timeout to run check again
        setTimeout(updateState,config.checkInterval);
        return;
      }
    }

    //no pendings, no rejections means all resolved
    runResolutionCallbacks();

    self.state = 'resolved';
    return;
  }

  function runErrorCallback(reason){
    config.error(reason);
  }

  function runResolutionCallbacks(){
    //run thens
    let previousResult = [];
    let result;
    config.returnValues = config.thenArray.map(function(callback){
      //using this block to chain the return values thru then calls
      if(previousResult.length > 0){
        result = callback(previousResult.pop());
      }
      else{
        result = callback();
      }
      previousResult.push(result);
      return result;
    });

    //run done
    config.done(previousResult.pop(),config.returnValues);
  }

  //init

  //add passed deferreds to queue
  passedDeferreds.forEach(function(deferred){
    self.add(deferred);
  })

  //start checking queue status
  updateState();

  return this;
}
