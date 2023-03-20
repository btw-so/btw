/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { GetTokenResponse, OAuth2Client, RefreshOptions } from './oauth2client';
import { AuthClient } from './authclient';
export interface ImpersonatedOptions extends RefreshOptions {
    /**
     * Client used to perform exchange for impersonated client.
     */
    sourceClient?: AuthClient;
    /**
     * The service account to impersonate.
     */
    targetPrincipal?: string;
    /**
     * Scopes to request during the authorization grant.
     */
    targetScopes?: string[];
    /**
     * The chained list of delegates required to grant the final access_token.
     */
    delegates?: string[];
    /**
     * Number of seconds the delegated credential should be valid.
     */
    lifetime?: number | 3600;
    /**
     * API endpoint to fetch token from.
     */
    endpoint?: string;
}
export interface TokenResponse {
    accessToken: string;
    expireTime: string;
}
export declare class Impersonated extends OAuth2Client {
    private sourceClient;
    private targetPrincipal;
    private targetScopes;
    private delegates;
    private lifetime;
    private endpoint;
    /**
     * Impersonated service account credentials.
     *
     * Create a new access token by impersonating another service account.
     *
     * Impersonated Credentials allowing credentials issued to a user or
     * service account to impersonate another. The source project using
     * Impersonated Credentials must enable the "IAMCredentials" API.
     * Also, the target service account must grant the orginating principal
     * the "Service Account Token Creator" IAM role.
     *
     * @param {object} options - The configuration object.
     * @param {object} [options.sourceClient] the source credential used as to
     * acquire the impersonated credentials.
     * @param {string} [options.targetPrincipal] the service account to
     * impersonate.
     * @param {string[]} [options.delegates] the chained list of delegates
     * required to grant the final access_token. If set, the sequence of
     * identities must have "Service Account Token Creator" capability granted to
     * the preceding identity. For example, if set to [serviceAccountB,
     * serviceAccountC], the sourceCredential must have the Token Creator role on
     * serviceAccountB. serviceAccountB must have the Token Creator on
     * serviceAccountC. Finally, C must have Token Creator on target_principal.
     * If left unset, sourceCredential must have that role on targetPrincipal.
     * @param {string[]} [options.targetScopes] scopes to request during the
     * authorization grant.
     * @param {number} [options.lifetime] number of seconds the delegated
     * credential should be valid for up to 3600 seconds by default, or 43,200
     * seconds by extending the token's lifetime, see:
     * https://cloud.google.com/iam/docs/creating-short-lived-service-account-credentials#sa-credentials-oauth
     * @param {string} [options.endpoint] api endpoint override.
     */
    constructor(options?: ImpersonatedOptions);
    /**
     * Refreshes the access token.
     * @param refreshToken Unused parameter
     */
    protected refreshToken(refreshToken?: string | null): Promise<GetTokenResponse>;
}
