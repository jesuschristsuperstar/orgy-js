const deferred = function(resolve,reject,options){

  const self = this;
  const md5 = require('blueimp-md5');

  //get a hash of the callbacks in order to generate a unique id
  this.id = md5(resolve.toString() + reject.toString()).substr(0,10);
  
  //initialize at pending state
  this.state = 'pending'; //pending,resolved,rejected
  
  this.resolve = function(){
    self.state = 'resolved';
    resolve(arguments);
  }

  this.reject = function(){
    self.state = 'rejected'; 
    reject(arguments);
  }

  if(options.timeout){
    setTimeout(function(){
      self.reject();
      //unset self.reject since already called
      self.reject = function(){};
    },options.timeout);
  }
}

module.exports = deferred;
