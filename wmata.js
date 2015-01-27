// Description:
//  Because public transit.
//
// Commands:
//  hubot bus me - Where is my bus
//  hubot metro me - Show train predictions for Gallery Place
//  hubot metro me <line> - Show train predictions for Gallery place for the specififed line

'use strict';
var module = module || {};
var require = require || function() {};
var _ = require('lodash');

// For each user wanting bus information, add their user id (we use slack),
// with their bus stop and the line they use. User id 1 is for running
// hubot locally.

var users = {
    'UXXXXXXXX': {
        stop: 1001105,
        line: 'P6'
    },
    '1': {
        stop: 1001105,
        line: 'P6'
    }
};

var busUrl = 'https://api.wmata.com/NextBusService.svc/json/jPredictions?StopID=';
var metroUrl = 'https://api.wmata.com/StationPrediction.svc/json/GetPrediction/';
var key = '&api_key=<your WMATA developer subscription key goes here>';

module.exports = function(robot) {
    robot.respond(/bus me/i, function(msg) {
        getBussesForUser(msg);
    });

    robot.respond(/metro me(.*)/i, function(msg) {
        getMetroPredictions(msg);
    });
};

var getBussesForUser = function(msg) {
    var user = users[msg.message.user.id];
    if (!user) {
        msg.send('I don\'t have bus info for you, ' + msg.message.user.name.toString());
        msg.send('Pull requests accepted.');
        return;
    }
    msg.http(busUrl + user.stop + key).get()(function(err, res, body) {
        if (err) {
            msg.send('Dang! Something went wrong.');
            return;
        }
        body = JSON.parse(body);
        var stop = body.StopName;
        var predictions = _.pluck(_.filter(body.Predictions, function(prediction) {
            return prediction.RouteID == user.line;
        }), 'Minutes');
        msg.send(user.line + ' busses at ' + stop + ' in ' + predictions.join(', ') + ' minutes');
    });
};

// F01: Gallery Place Green/Yellow
// B01: Gallery Place Red
// C01: Metro Center Red (for later)
// A01: Metro Center Orange/Blue/Silver (for later)
var getMetroPredictions = function(msg) {
    var line = msg.match[1].trim().toLowerCase();

    var lineCodes = {
        'RD': 'Red',
        'GR': 'Green',
        'YL': 'Yellow',
        'BL': 'Blue',
        'OR': 'Orange',
        'SV': 'Silver'
    };

    var lines = {
        'red': 'RD',
        'green': 'GR',
        'yellow': 'YL',
        'blue': 'BL',
        'orange': 'OR',
        'silver': 'SV'
    };

    if (line && !lines[line]) {
        msg.send('Foolish person! The ' + line + ' line doesn\'t exist!');
        return;
    }

    msg.http(metroUrl + 'F01,B01?' + key).get()(function(err, res, body) {
        if (err) {
            msg.send('Dang! Something went wrong.');
            return;
        }
        var trains = {};
        body = JSON.parse(body);
        body.Trains.forEach(function(train) {
            if (!trains[train.Line]) {
                trains[train.Line] = [];
            }
            trains[train.Line].push(train);
        });

        var printTrains = function(Line) {
            if (!lineCodes[Line]) {
                return;
            }
            msg.send(lineCodes[Line] + ' Line Trains:');

            trains[Line].forEach(function(train) {
                if (train.Min != 'ARR' && train.Min != 'BRD') {
                    train.Min = train.Min + ' min';
                }
                msg.send('    ' + train.Min + ' to ' + train.Destination);
            });
        };

        if (line && lines[line]) {
            printTrains(lines[line]);
        } else {
            for (var Line in trains) {
                printTrains(Line);
            }
        }
    });
};