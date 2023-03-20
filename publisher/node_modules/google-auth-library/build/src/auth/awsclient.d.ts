import { BaseExternalAccountClient, BaseExternalAccountClientOptions } from './baseexternalclient';
import { RefreshOptions } from './oauth2client';
/**
 * AWS credentials JSON interface. This is used for AWS workloads.
 */
export interface AwsClientOptions extends BaseExternalAccountClientOptions {
    credential_source: {
        environment_id: string;
        region_url?: string;
        url?: string;
        regional_cred_verification_url: string;
    };
}
/**
 * AWS external account client. This is used for AWS workloads, where
 * AWS STS GetCallerIdentity serialized signed requests are exchanged for
 * GCP access token.
 */
export declare class AwsClient extends BaseExternalAccountClient {
    private readonly environmentId;
    private readonly regionUrl?;
    private readonly securityCredentialsUrl?;
    private readonly regionalCredVerificationUrl;
    private awsRequestSigner;
    private region;
    /**
     * Instantiates an AwsClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid AWS credential.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @param additionalOptions Optional additional behavior customization
     *   options. These currently customize expiration threshold time and
     *   whether to retry on 401/403 API request errors.
     */
    constructor(options: AwsClientOptions, additionalOptions?: RefreshOptions);
    /**
     * Triggered when an external subject token is needed to be exchanged for a
     * GCP access token via GCP STS endpoint.
     * This uses the `options.credential_source` object to figure out how
     * to retrieve the token using the current environment. In this case,
     * this uses a serialized AWS signed request to the STS GetCallerIdentity
     * endpoint.
     * The logic is summarized as:
     * 1. Retrieve AWS region from availability-zone.
     * 2a. Check AWS credentials in environment variables. If not found, get
     *     from security-credentials endpoint.
     * 2b. Get AWS credentials from security-credentials endpoint. In order
     *     to retrieve this, the AWS role needs to be determined by calling
     *     security-credentials endpoint without any argument. Then the
     *     credentials can be retrieved via: security-credentials/role_name
     * 3. Generate the signed request to AWS STS GetCallerIdentity action.
     * 4. Inject x-goog-cloud-target-resource into header and serialize the
     *    signed request. This will be the subject-token to pass to GCP STS.
     * @return A promise that resolves with the external subject token.
     */
    retrieveSubjectToken(): Promise<string>;
    /**
     * @return A promise that resolves with the current AWS region.
     */
    private getAwsRegion;
    /**
     * @return A promise that resolves with the assigned role to the current
     *   AWS VM. This is needed for calling the security-credentials endpoint.
     */
    private getAwsRoleName;
    /**
     * Retrieves the temporary AWS credentials by calling the security-credentials
     * endpoint as specified in the `credential_source` object.
     * @param roleName The role attached to the current VM.
     * @return A promise that resolves with the temporary AWS credentials
     *   needed for creating the GetCallerIdentity signed request.
     */
    private getAwsSecurityCredentials;
}
