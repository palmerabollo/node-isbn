'use strict';

var isbn = require('../index');

var input = process.argv.slice(2)[0] || '0735619670';

isbn.resolve(input, function (err, book) {
    if (err) {
        console.log('Book isbn:' + input + ' not found', err);
    } else {
        console.log('Book isbn:' + input + ' found %j', book);
    }
});
