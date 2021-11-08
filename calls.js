const config = require("./config");
const log4js = require('log4js');
const EventEmitter = require("events");
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const ON_SUMMARIZED_EVENT_NAME = "onSummarized";

class Calls {
    static builder() {
        const calls = new Calls();
        const result = {
            build: () => {
                return calls;
            },
        };
        return result;
    }

    constructor() {
        this._records = new Map();
        this._deleted = new Map();
        this._emitter = new EventEmitter();
        this._timer = setInterval(() => {
            const completedCalls = [];
            const now = Date.now();
            const threshold = now - 60 * 1000;
            for (const [callId, record] of this._records.entries()) {
                const { ended, touched } = record;
                if (!ended || threshold < touched) {
                    continue
                }
                logger.info(`Summarize ${callId}`);
                const summary = this._summarize(record);
                completedCalls.push({
                    callId,
                    summary,
                });
            }
            completedCalls.forEach(({callId, summary}) => {
                this._emitter.emit(ON_SUMMARIZED_EVENT_NAME, summary);
                this._records.delete(callId);
                this._deleted.set(callId, now);
            });
            const toPurge = [];
            for (const [callId, deleted] of this._deleted) {
                if (deleted < threshold) {
                    toPurge.push(callId);
                    logger.debug(`Purge ${callId} from registry`);
                }
            }
            toPurge.forEach(callId => this._deleted.delete(callId));
        }, 5000);
    }

    started(callId, serviceId, timestamp) {
        logger.info(`Added startedCall request for ${callId}`);
        return this._put(callId, {
            started: timestamp,
            serviceId,
        });
    }

    ended(callId, serviceId, timestamp) {
        logger.info(`Added endedCall request for ${callId}`);
        return this._put(callId, {
            ended: timestamp,
            serviceId,
        });
    }

    useSFU(callId, value) {
        return this._put(callId, {
            useSFU: !!value,
        });
    }

    joinClient(callId, clientId, joined) {
        return this._extendRecord(callId, ({ clients, maxClients }) => {
            if (!clients) {
                return {
                    clients: {
                        clientId: {
                            joined,
                        }
                    },
                    maxClients: 1,
                };
            }
            const client = clients[clientId] || {};
            if (client.joined) {
                logger.warn(`Client ${clientId} is tried to be joined multiple times`);
                return {
                    clients,
                };
            }
            client.joined = joined;
            clients[clientId] = client;
            const newMaxClients = Object.values(clients).filter(({ detached }) => !detached || joined < detached).length;
            return {
                clients,
                maxClients: Math.max(newMaxClients, maxClients),
            }
        });
    }

    detachClient(callId, clientId, detached) {
        return this._extendRecord(callId, ({ clients, maxClients }) => {
            if (!clients) {
                return {
                    clients: {
                        clientId: {
                            detached,
                        }
                    },
                    maxClients: 1,
                };
            }
            const client = clients[clientId] || {};
            if (client.detached) {
                logger.warn(`Client ${clientId} is tried to be detached multiple times`);
                return {
                    clients,
                };
            }
            client.detached = detached;
            clients[clientId] = client;
            return {
                clients,
            };
        });
    }

    onSummarized(listener) {
        this._emitter.on(ON_SUMMARIZED_EVENT_NAME, listener)
        return this;
    }

    _summarize(record) {
        if (!record) {
            logger.warn(`Call with id ${callId} has not been found and cannot be summarized`);
            return null;
        }
        const { started, ended, maxClients, useSFU } = record;
        const durationInMs = (started && ended) ? ended - started : null;
        const result = {
            durationInMs,
            maxClients,
            useSFU,
        };
        return result;
    }

    _extendRecord(callId, transform) {
        let record = this._records.get(callId);
        const touched = Date.now();
        if (!record) {
            if (this._deleted.has(callId)) {
                logger.warn(`Call ${callId} cannot be extended because it has been already summaried and closed`);
                return this;
            }
            record = {
                callId,
            };
        }
        const item = transform(record);
        this._records.set(callId, {
            ...record,
            ...item,
            touched,
        });
        return this;
    }

    _put(callId, item) {
        return this._extendRecord(callId, () => item);
    }
}

module.exports = Calls;