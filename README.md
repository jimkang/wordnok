wordnok
==================

This is a wrapper that gets nouns, frequencies, and parts of speech from the [Wordnik REST API](http://developer.wordnik.com/docs.html).

Methods and their callback signatures:

- `getTopic(done)`: error, random noun.
- `getPartsOfSpeech(word, done)`: error, part of speech string.
- `getPartsOfSpeechForMultipleWords(wordArray, done)`: error, array of parts of speech.
- `getWordFrequency(word, done)`: error, number.
- `getWordFrequencies(wordArray, done)`: error, array of frequencies.

Installation
------------

    npm install wordnok

Usage
-----

    var createWordnok = require('wordnok');
    var wordnok = createWordnok({
      apiKey: 'kljhasdfkjahsdlfiq89243rsdhflksjdfhaskjhdf982kjhd'
    });
    wordnok.getPartsOfSpeechForMultipleWords(
      [
        'students',
        'realize',
        'the'
      ],
      function done(error, parts) {
        console.log(parts);
      }
    );

Output:

    [
       [
           'noun'
       ],
       [
         'verb-transitive',
         'verb-transitive',
         'verb-transitive',
         'verb-transitive'
       ],
       [
         'definite-article',
         'definite-article',
         'definite-article',
         'definite-article'
       ]
    ]

Tests
-----

First, create a `config.js` file in the root directory that has your Wordnik API like this:

    module.exports = {
      wordnikAPIKey: 'kljhasdfkjahsdlfiq89243rsdhflksjdfhaskjhdf982kjhd'
    };

Then, run tests with `make test`.

License
-------

MIT.
