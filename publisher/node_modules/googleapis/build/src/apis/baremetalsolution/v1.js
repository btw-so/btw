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
exports.baremetalsolution_v1 = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/class-name-casing */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable no-irregular-whitespace */
const googleapis_common_1 = require("googleapis-common");
var baremetalsolution_v1;
(function (baremetalsolution_v1) {
    /**
     * Bare Metal Solution API
     *
     * Provides ways to manage Bare Metal Solution hardware installed in a regional extension located near a Google Cloud data center.
     *
     * @example
     * ```js
     * const {google} = require('googleapis');
     * const baremetalsolution = google.baremetalsolution('v1');
     * ```
     */
    class Baremetalsolution {
        constructor(options, google) {
            this.context = {
                _options: options || {},
                google,
            };
            this.projects = new Resource$Projects(this.context);
        }
    }
    baremetalsolution_v1.Baremetalsolution = Baremetalsolution;
    class Resource$Projects {
        constructor(context) {
            this.context = context;
            this.locations = new Resource$Projects$Locations(this.context);
        }
    }
    baremetalsolution_v1.Resource$Projects = Resource$Projects;
    class Resource$Projects$Locations {
        constructor(context) {
            this.context = context;
            this.instances = new Resource$Projects$Locations$Instances(this.context);
        }
    }
    baremetalsolution_v1.Resource$Projects$Locations = Resource$Projects$Locations;
    class Resource$Projects$Locations$Instances {
        constructor(context) {
            this.context = context;
        }
        resetInstance(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback ||
                {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params =
                    {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://baremetalsolution.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/v1/{+instance}:resetInstance').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'POST',
                }, options),
                params,
                requiredParams: ['instance'],
                pathParams: ['instance'],
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
    baremetalsolution_v1.Resource$Projects$Locations$Instances = Resource$Projects$Locations$Instances;
})(baremetalsolution_v1 = exports.baremetalsolution_v1 || (exports.baremetalsolution_v1 = {}));
