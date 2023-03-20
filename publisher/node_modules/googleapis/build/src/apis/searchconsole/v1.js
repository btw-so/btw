"use strict";
// Copyright 2020 Google LLC
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchconsole_v1 = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/class-name-casing */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable no-irregular-whitespace */
const googleapis_common_1 = require("googleapis-common");
var searchconsole_v1;
(function (searchconsole_v1) {
    /**
     * Google Search Console API
     *
     * The Search Console API provides access to both Search Console data (verified users only) and to public information on an URL basis (anyone)
     *
     * @example
     * ```js
     * const {google} = require('googleapis');
     * const searchconsole = google.searchconsole('v1');
     * ```
     */
    class Searchconsole {
        constructor(options, google) {
            this.context = {
                _options: options || {},
                google,
            };
            this.searchanalytics = new Resource$Searchanalytics(this.context);
            this.sitemaps = new Resource$Sitemaps(this.context);
            this.sites = new Resource$Sites(this.context);
            this.urlTestingTools = new Resource$Urltestingtools(this.context);
        }
    }
    searchconsole_v1.Searchconsole = Searchconsole;
    class Resource$Searchanalytics {
        constructor(context) {
            this.context = context;
        }
        query(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback ||
                {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}/searchAnalytics/query').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'POST',
                }, options),
                params,
                requiredParams: ['siteUrl'],
                pathParams: ['siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
    }
    searchconsole_v1.Resource$Searchanalytics = Resource$Searchanalytics;
    class Resource$Sitemaps {
        constructor(context) {
            this.context = context;
        }
        delete(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'DELETE',
                }, options),
                params,
                requiredParams: ['siteUrl', 'feedpath'],
                pathParams: ['feedpath', 'siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
        get(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                }, options),
                params,
                requiredParams: ['siteUrl', 'feedpath'],
                pathParams: ['feedpath', 'siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
        list(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}/sitemaps').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                }, options),
                params,
                requiredParams: ['siteUrl'],
                pathParams: ['siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
        submit(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'PUT',
                }, options),
                params,
                requiredParams: ['siteUrl', 'feedpath'],
                pathParams: ['feedpath', 'siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
    }
    searchconsole_v1.Resource$Sitemaps = Resource$Sitemaps;
    class Resource$Sites {
        constructor(context) {
            this.context = context;
        }
        add(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'PUT',
                }, options),
                params,
                requiredParams: ['siteUrl'],
                pathParams: ['siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
        delete(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'DELETE',
                }, options),
                params,
                requiredParams: ['siteUrl'],
                pathParams: ['siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
        get(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites/{siteUrl}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                }, options),
                params,
                requiredParams: ['siteUrl'],
                pathParams: ['siteUrl'],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
        list(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/webmasters/v3/sites').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                }, options),
                params,
                requiredParams: [],
                pathParams: [],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
    }
    searchconsole_v1.Resource$Sites = Resource$Sites;
    class Resource$Urltestingtools {
        constructor(context) {
            this.context = context;
            this.mobileFriendlyTest = new Resource$Urltestingtools$Mobilefriendlytest(this.context);
        }
    }
    searchconsole_v1.Resource$Urltestingtools = Resource$Urltestingtools;
    class Resource$Urltestingtools$Mobilefriendlytest {
        constructor(context) {
            this.context = context;
        }
        run(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback ||
                {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://searchconsole.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/v1/urlTestingTools/mobileFriendlyTest:run').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'POST',
                }, options),
                params,
                requiredParams: [],
                pathParams: [],
                context: this.context,
            };
            if (callback) {
                googleapis_common_1.createAPIRequest(parameters, callback);
            }
            else {
                return googleapis_common_1.createAPIRequest(parameters);
            }
        }
    }
    searchconsole_v1.Resource$Urltestingtools$Mobilefriendlytest = Resource$Urltestingtools$Mobilefriendlytest;
})(searchconsole_v1 = exports.searchconsole_v1 || (exports.searchconsole_v1 = {}));
