const EventEmitter = require('events');

// Create the logger
const log4js = require('log4js');
const config = require("./config");
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const ON_ERROR_EVENT_NAME = "ERROR";
const ON_CLOSED_EVENT_NAME = "CLOSED";

const ON_CALL_STARTED_EVENT_NAME = "CALL_STARTED";
const ON_CALL_ENDED_EVENT_NAME = "CALL_ENDED";
const ON_CLIENT_JOINED_EVENT_NAME = "CLIENT_JOINED";
const ON_CLIENT_LEFT_EVENT_NAME = "CLIENT_LEFT";
const ON_PEER_CONNECTION_OPENED_EVENT_NAME = "PEER_CONNECTION_OPENED";
const ON_PEER_CONNECTION_CLOSED_EVENT_NAME = "PEER_CONNECTION_CLOSED";
const ON_MEDIA_TRACK_ADDED_EVENT_NAME = "MEDIA_TRACK_ADDED";
const ON_MEDIA_TRACK_REMOVED_EVENT_NAME = "MEDIA_TRACK_REMOVED";

class CallEvents {
    static builder() {
        const callEvents = new CallEvents();
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
        const { name: eventType } = callEvent;
        // logger.info(`Dispatching event `, eventType, callEvent, typeof callEvent, Object.keys(callEvent));
        try {
            this._emitter.emit(eventType, callEvent);
        } catch (error) {
            this._emitter.emit(ON_ERROR_EVENT_NAME, error, callEvent);
            logger.warn(`Unexpected error occurred while emitting ${eventType}`, error, callEvent);
        }
        
    }

    onCallStarted(listener) {
        this._emitter.on(ON_CALL_STARTED_EVENT_NAME, listener);
        return this;
    }

    onCallEnded(listener) {
        this._emitter.on(ON_CALL_ENDED_EVENT_NAME, listener);
        return this;
    }

    onClientJoined(listener) {
        this._emitter.on(ON_CLIENT_JOINED_EVENT_NAME, listener);
        return this;
    }
    
    onClientLeft(listener) {
        this._emitter.on(ON_CLIENT_LEFT_EVENT_NAME, listener);
        return this;
    }
    
    onPeerConnectionOpened(listener) {
        this._emitter.on(ON_PEER_CONNECTION_OPENED_EVENT_NAME, listener);
        return this;
    }
    
    onPeerConnectionClosed(listener) {
        this._emitter.on(ON_PEER_CONNECTION_CLOSED_EVENT_NAME, listener);
        return this;
    }
    
    onMediaTrackAdded(listener) {
        this._emitter.on(ON_MEDIA_TRACK_ADDED_EVENT_NAME, listener);
        return this;
    }
    
    
    onMediaTrackRemoved(listener) {
        this._emitter.on(ON_MEDIA_TRACK_REMOVED_EVENT_NAME, listener);
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

module.exports = CallEvents;