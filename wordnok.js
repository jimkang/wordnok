var requestModule = require('request');
var _ = require('lodash');
var queue = require('queue-async');
var isJSON = require('./isjson');
var createIsCool = require('iscool');
var multilevelCacheTools = require('multilevel-cache-tools');

function startCacheServer(opts, done) {
  multilevelCacheTools.server.create(
    {
      dbPath: opts.dbPath,
      port: opts.port
    },
    function onStart() {
      console.log('Cache server started at port ' + opts.port + '.');
      done();
    }
  );
}

function createWordnok(opts) {
  var logger = console;
  var request = requestModule;
  var memoizeServerPort;

  if (!opts || !opts.apiKey) {
    throw new Error('createWordnok is missing the Wordnik API key.');
  }
  if (opts) {
    if (opts.logger) {
      logger = opts.logger;
    }
    if (opts.request) {
      request = opts.request;
    }
    if (opts.memoizeServerPort) {
      memoizeServerPort = opts.memoizeServerPort;
    }
  }

  var isCool = createIsCool({
    logger: logger
  });

  var randomWordURL = 'http://api.wordnik.com:80/v4/words.json/randomWord?' +
    'hasDictionaryDef=false&' + 
    'includePartOfSpeech=noun&' +
    'excludePartOfSpeech=proper-noun&' + 
    'minCorpusCount=0&maxCorpusCount=-1' + 
    '&minDictionaryCount=1&maxDictionaryCount=-1&' + 
    'minLength=2&maxLength=120&' +
    'api_key=' + opts.apiKey;

  var wordURLPrefix = 'http://api.wordnik.com:80/v4/word.json/';

  var partOfSpeechURLPostfix = '/definitions?' + 
    'limit=4&' +
    'includeRelated=false&' + 
    'useCanonical=false&' + 
    'includeTags=false&' + 
    'api_key=' + opts.apiKey;

  var frequencyURLPostfix = '/frequency?' + 
    'useCanonical=false&' +
    'startYear=2003&' +
    'endYear=2012&' +
    'api_key=' + opts.apiKey;

  function getTopic(done) {
    request(randomWordURL, function parseWordnikReply(error, response, body) {
      if (error) {
        done(error);
      }
      else {
        var parsed = parseBody(body, randomWordURL);
        if (parsed && isCool(parsed.word)) {
          done(error, parsed.word);
        }
        else {
          // Try again.
          getTopic(done);
        }
      }
    });
  }

  function getPartsOfSpeech(word, done) {
    var url = wordURLPrefix + encodeURIComponent(word) + partOfSpeechURLPostfix;
    request(url, function parseReply(error, response, body) {
      if (error) {
        done(error);
      }
      else {
        var partOfSpeech = null;
        var parsed = parseBody(body, url);
        if (parsed) {
          done(null, _.compact(_.pluck(parsed, 'partOfSpeech')));
        }
        else {
          done('Invalid JSON from ' + url);
        }
      }
    });
  }


  function getWordFrequency(word, done) {
    var url = wordURLPrefix + encodeURIComponent(word) + frequencyURLPostfix;
    request(url, function parseReply(error, response, body) {
      if (error) {
        console.log('getWordFrequency error!');
        done(error);
      }
      else {
        var totalCount = 9999999;
        var parsed = parseBody(body, url);
        if (parsed) {
          if (typeof parsed.totalCount === 'number') {
            totalCount = parsed.totalCount;
          }
          else {
            logger.log('Got word frequency body without totalCount in it for:',
              word);
          }
          done(error, totalCount);
        }
        else {
          done('Invalid JSON from ' + url);
        }
      }
    });
  }  

  function runOperationOverWords(operation, words, done) {
    var q = queue();
    words.forEach(function addToQueue(word) {
      q.defer(operation, word);
    });
    q.awaitAll(done);    
  }

  function getPartsOfSpeechForMultipleWords(words, done) {
    runOperationOverWords(getPartsOfSpeech, words, done);
  }

  function getWordFrequencies(words, done) {
    runOperationOverWords(getWordFrequency, words, done);
  }

  function parseBody(body, url) {
    var parsed;
    if (isJSON(body)) {
      parsed = JSON.parse(body);
    }
    else {
      logger.log('Could not parse JSON from', url, body);
      error = 'Invalid JSON from ' + url;
    }
    return parsed;
  }

  var wordnok = {
    getTopic: getTopic,
    getPartsOfSpeechForMultipleWords: getPartsOfSpeechForMultipleWords,
    getPartsOfSpeech: getPartsOfSpeech,
    getWordFrequency: getWordFrequency,
    getWordFrequencies: getWordFrequencies
  };

  var nonDeterministicMethods = [
    'getTopic'
  ];

  if (memoizeServerPort) {
    for (method in wordnok) {
      if (nonDeterministicMethods.indexOf(method) === -1) {
        wordnok[method] = multilevelCacheTools.client.memoize({
          fn: wordnok[method],
          port: memoizeServerPort
        });
      }
    }
  }

  return wordnok;
}

module.exports = {
  createWordnok: createWordnok,
  startCacheServer: startCacheServer
};

