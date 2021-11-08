const convict = require('convict');

// Define a schema
var config = convict({
  env: {
    doc: 'The application environment.',
    format: ['prod', 'dev'],
    default: 'dev',
    env: 'NODE_ENV'
  },
  logLevel: {
    doc: 'The level of debugging',
    format: ['debug', 'info', 'warn'],
    default: 'info',
    env: 'LOG_LEVEL',
    arg: 'logLevel',
  },
  hostname: {
    doc: 'The hostname.',
    format: '*',
    default: 'localhost',
    env: 'HOSTNAME',
    arg: 'hostname',
  },
  serverPort: {
    doc: 'The port of the http server.',
    format: '*',
    default: '5080',
    env: 'SERVER_PORT',
    arg: 'server-port',
  },
  kafkaOffset: {
    doc: 'The offset the consumer starts reading the topic if the group has not been saved before',
    format: ['earliest'],
    default: 'earliest',
    env: 'KAFKA_OFFSET',
    arg: 'kafka-offset',
  },
  kafkaBrokers: {
    doc: 'The brokers addresses the kafka consumer connects to',
    format: '*',
    default: 'localhost:9092',
    env: 'KAFKA_BROKERS',
    arg: 'kafka-brokers',
  },
  kafkaGroupId: {
    doc: 'The group id the client connects to',
    format: '*',
    default: 'my-observertc-reports-evaluator',
    env: 'KAFKA_GROUP_ID',
    arg: 'kafka-group-id',
  },
  kafkaMuxReportTopic: {
    doc: 'The multiplexed report topic name the observer produces reports to',
    format: '*',
    default: 'observertc-reports',
    env: 'KAFKA_MUX_REPORT_TOPIC_NAME',
    arg: 'kafka-mux-report-topic',
  },
  initialWaitingTimeInS: {
    doc: 'An enforced waiting time before the application starts',
    format: '*',
    default: '10',
    env: 'INITIAL_WAITING_TIME_IN_S',
    arg: 'initial-waiting-time',
  },
});


// Load environment dependent configuration
// var env = config.get('env');
// config.loadFile('./config/' + env + '.json');

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;
