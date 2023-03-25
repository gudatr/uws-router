import { HttpResponse, AppOptions, RecognizedString, us_listen_socket } from "uWebSockets.js";
/**
 * A simple router that keeps your app file structured by using a
 * function stack approach for middleware. It's currently pretty
 * much meant for a POST-only api since it does not handle query strings
 */
export declare class Router {
    private middlewareStack;
    private groupStack;
    private routes;
    private app;
    constructor(ssl: boolean, options?: AppOptions);
    private getHttpMethod;
    /**
     * Adds a new middleware handler that is executed before the stack in the sub parameter.
     * Can be a request preprocessor or prematurely end the response like for example an authentication middleware
     * @param middleware
     * @param sub
     */
    middleware(middleware: (request: RequestData, next: NextFunction) => void, sub: () => void): void;
    /**
     * Adds a new group to the routes in sub
     * @param groupName the name of the group, e.g. "user" becomes "/user/"
     * @param sub the stack called on this route
     */
    group(groupName: string, sub: () => void): void;
    private cachedFiles;
    /**
     * Adds a get endpoint that serves a file.
     * Reloads the file from disc when cacheDuration is reached
     * @param file the absolute file path
     * @param alias the route's name
     * @param cacheDuration the time to wait before refreshing from storage in ms
     */
    serveFile(file: string, alias: string, cacheDuration?: number): void;
    /**
     * The same as serveFile with the addition that the path
     * in the file parameter is resolved with path.resolve(__dirname, file).
     * This lets you e.g. easily use paths relative to your router file.
     * @param file the absolute file path
     * @param alias the route's name
     * @param cacheDuration the time to wait before refreshing from storage in ms
     */
    serveFileRelative(file: string, alias: string, cacheDuration?: number): void;
    /**
     * Adds an endpoint with a handler to be executed
     * @param method the http method used, the method will be
     * @param handle the method used to handle the incoming request for this route
     * @param alias optional, if not specified the handlers name will be used for the endpoint
     * @param _this If you are using a method from an object and not a static class as handler, add your object here so the this keyword is bound correctly
     */
    endpoint(method: 'del' | 'patch' | 'post' | 'get' | 'put' | 'head' | 'options', handler: (request: RequestData) => void, alias?: string | undefined, _this?: any | undefined): void;
    /**
     * @returns all defined routes and their methods
     */
    getRoutes(): string[];
    /**
     * Start listening for incoming requests on the defined routes
     * @param host hostname
     * @param port
     * @param callback us_listen_socket will contain the socket the server is listening on if successful, otherwise undefined
     */
    listen(host: RecognizedString, port: number, callback: (listen: us_listen_socket) => void): void;
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
export declare class RequestData {
    headers: Dictionary<string>;
    method: string;
    data: string;
    query: string;
    internalResponse: HttpResponse;
    private _hasEnded;
    [key: string]: any;
    constructor(headers: Dictionary<string>, method: string, data: string, query: string, internalResponse: HttpResponse);
    /**
     * Add a header to the response.
     * @param key
     * @param value
     * @returns If write was successful
     */
    writeHeader(key: RecognizedString, value: RecognizedString): boolean;
    /**
     * Add a status to the response.
     * For example 200 OK or 404 Not Found
     * @param status
     * @returns If write was successful
     */
    writeStatus(status?: RecognizedString): boolean;
    /**
     * Add a chunk of data to the response.
     * @param status
     * @returns If write was successful
     */
    write(chunk: RecognizedString): boolean;
    /**
     * Add a chunk of data to the response and end the response.
     * The response cannot be written to after this.
     * @param body
     * @param closeConnection
     * @param compression - compression level 0 - 9, adds gzip header  if used (>0)
     * @returns If write was successful
     */
    end(body: RecognizedString, closeConnection?: boolean, compression?: number): Promise<boolean>;
    hasEnded(): boolean;
}
