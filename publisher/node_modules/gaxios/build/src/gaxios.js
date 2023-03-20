"use strict";
// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gaxios = void 0;
const extend_1 = __importDefault(require("extend"));
const https_1 = require("https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const querystring_1 = __importDefault(require("querystring"));
const is_stream_1 = __importDefault(require("is-stream"));
const url_1 = require("url");
const common_1 = require("./common");
const retry_1 = require("./retry");
/* eslint-disable @typescript-eslint/no-explicit-any */
const fetch = hasFetch() ? window.fetch : node_fetch_1.default;
function hasWindow() {
    return typeof window !== 'undefined' && !!window;
}
function hasFetch() {
    return hasWindow() && !!window.fetch;
}
function hasBuffer() {
    return typeof Buffer !== 'undefined';
}
function hasHeader(options, header) {
    return !!getHeader(options, header);
}
function getHeader(options, header) {
    header = header.toLowerCase();
    for (const key of Object.keys((options === null || options === void 0 ? void 0 : options.headers) || {})) {
        if (header === key.toLowerCase()) {
            return options.headers[key];
        }
    }
    return undefined;
}
let HttpsProxyAgent;
function loadProxy() {
    const proxy = process.env.HTTPS_PROXY ||
        process.env.https_proxy ||
        process.env.HTTP_PROXY ||
        process.env.http_proxy;
    if (proxy) {
        HttpsProxyAgent = require('https-proxy-agent');
    }
    return proxy;
}
loadProxy();
function skipProxy(url) {
    var _a;
    const noProxyEnv = (_a = process.env.NO_PROXY) !== null && _a !== void 0 ? _a : process.env.no_proxy;
    if (!noProxyEnv) {
        return false;
    }
    const noProxyUrls = noProxyEnv.split(',');
    const parsedURL = new url_1.URL(url);
    return !!noProxyUrls.find(url => {
        if (url.startsWith('*.') || url.startsWith('.')) {
            url = url.replace('*', '');
            return parsedURL.hostname.endsWith(url);
        }
        else {
            return url === parsedURL.origin || url === parsedURL.hostname;
        }
    });
}
// Figure out if we should be using a proxy. Only if it's required, load
// the https-proxy-agent module as it adds startup cost.
function getProxy(url) {
    // If there is a match between the no_proxy env variables and the url, then do not proxy
    if (skipProxy(url)) {
        return undefined;
        // If there is not a match between the no_proxy env variables and the url, check to see if there should be a proxy
    }
    else {
        return loadProxy();
    }
}
class Gaxios {
    /**
     * The Gaxios class is responsible for making HTTP requests.
     * @param defaults The default set of options to be used for this instance.
     */
    constructor(defaults) {
        this.agentCache = new Map();
        this.defaults = defaults || {};
    }
    /**
     * Perform an HTTP request with the given options.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    async request(opts = {}) {
        opts = this.validateOpts(opts);
        return this._request(opts);
    }
    async _defaultAdapter(opts) {
        const fetchImpl = opts.fetchImplementation || fetch;
        const res = (await fetchImpl(opts.url, opts));
        const data = await this.getResponseData(opts, res);
        return this.translateResponse(opts, res, data);
    }
    /**
     * Internal, retryable version of the `request` method.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    async _request(opts = {}) {
        try {
            let translatedResponse;
            if (opts.adapter) {
                translatedResponse = await opts.adapter(opts, this._defaultAdapter.bind(this));
            }
            else {
                translatedResponse = await this._defaultAdapter(opts);
            }
            if (!opts.validateStatus(translatedResponse.status)) {
                throw new common_1.GaxiosError(`Request failed with status code ${translatedResponse.status}`, opts, translatedResponse);
            }
            return translatedResponse;
        }
        catch (e) {
            const err = e;
            err.config = opts;
            const { shouldRetry, config } = await retry_1.getRetryConfig(e);
            if (shouldRetry && config) {
                err.config.retryConfig.currentRetryAttempt =
                    config.retryConfig.currentRetryAttempt;
                return this._request(err.config);
            }
            throw err;
        }
    }
    async getResponseData(opts, res) {
        switch (opts.responseType) {
            case 'stream':
                return res.body;
            case 'json': {
                let data = await res.text();
                try {
                    data = JSON.parse(data);
                }
                catch (_a) {
                    // continue
                }
                return data;
            }
            case 'arraybuffer':
                return res.arrayBuffer();
            case 'blob':
                return res.blob();
            default:
                return res.text();
        }
    }
    /**
     * Validates the options, and merges them with defaults.
     * @param opts The original options passed from the client.
     */
    validateOpts(options) {
        const opts = extend_1.default(true, {}, this.defaults, options);
        if (!opts.url) {
            throw new Error('URL is required.');
        }
        // baseUrl has been deprecated, remove in 2.0
        const baseUrl = opts.baseUrl || opts.baseURL;
        if (baseUrl) {
            opts.url = baseUrl + opts.url;
        }
        opts.paramsSerializer = opts.paramsSerializer || this.paramsSerializer;
        if (opts.params && Object.keys(opts.params).length > 0) {
            let additionalQueryParams = opts.paramsSerializer(opts.params);
            if (additionalQueryParams.startsWith('?')) {
                additionalQueryParams = additionalQueryParams.slice(1);
            }
            const prefix = opts.url.includes('?') ? '&' : '?';
            opts.url = opts.url + prefix + additionalQueryParams;
        }
        if (typeof options.maxContentLength === 'number') {
            opts.size = options.maxContentLength;
        }
        if (typeof options.maxRedirects === 'number') {
            opts.follow = options.maxRedirects;
        }
        opts.headers = opts.headers || {};
        if (opts.data) {
            if (is_stream_1.default.readable(opts.data)) {
                opts.body = opts.data;
            }
            else if (hasBuffer() && Buffer.isBuffer(opts.data)) {
                // Do not attempt to JSON.stringify() a Buffer:
                opts.body = opts.data;
                if (!hasHeader(opts, 'Content-Type')) {
                    opts.headers['Content-Type'] = 'application/json';
                }
            }
            else if (typeof opts.data === 'object') {
                // If www-form-urlencoded content type has been set, but data is
                // provided as an object, serialize the content using querystring:
                if (getHeader(opts, 'content-type') ===
                    'application/x-www-form-urlencoded') {
                    opts.body = opts.paramsSerializer(opts.data);
                }
                else {
                    if (!hasHeader(opts, 'Content-Type')) {
                        opts.headers['Content-Type'] = 'application/json';
                    }
                    opts.body = JSON.stringify(opts.data);
                }
            }
            else {
                opts.body = opts.data;
            }
        }
        opts.validateStatus = opts.validateStatus || this.validateStatus;
        opts.responseType = opts.responseType || 'json';
        if (!opts.headers['Accept'] && opts.responseType === 'json') {
            opts.headers['Accept'] = 'application/json';
        }
        opts.method = opts.method || 'GET';
        const proxy = getProxy(opts.url);
        if (proxy) {
            if (this.agentCache.has(proxy)) {
                opts.agent = this.agentCache.get(proxy);
            }
            else {
                // Proxy is being used in conjunction with mTLS.
                if (opts.cert && opts.key) {
                    const parsedURL = new url_1.URL(proxy);
                    opts.agent = new HttpsProxyAgent({
                        port: parsedURL.port,
                        host: parsedURL.host,
                        protocol: parsedURL.protocol,
                        cert: opts.cert,
                        key: opts.key,
                    });
                }
                else {
                    opts.agent = new HttpsProxyAgent(proxy);
                }
                this.agentCache.set(proxy, opts.agent);
            }
        }
        else if (opts.cert && opts.key) {
            // Configure client for mTLS:
            if (this.agentCache.has(opts.key)) {
                opts.agent = this.agentCache.get(opts.key);
            }
            else {
                opts.agent = new https_1.Agent({
                    cert: opts.cert,
                    key: opts.key,
                });
                this.agentCache.set(opts.key, opts.agent);
            }
        }
        return opts;
    }
    /**
     * By default, throw for any non-2xx status code
     * @param status status code from the HTTP response
     */
    validateStatus(status) {
        return status >= 200 && status < 300;
    }
    /**
     * Encode a set of key/value pars into a querystring format (?foo=bar&baz=boo)
     * @param params key value pars to encode
     */
    paramsSerializer(params) {
        return querystring_1.default.stringify(params);
    }
    translateResponse(opts, res, data) {
        // headers need to be converted from a map to an obj
        const headers = {};
        res.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return {
            config: opts,
            data: data,
            headers,
            status: res.status,
            statusText: res.statusText,
            // XMLHttpRequestLike
            request: {
                responseURL: res.url,
            },
        };
    }
}
exports.Gaxios = Gaxios;
//# sourceMappingURL=gaxios.js.map