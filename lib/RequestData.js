"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestData {
    constructor(headers, method, data, query, internalResponse) {
        this.headers = headers;
        this.method = method;
        this.data = data;
        this.query = query;
        this.internalResponse = internalResponse;
        this._hasEnded = false;
    }
    writeHeader(key, value) {
        if (this._hasEnded)
            return false;
        this.internalResponse.writeHeader(key, value);
        return true;
    }
    writeStatus(status = '200 OK') {
        if (this._hasEnded)
            return false;
        this.internalResponse.writeStatus(status);
        return true;
    }
    write(chunk) {
        if (this._hasEnded)
            return false;
        this.internalResponse.write(chunk);
        return true;
    }
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
