var globule = require("globule");
global.jsdom = require("jsdom").jsdom;
global.doc = jsdom("starting body content");
global.window = doc.defaultView;
global.document = global.window.document;
global.$ = require("jquery");
global.chai = require("chai");
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should();
global.Orgy = require("./../src/main.js");

process.chdir("./test");

//run all tests in top level of current directory
var result = globule.find(["*.js","!mocha.conf.js"]);
console.warn("Found "+result.length+" files.");
result.forEach(function(x){
  require("./"+x);
})
