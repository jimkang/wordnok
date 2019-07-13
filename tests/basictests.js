var test = require('tape');
var wordnokLib = require('../wordnok');
var createWordnok = wordnokLib.createWordnok;
var config = require('../config');
var callBackOnNextTick = require('conform-async').callBackOnNextTick;

function setUpWordnok() {
  return createWordnok({
    apiKey: config.wordnikAPIKey
  });
}

test('Get a topic via Wordnik', function testWordnik(t) {
  t.plan(3);
  var wordnok = setUpWordnok();

  wordnok.getTopic(function checkTopic(error, topic) {
    t.ok(!error, "Shouldn't get error.");
    t.equal(typeof topic, 'string');
    t.ok(topic.length > 0);
    // console.log(topic);
  });
});

test('Get random words via Wordnik', function testRandomWords(t) {
  t.plan(3);
  var wordnok = setUpWordnok();

  wordnok.getRandomWords(null, function checkWords(error, words) {
    t.ok(!error, "Shouldn't get error.");
    t.ok(Array.isArray(words));
    t.ok(words.length > 0);
    // console.log(words);
  });
});

test('Get parts of speech from Wordnik', function testGetPartsOfSpeech(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getPartsOfSpeech('students', function checkResult(error, parts) {
    t.ok(!error, "Shouldn't get error.");
    t.deepEqual(parts, ['noun']);
    // console.log(parts);
  });
});

test('Get parts of multiple parts speech', function testMultiPartsOfSpeech(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getPartsOfSpeechForMultipleWords(
    [
      "haven't",
      'students',
      'realize',
      'the',
      'importance',
      'could',
      'be',
      'a',
      'Nolan',
      'Batman',
      'inaccessible',
      'DS_Store',
      'morally',
      'feeds'
    ],
    function checkResult(error, parts) {
      t.ok(!error, "Shouldn't get error.");
      t.deepEqual(parts, [
        ['noun-possessive'],
        ['noun'],
        ['verb-transitive', 'verb-intransitive'],
        ['definite-article', 'adverb'],
        ['noun'],
        ['auxiliary-verb'],
        ['verb-intransitive', 'auxiliary-verb'],
        [
          'noun',
          'idiom',
          'indefinite-article',
          'preposition',
          'auxiliary-verb',
          'abbreviation'
        ],
        ['proper-noun'],
        ['proper-noun'],
        ['adjective'],
        [],
        ['adverb'],
        ['noun', 'verb']
      ]);
      // console.log(parts);
    }
  );
});

test('Get word frequency from Wordnik', function testGetWordFrequency(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getWordFrequency('students', function checkResult(error, frequency) {
    t.ok(!error, "Shouldn't get error.");
    t.equal(frequency, 1105);
    // console.log(frequency);
  });
});

test('Get word frequencies from Wordnik', function testGetWordFrequencies(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getWordFrequencies(
    [
      "haven't",
      'students',
      'realize',
      'the',
      'importance',
      'could',
      'be',
      'a',
      'Nolan',
      'Batman',
      'inaccessible',
      'DS_Store',
      'morally'
    ],
    function checkResult(error, frequencies) {
      t.ok(!error, "Shouldn't get error.");
      t.deepEqual(frequencies, [
        599,
        1105,
        373,
        245997,
        229,
        7678,
        32461,
        126929,
        36,
        223,
        6,
        0,
        45
      ]);
      // console.log(frequencies);
    }
  );
});

test('Get related words', function testRelatedWords(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  var expectedDictionary = {
    hypernym: ['aggressor', 'attacker', 'assailant', 'assaulter'],
    hyponym: [
      'bullyboy',
      'muscle',
      'tough guy',
      'skinhead',
      'plug-ugly',
      'muscleman'
    ],
    synonym: ['chav', 'tearaway', 'hooligan'],
    'same-context': [
      'choked-off',
      'ftu',
      'newsies',
      'typographic',
      'afterall',
      'hed',
      'half-animal',
      'oxy-',
      'goalmouth',
      '??'
    ]
  };

  wordnok.getRelatedWords(
    {
      word: 'yob'
    },
    function checkResult(error, words) {
      t.ok(!error, "Shouldn't get error.");
      t.deepEqual(words, expectedDictionary);
    }
  );
});

test('Error when Wordnik response cannot be parsed', function parseError(t) {
  t.plan(1);

  var wordnok = createWordnok({
    apiKey: config.wordnikAPIKey,
    request: function mockRequest(url, done) {
      callBackOnNextTick(
        done,
        null,
        null,
        '<html><body><h1>503 Service Unavailable</h1>\nNo server is available to handle this request.\n</body></html>'
      );
    }
  });

  wordnok.getPartsOfSpeech('students', checkResult);

  function checkResult(error) {
    t.equal(
      error.message.indexOf('Received unparseable response from '),
      0,
      'Should get error about unparseable response.'
    );
  }
});

test('Get simple definitions', testGetDefinitions);
test('Get complex definitions', testGetComplexDefinitions);

function testGetDefinitions(t) {
  var wordnok = setUpWordnok();

  wordnok.getDefinitions({ word: 'surtout' }, checkDefinitions);

  function checkDefinitions(error, definitions) {
    t.ok(!error, "Shouldn't get error.");
    t.ok(definitions.length > 0);
    t.equal(
      definitions[0],
      "A man's overcoat.",
      'First definition is correct.'
    );
    console.log(definitions[0]);
    t.end();
  }
}

function testGetComplexDefinitions(t) {
  var wordnok = setUpWordnok();

  wordnok.getDefinitions(
    { word: 'dog', partOfSpeech: 'noun' },
    checkDefinitions
  );

  function checkDefinitions(error, definitions) {
    t.ok(!error, "Shouldn't get error.");
    t.ok(definitions.length > 0);
    // console.log(definitions);

    definitions.forEach(checkDefinition);
    t.end();
  }

  function checkDefinition(definition) {
    t.ok(definition.length > 0, 'Definition is not empty.');
    t.ok(
      !definition.match(/\w+\s\s\s/) ||
        definition.match(/\w+\s\s\s/).index !== 0,
      'Does not start with "[Classification]   ".'
    );
    t.ok(definition.indexOf('See ') !== 0, 'Does not start with "See ".');
  }
}

test('Error when Wordnik response contains an error message', function handleErrorMessage(t) {
  t.plan(1);

  var wordnok = createWordnok({
    apiKey: config.wordnikAPIKey,
    request: function mockRequest(url, done) {
      callBackOnNextTick(
        done,
        null,
        null,
        JSON.stringify({
          type: 'error',
          message: 'exceeded access limits'
        })
      );
    }
  });

  wordnok.getTopic(checkResult);

  function checkResult(error) {
    t.equal(
      error.message.indexOf('exceeded access limits'),
      0,
      'Should get error that passes the error from the response.'
    );
  }
});
