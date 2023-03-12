import Dictionary from "./Dictionary";
import { HttpResponse, RecognizedString } from 'uWebSockets.js';
export default class RequestData {
    headers: Dictionary<string>;
    method: string;
    data: string;
    query: string;
    internalResponse: HttpResponse;
    private _hasEnded;
    [key: string]: any;
    constructor(headers: Dictionary<string>, method: string, data: string, query: string, internalResponse: HttpResponse);
    writeHeader(key: RecognizedString, value: RecognizedString): boolean;
    writeStatus(status?: RecognizedString): boolean;
    write(chunk: RecognizedString): boolean;
    end(body: RecognizedString, closeConnection?: boolean): boolean;
    hasEnded(): boolean;
}
