import { TemplatedApp } from "uWebSockets.js";
import { NextFunction } from "./NextFunction";
import RequestData from "./RequestData";
export declare class Router {
    private app;
    private middlewareStack;
    private groupStack;
    private routes;
    constructor(app: TemplatedApp);
    private getHttpMethod;
    middleware(middleware: (request: RequestData, next: NextFunction) => void, sub: () => void): void;
    group(groupName: string, sub: () => void): void;
    private cached;
    serveFile(file: string, alias: string, cacheDuration?: number): void;
    endpoint(method: 'del' | 'patch' | 'post' | 'get' | 'put' | 'head' | 'options', handler: (request: RequestData) => void, alias?: string | undefined): void;
    getRoutes(): string[];
}
