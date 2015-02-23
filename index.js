'use strict';

var https = require('https');

var GOOGLE_BOOKS_API_BASE = 'www.googleapis.com';
var GOOGLE_BOOKS_API_VOLUMES = '/books/v1/volumes';

function resolve(isbn, callback) {
  var requestOptions = {
    host: GOOGLE_BOOKS_API_BASE,
    path: GOOGLE_BOOKS_API_VOLUMES + '?q=isbn:' + isbn
  };

  var request = https.request(requestOptions, function(response) {
    if (response.statusCode !== 200) {
      return callback(new Error('wrong response code: ' + response.statusCode));
    }

    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    })

    response.on('end', function() {
      var books = JSON.parse(body);

      if (!books.totalItems) {
        return callback(new Error('no books found with isbn: ' + isbn));
      }

      var book = books.items[0].volumeInfo;
      return callback(null, book);
    })
  });

  request.on('error', function(err) {
    return callback(err);
  })

  request.end();
}

module.exports = {
  resolve: resolve
};
