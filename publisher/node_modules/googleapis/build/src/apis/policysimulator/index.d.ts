/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { policysimulator_v1 } from './v1';
import { policysimulator_v1beta1 } from './v1beta1';
export declare const VERSIONS: {
    v1: typeof policysimulator_v1.Policysimulator;
    v1beta1: typeof policysimulator_v1beta1.Policysimulator;
};
export declare function policysimulator(version: 'v1'): policysimulator_v1.Policysimulator;
export declare function policysimulator(options: policysimulator_v1.Options): policysimulator_v1.Policysimulator;
export declare function policysimulator(version: 'v1beta1'): policysimulator_v1beta1.Policysimulator;
export declare function policysimulator(options: policysimulator_v1beta1.Options): policysimulator_v1beta1.Policysimulator;
declare const auth: AuthPlus;
export { auth };
export { policysimulator_v1 };
export { policysimulator_v1beta1 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, GaxiosPromise, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
