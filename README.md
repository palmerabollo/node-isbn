# node-isbn

A simple node.js module that **resolves books by ISBN** using multiple services:
* [Google Books API](https://developers.google.com/books/)
* [Open Library Books API](https://openlibrary.org/dev/docs/api/books)
* [WorldCat xISBN API](http://xisbn.worldcat.org/xisbnadmin/doc/api.htm)
* [ISBNdb API](https://isbndb.com/apidocs/v2)

## Installation

```
$ npm install node-isbn
```

Supports Node.js versions 6.x and greater.

## Examples

### Using a callback

```javascript
var isbn = require('node-isbn');

isbn.resolve('0735619670', function (err, book) {
    if (err) {
        console.log('Book not found', err);
    } else {
        console.log('Book found %j', book);
    }
});
```

### Setting a timeout

```javascript
var isbn = require('node-isbn');

isbn.resolve('0735619670', { timeout: 15000 }, function (err, book) {
    if (err) {
        console.log('Book not found', err);
    } else {
        console.log('Book found %j', book);
    }
});
```

### Using a promise

```javascript
var isbn = require('node-isbn');

isbn.resolve('0735619670').then(function (book) {
    console.log('Book found %j', book);
}).catch(function (err) {
    console.log('Book not found', err);
});
```

### Response

Response follows the same schema, but some fields could depend on the service
that was used to find the book. In general, Google Books API returns more information.

```json
{
    "title": "Code Complete",
    "authors": [
        "Steve McConnell"
    ],
    "publisher": "O'Reilly Media, Inc.",
    "publishedDate": "2004",
    "description": "Features the best practices in the art and...",
    "industryIdentifiers": [
        {
            "type": "OTHER",
            "identifier": "UCSC:32106018687688"
        }
    ],
    "readingModes": {
        "text": false,
        "image": false
    },
    "pageCount": 914,
    "printType": "BOOK",
    "categories": [
        "Computers"
    ],
    "averageRating": 4,
    "ratingsCount": 123,
    "contentVersion": "preview-1.0.0",
    "imageLinks": {
        "smallThumbnail": "http://books.google.com/books/content?id=QnghAQAAIAAJ&printsec=frontcover&img=1&zoom=5&source=gbs_api",
        "thumbnail": "http://books.google.com/books/content?id=QnghAQAAIAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api"
    },
    "language": "en",
    "previewLink": "http://books.google.es/books?id=QnghAQAAIAAJ&dq=isbn:0735619670&hl=&cd=1&source=gbs_api",
    "infoLink": "http://books.google.es/books?id=QnghAQAAIAAJ&dq=isbn:0735619670&hl=&source=gbs_api",
    "canonicalVolumeLink": "http://books.google.es/books/about/Code_Complete.html?hl=&id=QnghAQAAIAAJ"
}
```

### Setting backend providers

You can optionally specify the providers that you want to use, in the order you need them to be invoked.

```javascript
// This request will search first in the Open Library API and then in the Google Books API
isbn.provider(['openlibrary', 'google'])
    .resolve('0735619670')
    .then(function (book) {
        console.log('Book found %j', book);
    }).catch(function (err) {
        console.log('Book not found', err);
    });
```

```javascript
// This request will search ONLY in the Google Books API
isbn.provider(['google'])
    .resolve('0735619670')
    .then(function (book) {
        console.log('Book found %j', book);
    }).catch(function (err) {
        console.log('Book not found', err);
    });
```

If you do not like using strings to specify the providers, you could grab the providers from `isbn.PROVIDER_NAMES` constant that the library provides!


```javascript
// This request will search ONLY in the Google Books API
isbn.provider([isbn.PROVIDER_NAMES.GOOGLE])
    .resolve('0735619670')
    .then(function (book) {
        console.log('Book found %j', book);
    }).catch(function (err) {
        console.log('Book not found', err);
    });
```

## License

**AGPL v3.0 LICENSE**
http://www.gnu.org/licenses/agpl-3.0.html

See also [Google Books API Terms of Service](https://developers.google.com/books/terms),
[Open Library Licensing](https://openlibrary.org/developers/licensing),
[WorldCat xISBN Terms of Service](http://www.oclc.org/worldcat/community/terms.en.html),
[ISBNdb Terms and Conditions](https://isbndb.com/terms-and-conditions).

## Development

* Ensure that you using Node 6 or greater.
* Tests use [mocha](http://mochajs.org). Feel free to contribute.

```
$ npm test
```
