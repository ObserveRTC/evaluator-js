const EventEmitter = require('events');
const Prometheus = require('prom-client')

// Logger and configs
const log4js = require('log4js');
const config = require("./config");
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

/** Define Prometheus metrics **/
const startedCalls = new Prometheus.Counter({
    name: 'started_calls',
    help: 'The number of initiated calls by the clients',
    labelNames: ['serviceId'],
});

const endedCalls = new Prometheus.Counter({
    name: 'ended_calls',
    help: 'The number of finished calls by the clients',
    labelNames: ['serviceId'],
});

const joinedClients = new Prometheus.Counter({
    name: 'joined_clients',
    help: 'The number of clients reported to joined',
    labelNames: ['serviceId'],
});

const detachedClients = new Prometheus.Counter({
    name: 'detached_clients',
    help: 'The number of clients reported to detached',
    labelNames: ['serviceId'],
});

const openedPeerConnections = new Prometheus.Counter({
    name: 'opened_peerconnections',
    help: 'The number of peer connections opened',
    labelNames: ['serviceId'],
});

const closedPeerConnections = new Prometheus.Counter({
    name: 'closed_peerconnections',
    help: 'The number of peer connections closed',
    labelNames: ['serviceId'],
});

const openedSfuRtpPads = new Prometheus.Counter({
    name: 'opened_rtp_pads',
    help: 'The number of RTP Pads opened on SFUs',
    labelNames: ['serviceId', 'mediaUnitId'],
});

const openedSfuInboundRtpPads = new Prometheus.Counter({
    name: 'opened_inbound_rtp_pads',
    help: 'The number of inbound RTP Pads opened on SFUs',
    labelNames: ['serviceId', 'mediaUnitId'],
});

const openedSfuOutboundRtpPads = new Prometheus.Counter({
    name: 'opened_outbound_rtp_pads',
    help: 'The number of outbound RTP Pads opened on SFUs',
    labelNames: ['serviceId', 'mediaUnitId'],
});

const closedSfuRtpPads = new Prometheus.Counter({
    name: 'closed_rtp_pads',
    help: 'The number of rtpPads closed on SFUs',
    labelNames: ['serviceId', 'mediaUnitId'],
});

const closedSfuInboundRtpPads = new Prometheus.Counter({
    name: 'closed_inbound_rtp_pads',
    help: 'The number of inbound RTP Pads closed on SFUs',
    labelNames: ['serviceId', 'mediaUnitId'],
});

const closedSfuOutboundRtpPads = new Prometheus.Counter({
    name: 'closed_outbound_rtp_pads',
    help: 'The number of outbound RTP Pads closed on SFUs',
    labelNames: ['serviceId', 'mediaUnitId'],
});

const callDurations = new Prometheus.Histogram({
    name: 'call_durations',
    help: 'The distribution of duration of calls',
    labelNames: ['serviceId'],
    buckets: [
        5 * 60 * 1000, // 5 min calls
        17 * 60 * 1000, // 17 min calls (for 15 mins meeting)
        32 * 60 * 1000, // 32 min calls (for the 30 mins meeting)
        62 * 60 * 1000, // 62 min calls (for the 1h meetings)
        5 * 60 * 60 * 1000, // less than 5h meetings
    ]
});

const callMaxJoinedClients = new Prometheus.Histogram({
    name: 'call_max_joined_clients',
    help: 'The distribution of the maximum number clients joined to a call',
    labelNames: ['serviceId'],
    buckets: [1, 2, 5, 20, 50, 100, 200]
});


const ON_ERROR_EVENT_NAME = "ERROR";
const ON_CLOSED_EVENT_NAME = "CLOSED";

class PromSink {
    static builder() {
        const sink = new PromSink();
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
        this._closed = false;
    }

    startedCall({ serviceId }) {
        startedCalls
            .labels(serviceId)
            .inc();
        return this;
    }

    endedCall({ serviceId }) {
        endedCalls
            .labels(serviceId)
            .inc();
        return this;
    }

    joinedClient({ serviceId }) {
        joinedClients
            .labels(serviceId)
            .inc();
        return this;
    }

    detachedClient({ serviceId }) {
        detachedClients
            .labels(serviceId)
            .inc();
        return this;
    }

    openedPeerConnection({ serviceId }) {
        openedPeerConnections
            .labels(serviceId)
            .inc();
        return this;
    }

    closedPeerConnection({ serviceId }) {
        closedPeerConnections
            .labels(serviceId)
            .inc();
        return this;
    }

    addedSfuRtpPad({ serviceId, mediaUnitId, streamDirection }) {
        openedSfuRtpPads
            .labels(serviceId, mediaUnitId)
            .inc();
        logger.info(`addedSfuRtpPad ${serviceId}, ${mediaUnitId}, ${streamDirection}`);
        if (streamDirection) {
            let directionCounter = null;
            const direction = streamDirection.toLowerCase();
            if (direction === "inbound") directionCounter = openedSfuInboundRtpPads;
            else if (direction === "outbound") directionCounter = openedSfuOutboundRtpPads;
            if (directionCounter) {
                directionCounter.labels(serviceId, mediaUnitId).inc();
            }
        }
        return this;
    }

    removedSfuRtpPad({ serviceId, mediaUnitId, streamDirection }) {
        closedSfuRtpPads
            .labels(serviceId, mediaUnitId)
            .inc();
        logger.info(`removedSfuRtpPad ${serviceId}, ${mediaUnitId}, ${streamDirection}`);
        if (streamDirection) {
            let directionCounter = null;
            const direction = streamDirection.toLowerCase();
            if (direction === "inbound") directionCounter = closedSfuInboundRtpPads;
            else if (direction === "outbound") directionCounter = closedSfuOutboundRtpPads;
            if (directionCounter) {
                directionCounter.labels(serviceId, mediaUnitId).inc();
            }
        }
        return this;
    }

    addCallDuration({ serviceId, durationInMs }) {
        if (!durationInMs) {
            return this;
        }
        callDurations
            .labels(serviceId)
            .observe(durationInMs);
        return this;
    }

    addCallMaxClientNum({ serviceId, maxClient }) {
        callMaxJoinedClients
            .labels(serviceId)
            .observe(maxClient);
        return this;
    }

    onClosed(listener) {
        this._emitter.once(ON_CLOSED_EVENT_NAME, listener);
        if (this._closed) {
            this._emitter.emit(ON_CLOSED_EVENT_NAME);
        }
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

module.exports = PromSink
