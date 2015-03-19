var test = require('tape');
var wordnokLib = require('../wordnok');
var createWordnok = wordnokLib.createWordnok;
var startCacheServer = wordnokLib.startCacheServer;
var config = require('../config');
var callBackOnNextTick = require('conform-async').callBackOnNextTick;

function setUpWordnok() {
  return createWordnok({
    apiKey: config.wordnikAPIKey
  });
}

test('Get a topic via Wordnik', 
  function testWordnik(t) {
    t.plan(3)
    var wordnok = setUpWordnok();

    wordnok.getTopic(function checkTopic(error, topic) {
      t.ok(!error, 'Shouldn\'t get error.');
      t.equal(typeof topic, 'string');
      t.ok(topic.length > 0);
      // console.log(topic);
    });
  }
);

test('Get random words via Wordnik', 
  function testRandomWords(t) {
    t.plan(3)
    var wordnok = setUpWordnok();

    wordnok.getRandomWords(null, function checkWords(error, words) {
      t.ok(!error, 'Shouldn\'t get error.');
      t.ok(Array.isArray(words));
      t.ok(words.length > 0);
      // console.log(words);
    });
  }
);

test('Get parts of speech from Wordnik', function testGetPartsOfSpeech(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getPartsOfSpeech('students', 
    function checkResult(error, parts) {
      t.ok(!error, 'Shouldn\'t get error.');
      t.deepEqual(parts, ['noun']);
      // console.log(parts);
    }
  );
});

test('Get parts of multiple parts speech', function testMultiPartsOfSpeech(t) {
  t.plan(2);  
  var wordnok = setUpWordnok();

  wordnok.getPartsOfSpeechForMultipleWords(
    [
      'haven\'t',        
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
      t.ok(!error, 'Shouldn\'t get error.');
      t.deepEqual(parts, 
        [
          [
              'noun-possessive'
          ],
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
          ],
          [
            'noun',
            'noun',
            'noun',
            'noun'
          ],
          [
            'auxiliary-verb',
            'auxiliary-verb',
            'auxiliary-verb'
          ],
          [
            'verb-intransitive',
            'verb-intransitive',
            'verb-intransitive',
            'verb-intransitive'
          ],
          [
            'noun',
            'noun',
            'noun',
            'noun'
          ],
          [
            'proper-noun',
            'proper-noun'
          ],
          [
            'proper-noun',
            'proper-noun',
            'proper-noun'
          ],
          [
            'adjective'
          ],
          [                  
          ],
          [
            'adverb',
            'adverb'
          ],
          [
            'noun', 'verb'
          ]
        ]
      );
      // console.log(parts);
    }
  );
});

test('Get word frequency from Wordnik', function testGetWordFrequency(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getWordFrequency('students', 
    function checkResult(error, frequency) {
      t.ok(!error, 'Shouldn\'t get error.');
      t.equal(frequency, 1105);
      // console.log(frequency);
    }
  );
});

test('Get word frequencies from Wordnik', function testGetWordFrequencies(t) {
  t.plan(2);
  var wordnok = setUpWordnok();

  wordnok.getWordFrequencies(
    [
      'haven\'t',        
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
    ],
    function checkResult(error, frequencies) {
      t.ok(!error, 'Shouldn\'t get error.');
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


test('Use memoized cache server', function memoized(t) {
  // WARNING: This test does not terminate. You have to ctrl+C it.
  t.plan(11);

  startCacheServer(
    {
      port: 4040,
      dbPath: 'testcache.db'
    },
    runTest
  );

  function runTest() {
    var requestCallCount = 0;
    var wordnok = createWordnok({
      apiKey: config.wordnikAPIKey,
      memoizeServerPort: 4040,
      request: function mockRequest(url, done) {
        requestCallCount += 1;
        t.ok(requestCallCount === 1, 'request is called only once.');

        callBackOnNextTick(done, null, null, JSON.stringify([
          {
            partOfSpeech: 'noun'
          },
          {
            partOfSpeech: 'participle'
          }
        ]));
      }
    });

    var count = 0;

    for (var i = 0; i < 5; ++i) {
      wordnok.getPartsOfSpeech('students', 
        function checkResult(error, parts) {
          count += 1;
          t.ok(!error, 'Shouldn\'t get error.');
          t.deepEqual(
            parts, 
            ['noun', 'participle'],
            'Gets the expected parts of speech for the ' + count + 'th time.'
          );
        }
      );
    }
  }
});
