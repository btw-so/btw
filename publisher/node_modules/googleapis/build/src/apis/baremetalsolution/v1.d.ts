/// <reference types="node" />
import { OAuth2Client, JWT, Compute, UserRefreshClient, BaseExternalAccountClient, GaxiosPromise, GoogleConfigurable, MethodOptions, StreamMethodOptions, GlobalOptions, GoogleAuth, BodyResponseCallback, APIRequestContext } from 'googleapis-common';
import { Readable } from 'stream';
export declare namespace baremetalsolution_v1 {
    export interface Options extends GlobalOptions {
        version: 'v1';
    }
    interface StandardParameters {
        /**
         * Auth client or API Key for the request
         */
        auth?: string | OAuth2Client | JWT | Compute | UserRefreshClient | BaseExternalAccountClient | GoogleAuth;
        /**
         * V1 error format.
         */
        '$.xgafv'?: string;
        /**
         * OAuth access token.
         */
        access_token?: string;
        /**
         * Data format for response.
         */
        alt?: string;
        /**
         * JSONP
         */
        callback?: string;
        /**
         * Selector specifying which fields to include in a partial response.
         */
        fields?: string;
        /**
         * API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.
         */
        key?: string;
        /**
         * OAuth 2.0 token for the current user.
         */
        oauth_token?: string;
        /**
         * Returns response with indentations and line breaks.
         */
        prettyPrint?: boolean;
        /**
         * Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.
         */
        quotaUser?: string;
        /**
         * Legacy upload protocol for media (e.g. "media", "multipart").
         */
        uploadType?: string;
        /**
         * Upload protocol for media (e.g. "raw", "multipart").
         */
        upload_protocol?: string;
    }
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
    export class Baremetalsolution {
        context: APIRequestContext;
        projects: Resource$Projects;
        constructor(options: GlobalOptions, google?: GoogleConfigurable);
    }
    /**
     * Request for ResetInstance.
     */
    export interface Schema$ResetInstanceRequest {
    }
    /**
     * Response for ResetInstance.
     */
    export interface Schema$ResetInstanceResponse {
    }
    export class Resource$Projects {
        context: APIRequestContext;
        locations: Resource$Projects$Locations;
        constructor(context: APIRequestContext);
    }
    export class Resource$Projects$Locations {
        context: APIRequestContext;
        instances: Resource$Projects$Locations$Instances;
        constructor(context: APIRequestContext);
    }
    export class Resource$Projects$Locations$Instances {
        context: APIRequestContext;
        constructor(context: APIRequestContext);
        /**
         * Perform an ungraceful, hard reset on a machine (equivalent to shutting the power off, and then turning it back on).
         * @example
         * ```js
         * // Before running the sample:
         * // - Enable the API at:
         * //   https://console.developers.google.com/apis/api/baremetalsolution.googleapis.com
         * // - Login into gcloud by running:
         * //   `$ gcloud auth application-default login`
         * // - Install the npm module by running:
         * //   `$ npm install googleapis`
         *
         * const {google} = require('googleapis');
         * const baremetalsolution = google.baremetalsolution('v1');
         *
         * async function main() {
         *   const auth = new google.auth.GoogleAuth({
         *     // Scopes can be specified either as an array or as a single, space-delimited string.
         *     scopes: ['https://www.googleapis.com/auth/cloud-platform'],
         *   });
         *
         *   // Acquire an auth client, and bind it to all future calls
         *   const authClient = await auth.getClient();
         *   google.options({auth: authClient});
         *
         *   // Do the magic
         *   const res =
         *     await baremetalsolution.projects.locations.instances.resetInstance({
         *       // Required. Name of the instance to reset.
         *       instance:
         *         'projects/my-project/locations/my-location/instances/my-instance',
         *
         *       // Request body metadata
         *       requestBody: {
         *         // request body parameters
         *         // {}
         *       },
         *     });
         *   console.log(res.data);
         *
         *   // Example response
         *   // {}
         * }
         *
         * main().catch(e => {
         *   console.error(e);
         *   throw e;
         * });
         *
         * ```
         *
         * @param params - Parameters for request
         * @param options - Optionally override request options, such as `url`, `method`, and `encoding`.
         * @param callback - Optional callback that handles the response.
         * @returns A promise if used with async/await, or void if used with a callback.
         */
        resetInstance(params: Params$Resource$Projects$Locations$Instances$Resetinstance, options: StreamMethodOptions): GaxiosPromise<Readable>;
        resetInstance(params?: Params$Resource$Projects$Locations$Instances$Resetinstance, options?: MethodOptions): GaxiosPromise<Schema$ResetInstanceResponse>;
        resetInstance(params: Params$Resource$Projects$Locations$Instances$Resetinstance, options: StreamMethodOptions | BodyResponseCallback<Readable>, callback: BodyResponseCallback<Readable>): void;
        resetInstance(params: Params$Resource$Projects$Locations$Instances$Resetinstance, options: MethodOptions | BodyResponseCallback<Schema$ResetInstanceResponse>, callback: BodyResponseCallback<Schema$ResetInstanceResponse>): void;
        resetInstance(params: Params$Resource$Projects$Locations$Instances$Resetinstance, callback: BodyResponseCallback<Schema$ResetInstanceResponse>): void;
        resetInstance(callback: BodyResponseCallback<Schema$ResetInstanceResponse>): void;
    }
    export interface Params$Resource$Projects$Locations$Instances$Resetinstance extends StandardParameters {
        /**
         * Required. Name of the instance to reset.
         */
        instance?: string;
        /**
         * Request body metadata
         */
        requestBody?: Schema$ResetInstanceRequest;
    }
    export {};
}
