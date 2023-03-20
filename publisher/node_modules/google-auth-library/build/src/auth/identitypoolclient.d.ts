import { BaseExternalAccountClient, BaseExternalAccountClientOptions } from './baseexternalclient';
import { RefreshOptions } from './oauth2client';
declare type SubjectTokenFormatType = 'json' | 'text';
/**
 * Url-sourced/file-sourced credentials json interface.
 * This is used for K8s and Azure workloads.
 */
export interface IdentityPoolClientOptions extends BaseExternalAccountClientOptions {
    credential_source: {
        file?: string;
        url?: string;
        headers?: {
            [key: string]: string;
        };
        format?: {
            type: SubjectTokenFormatType;
            subject_token_field_name?: string;
        };
    };
}
/**
 * Defines the Url-sourced and file-sourced external account clients mainly
 * used for K8s and Azure workloads.
 */
export declare class IdentityPoolClient extends BaseExternalAccountClient {
    private readonly file?;
    private readonly url?;
    private readonly headers?;
    private readonly formatType;
    private readonly formatSubjectTokenFieldName?;
    /**
     * Instantiate an IdentityPoolClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid file-sourced or
     * url-sourced credential.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @param additionalOptions Optional additional behavior customization
     *   options. These currently customize expiration threshold time and
     *   whether to retry on 401/403 API request errors.
     */
    constructor(options: IdentityPoolClientOptions, additionalOptions?: RefreshOptions);
    /**
     * Triggered when a external subject token is needed to be exchanged for a GCP
     * access token via GCP STS endpoint.
     * This uses the `options.credential_source` object to figure out how
     * to retrieve the token using the current environment. In this case,
     * this either retrieves the local credential from a file location (k8s
     * workload) or by sending a GET request to a local metadata server (Azure
     * workloads).
     * @return A promise that resolves with the external subject token.
     */
    retrieveSubjectToken(): Promise<string>;
    /**
     * Looks up the external subject token in the file path provided and
     * resolves with that token.
     * @param file The file path where the external credential is located.
     * @param formatType The token file or URL response type (JSON or text).
     * @param formatSubjectTokenFieldName For JSON response types, this is the
     *   subject_token field name. For Azure, this is access_token. For text
     *   response types, this is ignored.
     * @return A promise that resolves with the external subject token.
     */
    private getTokenFromFile;
    /**
     * Sends a GET request to the URL provided and resolves with the returned
     * external subject token.
     * @param url The URL to call to retrieve the subject token. This is typically
     *   a local metadata server.
     * @param formatType The token file or URL response type (JSON or text).
     * @param formatSubjectTokenFieldName For JSON response types, this is the
     *   subject_token field name. For Azure, this is access_token. For text
     *   response types, this is ignored.
     * @param headers The optional additional headers to send with the request to
     *   the metadata server url.
     * @return A promise that resolves with the external subject token.
     */
    private getTokenFromUrl;
}
export {};
