"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.Router = void 0;
const uWebSockets_js_1 = require("uWebSockets.js");
const RequestData_1 = __importDefault(require("./RequestData"));
const fs = __importStar(require("fs"));
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
        /**
         * Adds a get endpoint that serves a file.
         * Reloads the file from disc when cacheDuration is reached
         * @param file the absolute file path
         * @param alias the route's name
         * @param cacheDuration the time to wait before refreshing from storage in ms
         */
        this.cached = {};
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
     */
    group(groupName, sub) {
        this.groupStack.push(groupName.toLowerCase());
        sub();
        this.groupStack.pop();
    }
    serveFile(file, alias, cacheDuration = 10000) {
        this.endpoint('get', (request) => {
            let cached = this.cached[file];
            if (cached && cached.time > Date.now() - cacheDuration) {
                request.end(cached.data);
            }
            else {
                fs.readFile(file, (err, data) => {
                    if (err)
                        throw err;
                    this.cached[file] = {
                        time: Date.now(),
                        data
                    };
                    request.end(data);
                });
            }
        }, alias);
    }
    /**
     * Adds an endpoint with a handler to be executed
     * @param groupName the name of the group, e.g. "user" becomes "/user/"
     * @param sub the stack called on this route
     * @param alias optional, will override the handlers name for the route
     */
    endpoint(method, handler, alias = undefined) {
        //Route is created from the groups currently on the stack plus the handlers name
        this.groupStack.push(alias ? alias : handler.name.toLowerCase());
        let path = "/" + this.groupStack.join('/');
        this.groupStack.pop();
        //Middlewares currently on the stack are wrapped around the handler
        let currentHandler = handler;
        this.middlewareStack.forEach(middlewareUsed => {
            let referencedHandler = currentHandler;
            currentHandler = (request) => {
                middlewareUsed(request, referencedHandler);
            };
        });
        this.routes.push(`${method}: ${path}`);
        //Path is assigned, ignoring request type
        this.app[method](path, (res, req) => {
            //An abort handler is required by uws as the response will not be available after connection termination
            res.onAborted(() => res._hasEnded = true);
            let headers = {};
            req.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });
            let body = Buffer.from('');
            let query = req.getQuery();
            res.onData(async (data, isLast) => {
                body = Buffer.concat([body, Buffer.from(data)]);
                if (isLast) {
                    currentHandler(new RequestData_1.default(headers, this.getHttpMethod(method), body.toString(), query, res));
                }
            });
        });
    }
    getRoutes() {
        return this.routes;
    }
}
exports.Router = Router;
