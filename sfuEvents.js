const EventEmitter = require('events');

// Create the logger
const log4js = require('log4js');
const config = require("./config");
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const ON_ERROR_EVENT_NAME = "ERROR";
const ON_CLOSED_EVENT_NAME = "CLOSED";


const ON_SFU_JOINED_EVENT_NAME = "SFU_JOINED";
const ON_SFU_LEFT_EVENT_NAME = "SFU_LEFT";
const ON_SFU_TRANSPORT_OPENED_EVENT_NAME = "SFU_TRANSPORT_OPENED";
const ON_SFU_TRANSPORT_CLOSED_EVENT_NAME = "SFU_TRANSPORT_CLOSED";
const ON_SFU_RTP_PAD_ADDED_EVENT_NAME = "SFU_RTP_PAD_ADDED";
const ON_SFU_RTP_PAD_REMOVED_EVENT_NAME = "SFU_RTP_PAD_REMOVED";

class SfuEvents {
    static builder() {
        const callEvents = new SfuEvents();
        const emitter = new EventEmitter();
        const result = {
            onError: listener => {
                emitter.on(ON_ERROR_EVENT_NAME, listener);
                return result;
            },
            onClosed: listener => {
                emitter.once(ON_CLOSED_EVENT_NAME, listener);
                return result;
            },
            build: () => {
                callEvents._emitter = emitter;
                return callEvents;
            },
        };
        return result;
    }

    constructor() {
        this._emitter = null;
        this._closed = false;
    }

    dispatch(callEvent) {
        if (!callEvent) {
            logger.warn(`Received null callEvent`);
            return;
        }
        const eventType = callEvent.name;
        try {
            this._emitter.emit(eventType, callEvent);
        } catch (error) {
            this._emitter.emit(ON_ERROR_EVENT_NAME, error, callEvent);
            logger.warn(`Unexpected error occurred while emitting ${eventType}`, error, callEvent);
        }
        
    }

    onSfuJoined(listener) {
        this._emitter.on(ON_SFU_JOINED_EVENT_NAME, listener);
        return this;
    }
    
    onSfuLeft(listener) {
        this._emitter.on(ON_SFU_LEFT_EVENT_NAME, listener);
        return this;
    }
    
    onSfuTransportOpened(listener) {
        this._emitter.on(ON_SFU_TRANSPORT_OPENED_EVENT_NAME, listener);
        return this;
    }
    
    onSfuTransportClosed(listener) {
        this._emitter.on(ON_SFU_TRANSPORT_CLOSED_EVENT_NAME, listener);
        return this;
    }
    
    onSfuRtpPadAdded(listener) {
        this._emitter.on(ON_SFU_RTP_PAD_ADDED_EVENT_NAME, listener);
        return this;
    }
    
    onSfuRtpPadRemoved(listener) {
        this._emitter.on(ON_SFU_RTP_PAD_REMOVED_EVENT_NAME, listener);
        return this;
    }

    onClosed(listener) {
        this._emitter.once(ON_CLOSED_EVENT_NAME, listener);
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
        const eventTypes = this._emitter.eventNames();
        if (eventTypes) {
            eventTypes.filter(type => type !== ON_CLOSED_EVENT_NAME).forEach(type => {
                this._emitter.removeAllListeners(type);    
            });
        }
        logger.info(`Closed`);
        this._emitter.emit(ON_CLOSED_EVENT_NAME);
    }
}

module.exports = SfuEvents;