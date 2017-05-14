'use strict';

var request = require('request');

var defaultOptions = {
  poll: {
    maxSockets: 500,
  },
  timeout: 5000
};

// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  Object.assign = function(target, varArgs) { // .length of function is 2
    'use strict';
    if (target == null) { // TypeError if undefined or null
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) { // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

var GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
var GOOGLE_BOOKS_API_BOOK = '/books/v1/volumes';

var OPENLIBRARY_API_BASE = 'https://openlibrary.org';
var OPENLIBRARY_API_BOOK = '/api/books';

var WORLDCAT_API_BASE = 'http://xisbn.worldcat.org';
var WORLDCAT_API_BOOK = '/webservices/xid/isbn';

function _resolveGoogle(isbn, callback) {
  var requestOptions = Object.assign({
    url: GOOGLE_BOOKS_API_BASE + GOOGLE_BOOKS_API_BOOK + '?q=isbn:' + isbn
  }, defaultOptions);

  request(requestOptions, function(error, response, body) {
    if (error) {
      return callback(error);
    }

    if (response.statusCode !== 200) {
      return callback(new Error('wrong response code: ' + response.statusCode));
    }

    var books = JSON.parse(body);

    if (!books.totalItems) {
      return callback(new Error('no books found with isbn: ' + isbn));
    }

    // In very rare circumstances books.items[0] is undefined (see #2)
    if (!books.items || books.items.length === 0) {
      return callback(new Error('no volume info found for book with isbn: ' + isbn));
    }

    var book = books.items[0].volumeInfo;
    return callback(null, book);
  });
}

function _resolveOpenLibrary(isbn, callback) {

  var standardize = function standardize(book) {
    var standardBook = {
      'title': book.details.title,
      'publishedDate': book.details.publish_date,
      'authors': [],
      'description': book.details.subtitle,
      'industryIdentifiers': [],
      'pageCount': book.details.number_of_pages,
      'printType': 'BOOK',
      'categories': [],
      'imageLinks': {
          'smallThumbnail': book.thumbnail_url,
          'thumbnail': book.thumbnail_url
      },
      'previewLink': book.preview_url,
      'infoLink': book.info_url
    };

    if (book.details.publishers) {
      standardBook.publisher = book.details.publishers[0];
    } else {
      standardBook.publisher = '';
    }

    if (book.details.authors) {
      book.details.authors.forEach(function (author) {
        standardBook.authors.push(author.name);
      });
    }

    if (book.details.languages) {
      book.details.languages.forEach(function (language) {
        switch (language.key) {
          case '/languages/eng':
            standardBook.language = 'en';
            break;
          case '/languages/spa':
            standardBook.language = 'es';
            break;
          case '/languages/fre':
            standardBook.language = 'fr';
            break;
          default:
            standardBook.language = 'unknown';
            break;
        }
      });
    } else {
      standardBook.language = 'unknown';
    }

    return standardBook;
  };

  var requestOptions = Object.assign({
    url: OPENLIBRARY_API_BASE + OPENLIBRARY_API_BOOK + '?bibkeys=ISBN:' + isbn + '&format=json&jscmd=details'
  }, defaultOptions);

  request(requestOptions, function(error, response, body) {
    if (error) {
      return callback(error);
    }

    if (response.statusCode !== 200) {
      return callback(new Error('wrong response code: ' + response.statusCode));
    }

    var books = JSON.parse(body);
    var book = books['ISBN:' + isbn];

    if (!book) {
      return callback(new Error('no books found with isbn: ' + isbn));
    }

    return callback(null, standardize(book));
  });
}

function _resolveWorldcat(isbn, callback) {

  var standardize = function standardize(book) {
    var standardBook = {
      'title': book.title,
      'publishedDate': book.year,
      'authors': [],
      'description': null,
      'industryIdentifiers': [],
      'pageCount': null,
      'printType': 'BOOK',
      'categories': [],
      'imageLinks': {
      },
      'publisher': book.publisher
    };

    if (book.author) {
      standardBook.authors.push(book.author);
    }

    switch (book.lang) {
      case 'eng':
        standardBook.language = 'en';
        break;
      case 'spa':
        standardBook.language = 'es';
        break;
      case 'fre':
        standardBook.language = 'fr';
        break;
      default:
        standardBook.language = 'unknown';
        break;
    };

    return standardBook;
  };

  var requestOptions = Object.assign({
    url: WORLDCAT_API_BASE + WORLDCAT_API_BOOK + '/' + isbn + '?method=getMetadata&fl=*&format=json'
  }, defaultOptions);

  request(requestOptions, function(error, response, body) {
    if (error) {
      return callback(error);
    }

    if (response.statusCode !== 200) {
      return callback(new Error('wrong response code: ' + response.statusCode));
    }

    var books = JSON.parse(body);

    if (books.stat !== 'ok') {
      return callback(new Error('no books found with isbn: ' + isbn));
    }

    var book = books.list[0];

    return callback(null, standardize(book));
  });
}

// XXX refactor this code if more providers are added.

function resolve(isbn, callback) {
  _resolveGoogle(isbn, function(err, book) {
    if (err) {
      return _resolveOpenLibrary(isbn, function (err, book) {
        if (err) {
          return _resolveWorldcat(isbn, callback);
        }
        return callback(null, book);
      });
    }
    return callback(null, book);
  });
}

module.exports = {
  resolve: resolve
};
