import Dictionary from "./Dictionary";
import { HttpResponse, RecognizedString } from 'uWebSockets.js';
/**
 * Wraps the data of the original request since it does not exist past the initial uws handler
 */
export default class RequestData {
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
