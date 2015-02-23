'use strict';

var isbn = require('..');

var assert = require('assert'),
    nock = require('nock');

var MOCK_ISBN = 'isbn';
var GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
var GOOGLE_BOOKS_API_VOLUMES = '/books/v1/volumes?q=isbn:' + MOCK_ISBN;

describe('ISBN Resolver', function() {
  it('should resolve a valid ISBN', function(done) {
    var mockResponse = {
      totalItems: 1,
      items: [{
        "volumeInfo": {
          "title": "Code Complete",
          "authors": ["Steve McConnell"]
        }
      }]
    };

    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_VOLUMES)
        .reply(200, JSON.stringify(mockResponse));

    isbn.resolve('isbn', function(err, book) {
      assert.equal(err, null);
      assert.deepEqual(book, mockResponse.items[0].volumeInfo);
      done();
    })
  });

  it('should return an error if no book is found', function(done) {
    var mockResponse = {
      kind: 'books#volumes',
      totalItems: 0
    };

    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_VOLUMES)
        .reply(200, JSON.stringify(mockResponse));

    isbn.resolve('isbn', function(err, book) {
      assert.notEqual(err, null);
      done();
    })
  });

  it('should return an error if Google API is not reachable', function(done) {
    nock.disableNetConnect();

    isbn.resolve('isbn', function(err, book) {
      assert.notEqual(err, null);
      done();
    })
  });

  it('should return an error if Google API returns a HTTP error', function(done) {
    nock(GOOGLE_BOOKS_API_BASE)
        .get(GOOGLE_BOOKS_API_VOLUMES)
        .reply(500);

    isbn.resolve('isbn', function(err, book) {
      assert.notEqual(err, null);
      done();
    })
  });
})
