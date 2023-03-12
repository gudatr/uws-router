"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
     * @returns If write was successful
     */
    end(body, closeConnection = false) {
        if (this._hasEnded)
            return false;
        this.internalResponse.end(body, closeConnection);
        return true;
    }
    hasEnded() {
        return this._hasEnded;
    }
}
exports.default = RequestData;
