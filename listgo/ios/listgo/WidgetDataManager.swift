//
//  WidgetDataManager.swift
//  listgo
//
//  Native module to share data with widgets via App Groups
//

import Foundation
import React
import WidgetKit

@objc(WidgetDataManager)
class WidgetDataManager: NSObject {

    private let appGroupName = "group.com.listgo.widgets"

    // MARK: - Update Note Widget
    @objc
    func updateNoteWidget(
        _ nodeId: String,
        nodeText: String,
        noteContent: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [WidgetDataManager] updateNoteWidget called")
        print("📱 [WidgetDataManager] nodeId: \(nodeId)")
        print("📱 [WidgetDataManager] nodeText: \(nodeText)")
        print("📱 [WidgetDataManager] appGroupName: \(appGroupName)")

        guard let userDefaults = UserDefaults(suiteName: appGroupName) else {
            print("❌ [WidgetDataManager] Failed to access App Group: \(appGroupName)")
            rejecter("ERROR", "Failed to access App Group: \(appGroupName)", nil)
            return
        }

        let widgetData: [String: Any] = [
            "nodeId": nodeId,
            "nodeText": nodeText,
            "noteContent": noteContent,
            "lastUpdated": Date().timeIntervalSince1970
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData)
            userDefaults.set(jsonData, forKey: "noteWidget")
            let success = userDefaults.synchronize()
            print("✅ [WidgetDataManager] Data saved. Sync success: \(success)")

            // Reload widget timelines
            WidgetCenter.shared.reloadTimelines(ofKind: "NoteWidget")
            print("✅ [WidgetDataManager] Widget timeline reloaded")

            resolver(["success": true])
        } catch {
            print("❌ [WidgetDataManager] Failed to encode: \(error)")
            rejecter("ERROR", "Failed to encode widget data", error)
        }
    }

    // MARK: - Update Child Widget
    @objc
    func updateChildWidget(
        _ parentNodeId: String,
        parentNodeText: String,
        widgetToken: NSString?,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [WidgetDataManager] updateChildWidget called")
        print("📱 [WidgetDataManager] parentNodeId: \(parentNodeId)")
        print("📱 [WidgetDataManager] parentNodeText: \(parentNodeText)")
        print("📱 [WidgetDataManager] widgetToken: \(widgetToken ?? "nil")")

        guard let userDefaults = UserDefaults(suiteName: appGroupName) else {
            print("❌ [WidgetDataManager] Failed to access App Group")
            rejecter("ERROR", "Failed to access App Group", nil)
            return
        }

        var widgetData: [String: Any] = [
            "parentNodeId": parentNodeId,
            "parentNodeText": parentNodeText,
            "lastUpdated": Date().timeIntervalSince1970
        ]

        if let widgetToken = widgetToken as String? {
            widgetData["widgetToken"] = widgetToken
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData)
            userDefaults.set(jsonData, forKey: "childWidget")
            let success = userDefaults.synchronize()
            print("✅ [WidgetDataManager] Child widget data saved. Sync success: \(success)")

            // Reload widget timelines
            WidgetCenter.shared.reloadTimelines(ofKind: "ChildWidget")
            print("✅ [WidgetDataManager] Child widget timeline reloaded")

            resolver(["success": true])
        } catch {
            print("❌ [WidgetDataManager] Failed to encode: \(error)")
            rejecter("ERROR", "Failed to encode widget data", error)
        }
    }

    // MARK: - Get Note Widget Data
    @objc
    func getNoteWidgetData(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [WidgetDataManager] getNoteWidgetData called")
        print("📱 [WidgetDataManager] appGroupName: \(appGroupName)")

        guard let userDefaults = UserDefaults(suiteName: appGroupName) else {
            print("❌ [WidgetDataManager] Failed to access App Group")
            resolver(NSNull())
            return
        }

        guard let jsonData = userDefaults.data(forKey: "noteWidget") else {
            print("⚠️ [WidgetDataManager] No data found for key 'noteWidget'")
            resolver(NSNull())
            return
        }

        guard let widgetData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            print("❌ [WidgetDataManager] Failed to decode data")
            resolver(NSNull())
            return
        }

        print("✅ [WidgetDataManager] Found widget data: \(widgetData)")
        resolver(widgetData)
    }

    // MARK: - Get Child Widget Data
    @objc
    func getChildWidgetData(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [WidgetDataManager] getChildWidgetData called")
        print("📱 [WidgetDataManager] appGroupName: \(appGroupName)")

        guard let userDefaults = UserDefaults(suiteName: appGroupName) else {
            print("❌ [WidgetDataManager] Failed to access App Group")
            resolver(NSNull())
            return
        }

        guard let jsonData = userDefaults.data(forKey: "childWidget") else {
            print("⚠️ [WidgetDataManager] No data found for key 'childWidget'")
            resolver(NSNull())
            return
        }

        guard let widgetData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            print("❌ [WidgetDataManager] Failed to decode data")
            resolver(NSNull())
            return
        }

        print("✅ [WidgetDataManager] Found child widget data: \(widgetData)")
        resolver(widgetData)
    }

    // MARK: - Clear Widget Data
    @objc
    func clearNoteWidget(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let userDefaults = UserDefaults(suiteName: appGroupName) else {
            rejecter("ERROR", "Failed to access App Group", nil)
            return
        }

        userDefaults.removeObject(forKey: "noteWidget")
        userDefaults.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "NoteWidget")

        resolver(["success": true])
    }

    @objc
    func clearChildWidget(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let userDefaults = UserDefaults(suiteName: appGroupName) else {
            rejecter("ERROR", "Failed to access App Group", nil)
            return
        }

        userDefaults.removeObject(forKey: "childWidget")
        userDefaults.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "ChildWidget")

        resolver(["success": true])
    }

    // MARK: - React Native Bridge
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
