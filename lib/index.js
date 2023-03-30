"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestData = exports.Router = void 0;
const uWebSockets_js_1 = require("uWebSockets.js");
const fs = __importStar(require("fs"));
const zlib_1 = require("zlib");
const path_1 = __importDefault(require("path"));
/**
 * A simple router that keeps your app file structured by using a
 * function stack approach for middleware. It's currently pretty
 * much meant for a POST-only api since it does not handle query strings
 */
class Router {
    constructor(ssl, options = {}) {
        this.middlewareStack = [];
        this.groupStack = [];
        this.routes = [];
        this.cachedFiles = {};
        if (ssl && options) {
            this.app = (0, uWebSockets_js_1.SSLApp)(options);
        }
        else {
            this.app = (0, uWebSockets_js_1.App)();
        }
    }
    getHttpMethod(method) {
        if (method === 'del') {
            return 'DELETE';
        }
        return method.toUpperCase();
    }
    /**
     * Adds a new middleware handler that is executed before the stack in the sub parameter.
     * Can be a request preprocessor or prematurely end the response like for example an authentication middleware
     * @param middleware
     * @param sub
     */
    middleware(middleware, sub) {
        this.middlewareStack.push(middleware);
        sub();
        this.middlewareStack.pop();
    }
    /**
     * Adds a new group to the routes in sub
     * @param groupName the name of the group, e.g. "user" becomes "/user/"
     * @param sub the stack called on this route
     * @param _this If you are using a method from an object and not a static class as handler in your endpoints, you can supply the object for the whole group here instead of separately for each endpoint
     */
    group(groupName, sub, _this = undefined) {
        this.groupStack.push(groupName.toLowerCase());
        this.thisOverride = _this;
        sub();
        this.thisOverride = undefined;
        this.groupStack.pop();
    }
    /**
     * Adds a get endpoint that serves a file.
     * Reloads the file from disc when cacheDuration is reached
     * @param file the absolute file path
     * @param alias the route's name
     * @param cacheDuration the time to wait before refreshing from storage in ms
     */
    serveFile(file, alias, cacheDuration = 10000) {
        this.endpoint('get', (request) => {
            let cached = this.cachedFiles[file];
            if (cached && cached.time > Date.now() - cacheDuration) {
                request.end(cached.data);
            }
            else {
                fs.readFile(file, (err, data) => {
                    if (err)
                        throw err;
                    this.cachedFiles[file] = {
                        time: Date.now(),
                        data
                    };
                    request.end(data);
                });
            }
        }, alias);
    }
    /**
     * The same as serveFile with the addition that the path
     * in the file parameter is resolved relative to the calling file.
     * This lets you e.g. easily use paths relative to your router file.
     * @param file the absolute file path
     * @param alias the route's name
     * @param cacheDuration the time to wait before refreshing from storage in ms
     */
    serveFileRelative(file, alias, cacheDuration = 10000) {
        this.serveFile(path_1.default.resolve(this.getCallingFile(), file), alias, cacheDuration);
    }
    getCallingFile() {
        var _a;
        let _prepareStackTrace = Error.prepareStackTrace;
        Error.prepareStackTrace = (_, stack) => stack;
        let stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.slice(1);
        Error.prepareStackTrace = _prepareStackTrace;
        return path_1.default.dirname(stack[1].getFileName());
    }
    /**
     * Adds an endpoint with a handler to be executed
     * @param method the http method used, the method will be
     * @param handle the method used to handle the incoming request for this route
     * @param alias optional, if not specified the handlers name will be used for the endpoint
     * @param _this If you are using a method from an object and not a static class as handler, add your object here so the this keyword is bound correctly
     */
    endpoint(method, handler, alias = undefined, _this = undefined, skipBody = false, skipHeaders = false) {
        //Route is created from the groups currently on the stack plus the handlers name
        this.groupStack.push(alias ? alias : handler.name.toLowerCase());
        let path = "/" + this.groupStack.join('/');
        this.groupStack.pop();
        //Middlewares currently on the stack are wrapped around the handler
        let currentHandler = handler;
        //Bind the _this parameter to the handler if specified
        if (_this) {
            currentHandler = currentHandler.bind(_this);
        }
        else if (this.thisOverride) {
            currentHandler = currentHandler.bind(this.thisOverride);
        }
        this.middlewareStack.reverse().forEach(middlewareUsed => {
            let referencedHandler = currentHandler;
            currentHandler = (request) => {
                middlewareUsed(request, referencedHandler);
            };
        });
        this.middlewareStack.reverse();
        this.routes.push(`${this.getHttpMethod(method)}: ${path}`);
        if (skipBody) {
            //Path is assigned, ignoring request type
            this.app[method](path, (res, req) => {
                //An abort handler is required by uws as the response will not be available after connection termination
                //_hasEnded will keep track if this so the response is not written to afterwards
                res.onAborted(() => res._hasEnded = true);
                let headers = {};
                req.forEach((headerKey, headerValue) => headers[headerKey] = headerValue);
                let requestData = new RequestData(headers, this.getHttpMethod(method), '', req.getQuery(), res);
                currentHandler(requestData);
            });
        }
        else {
            //Path is assigned, ignoring request type
            this.app[method](path, (res, req) => {
                //An abort handler is required by uws as the response will not be available after connection termination
                //_hasEnded will keep track if this so the response is not written to afterwards
                res.onAborted(() => res._hasEnded = true);
                let headers = {};
                req.forEach((headerKey, headerValue) => headers[headerKey] = headerValue);
                let body = Buffer.from('');
                let query = req.getQuery();
                res.onData(async (data, isLast) => {
                    body = Buffer.concat([body, Buffer.from(data)]);
                    if (isLast) {
                        let requestData = new RequestData(headers, this.getHttpMethod(method), body.toString(), query, res);
                        currentHandler(requestData);
                    }
                });
            });
        }
    }
    /**
     * @returns all defined routes and their methods
     */
    getRoutes() {
        return this.routes;
    }
    /**
     * Start listening for incoming requests on the defined routes
     * @param host hostname
     * @param port
     * @param callback us_listen_socket will contain the socket the server is listening on if successful, otherwise undefined
     */
    listen(host, port, callback) {
        this.app.listen(host, port, callback);
    }
    ;
}
exports.Router = Router;
/**
 * Wraps the data of the original request since it does not exist past the initial uws handler
 */
