'use strict';

const axios = require('axios');

const defaultOptions = {
  poll: {
    maxSockets: 500,
  },
  timeout: 5000
};

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
const GOOGLE_BOOKS_API_BOOK = '/books/v1/volumes';

const OPENLIBRARY_API_BASE = 'https://openlibrary.org';
const OPENLIBRARY_API_BOOK = '/api/books';

const WORLDCAT_API_BASE = 'http://xisbn.worldcat.org';
const WORLDCAT_API_BOOK = '/webservices/xid/isbn';

const PROVIDER_NAMES = {
  GOOGLE: 'google',
  OPENLIBRARY: 'openlibrary',
  WORLDCAT: 'worldcat'
}

const DEFAULT_PROVIDERS = [
  PROVIDER_NAMES.GOOGLE,
  PROVIDER_NAMES.OPENLIBRARY,
  PROVIDER_NAMES.WORLDCAT
]

const PROVIDER_RESOLVERS = {
  [PROVIDER_NAMES.GOOGLE]: _resolveGoogle,
  [PROVIDER_NAMES.OPENLIBRARY]: _resolveOpenLibrary,
  [PROVIDER_NAMES.WORLDCAT]: _resolveWorldcat
}

function _resolveGoogle(isbn, options) {
  const requestOptions = Object.assign({}, defaultOptions, options, {
    url: `${GOOGLE_BOOKS_API_BASE + GOOGLE_BOOKS_API_BOOK}?q=isbn:${isbn}`
  });

  return axios.request(requestOptions).then(({status, data}) => {
    if (status !== 200) {
      throw new Error(`wrong response code: ${status}`);
    }

    const books = data;

    if (!books.totalItems) {
      throw new Error(`no books found with isbn: ${isbn}`);
    }

    // In very rare circumstances books.items[0] is undefined (see #2)
    if (!books.items || books.items.length === 0) {
      throw new Error(`no volume info found for book with isbn: ${isbn}`);
    }

    const book = books.items[0].volumeInfo;
    return book;
  });
}

function _resolveOpenLibrary(isbn, options) {

  const standardize = function standardize(book) {
    const standardBook = {
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
      book.details.authors.forEach(({name}) => {
        standardBook.authors.push(name);
      });
    }

    if (book.details.languages) {
      book.details.languages.forEach(({key}) => {
        switch (key) {
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

  const requestOptions = Object.assign({}, defaultOptions, options, {
    url: `${OPENLIBRARY_API_BASE + OPENLIBRARY_API_BOOK}?bibkeys=ISBN:${isbn}&format=json&jscmd=details`
  });

  return axios.request(requestOptions).then(({status, data}) => {
    if (status !== 200) {
      throw new Error(`wrong response code: ${status}`);
    }

    const books = data;
    const book = books[`ISBN:${isbn}`];

    if (!book) {
      throw new Error(`no books found with isbn: ${isbn}`);
    }

    return standardize(book);
  });
}

function _resolveWorldcat(isbn, options) {

  const standardize = function standardize(book) {
    const standardBook = {
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

  const requestOptions = Object.assign({}, defaultOptions, options, {
    url: `${WORLDCAT_API_BASE + WORLDCAT_API_BOOK}/${isbn}?method=getMetadata&fl=*&format=json`
  });

  return axios.request(requestOptions).then(({status, statusCode, data}) => {
    if (status !== 200) {
      throw new Error(`wrong response code: ${statusCode}`);
    }

    const books = data;

    if (books.stat !== 'ok') {
      throw new Error(`no books found with isbn: ${isbn}`);
    }

    const book = books.list[0];

    return standardize(book);
  });
}

function getBookInfo(providers, isbn, options) {
  const [firstProvider, ...remainingProviders] = providers;

  // Try the first provider..
  const seed = PROVIDER_RESOLVERS[firstProvider](isbn, options);

  // If there are no more providers, get out quickly! 🏃‍♂️
  if (!remainingProviders.length) return seed;

  // ...and set remaining providers as fallbacks!
  return remainingProviders
    .reduce((promise, provider) => {
      return promise.catch(err => PROVIDER_RESOLVERS[provider](isbn, options));
    }, seed);
}

class Isbn {
  constructor() {
    // For usage outside this package!
    this.PROVIDER_NAMES = PROVIDER_NAMES;

    this._resetProviders();
  }

  _resetProviders() {
    this._providers = DEFAULT_PROVIDERS;
  }

  /**
   * Provider API that gets chained before `resolve`. If this is specified, the 
   * `resolve` fn will honor this order.
   * 
   * @param {Array} providers - Array of providers. Must be one of more from `isbn.PROVIDER_NAMES`
   * 
   * @example
   * 
   * ```
   * isbn
   *  .provider([isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.GOOGLE])
   *  .resolve(...)
   * ```
   */
  provider(providers) {
    const providerValid = Array.isArray(providers);
    if (!providerValid) throw new Error('`providers` must be an array.');

    // If there is nothing in the providers array, do nothing.
    if (!providers.length) return this;

    // remove duplicates, if any
    providers = [...new Set(providers)];

    // Check to see if there are any unsupported providers in the list.
    const providersSupported = providers.reduce((acc, p) => {
      return acc && DEFAULT_PROVIDERS.includes(p);
    }, true);
    if (!providersSupported) throw new Error('Please pass in supported providers.');

    // All good, reset provider list
    this._providers = providers;
    return this;
  }

  /**
   * Resolves book info, given an isbn
   * @param {string} isbn 
   */
  resolve(isbn) {
    const options = arguments.length === 3 ? arguments[1] : null;
    const callback = arguments.length === 3 ? arguments[2] : arguments[1];

    const promise = getBookInfo(this._providers, isbn, options)
      .then(book => {
        if (typeof (callback) === 'function') {
          callback(null, book);
        } else {
          return book;
        }
      })
      .catch(err => {
        if (typeof (callback) === 'function') {
          // Error will be handled by callback
          callback(err, null);
        } else {
          // Rethrow the error for the next .then/.catch in the chain
          throw err;
        }
      });

    // Reset providers on instance, so that it works well during the next round!
    this._resetProviders();

    if (typeof (callback) !== 'function') {
      return promise;
    }
  }
}

module.exports = new Isbn()
