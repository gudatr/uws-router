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
const RequestData_1 = __importDefault(require("./RequestData"));
const fs = __importStar(require("fs"));
class Router {
    constructor(app) {
        this.app = app;
        this.middlewareStack = [];
        this.groupStack = [];
        this.routes = [];
        this.cached = {};
    }
    getHttpMethod(method) {
        if (method === 'del') {
            return 'DELETE';
        }
        return method.toUpperCase();
    }
    middleware(middleware, sub) {
        this.middlewareStack.push(middleware);
        sub();
        this.middlewareStack.pop();
    }
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
                });
            }
        }, alias);
    }
    endpoint(method, handler, alias = undefined) {
        this.groupStack.push(alias ? alias : handler.name.toLowerCase());
        let path = "/" + this.groupStack.join('/');
        this.groupStack.pop();
        let currentHandler = handler;
        this.middlewareStack.forEach(middlewareUsed => {
            let referencedHandler = currentHandler;
            currentHandler = (request) => {
                middlewareUsed(request, referencedHandler);
            };
        });
        this.routes.push(`${method}: ${path}`);
        this.app[method](path, (res, req) => {
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
