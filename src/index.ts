import { HttpRequest, HttpResponse, SSLApp, TemplatedApp, AppOptions, App, RecognizedString, us_listen_socket } from "uWebSockets.js";
import * as fs from 'fs';
import { gzip } from "zlib";

/**
 * A simple router that keeps your app file structured by using a
 * function stack approach for middleware. It's currently pretty
 * much meant for a POST-only api since it does not handle query strings
 */
export class Router {
    private middlewareStack: Array<(request: RequestData, next: NextFunction) => void> = [];
    private groupStack: Array<string> = [];

    private routes: Array<string> = [];
    private app: TemplatedApp;

    constructor(ssl: boolean, options: AppOptions = {}) {
        if (ssl && options) {
            this.app = SSLApp(options);
        } else {
            this.app = App();
        }
    }

    private getHttpMethod(method: string): string {
        if (method === 'del') {
            return 'DELETE'
        }
        return method.toUpperCase();
    }

    /**
     * Adds a new middleware handler that is executed before the stack in the sub parameter.
     * Can be a request preprocessor or prematurely end the response like for example an authentication middleware
     * @param middleware
     * @param sub 
     */
    middleware(middleware: (request: RequestData, next: NextFunction) => void, sub: () => void): void {
        this.middlewareStack.push(middleware);
        sub();
        this.middlewareStack.pop();
    }


    /**
     * Adds a new group to the routes in sub
     * @param groupName the name of the group, e.g. "user" becomes "/user/" 
     * @param sub the stack called on this route
     */
    group(groupName: string, sub: () => void): void {
        this.groupStack.push(groupName.toLowerCase());
        sub();
        this.groupStack.pop();
    }

    /**
     * Adds a get endpoint that serves a file.
     * Reloads the file from disc when cacheDuration is reached
     * @param file the absolute file path 
     * @param alias the route's name
     * @param cacheDuration the time to wait before refreshing from storage in ms
     */
    private cached: Dictionary<{ time: number, data: Buffer }> = {};
    serveFile(file: string, alias: string, cacheDuration: number = 10000) {
        this.endpoint('get', (request: RequestData) => {
            let cached = this.cached[file];

            if (cached && cached.time > Date.now() - cacheDuration) {
                request.end(cached.data);
            } else {
                fs.readFile(file, (err, data) => {
                    if (err) throw err;
                    this.cached[file] = {
                        time: Date.now(),
                        data
                    }
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
    endpoint(method: 'del' | 'patch' | 'post' | 'get' | 'put' | 'head' | 'options', handler: (request: RequestData) => void, alias: string | undefined = undefined): void {

        //Route is created from the groups currently on the stack plus the handlers name
        this.groupStack.push(alias ? alias : handler.name.toLowerCase());
        let path = "/" + this.groupStack.join('/');
        this.groupStack.pop();

        //Middlewares currently on the stack are wrapped around the handler
        let currentHandler = handler;
        this.middlewareStack.forEach(middlewareUsed => {
            let referencedHandler = currentHandler;
            currentHandler = (request: RequestData) => {
                middlewareUsed(request, referencedHandler);
            }
        });

        this.routes.push(`${method}: ${path}`);

        //Path is assigned, ignoring request type
        this.app[method](path, (res: HttpResponse, req: HttpRequest) => {

            //An abort handler is required by uws as the response will not be available after connection termination
            res.onAborted(() => res._hasEnded = true);

            let headers: Dictionary<string> = {};
            req.forEach((headerKey, headerValue) => {
                headers[headerKey] = headerValue;
            });

            let body = Buffer.from('');
            let query = req.getQuery();
            res.onData(async (data: ArrayBuffer, isLast: boolean) => {
                body = Buffer.concat([body, Buffer.from(data)]);

                if (isLast) {
                    currentHandler(
                        new RequestData(
                            headers,
                            this.getHttpMethod(method),
                            body.toString(),
                            query,
                            res));
                }
            });
        })
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
    listen(host: RecognizedString, port: number, callback: (listen: us_listen_socket) => void) {
        this.app.listen(host, port, callback);
    };
}

export type NextFunction = (request: RequestData) => any;

/**
 * A helper type for object literals
 */
export interface Dictionary<T> {
    [Key: string]: T;
}


/**
 * Wraps the data of the original request since it does not exist past the initial uws handler
 */
export class RequestData {

    private _hasEnded = false;
    [key: string]: any;

    constructor(
        public headers: Dictionary<string>,
        public method: string,
        public data: string,
        public query: string,
        public internalResponse: HttpResponse
    ) { }

    /**
     * Add a header to the response.
     * @param key 
     * @param value 
     * @returns If write was successful
     */
    public writeHeader(key: RecognizedString, value: RecognizedString): boolean {
        if (this._hasEnded) return false;
        this.internalResponse.writeHeader(key, value);
        return true;
    }

    /**
     * Add a status to the response.
     * For example 200 OK or 404 Not Found
     * @param status
     * @returns If write was successful
     */
    public writeStatus(status: RecognizedString = '200 OK'): boolean {
        if (this._hasEnded) return false;
        this.internalResponse.writeStatus(status);
        return true;
    }

    /**
     * Add a chunk of data to the response.
     * @param status
     * @returns If write was successful
     */
    public write(chunk: RecognizedString): boolean {
        if (this._hasEnded) return false;
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
    public async end(body: RecognizedString, closeConnection = false, compression = 0): Promise<boolean> {
        if (compression > 0) {
            body = await new Promise((resolve, reject) => {
                gzip(body, { level: compression }, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            });

            if (this._hasEnded) return false;

            this.internalResponse.writeHeader('Content-Encoding', 'gzip')
        }

        if (this._hasEnded) return false;

        this.internalResponse.end(body, closeConnection);
        return true;
    }

    public hasEnded(): boolean {
        return this._hasEnded;
    }
}