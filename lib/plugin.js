'use strict';

var _ = require('lodash'),
    q = require('q'),
    Allure = require('allure-js-commons'),
    Attachment = require('allure-js-commons/beans/attachment'),
    writer = require('allure-js-commons/writer'),
    allureReporter = new Allure(),
    fs = require('fs');

function AllureReporter(gemini) {

    var suites = {},
        runner;

    gemini.on('startRunner', function(geminiRunner) {
        runner = geminiRunner;
    });

    runner.on('beginSuite', function(result) {
        var sutePath = result.suite.path.join('/');
        console.log(sutePath);
        allureReporter.startSuite(sutePath);
        suites[sutePath] = q();
    });

    runner.on('endSuite', function(result) {
        suites[result.suite.path.join('/')].then(function() {
            allureReporter.endSuite();
        });
    });

    runner.on('endTest', function(result) {
        allureReporter.startCase(result.state.name);
        if (result.equal) {
            allureReporter.addAttachment('actual', fs.readFileSync(result.currentPath), 'image/png');
            allureReporter.endCase('passed');
        } else {
            console.log('failed test', result.state.name);
            var currentTest = allureReporter.getCurrentSuite().currentTest;
            allureReporter.addAttachment('actual', fs.readFileSync(result.currentPath), 'image/png');
            allureReporter.addAttachment('expected', fs.readFileSync(result.referencePath), 'image/png');
            var sutePath = result.suite.path.join('/');
            suites[sutePath] = suites[sutePath].then(function() {
                console.log('saving diff', result.state.name);
                return result.saveDiffTo().then(function() {
                    var name = writer.writeBuffer(allureReporter.options.targetDir, buffer, '.png'),
                        attachment = new Attachment('diff', name, buffer.length, 'image/png');
                    currentTest.addAttachment(attachment);
                    console.log('diff done', result.state.name);
                });
            }, function(e) {
                console.log(e);
            });
            allureReporter.endCase('failed', new Error('screenshots not match'));
        }
    });

}

module.exports = AllureReporter;

