'use strict';

const isbn = require('..');

const assert = require('assert');
const nock = require('nock');

const MOCK_ISBN = 'isbn';

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
const GOOGLE_BOOKS_API_BOOK = `/books/v1/volumes?q=isbn:${MOCK_ISBN}`;

const OPENLIBRARY_API_BASE = 'https://openlibrary.org';
const OPENLIBRARY_API_BOOK = `/api/books?bibkeys=ISBN:${MOCK_ISBN}&format=json&jscmd=details`;

const WORLDCAT_API_BASE = 'http://xisbn.worldcat.org';
const WORLDCAT_API_BOOK = `/webservices/xid/isbn/${MOCK_ISBN}?method=getMetadata&fl=*&format=json`;

const ISBNDB_API_BASE = 'https://api2.isbndb.com';
const ISBNDB_API_BOOK = `/book/${MOCK_ISBN}`;

const DEFAULT_PROVIDER_ORDER = [
  isbn.PROVIDER_NAMES.GOOGLE,
  isbn.PROVIDER_NAMES.OPENLIBRARY,
  isbn.PROVIDER_NAMES.WORLDCAT,
  isbn.PROVIDER_NAMES.ISBNDB
];

describe('ISBN Resolver API', () => {
  describe('using callback', () => {
    it('should resolve a valid ISBN with Google', done => {
      const mockResponseGoogle = {
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

      isbn.resolve(MOCK_ISBN, (err, book) => {
        assert.equal(err, null);
        assert.deepEqual(book, mockResponseGoogle.items[0].volumeInfo);
        done();
      })
    });

    it('should resolve a valid ISBN with Open Library', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};
      mockResponseOpenLibrary[`ISBN:${MOCK_ISBN}`] = {
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

      isbn.resolve(MOCK_ISBN, (err, book) => {
        assert.equal(err, null);
        assert.equal(book.title, 'Book Title');
        assert.equal(book.publisher, 'Turtle Bay Books');
        assert.equal(book.publishedDate, '1992');
        assert.equal(book.pageCount, 521);
        assert.equal(book.language, 'en');
        done();
      })
    });

    it('should resolve a valid ISBN with Worldcat', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};

      const mockResponseWorldcat = {
        "stat":"ok",
        "list":[{
          "url":["http://www.worldcat.org/oclc/249645389?referer=xid"],
          "publisher":"Turtle Bay Books",
          "form":["BC", "DA"],
          "lccn":["2004049981"],
          "lang":"eng",
          "city":"Redmond, Wash.",
          "author":"Steve McConnell.",
          "ed":"2. ed.",
          "year":"1992",
          "isbn":["0735619670"],
          "title":"Book Title",
          "oclcnum":["249645389", "301075365", "427465443"]
        }]
      };

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(200, JSON.stringify(mockResponseWorldcat));

      isbn.resolve(MOCK_ISBN, (err, {title, publisher, publishedDate, language}) => {
        assert.equal(err, null);
        assert.equal(title, 'Book Title');
        assert.equal(publisher, 'Turtle Bay Books');
        assert.equal(publishedDate, '1992');
        assert.equal(language, 'en');
        done();
      })
    });

    it('should resolve a valid ISBN with ISBNdb', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};

      const mockResponseWorldcat = {'stat': 'invalidId'};

      const mockResponseIsbnDb = { book:
       { publisher: 'Turtle Bay Books',
         image: 'https://images.isbndb.com/covers/30/23/9781484233023.jpg',
         title_long:
          'Book Title',
         edition: '1',
         pages: 174,
         date_published: '1992-12-13',
         authors: [ 'Aswin Pranam' ],
         title:
          'Book Title',
         isbn13: '9781484233023',
         msrp: '1.23',
         binding: 'Paperback',
         isbn: '1484233026' }
      }

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(200, JSON.stringify(mockResponseWorldcat));

      nock(ISBNDB_API_BASE)
          .get(ISBNDB_API_BOOK)
          .reply(200, JSON.stringify(mockResponseIsbnDb));

      isbn.resolve(MOCK_ISBN, (err, {title, publisher, publishedDate, language}) => {
        assert.equal(err, null);
        assert.equal(title, 'Book Title');
        assert.equal(publisher, 'Turtle Bay Books');
        assert.equal(publishedDate, '1992-12-13');
        done();
      })
    });

    it('should return an error if no book is found', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};

      const mockResponseWorldcat = {'stat': 'invalidId'};

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(200, JSON.stringify(mockResponseWorldcat));

      isbn.resolve(MOCK_ISBN, (err, book) => {
        assert.notEqual(err, null);
        done();
      })
    });

    it('should return an error if external endpoints are not reachable', done => {
      nock.disableNetConnect();

      isbn.resolve(MOCK_ISBN, (err, book) => {
        assert.notEqual(err, null);
        done();
      })
    });

    it('should return an error if external endpoints return a HTTP error', done => {
      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(500);

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(500);

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(500);

      isbn.resolve(MOCK_ISBN, (err, book) => {
        assert.notEqual(err, null);
        done();
      })
    });

    it('should timeout on long connections', done => {
      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .socketDelay(10000)
          .reply(200, JSON.stringify({}));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .socketDelay(10000)
          .reply(200, JSON.stringify({}));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .socketDelay(10000)
          .reply(200, JSON.stringify({}));

      isbn.resolve(MOCK_ISBN, (err, book) => {
        assert.notEqual(err, null);
        done();
      })
    });

    it('should invoke providers in order specified', done => {
      const mockResponseGoogle = {
        totalItems: 1,
        items: [{
          'volumeInfo': {
            'title': 'Code Complete',
            'authors': ['Steve McConnell']
          }
        }]
      };

      const mockResponseOpenLibrary = {};

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      isbn
        .provider([isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.GOOGLE])
        .resolve(MOCK_ISBN, (err, book) => {
          assert.equal(err, null);

          // Assert order: OpenLib (err) -> Google (success)
          // Notice worldcat is not called!
          assert.deepEqual(book, mockResponseGoogle.items[0].volumeInfo);
          done();
        })
    });

    it('should reset providers after completion', done => {
      const mockResponseGoogle = {
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

      isbn
        .provider([isbn.PROVIDER_NAMES.GOOGLE])
        .resolve(MOCK_ISBN, (err, book) => {
          assert.equal(err, null);
          assert.deepEqual(
            isbn._providers,
            DEFAULT_PROVIDER_ORDER
          )

          done();
        })
    })

    it('should override default options', done => {
      const mockResponseGoogle = {
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
          .socketDelay(10000)
          .reply(200, JSON.stringify(mockResponseGoogle));

      isbn.resolve(MOCK_ISBN, { timeout: 15000 }, (err, book) => {
        assert.equal(err, null);
        done();
      })
    });
  });

  describe('using promise', () => {
    it('should resolve a valid ISBN with Google', done => {
      const mockResponseGoogle = {
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

      isbn.resolve(MOCK_ISBN)
      .then(book => {
        assert.deepEqual(book, mockResponseGoogle.items[0].volumeInfo);
        done();
      })
      .catch(done);
    });

    it('should resolve a valid ISBN with Open Library', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};
      mockResponseOpenLibrary[`ISBN:${MOCK_ISBN}`] = {
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

      isbn.resolve(MOCK_ISBN)
      .then(book => {
        assert.equal(book.title, 'Book Title');
        assert.equal(book.publisher, 'Turtle Bay Books');
        assert.equal(book.publishedDate, '1992');
        assert.equal(book.pageCount, 521);
        assert.equal(book.language, 'en');
        done();
      })
      .catch(done);
    });

    it('should resolve a valid ISBN with Worldcat', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};

      const mockResponseWorldcat = {
        "stat":"ok",
        "list":[{
          "url":["http://www.worldcat.org/oclc/249645389?referer=xid"],
          "publisher":"Turtle Bay Books",
          "form":["BC", "DA"],
          "lccn":["2004049981"],
          "lang":"eng",
          "city":"Redmond, Wash.",
          "author":"Steve McConnell.",
          "ed":"2. ed.",
          "year":"1992",
          "isbn":["0735619670"],
          "title":"Book Title",
          "oclcnum":["249645389", "301075365", "427465443"]
        }]
      };

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(200, JSON.stringify(mockResponseWorldcat));

      isbn.resolve(MOCK_ISBN)
      .then(({title, publisher, publishedDate, language}) => {
        assert.equal(title, 'Book Title');
        assert.equal(publisher, 'Turtle Bay Books');
        assert.equal(publishedDate, '1992');
        assert.equal(language, 'en');
        done();
      })
      .catch(done);
    });

    it('should resolve a valid ISBN with ISBNdb', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};

      const mockResponseWorldcat = {'stat': 'invalidId'};

      const mockResponseIsbnDb = { book:
       { publisher: 'Turtle Bay Books',
         image: 'https://images.isbndb.com/covers/30/23/9781484233023.jpg',
         title_long:
          'Book Title',
         edition: '1',
         pages: 174,
         date_published: '1992-12-13',
         authors: [ 'Aswin Pranam' ],
         title:
          'Book Title',
         isbn13: '9781484233023',
         msrp: '1.23',
         binding: 'Paperback',
         isbn: '1484233026' }
      }

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(200, JSON.stringify(mockResponseWorldcat));

      nock(ISBNDB_API_BASE)
          .get(ISBNDB_API_BOOK)
          .reply(200, JSON.stringify(mockResponseIsbnDb));

      isbn.resolve(MOCK_ISBN)
      .then(({title, publisher, publishedDate, language}) => {
        assert.equal(title, 'Book Title');
        assert.equal(publisher, 'Turtle Bay Books');
        assert.equal(publishedDate, '1992-12-13');
        done();
      })
      .catch(done);
    });

    it('should return an error if no book is found', done => {
      const mockResponseGoogle = {
        kind: 'books#volumes',
        totalItems: 0
      };

      const mockResponseOpenLibrary = {};

      const mockResponseWorldcat = {'stat': 'invalidId'};

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(200, JSON.stringify(mockResponseWorldcat));

      isbn.resolve(MOCK_ISBN)
      .then(book => {
        done(new Error('resolve succeeded when failure expected'));
      })
      .catch(err => {
        assert.notEqual(err, null);
        done();
      });
    });

    it('should return an error if external endpoints are not reachable', done => {
      nock.disableNetConnect();

      isbn.resolve(MOCK_ISBN)
      .then(book => {
        done(new Error('resolve succeeded when failure expected'));
      })
      .catch(err => {
        assert.notEqual(err, null);
        done();
      });
    });

    it('should return an error if external endpoints return a HTTP error', done => {
      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(500);

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(500);

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .reply(500);

      isbn.resolve(MOCK_ISBN)
      .then(book => {
        done(new Error('resolve succeeded when failure expected'));
      })
      .catch(err => {
        assert.notEqual(err, null);
        done();
      });
    });

    it('should timeout on long connections', done => {
      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .socketDelay(10000)
          .reply(200, JSON.stringify({}));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .socketDelay(10000)
          .reply(200, JSON.stringify({}));

      nock(WORLDCAT_API_BASE)
          .get(WORLDCAT_API_BOOK)
          .socketDelay(10000)
          .reply(200, JSON.stringify({}));

      isbn.resolve(MOCK_ISBN)
      .then(book => {
        done(new Error('resolve succeeded when failure expected'));
      })
      .catch(err => {
        assert.notEqual(err, null);
        done();
      });
    });

    it('should invoke providers in order specified', done => {
      const mockResponseGoogle = {
        totalItems: 1,
        items: [{
          'volumeInfo': {
            'title': 'Code Complete',
            'authors': ['Steve McConnell']
          }
        }]
      };

      const mockResponseOpenLibrary = {};

      nock(GOOGLE_BOOKS_API_BASE)
          .get(GOOGLE_BOOKS_API_BOOK)
          .reply(200, JSON.stringify(mockResponseGoogle));

      nock(OPENLIBRARY_API_BASE)
          .get(OPENLIBRARY_API_BOOK)
          .reply(200, JSON.stringify(mockResponseOpenLibrary));

      isbn
        .provider([isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.GOOGLE])
        .resolve(MOCK_ISBN)
        .then((book) => {
          // Assert order: OpenLib (err) -> Google (success)
          // Notice worldcat is not called!
          assert.deepEqual(book, mockResponseGoogle.items[0].volumeInfo);
          done();
        })
    });

    it('should reset providers after completion', done => {
      const mockResponseGoogle = {
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

      isbn
        .provider([isbn.PROVIDER_NAMES.GOOGLE])
        .resolve(MOCK_ISBN)
        .then((book) => {
          assert.deepEqual(
            isbn._providers,
            DEFAULT_PROVIDER_ORDER
          )

          done();
        })
    })

    it('should override default options', done => {
      const mockResponseGoogle = {
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
          .socketDelay(10000)
          .reply(200, JSON.stringify(mockResponseGoogle));

      isbn.resolve(MOCK_ISBN, { timeout: 15000 })
      .then(({title}) => {
        assert.equal(title, 'Code Complete');
        done();
      })
      .catch(done);
    });
  });
})