class RequestData {
    constructor(headers, method, data, query, internalResponse) {
        this.headers = headers;
        this.method = method;
        this.data = data;
        this.query = query;
        this.internalResponse = internalResponse;
        this._hasEnded = false;
    }
    /**
     * Add a header to the response.
     * @param key
     * @param value
     * @returns If write was successful
     */
    writeHeader(key, value) {
        if (this._hasEnded)
            return false;
        this.internalResponse.writeHeader(key, value);
        return true;
    }
    /**
     * Add a status to the response.
     * For example 200 OK or 404 Not Found
     * @param status
     * @returns If write was successful
     */
    writeStatus(status = '200 OK') {
        if (this._hasEnded)
            return false;
        this.internalResponse.writeStatus(status);
        return true;
    }
    /**
     * Add a chunk of data to the response.
     * @param status
     * @returns If write was successful
     */
    write(chunk) {
        if (this._hasEnded)
            return false;
        this.internalResponse.write(chunk);
        return true;
    }
    /**
     * Add a chunk of data to the response and end the response.
     * The response cannot be written to after this.
     * @param body
     * @param closeConnection
     * @param compression - compression level 0 - 9, adds gzip header  if used (>0)
     * @returns If write was successful
     */
    async end(body, closeConnection = false, compression = 0) {
        if (compression > 0) {
            body = await new Promise((resolve, reject) => {
                (0, zlib_1.gzip)(body, { level: compression }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
            if (this._hasEnded)
                return false;
            this.internalResponse.writeHeader('Content-Encoding', 'gzip');
        }
        if (this._hasEnded)
            return false;
        this.internalResponse.end(body, closeConnection);
        return true;
    }
    hasEnded() {
        return this._hasEnded;
    }
}
exports.RequestData = RequestData;
