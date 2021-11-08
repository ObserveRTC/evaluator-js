const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const config = require("./config");
const Prometheus = require('prom-client')
const http = require('http');
const os = require('os');
const dns = require('dns');
async function lookup(hostname) {
    return new Promise((resolve) => {
        dns.lookup(hostname, function(err, result) {
            resolve(result);
        });
    });
}


// Create the logger
const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = config.get('logLevel');

const ON_READY_EVENT_NAME = "onReady";
const ON_ERROR_EVENT_NAME = "onError";
const ON_CLOSED_EVENT_NAME = "onClosed";

class HttpServer {
    static builder() {
        const server = new HttpServer();
        const emitter = server._emitter;
        const result = {
            withPort: (port) => {
                server._port = port;
                return result;
            },
            withHostname: (hostname) => {
                server._hostName = hostname;
                return result;
            },
            onReady: (listener) => {
                emitter.once(ON_READY_EVENT_NAME, listener);
                return result;
            },
            onError: (listener) => {
                emitter.on(ON_ERROR_EVENT_NAME, listener);
                return result;
            },
            onClosed: (listener) => {
                server.onClosed(listener);
                return result;
            },
            build: () => {
                if (!server._hostName) {
                    throw new Error("hostname must be given");
                }
                return server;
            }
        };
        return result;
    }

    constructor() {
        this._id = uuidv4();
        this._hostName = null;
        this._serverIp = null;
        this._port = 3000;
        this._process = null;
        this._emitter = new EventEmitter();
        this._server = null;
        this._closed = false;
    }

    get id() {
        return this._id;
    }

    async start() {
        logger.info('The server is being started');
        const emitter = this._emitter;
        let server = null;
        try {
            const hostName = this._hostName;
            const serverIp = await lookup(hostName);
            server = await this._makeServer();
            logger.info("Byte endianess", os.endianness());
            logger.info("IP address of the machine associated with hostname", hostName, serverIp);
        } catch (error) {
            logger.error("Error occurred while server is being started", error);
            emitter.emit(ON_ERROR_EVENT_NAME, error);
            if (!this._closed) {
                this.close();
            }
            return;
        }
        server.listen(this._port, () => {
            this._server = server;
            logger.info("IP address of the http server", server.address());
            emitter.emit(ON_READY_EVENT_NAME);
        });
        server.once('close', () => {
            if (!this._closed) {
                this.close();
            }
            this._server = null;
        });
        // setTimeout(async () => {
        //     server.close();
        //     console.log("here1 ");
        // }, 2000);
        
    }

    get closed() {
        return this._closed;
    }

    async close() {
        if (this._closed) {
            logger.warn("Attempted to close an already closed server");
            return;
        }
        this._closed = true;
        logger.info('The server is being closed');

        if (this._server) {
            this._server.close();
        }
        const eventTypes = this._emitter.eventNames();
        if (eventTypes) {
            eventTypes.forEach(eventType => {
                this._emitter.removeAllListeners(eventType);
            });
        }
        logger.info(`Closed`);
        this._emitter.emit(ON_CLOSED_EVENT_NAME);
    }

    // onError(listener) {
    //     if (this._closed) {
    //         logger.warn(`Attempted to subscribe to an already closed server`, listener);
    //         return this;
    //     }
    //     this._emitter.on(ON_ERROR_EVENT_NAME, listener);
    //     return this;
    // }

    // onReady(listener) {
    //     if (this._closed) {
    //         logger.warn(`Attempted to subscribe to an already closed server`, listener);
    //         return this;
    //     }
    //     this._emitter.once(ON_READY_EVENT_NAME, listener);
    //     if (this._httpServer) {
    //         this._emitter.emit(ON_READY_EVENT_NAME);
    //     }
    //     return this;
    // }

    onClosed(listener) {
        this._emitter.once(ON_CLOSED_EVENT_NAME, listener);
        if (this._closed) {
            this._emitter.emit(ON_CLOSED_EVENT_NAME);
        }
        return this;
    }

    async _makeServer() {
        const server = http.createServer({
                maxHeaderSize: 8192,
                insecureHTTPParser: false,
            }
        );
        
        server.on('request', (request, response) => {
            switch (request.url) {
                case "/":
                    // because of GCP k8s, this must return 200
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.end(JSON.stringify({}));
                    break;
                case "/metrics":
                    response.writeHead(200, {'Content-Type': Prometheus.register.contentType});
                    Prometheus.register.metrics().then(metrics => {
                        response.end(metrics);
                    });
                    break;
                case "/health":
                    response.writeHead(200, {'Content-Type': 'application/json'});
                    response.end(JSON.stringify({
                        notImplemented: true,
                    }));
                    break;
            }
        });
        return server;
    }
}

module.exports = HttpServer;