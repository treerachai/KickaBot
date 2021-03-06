// npm modules
var Bot = require('node-telegram-bot');
var _ = require('lodash');

// Custom modules
var utils = require('./utils');

var self = module.exports = {
    buildMatchKeyboard: function buildMatchKeyboard(feed) {
        var matches = feed.matches.filter(function(el) {
            return el.match_status === 'FT';
        });
        var rows = [];

        _.each(matches.reverse(), function(standing, i) {
            rows.push([String.format('{0} vs {1}, {2}',
                self.getShortName(standing.match_localteam_name),
                self.getShortName(standing.match_visitorteam_name),
                standing.match_date)]);
        });

        return rows;
    },
    buildTeamKeyboard: function buildTeamKeyboard(feed) {
        var standings = feed.teams.filter(function(el) {
            return +(el.stand_team_id) !== 0;
        });
        var rows = [];
        var cols = [];
        var width = 2;

        _.each(_.sortBy(standings, 'stand_team_name'), function(standing, i) {
            if (i % width === 0) {
                if (i > 0) {
                    rows.push(cols);
                }
                cols = [];
            }

            cols.push(self.getShortName(standing.stand_team_name));
        });

        if (cols.length > 0) {
            rows.push(cols);
        }

        return rows;
    },
    getDate: function getDate(formattedDate) {
        var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
        var date = new Date(formattedDate.replace(pattern, '$3-$2-$1T00:00:00Z'));

        return date;
    },
    /**
     * Returns the full name of a football team where a shortened version may have been input
     * @param  {string} short_name The shortened team name
     * @return {string}      The full team name
     */
    getFullName: function getFullName(shortName) {
        var fullName;
        switch (shortName.toLowerCase()) {
            case 'villa':
                fullName = 'Aston Villa';
                break;
            case 'c. palace':
            case 'c palace':
            case 'palace':
                fullName = 'Crystal Palace';
                break;
            case 'man. united':
            case 'man united':
            case 'man. u':
            case 'man u':
                fullName = 'Manchester United';
                break;
            case 'man. city':
            case 'man city':
            case 'man. c':
            case 'man c':
                fullName = 'Manchester City';
                break;
            case 'newcastle':
                fullName = 'Newcastle Utd';
                break;
            case 'stoke':
                fullName = 'Stoke City';
                break;
            case 'spurs':
                fullName = 'Tottenham';
                break;
            default:
                fullName = utils.capitalise(shortName);
                break;
        }

        return fullName;
    },
    /**
     * Returns a shortened team name for rendering purposes
     * @param  {string} name The full team name
     * @return {string}      If defined, the shortened team name, otherwise the full team name
     */
    getShortName: function getShortName(name) {
        var shortName;

        switch (name) {
            case 'Crystal Palace':
                shortName = 'C. Palace';
                break;
            case 'Manchester United':
                shortName = 'Man. United';
                break;
            case 'Manchester City':
                shortName = 'Man. City';
                break;
            case 'Newcastle Utd':
                shortName = 'Newcastle';
                break;
            default:
                shortName = name;
                break;
        }

        return shortName;
    },
    /**
     * Renders a table of upcoming fixtures:
     * |---------------------------|
     * | Monday, 07 Dec 2015       |
     * |===========================|
     * | Everton v C. Palace       |
     * | 20:00             2151488 |
     * |===========================|
     * | Saturday, 12 Dec 2015     |
     * |===========================|
     * | Norwich v Everton         |
     * | 12:45             2152438 |
     * |---------------------------|
     * | C. Palace v Southampton   |
     * | 15:00             2152439 |
     * |---------------------------|
     * | Man. City v Swansea       |
     * | 15:00             2152440 |
     * |---------------------------|
     * | Sunderland v Watford      |
     * | 15:00             2152441 |
     * |---------------------------|
     * | West Ham v Stoke City     |
     * | 15:00             2152442 |
     * |---------------------------|
     * | Bournemouth v Man. United |
     * | 17:30             2152443 |
     * |===========================|
     * | Sunday, 13 Dec 2015       |
     * |===========================|
     * | Aston Villa v Arsenal     |
     * | 13:30             2152744 |
     * |---------------------------|
     * | Liverpool v West Brom     |
     * | 16:00             2152745 |
     * |---------------------------|
     * | Tottenham v Newcastle     |
     * | 16:00             2152746 |
     * |===========================|
     * | Monday, 14 Dec 2015       |
     * |===========================|
     * | Leicester v Chelsea       |
     * | 20:00             2152747 |
     * |---------------------------|
     *
     * @param  {[type]}   error    [description]
     * @param  {[type]}   feed     [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    renderFixtures: function renderFixtures(error, feed, callback) {
        if (error) {
            return callback(error);
        }

        if (feed && typeof(feed.matches) !== 'undefined') {
            var today = utils.today();

            var matches = feed.matches.filter(function(el) {
                return self.getDate(el.match_formatted_date) >= today;
            });

            if (matches.length === 0) {
                return callback(new Error('No fixtures currently available, please try again later'));
            }

            var buffer = [];
            var currentDate = new Date(1970, 0, 1);

            _.each(matches, function(match, i) {
                var matchDate = self.getDate(match.match_formatted_date);

                if (matchDate > currentDate) {
                    if (i > 0)
                        buffer.push('\r\n');

                    buffer.push('*' + match.match_date + '*\r\n');
                    currentDate = matchDate;
                }

                buffer.push(String.format('{0} | {1} vs {2}\r\n',
                    match.match_time, match.match_localteam_name,
                    match.match_visitorteam_name));
            });

            if (typeof(callback) === 'function') {
                return callback(null, buffer.join(''));
            }
        } else if (typeof(callback) === 'function') {
            return callback(new Error('Couldn\'t retrieve fixtures, please try again later'));
        }
    },
    /**
     * Renders match statistics:
     * |---------------------------------------|
     * |           | Man. United | Southampton |
     * |---------------------------------------|
     * | Possess.  |         65% |         35% |
     * | Shots     |          11 |           8 |
     * | On target |           4 |           3 |
     * | Corners   |           7 |           5 |
     * | Offsides  |           3 |           1 |
     * | Saves     |           2 |           5 |
     * | Fouls     |           6 |           4 |
     * | Yellows   |           1 |           0 |
     * | Reds      |           0 |           0 |
     * |---------------------------------------|
     * @param  {Object}   err    [description]
     * @param  {[type]}   feed     [description]
     * @param  {[type]}   teamName [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    renderMatchStats: function renderMatchStats(error, feed, teams, callback) {
        var commentary = feed.commentaries[0];

        // We couldn't recognise the provided team name
        if (!commentary) {
            error = new Error('Match name wasn\'t recognised, please try again.');

            return callback(error);
        }
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var home_team_stats = commentary.comm_match_stats.localteam;
        var away_team_stats = commentary.comm_match_stats.visitorteam;
        var width = 39;
        var divider = self.writeDivider(width);
        var mark = divider.length - 2;
        //var lastDivider = divider.slice(0, mark) + '```' + divider.slice(mark);
        var lastDivider = divider + '```';
        var firstDivider = String.format('```\n{0}', divider);
        var buffer = [firstDivider];
        // Title row
        var cells = [{
            'text': '',
            'width': 9
        },
        {
            'text': teams.home.name,
            'width': 11
        },
        {
            'text': teams.away.name,
            'width': 11
        }];
        // Match stats
        buffer.push(self.writeRow(cells));
        buffer.push(divider);
        utils.mergeArrayValues([
            'Goals',
            teams.home.score,
            teams.away.score
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Possess.',
            home_team_stats.possestiontime.total,
            away_team_stats.possestiontime.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Shots',
            home_team_stats.shots.total,
            away_team_stats.shots.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'On Target',
            home_team_stats.shots.ongoal,
            away_team_stats.shots.ongoal
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Corners',
            home_team_stats.corners.total,
            away_team_stats.corners.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Offsides',
            home_team_stats.offsides.total,
            away_team_stats.offsides.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Saves',
            home_team_stats.saves.total,
            away_team_stats.saves.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Fouls',
            home_team_stats.fouls.total,
            away_team_stats.fouls.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Yellows',
            home_team_stats.yellowcards.total,
            away_team_stats.yellowcards.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Reds',
            home_team_stats.redcards.total,
            away_team_stats.redcards.total
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        buffer.push(lastDivider);
        callback(null, buffer.join(''));
    },
    renderResults: function renderResults(error, feed, callback) {
        if (error) {
            return callback(error);
        }

        if (feed && typeof(feed.matches) !== 'undefined') {
            var today = utils.today();
            //var today = new Date('2015-09-19T00:00:00Z');
            var matches = feed.matches.filter(function(el) {
                return self.getDate(el.match_formatted_date) <= today && el.match_status === 'FT';
            });

            if (matches.length === 0) {
                return callback(new Error('No results currently available, please try again later'));
            }

            var buffer = [];
            var currentDate = new Date(1970, 0, 1);
            var padding = Array(18).join(' ');

            _.each(matches.reverse(), function(match, i) {
                var matchDate = self.getDate(match.match_formatted_date);
                if (matchDate < currentDate || i === 0) {
                    if (i > 0)
                        buffer.push('```\r\n');

                    buffer.push('*' + match.match_date + '*\r\n```');
                    currentDate = matchDate;
                }

                buffer.push(String.format('{0} {1}-{2} {3}\r\n',
                    utils.pad(padding, match.match_localteam_name, true),
                    match.match_localteam_score, match.match_visitorteam_score,
                    match.match_visitorteam_name));
            });

            buffer.push('```');
            if (typeof(callback) === 'function') {
                callback(null, buffer.join(''));
            }
        } else if (typeof(callback) === 'function') {
            callback(new Error('Couldn\'t retrieve results, please try again later'));
        }
    },
    /**
     * Renders a league table:
     * |-----------------------------------|
     * | #  | Team        | P  | GD  | Pts |
     * |-----------------------------------|
     * | 1  | Man. City   | 8  | 16  | 29  |
     * | 2  | Leicester   | 7  | 8   | 29  |
     * | 3  | Man. United | 6  | 10  | 28  |
     * | 4  | Arsenal     | 6  | 12  | 27  |
     * |-----------------------------------|
     * | 5  | Tottenham   | 8  | 13  | 25  |
     * |-----------------------------------|
     * | 6  | Liverpool   | 7  | 3   | 23  |
     * | 7  | C. Palace   | 8  | 5   | 22  |
     * | 8  | West Ham    | 7  | 4   | 22  |
     * | 9  | Everton     | 7  | 8   | 21  |
     * | 10 | Southampton | 7  | 3   | 20  |
     * | 11 | Watford     | 7  | -1  | 19  |
     * | 12 | Stoke City  | 6  | -3  | 19  |
     * | 13 | West Brom   | 7  | -5  | 18  |
     * | 14 | Chelsea     | 7  | -6  | 15  |
     * | 15 | Swansea     | 7  | -5  | 14  |
     * | 16 | Norwich     | 7  | -8  | 13  |
     * | 17 | Sunderland  | 7  | -10 | 12  |
     * |-----------------------------------|
     * | 18 | Bournemouth | 7  | -13 | 10  |
     * | 19 | Newcastle   | 7  | -16 | 10  |
     * | 20 | Aston Villa | 7  | -15 | 5   |
     * |-----------------------------------|
     * @param  {Object}   error    An error object
     * @param  {Object}   feed     The feed
     * @param  {Function} callback The callback function
     */
    renderTable: function renderTable(error, feed, callback) {
        //Check for error
        if (error) {
            return logger.warn(String.format('Error in renderTable function\r\n{0}', error));
        }

        var standings = feed.teams.filter(function(el) {
            return +(el.stand_team_id) !== 0;
        });
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var width = 35;
        var divider = self.writeDivider(width);
        var headers = [{
            'text': '#',
            'width': 2
        }, {
            'text': 'Team',
            'width': 11
        }, {
            'text': 'P',
            'width': 2
        }, {
            'text': 'GD',
            'width': 3
        }, {
            'text': 'Pts',
            'width': 3
        }];
        var head = String.format('``` {0}{1}', divider, self.writeRow(headers));
        var buffer = [head];
        var currentDesc = '';
        var mark = divider.length - 2;
        var lastDivider = divider.slice(0, mark) + '```' + divider.slice(mark);

        _.each(standings, function(standing, i) {
            var standingDesc = standing.stand_desc;
            var columns = [{
                'text': standing.stand_position,
                'width': 2
            }, {
                'text': self.getShortName(standing.stand_team_name),
                'width': 11
            }, {
                'text': standing.stand_overall_gp,
                'width': 2
            }, {
                'text': standing.stand_gd,
                'width': 3
            }, {
                'text': standing.stand_points,
                'width': 3
            }];

            if (currentDesc !== standingDesc && i != 3) {
                buffer.push(divider);
                currentDesc = standingDesc;
            }
            buffer.push(self.writeRow(columns));
        });
        buffer.push(lastDivider);
        callback(null, buffer.join(''));
    },
    /**
     * Renders team statistics:
     * |---------------------------------|
     * | Man. United                     |
     * |---------------------------------|
     * | League # | Points | Recent form |
     * | 3        | 19     | WWDLL       |
     * |---------------------------------|
     * |       | GP | W  | D  | L  | GD  |
     * | Total | 5  | 2  | 1  | 2  | 3   |
     * | Home  | 3  | 2  | 0  | 1  | 4   |
     * | Away  | 2  | 0  | 1  | 1  | -1  |
     * |---------------------------------|
     * @param  {Object}   err    [description]
     * @param  {[type]}   feed     [description]
     * @param  {[type]}   teamName [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    renderTeamStats: function renderTeamStats(error, feed, teamName, callback) {
        var standings = feed.teams.filter(function(el) {
            return el.stand_team_name == teamName;
        });

        // We couldn't recognise the provided team name
        if (standings.length != 1) {
            error = new Error('Team name wasn\'t recognised, please try again.');

            return callback(error);
        }
        // Markdown code blocks require a space after the opening block and a
        // non-whitespace character after the closing block
        var team = standings[0];
        var width = 33;
        var divider = self.writeDivider(width);
        var mark = divider.length - 2;
        //var lastDivider = divider.slice(0, mark) + '```' + divider.slice(mark);
        var lastDivider = divider + '```';
        var firstDivider = String.format('```\n{0}', divider);
        var buffer = [firstDivider];
        var cells = [{
            'text': team.stand_team_name,
            'width': width - 2
        }];

        // Title row
        buffer.push(self.writeRow(cells));
        buffer.push(divider);
        cells = [{
            'text': 'League #',
            'width': 8
        }, {
            'text': 'Points',
            'width': 6
        }, {
            'text': 'Recent form',
            'width': 11
        }];
        // Team stats
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            team.stand_position,
            team.stand_points,
            team.stand_recent_form
        ], cells, 'text');
        // cells[0].text = team.stand_recent_position;
        // cells[1].text = team.stand_recent_points;
        // cells[2].text = team.stand_recent_form;
        buffer.push(self.writeRow(cells));
        buffer.push(divider);
        cells = [{
            'text': '',
            'width': 5
        }, {
            'text': 'GP',
            'width': 2
        }, {
            'text': 'W',
            'width': 2
        }, {
            'text': 'D',
            'width': 2
        }, {
            'text': 'L',
            'width': 2
        }, {
            'text': 'GD',
            'width': 3
        }];
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Total',
            team.stand_overall_gp,
            team.stand_overall_w,
            team.stand_overall_d,
            team.stand_overall_l,
            team.stand_gd
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Home',
            team.stand_home_gp,
            team.stand_home_w,
            team.stand_home_d,
            team.stand_home_l, (+team.stand_home_gs - +team.stand_home_ga) + ''
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        utils.mergeArrayValues([
            'Away',
            team.stand_away_gp,
            team.stand_away_w,
            team.stand_away_d,
            team.stand_away_l, (+team.stand_away_gs - +team.stand_away_ga) + ''
        ], cells, 'text');
        buffer.push(self.writeRow(cells));
        buffer.push(lastDivider);
        callback(null, buffer.join(''));
    },
    writeDivider: function writeDivider(width) {
        var divider = String.format('|{0}|\n', utils.pad(Array(width + 1).join('-')));

        return divider;
    },
    // Takes an array of column values and formats into a
    // fixed-width table row
    writeRow: function writeRow(columns) {
        var values = [];

        //   Object.keys(columns).forEach(function(key, index) {
        //       logger.info(String.format('Key: {0}, value: {1}', key, this[key]));
        //       var width = this[key];
        //       var column = String.format('| {0} ', utils.pad(Array(width + 1).join(' '),
        //           key, false));
        //   }, columns);
        for (var i = 0; i < columns.length; i++) {
            var width = columns[i].width;
            var column = String.format('| {0} ', utils.pad(Array(width + 1).join(' '),
                columns[i].text, false));

            values.push(column);
        }
        values.push('|\n');

        return values.join('');
    }
};

if (!String.format) {
    String.format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}
