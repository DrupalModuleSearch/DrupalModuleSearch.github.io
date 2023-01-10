<?php
require './vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\TransferStats;
use GuzzleRetry\GuzzleRetryMiddleware;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Bramus\Monolog\Formatter\ColoredLineFormatter;
use Medoo\Medoo;
use Monolog\Processor\MemoryUsageProcessor;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;


class DrupalSync {
  public Logger $log;
  protected Client $apiClient;
  protected Client $updateClient;
  protected Medoo $db;


  public function __construct() {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();

    // Logging
    $this->log = new Logger('DrupalModuleSync');

    $this->log->pushProcessor(new MemoryUsageProcessor());

    $this->log->pushHandler(new StreamHandler('output.log', Logger::WARNING));
    $handler = new StreamHandler('php://stdout', Logger::DEBUG);
    $handler->setFormatter(new ColoredLineFormatter());
    $this->log->pushHandler($handler);

    // HTTP Clients
    $stack = HandlerStack::create();
    $stack->push(GuzzleRetryMiddleware::factory([
      'max_retry_attempts' => 5,
      'retry_on_timeout' => TRUE,
      'on_retry_callback' => function(int $attemptNumber, float $delay, RequestInterface $request, array &$options, ?ResponseInterface $response) {
        if ($response) {
          $this->log->warning("Retrying connection to {$request->getUri()->getPath()} due to [{$response->getStatusCode()}] - Attempt number: $attemptNumber");
        }
        else {
          $this->log->warning("Retrying connection to {$request->getUri()->getPath()} due to UNKNOWN response - Attempt number: $attemptNumber");
        }
      }
    ]));

    $this->apiClient = new Client([
      'base_uri' => 'https://www.drupal.org/api-d7/',
      'timeout'  => 30.0,
      'handler' => $stack,
      'headers' => [
        'User-Agent' => 'DrupalModuleSearch.github.io/1.0',
        'Accept'     => 'application/json',
      ],
      'on_stats' => function(TransferStats $stats) {
        $this->log->debug("Response Time: {$stats->getTransferTime()} for {$stats->getEffectiveUri()}");
      }
    ]);
    $this->updateClient = new Client([
      'base_uri' => 'https://updates.drupal.org',
      'timeout'  => 30.0,
      'handler' => $stack,
      'headers' => [
        'User-Agent' => 'DrupalModuleSearch.github.io/1.0',
        'Accept'     => 'text/xml',
      ],
      'on_stats' => function(TransferStats $stats) {
        $this->log->debug("Response Time: {$stats->getTransferTime()} for {$stats->getEffectiveUri()}");
      }
    ]);

    // Database
    $this->db = new Medoo([
      'type' => 'mysql',
      'host' => $_ENV['MYSQL_HOST'],
      'database' => $_ENV['MYSQL_DB'],
      'username' => $_ENV['MYSQL_USER'],
      'password' => $_ENV['MYSQL_PASS'],

      'charset' => 'utf8mb4',
      'collation' => 'utf8mb4_general_ci',
      'port' => $_ENV['MYSQL_PORT'],
      'error' => PDO::ERRMODE_EXCEPTION,
    ]);
  }

