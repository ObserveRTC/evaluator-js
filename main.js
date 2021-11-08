const HttpServer = require("./httpServer");
const constants = require("./constants");
const config = require("./config");
const process = require('process');
const CallEvents = require("./callEvents");
const SfuEvents = require("./sfuEvents");
const Calls = require("./calls");
const PromSink = require("./promSink");
const ReportDispatcher = require("./reportDispatcher");
const KafkaSource = require("./kafkaSource");
const { v4: uuidv4 } = require('uuid');
const { Buffer } = require('buffer');

// Create the logger
const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const sleep = (timeInMs) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, timeInMs)
    })
}

const setup = () => new Promise(resolve => {
    const hostName = config.get('hostname');
    const serverPort = config.get('serverPort');
    const promSink = PromSink.builder().build();
    const httpServer = HttpServer.builder()
        .withHostname(hostName)
        .withPort(serverPort)
        .onReady(() => {
            resolve({
                httpServer,
                promSink
            });
        })
        .build();
    
    promSink.onClosed(() => {
        if (!httpServer.closed) {
            httpServer.close();
        }
    })
    httpServer.onClosed(() => {
        if (!promSink.closed) {
            promSink.close();
        }
    });
    httpServer.start();
}).then(({ promSink }) => {
    const reportDispatcher = ReportDispatcher.builder().build();
    const callEvents = CallEvents.builder().build();
    const sfuEvents = SfuEvents.builder().build();
    reportDispatcher.onClosed(() => {
        if (!promSink.closed) {
            promSink.close();
        }
        if (!callEvents.closed) {
            callEvents.close();
        }
    });
    callEvents.onClosed(() => {
        if (!promSink.closed) {
            promSink.close();
        }
        if (!reportDispatcher.closed) {
            reportDispatcher.close();
        }
    });
    const kafkaBrokers = config.get("kafkaBrokers");
    const kafkaOffset = config.get("kafkaOffset");
    const kafkaGroupId = config.get("kafkaGroupId");
    const kafkaMuxReportTopic = config.get("kafkaMuxReportTopic")
    const kafkaSourceBuilder = KafkaSource.builder()
        .withClientId(`myclient-` + uuidv4())
        .withOffset(kafkaOffset)
        .withBrokers(kafkaBrokers)
        .withGroupId(kafkaGroupId)
        .withFormat("json");
    if (true) {
        kafkaSourceBuilder.withMultiplexedSourceTopic(kafkaMuxReportTopic);
    } else {
        // NOT IMPLEMETED YET, sorry.
        kafkaSourceBuilder.withDemultiplexedPrefixedTopicName("observertc-");
    }
    const kafkaSource = kafkaSourceBuilder.build();
    return {
        kafkaSource,
        reportDispatcher,
        callEvents,
        sfuEvents,
        promSink,
    }
});

