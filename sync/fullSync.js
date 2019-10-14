require('events').EventEmitter.defaultMaxListeners = 205

require('dotenv').config({
  path: require('path').resolve(process.cwd(), 'sync', '.env')
});
const got = require('got');

const API_BASE_URI = 'https://www.drupal.org/api-d7';
const MAX_PAGES = parseInt(process.env.MAX_PAGES, 10) || 3;
const LIMIT = parseInt(process.env.LIMIT, 10) || 10;
const START_PAGE = parseInt(process.env.START_PAGE, 10) || 0;

const { Client } = require('@elastic/elasticsearch');
const client = new Client({
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

function get(url, params) {
  return got(url, { ...params, ...{ cache } });
}


function getNodes(currentPage, params) {
  return get(`${API_BASE_URI}/node.json`, {
    json: true,
    query: {
      page: currentPage,
      limit: LIMIT,
      ...params,
    },
  });
}

function getTerms(tids) {
  if (tids.length > 0) {
    return get(`${API_BASE_URI}/taxonomy_term.json`, {
      query: tids.map(tid => `tid[]=${tid}`)
        .join('&'),
      json: true,
    });
  }
}


function getProjects(currentPage) {
  return getNodes(currentPage, {
    status: 1,
//     type: ['project_module', 'project_theme'],
    type: 'project_theme',
  });
}

function checkCore(project, core) {
  return get(`https://updates.drupal.org/release-history/${project}/${core}`, {});
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

      if (promiseResults[i] && promiseResults[i].body) {
        doc.maintenance_status = promiseResults[i].body.list[0].name;
      }
      i += 1;

      if (promiseResults[i] && promiseResults[i].body) {
        doc.development_status = promiseResults[i].body.list[0].name;
      }
      i += 1;

      if (promiseResults[i] && promiseResults[i].body) {
        doc.category = promiseResults[2].body.list.map(term => term.name);
      }
      i += 1;


      ['5.x', '6.x', '7.x', '8.x'].forEach((core) => {
        if (promiseResults[i] && promiseResults[i].body) {
          if (promiseResults[i].body.indexOf('<project_status>published</project_status>') >= 0) {
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

  for (let page = START_PAGE; page < MAX_PAGES; page += 1) {
    console.log(`Processing page ${page}...`);
    let bail = false;
    let startTime = new Date().getTime();
    let queryTime = 0, indexTime = 0;
    await getProjects(page)
      .then(response => {
        if (lastPage === undefined) {
          lastPage = new URLSearchParams(new URL(response.body.last).search).get('page');
        }
        queryTime = (new Date().getTime()) - startTime;
        return Promise.all(response.body.list.map(buildObj))
      })
      .then(data => [].concat(...data)) // Flatten the array
      .then(data => {
        startTime = new Date().getTime()
        return client.bulk({
          index: process.env.ELASTIC_INDEX,
          body: data
        })
      })
      .then(clientResponse => {
        indexTime = (new Date().getTime()) - startTime;
        console.log(`Page ${page} / ${lastPage} done! Indexed ${clientResponse.body.items.length} items ${clientResponse.body.errors ? 'with errors' : 'without errors'}. API Took ${queryTime}ms. Index took ${indexTime}`);
      })
      .catch(error => {
        if (error.statusCode === 404) {
          bail = true;
          console.log('API 404, end of results');
        }
        else {
          console.log(error)
        }
      });

    if (bail) {
      break;
    }
  }
})();