describe('ISBN Provider API', () => {
  it('should use default providers if providers array is empty', () => {
    const expectedProviders = isbn._providers;
    isbn.provider([]);
    assert.deepEqual(expectedProviders, isbn._providers);
  });

  it('should return an error if providers is not an array', () => {
    const expectedProviders = isbn._providers;

    try {
      isbn.provider('string-that-must-not-work');
      assert.fail(`Test must've failed! 😱`);
    } catch (error) {
      assert.deepEqual(expectedProviders, isbn._providers);
    }
  });

  it('should return an error if invalid providers in list', () => {
    const expectedProviders = isbn._providers;

    try {
      isbn.provider(['gibberish', 'wow', 'sogood']);
      assert.fail(`Test must've failed! 😱`);
    } catch (error) {
      assert.deepEqual(expectedProviders, isbn._providers);
    }
  });

  it('should remove duplicates', () => {
    const providers = [isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.OPENLIBRARY];
    const expected = [isbn.PROVIDER_NAMES.OPENLIBRARY];

    isbn.provider(providers);
    assert.deepEqual(expected, isbn._providers);
  });

  it('should set providers as expected', () => {
    const providers = [isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.GOOGLE];

    isbn.provider(providers);
    assert.deepEqual(providers, isbn._providers);
  });

  it('should return instance after setting provider', () => {
    const providers = [isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.GOOGLE];

    const result = isbn.provider(providers);
    assert.strictEqual(result.constructor, isbn.constructor)
  });
})

