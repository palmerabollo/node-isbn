'use strict';

var isbn = require('../index');

// This one is resolved by Google Books API
isbn.resolve('0735619670', function (err, book) {
    if (err) {
        console.log('Book isbn:0735619670 not found', err);
    } else {
        console.log('Book isbn:0735619670 found %j', book);
    }
});

// This one is resolved by Open Library API
isbn.resolve('9780394584218', function (err, book) {
    if (err) {
        console.log('Book isbn:9780394584218 not found', err);
    } else {
        console.log('Book isbn:9780394584218 found %j', book);
    }
});
