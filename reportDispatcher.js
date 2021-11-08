const EventEmitter = require('events');
const { ReportTypes } = require('./constants');
const config = require("./config");

// Create the logger
const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const ON_ERROR_EVENT_NAME = "onERROR";
const ON_CLOSED_EVENT_NAME = "onCLOSED";
const ON_UNDISPATCHED_EVENT_NAME = "onUNDISPATCHED";


class ReportDispatcher {
    static builder() {
        const sink = new ReportDispatcher();
        const emitter = sink._emitter;
        const result = {
            onError: listener => {
                emitter.on(ON_ERROR_EVENT_NAME, listener);
                return result;
            },
            build: () => {
                return sink;
            },
        };
        return result;
    }

    constructor() {
        this._emitter = new EventEmitter();
    }

    dispatch(reportType, report) {
        if (!reportType || !report) {
            logger.warn(`Attempted to dispatch a null value. (reportType: ${reportType}, report: ${report})`);
            return;
        }
        if (this._emitter.listenerCount(reportType) < 1) {
            if (this._emitter.listenerCount(ON_UNDISPATCHED_EVENT_NAME)) {
                this._emitter.emit(ON_UNDISPATCHED_EVENT_NAME, report);
            }
            return;
        }
        try {
            this._emitter.emit(reportType, report);
        } catch (error) {
            logger.warn(`Error occurred while dispatching (reportType: ${reportType}, report: ${report})`);
            this._emitter.emit(ON_ERROR_EVENT_NAME, error, reportType, report);
        }
    }

    onObserverEvent(listener) {
        this._emitter.on(ReportTypes.OBSERVER_EVENT, listener);
        return this;
    }
    
    onCallEvent(listener) {
        this._emitter.on(ReportTypes.CALL_EVENT, listener);
        return this;
    }
    
    onCallMetaData(listener) {
        this._emitter.on(ReportTypes.CALL_META_DATA, listener);
        return this;
    }
    
    onClientExtensionData(listener) {
        this._emitter.on(ReportTypes.CLIENT_EXTENSION_DATA, listener);
        return this;
    }

    onPeerConnectionTransport(listener) {
        this._emitter.on(ReportTypes.PEER_CONNECTION_TRANSPORT, listener);
        return this;
    }

    onPeerConnectionDataChannel(listener) {
        this._emitter.on(ReportTypes.PEER_CONNECTION_DATA_CHANNEL, listener);
        return this;
    }

    onInboundAudioTrack(listener) {
        this._emitter.on(ReportTypes.INBOUND_AUDIO_TRACK, listener);
        return this;
    }

    onInboundVideoTrack(listener) {
        this._emitter.on(ReportTypes.INBOUND_VIDEO_TRACK, listener);
        return this;
    }

    onOutboundAudioTrack(listener) {
        this._emitter.on(ReportTypes.OUTBOUND_AUDIO_TRACK, listener);
        return this;
    }

    onOutboundVideoTrack(listener) {
        this._emitter.on(ReportTypes.OUTBOUND_VIDEO_TRACK, listener);
        return this;
    }

    onMediaTrack(listener) {
        this._emitter.on(ReportTypes.MEDIA_TRACK, listener);
        return this;
    }
    
    onSfuEvent(listener) {
        this._emitter.on(ReportTypes.SFU_EVENT, listener);
        return this;
    }
    
    onSfuMetaData(listener) {
        this._emitter.on(ReportTypes.SFU_META_DATA, listener);
        return this;
    }
    
    onSfuTransport(listener) {
        this._emitter.on(ReportTypes.SFU_TRANSPORT, listener);
        return this;
    }
    
    onSfuInboundRtpPad(listener) {
        this._emitter.on(ReportTypes.SFU_INBOUND_RTP_PAD, listener);
        return this;
    }
    
    onSfuOutboundRtpPad(listener) {
        this._emitter.on(ReportTypes.SFU_OUTBOUND_RTP_PAD, listener);
        return this;
    }
    
    onSfuSctpStream(listener) {
        this._emitter.on(ReportTypes.SFU_SCTP_STREAM, listener);
        return this;
    }

    onUnrecognizedReport(listener) {
        this._emitter.on(ON_UNDISPATCHED_EVENT_NAME, listener)
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

module.exports = ReportDispatcher
