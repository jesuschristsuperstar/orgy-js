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
global.Orgy = require("../../dist/orgy.devel.js");
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

var cwd = process.cwd();
process.chdir(cwd + "/demos");

var Test = require('../test.class.js');

var q = Orgy.queue(Test.deps,{
  id : "some-que-id"
});

//Change back to original cwd
process.chdir(cwd);

Test.describe(q,Test.deps);