  /**
   * @param array $query
   *
   * @return \Psr\Http\Message\ResponseInterface
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  protected function fetchNodes(array $query = []): ResponseInterface {
    return $this->apiClient->get('node.json', [
      'query' => $query
    ]);
  }

  /**
   * @param array $terms
   *
   * @return \Psr\Http\Message\ResponseInterface
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  protected function fetchTerms(array $terms): ResponseInterface {
    $query = implode('&', array_map(function($tid) {
      return 'tid[]=' . $tid;
    }, $terms));

    return $this->apiClient->get('taxonomy_term.json', [
      'query' => $query
    ]);
  }

  /**
   * @param int $page
   *
   * @return \Psr\Http\Message\ResponseInterface
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  protected function fetchProjects(int $page): ResponseInterface {
    return $this->fetchNodes([
      'page' => $page,
      'limit' => 50,
      'status' => 1,
      'type' => 'project_module', // @TODO themes?
    ]);
  }

  /**
   * @param array $term_ids
   *
   * @return array
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  protected function getTerms(array $term_ids): array {
    static $skip = [];

    $this->log->debug("getTerms", $term_ids);

    foreach ($skip as $tid => $_) {
      if (($k = array_search($tid, $term_ids)) !== false) {
        unset($term_ids[$k]);
        $this->log->debug("Skipping $tid - Failed to find it in previous lookup.");
      }
    }

    $term_ids = array_filter($term_ids);
    if (empty($term_ids)) {
      return [];
    }

    // @TODO some kind of MRU static cache?
    $return = [];

    // Try to find them in the DB first.
    $this->db->select('terms',  ['tid', 'name'], ['tid' => $term_ids], function($result) use (&$return, &$term_ids) {

      $return[$result['tid']] = $result['name'];
      if (($k = array_search($result['tid'], $term_ids)) !== false) {
        unset($term_ids[$k]);
      }
    });

    // Remaining Term IDs, do API lookup
    if (!empty($term_ids)) {
      $this->log->info("Fetching terms", $term_ids);
      $response = $this->fetchTerms($term_ids);
      $terms = json_decode($response->getBody()->getContents(), TRUE);
      foreach ($terms['list'] as $term) {
        $values = [
          'name' => $term['name'],
        ];
        $this->upsert('terms', $values, 'tid', $term['tid']);

        $return[$term['tid']] = $term['name'];

        if (($k = array_search($term['tid'], $term_ids)) !== false) {
          unset($term_ids[$k]);
        }
      }

      // Any remaining should be marked as skip and show a warning
      foreach ($term_ids as $tid) {
        $this->log->warning("Unable to find Term $tid");
        $skip[$tid] = true;
      }
    }

    return $return;
  }

  /**
   * @param string $project
   * @param string $core
   *
   * @return \Psr\Http\Message\ResponseInterface
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  protected function checkCore(string $project, string $core): ResponseInterface {
    return $this->updateClient->get("release-history/$project/$core");
  }


  /**
   * @param array $node
   *
   * @return array
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  protected function buildProjectDoc(array $node): array {
    $doc = [
      'title' => $node['title'],
      'body' => $node['body']['value'] ?? NULL,
      'url' => $node['url'],
      'type' => $node['type'],
      'project_type' => $node['field_project_type'],
      'project_machine_name' => $node['field_project_machine_name'],
      'compatibility' => [],
      'author' => $node['author']['id'] ?? NULL,
    ];

    // Ensure UID exists
    if (array_key_exists('author', $node) && $node['author']['id'] && !$this->db->has('users', ['uid' => $node['author']['id']])) {
      $this->db->insert('users', ['uid' => $node['author']['id'], 'name' => $node['author']['name']]);
    }

    // Bulk fetch term data...
    $ms_id = $node['taxonomy_vocabulary_44']['id'] ?? null;
    $ds_id = $node['taxonomy_vocabulary_46']['id'] ?? null;
    $c_ids = array_map(function($t) {
      return $t['id'];
    }, $node['taxonomy_vocabulary_3'] ?? []);

    $term_data = $this->getTerms(array_merge([
      $ms_id,
      $ds_id,
    ], $c_ids));

    $doc['maintenance_status'] = $term_data[$ms_id] ?? null;
    $doc['development_status'] = $term_data[$ds_id] ?? null;

    $doc['category'] = [];
    foreach ($c_ids as $c_id) {
      $doc['category'][] = $term_data[$c_id] ?? NULL;
    }
    $doc['category'] = array_filter($doc['category']);
    if (empty($doc['category'])) {
      $doc['category'] = null;
    }
    else {
      $doc['category'] = json_encode(array_values($doc['category']), 0, 1);
    }

    foreach (['5.x', '6.x', '7.x', '8.x'] as $core) {
      $response = $this->checkCore($node['field_project_machine_name'], $core);
      $xml = simplexml_load_string($response->getBody()->getContents());
      $status = strval($xml->project_status);
      if ($status == 'published' || $status == 'unsupported') {
        $doc['compatibility'][] = $core;
      }

      if ($core == '8.x' && $xml->releases->count()) {
        $doc['core_compatibility'] = strval($xml->releases[0]->release->core_compatibility);
      }
    }
    $doc['compatibility'] = implode(',', $doc['compatibility']);

    return $doc;
  }


  /**
   * @param $table
   * @param $values
   * @param $pk_name
   * @param $pk_value
   *
   * @return void
   */
  protected function upsert($table, $values, $pk_name, $pk_value): void {
    if ($this->db->has($table, [$pk_name => $pk_value])) {
      $this->db->update($table, $values, [$pk_name => $pk_value]);
    }
    else {
      $values[$pk_name] = $pk_value;
      $this->db->insert($table, $values);
    }
  }