let started = false;
const main = async () => {
    logger.info(`Service is starting now`);
    if (started) {
        logger.warn(`Attempted to start the server twice`);
        return;
    }
    started = true;
    logger.info("Loaded configuration", config.getProperties());
    const initialWaitingTimeInS = config.get("initialWaitingTimeInS");
    if (0 < initialWaitingTimeInS) {
        const initialWaitingTimeInMs = initialWaitingTimeInS * 1000;
        logger.info(`Enforced waiting for ${initialWaitingTimeInMs}ms`);
        await sleep(initialWaitingTimeInMs);
    }
    const { kafkaSource, reportDispatcher, callEvents, sfuEvents, promSink } = await setup();
    process.on('SIGINT', () => {
        if (!kafkaSource.closed) {
            kafkaSource.close();
        }
        if (!promSink.closed) {
            promSink.close();
        }
        setTimeout(() => {
            logger.info("Graceful timeout elapsed, process exit");
            process.exit(0);
        }, 3000);
    });

    kafkaSource.onReport(({ reportType, report }) => {
        logger.debug(`Consumed Report `, reportType, report);
        reportDispatcher.dispatch(reportType, report);
    });
    const calls = Calls.builder().build();
    reportDispatcher
        .onObserverEvent(observerEvent => {

        })
        .onCallEvent(callEvent => {
            callEvents.dispatch(callEvent);
        })
        .onCallMetaData(callMetaData => {

        })
        .onClientExtensionData(clientExtensionData => {
            
        })
        .onPeerConnectionTransport(pcTransport => {
            
        })
        .onPeerConnectionDataChannel(pcDataChannel => {
            
        })
        .onInboundAudioTrack(inbAudioTrack => {
            
        })
        .onInboundVideoTrack(inbVideoTrack => {
            
        })
        .onOutboundAudioTrack(outbAudioTrack => {
            
        })
        .onOutboundVideoTrack(outbVideoTrack => {
            
        })
        .onMediaTrack(mediaTrack => {
            
        })
        .onSfuEvent(sfuEvent => {
            sfuEvents.dispatch(sfuEvent);
        })
        .onSfuMetaData(sfuMetaData => {
            
        })
        .onSfuTransport(sfuTransport => {
            
        })
        .onSfuInboundRtpPad(sfuInboundRtpPad => {
            
        })
        .onSfuOutboundRtpPad(sfuOutboundRtpPad => {
            
        })
        .onSfuSctpStream(sfuSctpStream => {
            
        })
        .onUnrecognizedReport(unknownReport => {
            
        });
    callEvents
        .onCallStarted(callEvent => {
            logger.info(`Call Started event `, callEvent);
            const { callId, timestamp, serviceId } = callEvent;
            if (!callId) {
                return;
            }
            promSink.startedCall({ serviceId });
            calls.started(callId, serviceId, timestamp);
        })
        .onCallEnded(callEvent => {
            const { callId, timestamp, serviceId } = callEvent;
            if (!callId) {
                return;
            }
            promSink.endedCall({ serviceId });
            calls.ended(callId, serviceId, timestamp);
        })
        .onClientJoined(callEvent => {
            logger.info(`Client Joined event `, callEvent);
            const { callId, clientId, timestamp, serviceId } = callEvent;
            if (!callId) {
                return;
            }
            promSink.joinedClient({ serviceId });
            if (clientId && timestamp) {
                calls.joinClient(callId, clientId, timestamp);    
            }
        })
        .onClientLeft(callEvent => {
            const { callId, clientId, timestamp, serviceId } = callEvent;
            if (!callId) {
                return;
            }
            promSink.detachedClient({ serviceId });
            if (clientId && timestamp) {
                calls.detachClient(callId, clientId, timestamp);
            }
        })
        .onPeerConnectionOpened(callEvent => {
            const { serviceId } = callEvent;
            promSink.openedPeerConnection({ serviceId });
        })
        .onPeerConnectionClosed(callEvent => {
            const { serviceId } = callEvent;
            promSink.closedPeerConnection({ serviceId });
        })
        .onMediaTrackAdded(callEvent => {
            
        })
        .onMediaTrackRemoved(callEvent => {
            
        });
    sfuEvents
        .onSfuJoined(sfuEvent => {

        })
        .onSfuLeft(sfuEvent => {
            
        })
        .onSfuTransportOpened(sfuEvent => {
            
        })
        .onSfuTransportClosed(sfuEvent => {
            
        })
        .onSfuRtpPadAdded(sfuEvent => {
            const { serviceId, mediaUnitId, attachments } = sfuEvent;
            let streamDirection = null;
            if (attachments) {
                const str = Buffer.from(attachments, 'base64').toString('ascii');
                if (str) {
                    const attachmentObj = JSON.parse(str);
                    streamDirection = attachmentObj.streamDirection;
                }
            }
            
            promSink.addedSfuRtpPad({
                serviceId,
                mediaUnitId,
                streamDirection,
            });
        })
        .onSfuRtpPadRemoved(sfuEvent => {
            const { serviceId, mediaUnitId, attachments } = sfuEvent;
            let streamDirection = null;
            if (attachments) {
                const str = Buffer.from(attachments, 'base64').toString('ascii');
                if (str) {
                    const attachmentObj = JSON.parse(str);
                    streamDirection = attachmentObj.streamDirection;
                }
            }
            
            promSink.removedSfuRtpPad({
                serviceId,
                mediaUnitId,
                streamDirection,
            })
        });
    calls.onSummarized(completedCall => {
        const { serviceId,
            durationInMs,
            maxClients,
            // useSFU
        } = completedCall;
        promSink
            .addCallMaxClientNum({ serviceId, maxClients })
            .addCallDuration({ serviceId, durationInMs })
            ;
    });
    await kafkaSource.start();
};

main();
