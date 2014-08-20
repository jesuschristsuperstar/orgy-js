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

var Test = require('../test.class.js');

Orgy.configure({
    basepath : './demos/data'
});

var q = Orgy.queue(Test.deps,{
    id : "some-que-id"
});

Test.describe(q,Test.deps);