'use strict';

var axios = require('axios');

var defaultOptions = {
  poll: {
    maxSockets: 500,
  },
  timeout: 5000
};

var GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
var GOOGLE_BOOKS_API_BOOK = '/books/v1/volumes';

var OPENLIBRARY_API_BASE = 'https://openlibrary.org';
var OPENLIBRARY_API_BOOK = '/api/books';

var WORLDCAT_API_BASE = 'http://xisbn.worldcat.org';
var WORLDCAT_API_BOOK = '/webservices/xid/isbn';

function _resolveGoogle(isbn, options) {
  var requestOptions = Object.assign({}, defaultOptions, options, {
    url: GOOGLE_BOOKS_API_BASE + GOOGLE_BOOKS_API_BOOK + '?q=isbn:' + isbn
  });

  return axios.request(requestOptions).then(function (response) {
    if (response.status !== 200) {
      return Promise.reject(new Error('wrong response code: ' + response.status));
    }

    var books = response.data;

    if (!books.totalItems) {
      return Promise.reject(new Error('no books found with isbn: ' + isbn));
    }

    // In very rare circumstances books.items[0] is undefined (see #2)
    if (!books.items || books.items.length === 0) {
      return Promise.reject(new Error('no volume info found for book with isbn: ' + isbn));
    }

    var book = books.items[0].volumeInfo;
    return Promise.resolve(book);
  });
}

function _resolveOpenLibrary(isbn, options, callback) {

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

  var requestOptions = Object.assign({}, defaultOptions, options, {
    url: OPENLIBRARY_API_BASE + OPENLIBRARY_API_BOOK + '?bibkeys=ISBN:' + isbn + '&format=json&jscmd=details'
  });

  return axios.request(requestOptions).then(function(response) {
    if (response.status !== 200) {
      return Promise.reject(new Error('wrong response code: ' + response.status));
    }

    var books = response.data
    var book = books['ISBN:' + isbn];

    if (!book) {
      return Promise.reject(new Error('no books found with isbn: ' + isbn));
    }

    return Promise.resolve(standardize(book));
  });
}

function _resolveWorldcat(isbn, options, callback) {

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

  var requestOptions = Object.assign({}, defaultOptions, options, {
    url: WORLDCAT_API_BASE + WORLDCAT_API_BOOK + '/' + isbn + '?method=getMetadata&fl=*&format=json'
  });

  return axios.request(requestOptions).then(function(response) {
    if (response.status !== 200) {
      return Promise.reject(new Error('wrong response code: ' + response.statusCode));
    }

    var books = response.data;

    if (books.stat !== 'ok') {
      return Promise.reject(new Error('no books found with isbn: ' + isbn));
    }

    var book = books.list[0];

    return Promise.resolve(standardize(book));
  });
}

function resolve(isbn) {
  const options = arguments.length === 3 ? arguments[1] : null;
  const callback = arguments.length === 3 ? arguments[2] : arguments[1];

  var promise = _resolveGoogle(isbn, options)
  .catch(function (err) {
    return _resolveOpenLibrary(isbn, options);
  })
  .catch(function (err) {
    return _resolveWorldcat(isbn, options);
  })
  .then(function (book) {
    if (typeof(callback) === 'function') {
      callback(null, book);
    } else {
      return Promise.resolve(book);
    }
  })
  .catch(function (err) {
    if (typeof(callback) === 'function') {
      // Error will be handled by callback
      callback(err, null);
    } else {
      // Re-raise the error for the next .then/.catch in the chain
      return Promise.reject(err);
    }
  })

  if (typeof(callback) !== 'function') {
    return promise;
  }
}

module.exports = {
  resolve: resolve
};
