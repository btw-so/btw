//
//  WidgetDataManager.m
//  locus
//
//  Objective-C bridge for WidgetDataManager
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetDataManager, NSObject)

RCT_EXTERN_METHOD(updateNoteWidget:(NSString *)nodeId
                  nodeText:(NSString *)nodeText
                  widgetToken:(NSString *)widgetToken
                  fingerprint:(NSString *)fingerprint
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(updateChildWidget:(NSString *)parentNodeId
                  parentNodeText:(NSString *)parentNodeText
                  widgetToken:(NSString *)widgetToken
                  fingerprint:(NSString *)fingerprint
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getNoteWidgetData:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getChildWidgetData:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(clearNoteWidget:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(clearChildWidget:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