  /**
   * @param int $page
   *
   * @return void
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  public function syncProjects($page = 0): void {
    // Get projects
    $last_page = null;
    while ($last_page == NULL || $page < $last_page) {
      $this->log->info("Fetching page [$page] of [$last_page]");

      $response = $this->fetchProjects($page);

      $projects = json_decode($response->getBody()->getContents(), true);

      if (is_null($last_page)) {
        $querystring = parse_url($projects['last'], PHP_URL_QUERY);
        parse_str($querystring, $query);
        $last_page = $query['page'];
      }

      foreach ($projects['list'] as $node) {
        $this->log->info("Processing Project {$node['nid']} - {$node['title']}");
        $doc = $this->buildProjectDoc($node);

        $this->upsert('docs', $doc, 'nid',$node['nid']);
      }

      $page += 1;
    }
  }

  /**
   * @return void
   */
  public function resetSchema(): void {
    $this->log->info("Resetting Schema!");

    $this->log->info("Dropping and creating 'docs'");
    $this->db->drop('docs');
    $this->db->create('docs', [
      'nid' => ['INT', 'NOT NULL', 'PRIMARY KEY'],
      'title' => ['VARCHAR(255)', 'NOT NULL'],
      'body' => ['TEXT'],
      'url' => ['TEXT'],
      'type' => ['VARCHAR(128)'],
      'project_type' => ['VARCHAR(128)'],
      'project_machine_name' => ['VARCHAR(128)'],
      'compatibility' => ['VARCHAR(255)'],
      'author' => ['INT'],
      'maintenance_status' => ['VARCHAR(255)'],
      'development_status' => ['VARCHAR(255)'],
      'category' => ['VARCHAR(255)'],
      'core_compatibility' => ['VARCHAR(255)']
    ]);

    $this->log->info("Dropping and creating 'terms'");
    $this->db->drop('terms');
    $this->db->create('terms', [
      'tid' => ['INT', 'NOT NULL', 'PRIMARY KEY'],
      'name' => ['VARCHAR(255)', 'NOT NULL'],
    ]);

    $this->log->info("Dropping and creating 'users'");
    $this->db->drop('users');
    $this->db->create('users', [
      'uid' => ['INT', 'NOT NULL', 'PRIMARY KEY'],
      'name' => ['VARCHAR(255)', 'NOT NULL'],
    ]);
  }

  /**
   * @return void
   * @throws \GuzzleHttp\Exception\GuzzleException
   */
  public static function start(): void {
    $getOpt = new \GetOpt\GetOpt([
      \GetOpt\Option::create(NULL, 'reset-schema')
        ->setDescription('Optional: Will drop and recreate MySQL tables'),

      \GetOpt\Option::create('s', 'start', \GetOpt\GetOpt::REQUIRED_ARGUMENT)
        ->setDescription('Optional: Define starting page. Defaults to zero')
        ->setArgument(new \GetOpt\Argument("0", 'is_numeric', 'start')),

      \GetOpt\Option::create('?', 'help')
        ->setDescription('Show help.'),
    ]);


    $getOpt->process();

    // show help and quit
    if ($getOpt->getOption('help')) {
      echo $getOpt->getHelpText();
      exit;
    }

    $instance = new self();

    if ($getOpt->getOption('reset-schema')) {
      // Make DB from Schema
      $instance->resetSchema();
    }

    $page = intval($getOpt->getOption('start'));
    $instance->syncProjects($page);
  }
}


DrupalSync::start();
