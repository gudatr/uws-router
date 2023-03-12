import { AppOptions } from "uWebSockets.js";
import { NextFunction } from "./NextFunction";
import RequestData from "./RequestData";
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
