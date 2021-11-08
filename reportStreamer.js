// const EventEmitter = require('events');
// const { ReportTypes } = require('./constants');
// const config = require("./config");

// // Create the logger
// const log4js = require('log4js');
// const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
// const logger = log4js.getLogger(moduleName);
// logger.level = config.get('logLevel');

// const ON_ERROR_EVENT_NAME = "onERROR";
// const ON_CLOSED_EVENT_NAME = "onCLOSED";
// const ON_UNDISPATCHED_EVENT_NAME = "onUNDISPATCHED";


// class ReportDispatcher extends WritableStream {
//     static builder() {
//         const sink = new ReportDispatcher();
//         const emitter = sink._emitter;
//         const result = {
//             onError: listener => {
//                 emitter.on(ON_ERROR_EVENT_NAME, listener);
//                 return result;
//             },
//             build: () => {
//                 return sink;
//             },
//         };
//         return result;
//     }

//     constructor() {
//         this._emitter = new EventEmitter();
//         this._dispatcher = ReportDispatcher.builder()
//             .onError(error => {
//                 this._emitter
//             })
//             .build();
//         this._readableStreams = [];
//     }

//     streamCallEvents() {
//         return this._makeStream(this._dispatcher.onCallEvent);
//     }

//     _makeStream(dispatcher) {
//         const stream = new Readable({
//             read() {}
//         });
//         dispatcher(data => {
//             stream.push(data);
//         });
//         this._readableStreams.push(stream);
//         return stream;
//     }

//     onClosed(listener) {
//         this._emitter.once(ON_CLOSED_EVENT_NAME, listener);
//         return this;
//     }

//     get closed() {
//         return this._closed;
//     }

//     close() {
//         if (this._closed) {
//             logger.warn(`Attempted to close twice`);
//             return;
//         }
//         this._closed = true;
//         const eventTypes = this._emitter.eventNames();
//         if (eventTypes) {
//             eventTypes.filter(type => type !== ON_CLOSED_EVENT_NAME).forEach(type => {
//                 this._emitter.removeAllListeners(type);
//             });
//         }
//         logger.info(`Closed`);
//         this._emitter.emit(ON_CLOSED_EVENT_NAME);
//     }
// }

// module.exports = ReportDispatcher
