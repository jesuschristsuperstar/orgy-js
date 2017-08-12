const deferred = require('./deferred');

const queue = function(passedDeferreds){

  //public props
  const self = this;
  this.state = 'pending';

  //private props
  let config = {}:
  config.checkInterval = 100; //time to wait between queue checks
  config.upstream = {};
  config.returnValues = [];
  config.thenArray = [];
  config.done = function(){};
  config.error = function(){};

  this.add = function(deferred){
    config.upstream[deferred.id] = deferred;
  }

  this.remove = function(deferred){
    //get id of deferred
    let id = deferred.id; 

    //remove from upstream
    delete config.upstream[id]; 
  }

  this.then = function(callback){
    config.thenArray.push(callback);
  }

  this.done = function(callback){
    config.done = callback;
  }

  this.error = function(callback){
    config.error = callback;
  }

  function updateState(){
    
    let keys = Object.keys(self.upstream);

    //check rejections
    for(let i = 0; i < keys.length; i++){
      //run error callback and exit if any deps rejected
      if (self.upstream[keys[i]].state == 'rejected'){
        self.state = 'rejected';
        runErrorCallbacks(); 
        return;
      }
    }

    //check pendings
    for(let i = 0; i < keys.length; i++){
      //run error callback and exit if any deps rejected
      if (self.upstream[keys[i]].state == 'pending'){
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


  function runErrorCallbacks(){
    config.error();
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
    config.upstream[deferred.id] = deferred;
  }

  //start checking queue status
  updateState();
}
