/**
 * To debug this file (from document root):
 *
 * $ node-inspector
 * $ mocha --debug-brk
 *
 */
require('source-map-support').install({
  handleUncaughtExceptions: false
});
//global.Orgy = require("../../dist/orgy.devel.js");
global.Orgy = require("../../src/main.js");
global.chai = require('chai');
global.expect = chai.expect;
global.assert = require("assert");


Orgy.config({
  //SET DOM CONTEXT TO MODIFY [ONLY NEEDED IN NODEJS]
  document : (function(){
    var cheerio = require('cheerio');
    return global.$ = cheerio.load("<html><head></head><body></body></html>");
  }())
  ,debug_mode : 1
});

var owd = process.cwd();
process.chdir(owd + "/demos");

var Test = require('../test.class.js');
var deps = require('../../demos/node.queue.js').deps;

var q = Orgy.queue(deps,{
  id : "some-que-id"
});

//Change back to original cwd
process.chdir(owd);

console.log("Changed working directory back to: "+owd);

Test.describe(q,deps);
