import { HttpResponse, AppOptions, RecognizedString } from "uWebSockets.js";
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
    /**
     * Adds a get endpoint that serves a file.
     * Reloads the file from disc when cacheDuration is reached
     * @param file the absolute file path
     * @param alias the route's name
     * @param cacheDuration the time to wait before refreshing from storage in ms
     */
    private cached;
    serveFile(file: string, alias: string, cacheDuration?: number): void;
    /**
     * Adds an endpoint with a handler to be executed
     * @param groupName the name of the group, e.g. "user" becomes "/user/"
     * @param sub the stack called on this route
     * @param alias optional, will override the handlers name for the route
     */
    endpoint(method: 'del' | 'patch' | 'post' | 'get' | 'put' | 'head' | 'options', handler: (request: RequestData) => void, alias?: string | undefined): void;
    getRoutes(): string[];
}
export declare type NextFunction = (request: RequestData) => any;
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
     * @returns If write was successful
     */
    end(body: RecognizedString, closeConnection?: boolean): boolean;
    hasEnded(): boolean;
}
