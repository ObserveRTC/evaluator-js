const EventEmitter = require('events');
const { Kafka } = require('kafkajs');

// Create the logger
const log4js = require('log4js');
const config = require("./config");
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const ON_ERROR_EVENT_NAME = "ERROR";
const ON_READY_EVENT_NAME = "READY";
const ON_REPORT_EVENT_NAME = "reportEvent";
const ON_CLOSED_EVENT_NAME = "CLOSED";

const offsetValues = {
    earliest: "earliest",
    latest: "latest",
}

class KafkaSource {
    static builder() {
        const source = new KafkaSource();
        const emitter = new EventEmitter();
        const kafkaConfig = {};
        const consumerConfig = {};
        const result = {
            withClientId: clientId => {
                kafkaConfig.clientId = clientId;
                return result;
            },
            withOffset: value => {
                const offset = offsetValues[value.toLowerCase()];
                if (!offset) {
                    throw new Error(`Invalid offset value ${value} it can only be: ` + Object.values(offsetValues).join(", "));
                }
                source._offset = offset;
                return result;
            },
            withBrokers: (...brokers) => {
                kafkaConfig.brokers = brokers;
                return result;
            },
            withGroupId: groupId => {
                consumerConfig.groupId = groupId;
                return result;
            },
            withFormat: format => {
                switch(format.toUpperCase()) {
                    case "JSON":
                        break;
                    default:
                        throw new Error(`Format ${format} does not supported`);
                }
                return result;
            },
            withMultiplexedSourceTopic: topic => {
                if (source._multiplexed === false) {
                    throw new Error(`Cannot subscribe to multiplexed and demultiplexed topics with the same kafkasource`)
                }
                source._topics.push(topic);
                source._multiplexed = true;
                return result;
            },
            withDemultiplexedPrefixedTopicName: prefix => {
                if (source._multiplexed === true) {
                    throw new Error(`Cannot subscribe to multiplexed and demultiplexed topics with the same kafkasource`)
                }
                source._demuxPrefix = prefix;
                source._multiplexed = false;
                return result;
            },
            onError: listener => {
                emitter.on(ON_ERROR_EVENT_NAME, listener);
                return result;
            },
            build: () => {
                source._emitter = emitter;
                logger.info(`KafkaConfig`, kafkaConfig);
                source._consumer = new Kafka(kafkaConfig).consumer(consumerConfig);
                return source;
            },
        };
        return result;
    }

    constructor() {
        this._emitter = null;
        this._consumer = null;
        this._groupId = null;
        this._closed = false;
        this._started = false;
        this._multiplexed = null;
        this._demuxPrefix = "";
        this._topics = [];
        this._offset = offsetValues.earliest;
    }

    async start() {
        if (this._closed) {
            throw new Error(`Cannot start an already closed KafkaSource`);
        }
        if (this._started) {
            logger.warn(`Attempted to start twice`);
            return;
        }
        const handleError = (error, message) => {
            logger.warn(message, error);
            this._emitter.emit(ON_ERROR_EVENT_NAME, error);
            if (!this._closed) {
                this.close();
            }
        };
        try {
            await this._consumer.connect();
        } catch(error) {
            handleError(error, `Unexpected error while connecting consumer`);
            return;
        }
        const fromBeginning = this._offset === offsetValues.earliest;
        try {
            for (const topic of this._topics) {
                logger.info(`Subscribe to ${topic}, fromBeginning: ${fromBeginning}, multiplexed: ${this._multiplexed}`);
                await this._consumer.subscribe({ topic, fromBeginning })
            }
        } catch (error) {
            handleError(error, `Unexpected error while subscribing to topics by a connected consumer`);
            return;
        }
        let eachMessage;
        if (this._multiplexed) {
            eachMessage = async ({ message }) => {
                const buffer = Buffer.from(message.value);
                const decodedString = String.fromCharCode.apply(null, buffer);
                const muxReport = JSON.parse(decodedString);
                const { payload, type: reportType } = muxReport;
                const reportStr = Buffer.from(payload, 'base64').toString('ascii');
                const report = JSON.parse(reportStr);
                logger.debug(`Consumed message`, muxReport, reportType, report);
                this._emitter.emit(ON_REPORT_EVENT_NAME, { report, reportType });
            };
        } else {
            const prefixLength = this._demuxPrefix ? this._demuxPrefix.length : 0;
            eachMessage = async ({ topic, message }) => {
                const reportType = topic.substr(prefixLength).toUpperCase();
                if (!message.value) {
                    return;
                }
                const report = JSON.parse(message.value);
                this._emitter.emit(ON_REPORT_EVENT_NAME, { report, reportType });
            };
        }
        try {
            logger.info(`Try running consumer`);
            await this._consumer.run({
                eachMessage,
            });
        } catch (error) {
            handleError(error, `Unexpected error while runninng a connected consumer`);
            return;
        }
        this._started = true;
        logger.info(`Started`);
    }

    onReport(listener) {
        this._emitter.on(ON_REPORT_EVENT_NAME, listener);
        return this;
    }

    get closed() {
        return this._closed;
    }

    close() {
        if (this._closed) {
            logger.warn(`Attempted to close twice`);
            return;
        }
        this._closed = true;
        logger.info(`Component is being closed`);
        if (this._consumer) {
            this._consumer.stop();
        }
        const eventTypes = this._emitter.eventNames();
        if (eventTypes) {
            eventTypes.filter(type => type !== ON_CLOSED_EVENT_NAME).forEach(type => {
                this._emitter.removeAllListeners(type);    
            });
        }
        logger.info(`Component is closed`);
        this._emitter.emit(ON_CLOSED_EVENT_NAME);
    }

}

module.exports = KafkaSource
