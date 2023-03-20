/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { metastore_v1alpha } from './v1alpha';
import { metastore_v1beta } from './v1beta';
export declare const VERSIONS: {
    v1alpha: typeof metastore_v1alpha.Metastore;
    v1beta: typeof metastore_v1beta.Metastore;
};
export declare function metastore(version: 'v1alpha'): metastore_v1alpha.Metastore;
export declare function metastore(options: metastore_v1alpha.Options): metastore_v1alpha.Metastore;
export declare function metastore(version: 'v1beta'): metastore_v1beta.Metastore;
export declare function metastore(options: metastore_v1beta.Options): metastore_v1beta.Metastore;
declare const auth: AuthPlus;
export { auth };
export { metastore_v1alpha };
export { metastore_v1beta };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, GaxiosPromise, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
