// Core modules
var http = require('http');

// npm modules
var Bot = require('node-telegram-bot');
var dateFormat = require('dateformat');
var config = require('config');
var _ = require('lodash');
var util = require('util');

// Custom modules
var Chat = require('./lib/chat');
var utils = require('./lib/utils');

(function() {
    var telegramConfig = config.get('Server.telegram');
    var bot = new Bot({
            token: telegramConfig.token
        })
        .on('message', function(message) {
            processMessage(message);
        })
        .on('start', function(message) {
            bot.start();
        })
        .on('error', function(message) {
            utils.log('ERROR: ' + message);
        })
        .on('fixtures', function(message, args) {
            chat.initCommand(message, args, 'fixtures');
        })
        .on('matchstats', function(message, args) {
            chat.initCommand(message, args, 'matchstats');
        })
        .on('results', function(message, args) {
            chat.initCommand(message, args, 'results');
        })
        .on('table', function(message, args) {
            chat.initCommand(message, args, 'table');
        })
        .on('teamstats', function(message, args) {
            chat.initCommand(message, args, 'teamstats');
        })
        .enableAnalytics(config.get('Server.botanio').token)
        .start();

    var chat = new Chat(bot);
    var steps = {
        'fixtures': [chat.sendFixtures],
        'results': [chat.sendResults],
        'table': [chat.sendTable],
        'matchstats': [chat.requestMatchName, chat.sendMatchStats],
        'teamstats': [chat.requestTeamName, chat.sendTeamStats]
    };
    var processMessage = function(message) {
        var command = chat.getCommand(message);

        if (!command) {
            return;
        }

        utils.log(message);

        // Append the current message if not another command
        if (message.text && message.text.lastIndexOf('/', 0) !== 0) {
            command.args.push(message.text);
            chat.setCommand(message, command);
        }

        var commandSteps = steps[command.name];

        // Execute the appropriate step
        if (commandSteps && commandSteps.length > command.args.length) {
            // call method is needed to execute in correct context
            commandSteps[command.args.length].call(chat, message, command.args);
        }
    };
})();

Date.prototype.format = function(mask, utc) {
    return dateFormat(this, mask, utc);
};

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8090;

if (ipaddress !== '127.0.0.1') {
    console.log(String.format('Starting server on {0}:{1}', ipaddress, port));
    http.createServer(function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end('Nothing to see here...\r\n');
    }).listen(port, ipaddress);
}
