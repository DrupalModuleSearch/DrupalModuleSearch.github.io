/* eslint-disable no-console */

require('events').EventEmitter.defaultMaxListeners = 500

require('dotenv').config({
  path: require('path').resolve(process.cwd(), 'sync', '.env')
});

const MAX_PAGES = parseInt(process.env.MAX_PAGES, 10) || 3;
const LIMIT = parseInt(process.env.LIMIT, 10) || 10;
const START_PAGE = parseInt(process.env.START_PAGE, 10) || 0;

const { Client } = require('@elastic/elasticsearch');
const elasticClient = new Client({
  node: process.env.ELASTIC_HOST,
  auth: {
    username: process.env.ELASTIC_USER,
    password: process.env.ELASTIC_PASS
  }
});

const Keyv = require('keyv');
const KeyvFile = require('keyv-file');
const store = new KeyvFile({ filename: './sync/cache.msgpack' });
const cache = new Keyv({ store });

const got = require('got');
const gotApiClient = got.extend({
  prefixUrl: 'https://www.drupal.org/api-d7',
  responseType: 'json',
  resolveBodyOnly: true,
  cache
});
const gotUpdateClient = got.extend({
  prefixUrl: 'https://updates.drupal.org',
  responseType: 'text',
  resolveBodyOnly: true,
  cache
});



// function get(url, params) {
//   return gotClient(url, { ...params });
// }


function getNodes(currentPage, params) {
  return gotApiClient('node.json', {
    searchParams: {
      page: currentPage,
      limit: LIMIT,
      ...params,
    },
  });
}

function getTerms(tids) {
  if (tids.length > 0) {
    return gotApiClient('taxonomy_term.json', {
      searchParams: tids.map(tid => `tid[]=${tid}`).join('&')
    });
  }
}


function getProjects(currentPage) {
  return getNodes(currentPage, {
    status: 1,
    type: 'project_module'
    // 0: 'type[]=project_module',
    // 1: 'type[]=project_theme',
  });
}

function checkCore(project, core) {
  return gotUpdateClient(['release-history', project, core].join('/'));
}


async function buildObj(node) {
  console.log(`${node.nid} : ${node.title}`);
  const doc = {
    title: node.title,
    body: node.body.value, // @TODO - strip tags?
    url: node.url,
    type: node.type,
    project_type: node.field_project_type,
    project_machine_name: node.field_project_machine_name,
    download_count: parseInt(node.field_download_count, 10),
    compatibility: [],
    author: node.author ? node.author.name : 'Unknown',
  };

  const promises = [
    node.taxonomy_vocabulary_44 === undefined ? null : getTerms([node.taxonomy_vocabulary_44.id]),
    node.taxonomy_vocabulary_46 === undefined ? null : getTerms([node.taxonomy_vocabulary_46.id]),
    node.taxonomy_vocabulary_3  === undefined ? null : getTerms(node.taxonomy_vocabulary_3.map(term => term.id)),
  ];

  if (node.field_project_type !== 'sandbox') {
    promises.push(checkCore(node.field_project_machine_name, '5.x'));
    promises.push(checkCore(node.field_project_machine_name, '6.x'));
    promises.push(checkCore(node.field_project_machine_name, '7.x'));
    promises.push(checkCore(node.field_project_machine_name, '8.x'));
  }

  // console.log(promises);
  await Promise.all(promises)
    .then((promiseResults) => {
      let i = 0;

      if (promiseResults[i]) {
        doc.maintenance_status = promiseResults[i].list[0].name;
      }
      i += 1;

      if (promiseResults[i]) {
        doc.development_status = promiseResults[i].list[0].name;
      }
      i += 1;

      if (promiseResults[i]) {
        doc.category = promiseResults[2].list.map(term => term.name);
      }
      i += 1;


      ['5.x', '6.x', '7.x', '8.x'].forEach((core) => {
        if (promiseResults[i]) {
          if (promiseResults[i].indexOf('<project_status>published</project_status>') >= 0) {
            doc.compatibility.push(core);
          }
        }
        i += 1;
      });
    });

  return [
    { index: { _index: process.env.ELASTIC_INDEX, _id: node.nid } },
    doc
  ]
}


(async () => {
  let lastPage = undefined;

  console.log('Starting Sync on ' + process.env.ELASTIC_INDEX)

  console.log('Deleting old index')
  await elasticClient.indices.delete({
    index: process.env.ELASTIC_INDEX,
    ignoreUnavailable: true,
    allowNoIndices: true
  }).catch(error => console.log(error.body))

  console.log('Creating new index')
  await elasticClient.indices.create({
    index: process.env.ELASTIC_INDEX,
    body: {
      settings : {
        analysis : {
          filter: {
            english_stop: {
              type: "stop",
              stopwords: "_english_"
            },
            english_keywords: {
              type: "keyword_marker",
              keywords: ["lazy"] // stem_exclusion
            },
            english_stemmer: {
              type: "stemmer",
              language: "english"
            },
            english_possessive_stemmer: {
              type: "stemmer",
              language: "possessive_english"
            }
          },
          analyzer: {
            html_strip_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: [
                'standard',
                'lowercase',
                'english_possessive_stemmer',
                'english_stop',
                'english_keywords',
                'english_stemmer'
               ],
              char_filter: [
                'html_strip'
              ]
            },
            rebuilt_english: {
              tokenizer:  "standard",
              filter: [
                'english_possessive_stemmer',
                'lowercase',
                'english_stop',
                'english_keywords',
                'english_stemmer'
              ]
            }
          }
        }
      },
      mappings : {
        properties : {
          author               : { type : 'keyword' },
          body                 : { type : 'text', analyzer: 'html_strip_analyzer' },
          category             : { type : 'keyword' },
          compatibility        : { type : 'keyword' },
          development_status   : { type : "keyword" },
          download_count       : { type : "integer" },
          id                   : { type : "integer" },
          maintenance_status   : { type : "keyword" },
          project_machine_name : { type : "text" },
          project_type         : { type : "keyword" },
          title                : { type : "text", analyzer: 'rebuilt_english' },
          type                 : { type : "keyword" },
          url                  : { type : "keyword" },
        }
      }
    }
  }).catch(error => console.log(error.body))

  for (let page = START_PAGE; page < MAX_PAGES; page += 1) {
    console.log(`Processing page ${page}...`);
    let bail = false;
    let startTime = new Date().getTime();
    let queryTime = 0, indexTime = 0, indexed = 0;
    await getProjects(page)
      .then(response => {
        if (lastPage === undefined) {
          lastPage = new URLSearchParams(new URL(response.last).search).get('page');
        }
        queryTime = (new Date().getTime()) - startTime;
        return Promise.all(response.list.map(buildObj))
      })
      .then(data => [].concat(...data)) // Flatten the array
      .then(data => {
        startTime = new Date().getTime()
        return elasticClient.bulk({
          index: process.env.ELASTIC_INDEX,
          body: data
        })
      })
      .then(clientResponse => {
        indexTime = (new Date().getTime()) - startTime
        indexed = clientResponse.body.items.length
      })
      .catch(error => {
        if (error.statusCode === 404) {
          bail = true;
          console.log('API 404, end of results');
        }
        else {
          console.log(error)
        }
      })
      .finally(() => {
        console.log(`Page ${page} / ${lastPage} done! Indexed ${indexed}. API Took ${queryTime}ms. Index took ${indexTime}`);
      })

    if (bail) {
      break;
    }
  }
})();
