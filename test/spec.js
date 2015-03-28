'use strict';

var isbn = require('..');

var assert = require('assert'),
    nock = require('nock');

var MOCK_ISBN = 'isbn';

var GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
var GOOGLE_BOOKS_API_BOOK = '/books/v1/volumes?q=isbn:' + MOCK_ISBN;

var OPENLIBRARY_API_BASE = 'https://openlibrary.org';
var OPENLIBRARY_API_BOOK = '/api/books' + '?bibkeys=ISBN:' + MOCK_ISBN + '&format=json&jscmd=details';

describe('ISBN Resolver', function() {
  it('should resolve a valid ISBN with Google', function(done) {
    var mockResponseGoogle = {
      totalItems: 1,
      items: [{
        'volumeInfo': {
          'title': 'Code Complete',
          'authors': ['Steve McConnell']
        }
      }]
    };

    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_BOOK)
        .reply(200, JSON.stringify(mockResponseGoogle));

    isbn.resolve(MOCK_ISBN, function(err, book) {
      assert.equal(err, null);
      assert.deepEqual(book, mockResponseGoogle.items[0].volumeInfo);
      done();
    })
  });

  it('should resolve a valid ISBN with Open Library', function(done) {
    var mockResponseGoogle = {
      kind: 'books#volumes',
      totalItems: 0
    };

    var mockResponseOpenLibrary = {}
    mockResponseOpenLibrary['ISBN:' + MOCK_ISBN] = {
      'info_url': 'https://openlibrary.org/books/OL1743093M/Book',
      'preview_url': 'https://archive.org/details/whatsitallabouta00cain',
      'thumbnail_url': 'https://covers.openlibrary.org/b/id/6739180-S.jpg',
      'details': {
        'number_of_pages': 521,
        'subtitle': 'an autobiography',
        'title': 'Book Title',
        'languages': [
          {
            'key': '/languages/eng'
          }
        ],
        'publishers': [
          'Turtle Bay Books'
        ],
        'authors': [
          {
            'name': 'Michael Caine',
            'key': '/authors/OL840869A'
          }
        ],
        'publish_date': '1992',
      },
      'preview': 'borrow'
    };

    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_BOOK)
        .reply(200, JSON.stringify(mockResponseGoogle));

    nock(OPENLIBRARY_API_BASE)
        .get(OPENLIBRARY_API_BOOK)
        .reply(200, JSON.stringify(mockResponseOpenLibrary));

    isbn.resolve(MOCK_ISBN, function(err, book) {
      assert.equal(err, null);
      assert.equal(book.title, 'Book Title');
      assert.equal(book.publisher, 'Turtle Bay Books');
      assert.equal(book.publishedDate, '1992');
      assert.equal(book.pageCount, 521);
      assert.equal(book.language, 'en');
      done();
    })
  });

  it('should return an error if no book is found', function(done) {
    var mockResponseGoogle = {
      kind: 'books#volumes',
      totalItems: 0
    };

    var mockResponseOpenLibrary = {};

    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_BOOK)
        .reply(200, JSON.stringify(mockResponseGoogle));

    nock(OPENLIBRARY_API_BASE)
        .get(OPENLIBRARY_API_BOOK)
        .reply(200, JSON.stringify(mockResponseOpenLibrary));

    isbn.resolve(MOCK_ISBN, function(err, book) {
      assert.notEqual(err, null);
      done();
    })
  });

  it('should return an error if external endpoints are not reachable', function(done) {
    nock.disableNetConnect();

    isbn.resolve(MOCK_ISBN, function(err, book) {
      assert.notEqual(err, null);
      done();
    })
  });

  it('should return an error if Google API returns a HTTP error', function(done) {
    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_BOOK)
        .reply(500);

    nock(OPENLIBRARY_API_BASE)
        .get(OPENLIBRARY_API_BOOK)
        .reply(500);

    isbn.resolve(MOCK_ISBN, function(err, book) {
      assert.notEqual(err, null);
      done();
    })
  });
})
