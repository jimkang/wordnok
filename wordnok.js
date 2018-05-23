var requestModule = require('request');
var _ = require('lodash');
var queue = require('d3-queue').queue;
var isJSON = require('./isjson');
var createIsCool = require('iscool');

var definitionClassificationPrefixRegex = /\w+\s\s\s/;

var randomWordsQueryParams = {
  hasDictionaryDef: false,
  includePartOfSpeech: 'noun',
  minCorpusCount: 250,
  maxCorpusCount: -1,
  minDictionaryCount: 1,
  maxDictionaryCount: -1,
  minLength: 5,
  maxLength: -1,
  limit: 10
};

var relatedWordsQueryParams = {
  useCanonical: true,
  limitPerRelationshipType: 10
};

var getDefinitionsQueryParams = {
  useCanonical: false,
  limit: 10,
  includeRelated: false
};

function createWordnok(opts) {
  var logger = console;
  var request = requestModule;

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
  }

  var isCool = createIsCool({
    logger: logger
  });

  var randomWordURL =
    'http://api.wordnik.com:80/v4/words.json/randomWord?' +
    'hasDictionaryDef=false&' +
    'includePartOfSpeech=noun&' +
    'excludePartOfSpeech=proper-noun&' +
    'minCorpusCount=0&maxCorpusCount=-1' +
    '&minDictionaryCount=1&maxDictionaryCount=-1&' +
    'minLength=2&maxLength=120&' +
    'api_key=' +
    opts.apiKey;

  var wordURLPrefix = 'http://api.wordnik.com:80/v4/word.json/';

  var partOfSpeechURLPostfix =
    '/definitions?' +
    'includeRelated=false&' +
    'useCanonical=false&' +
    'includeTags=false&' +
    'api_key=' +
    opts.apiKey;

  var frequencyURLPostfix =
    '/frequency?' +
    'useCanonical=false&' +
    'startYear=2003&' +
    'endYear=2012&' +
    'api_key=' +
    opts.apiKey;

  var canonicalizeURLPostfix =
    '?useCanonical=true&' +
    'includeSuggestions=false&' +
    'api_key=' +
    opts.apiKey;

  function getTopic(done) {
    request(randomWordURL, function parseWordnikReply(error, response, body) {
      if (error) {
        done(error);
      } else {
        var parseResults = parseBody(body, randomWordURL);
        if (parseResults.error) {
          done(parseResults.error);
        } else if (parseResults.parsed && isCool(parseResults.parsed.word)) {
          done(error, parseResults.parsed.word);
        } else {
          // Try again.
          getTopic(done);
        }
      }
    });
  }

  function getRandomWords(randomWordsOpts, done) {
    var customParams = {};
    if (randomWordsOpts && randomWordsOpts.customParams) {
      customParams = randomWordsOpts.customParams;
    }
    customParams.api_key = opts.apiKey;

    request(
      {
        url: 'http://api.wordnik.com:80/v4/words.json/randomWords',
        qs: _.defaults(customParams, randomWordsQueryParams)
      },
      parseWordnikReply
    );

    function parseWordnikReply(error, response, body) {
      if (error) {
        done(error);
      } else {
        var parseResults = parseBody(body, response.url);
        var words;
        if (parseResults.error) {
          done(error);
        } else if (parseResults.parsed && Array.isArray(parseResults.parsed)) {
          words = _.pluck(parseResults.parsed, 'word');
          words = words.filter(isCool);
          done(error, words);
        }
      }
    }
  }

  function getPartsOfSpeech(word, done) {
    // TODO: support custom params so that specific dictionaries can be specified.
    var url = wordURLPrefix + encodeURIComponent(word) + partOfSpeechURLPostfix;
    request(url, function parseReply(error, response, body) {
      if (error) {
        done(error);
      } else {
        var parseResults = parseBody(body, url);
        if (parseResults.error) {
          done(parseResults.error);
        } else {
          done(
            null,
            _.uniq(_.compact(_.pluck(parseResults.parsed, 'partOfSpeech')))
          );
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
      } else {
        var totalCount = 9999999;
        var parseResults = parseBody(body, url);
        if (parseResults.error) {
          done(parseResults.error);
        } else {
          if (typeof parseResults.parsed.totalCount === 'number') {
            totalCount = parseResults.parsed.totalCount;
          } else {
            logger.log(
              'Got word frequency body without totalCount in it for:',
              word
            );
          }
          done(error, totalCount);
        }
      }
    });
  }

  function getRelatedWords(relatedWordsOpts, done) {
    var customParams = {};
    if (relatedWordsOpts && relatedWordsOpts.customParams) {
      customParams = relatedWordsOpts.customParams;
    }
    var word;

    if (relatedWordsOpts) {
      if (relatedWordsOpts.customParams) {
        customParams = relatedWordsOpts.customParams;
      }
      word = relatedWordsOpts.word;
    }

    if (!word) {
      throw new Error('No word provided to getRelatedWords.');
    }
    customParams.api_key = opts.apiKey;

    request(
      {
        url: 'http://api.wordnik.com:80/v4/word.json/' + word + '/relatedWords',
        qs: _.defaults(customParams, relatedWordsQueryParams)
      },
      parseWordnikReply
    );

    function parseWordnikReply(error, response, body) {
      if (error) {
        done(error);
      } else {
        var parseResults = parseBody(body, response.url);
        var wordDict;
        if (parseResults.error) {
          done(parseResults.error);
        } else if (Array.isArray(parseResults.parsed)) {
          wordDict = arrangeRelatedWordsResponse(parseResults.parsed);
        }
        done(error, wordDict);
      }
    }
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

  function canonicalize(opts, done) {
    var word;
    if (opts) {
      word = opts.word;
    }

    var url = wordURLPrefix + encodeURIComponent(word) + canonicalizeURLPostfix;
    request(url, parseReply);

    function parseReply(error, response, body) {
      if (error) {
        done(error);
      } else {
        var parseResults = parseBody(body, url);
        if (parseResults.error) {
          done(parseResults.error);
        } else {
          done(error, parseResults.parsed.word);
        }
      }
    }
  }

  function getDefinitions(definitionOpts, done) {
    var customParams = {};

    if (definitionOpts && definitionOpts.customParams) {
      customParams = definitionOpts.customParams;
    }
    var word = definitionOpts.word;

    if (!word) {
      done(new Error('No word provided to getDefinitions.'));
      return;
    }

    customParams.api_key = opts.apiKey;

    request(
      {
        url: 'http://api.wordnik.com:80/v4/word.json/' + word + '/definitions',
        qs: _.defaults(customParams, getDefinitionsQueryParams)
      },
      parseWordnikReply
    );

    function parseWordnikReply(error, response, body) {
      if (error) {
        done(error);
      } else {
        var parseResults = parseBody(body, response.url);
        var definitions;
        if (parseResults.error) {
          done(parseResults.error);
          return;
        }

        if (Array.isArray(parseResults.parsed)) {
          // wordDict = arrangeRelatedWordsResponse(parseResults.parsed);
          definitions = _.pluck(parseResults.parsed, 'text')
            .filter(definitionIsUsable)
            .map(removeDefinitionClassificationPrefix);
        }
        done(error, definitions);
      }
    }
  }

  function parseBody(body, url) {
    var parsed;
    var error;

    if (isJSON(body)) {
      parsed = JSON.parse(body);
    } else {
      logger.log('Could not parse JSON from', url, body);
      error = new Error('Received unparseable response from ' + url);
    }
    return {
      parsed: parsed,
      error: error
    };
  }

  var wordnok = {
    getTopic: getTopic,
    getRandomWords: getRandomWords,
    getPartsOfSpeechForMultipleWords: getPartsOfSpeechForMultipleWords,
    getPartsOfSpeech: getPartsOfSpeech,
    getWordFrequency: getWordFrequency,
    getWordFrequencies: getWordFrequencies,
    getRelatedWords: getRelatedWords,
    canonicalize: canonicalize,
    getDefinitions: getDefinitions
  };

  return wordnok;
}

function arrangeRelatedWordsResponse(wordnikArray) {
  var dict = {};
  // Assumption: No two array members will have the same relationshipType.
  wordnikArray.forEach(function addToDict(group) {
    dict[group.relationshipType] = group.words;
  });
  return dict;
}

function definitionIsUsable(definition) {
  return definition.indexOf('See ') !== 0;
}

function removeDefinitionClassificationPrefix(definition) {
  var prefixLocation = definition.match(definitionClassificationPrefixRegex);
  if (prefixLocation && prefixLocation.index === 0) {
    return definition.replace(definitionClassificationPrefixRegex, '');
  } else {
    return definition;
  }
}

module.exports = {
  createWordnok: createWordnok
};
