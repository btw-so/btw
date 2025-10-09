//
//  List_ExtensionsLiveActivity.swift
//  List Extensions
//
//  Created by Siddhartha Gunti on 09/10/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct List_ExtensionsAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct List_ExtensionsLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: List_ExtensionsAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension List_ExtensionsAttributes {
    fileprivate static var preview: List_ExtensionsAttributes {
        List_ExtensionsAttributes(name: "World")
    }
}

extension List_ExtensionsAttributes.ContentState {
    fileprivate static var smiley: List_ExtensionsAttributes.ContentState {
        List_ExtensionsAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: List_ExtensionsAttributes.ContentState {
         List_ExtensionsAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: List_ExtensionsAttributes.preview) {
   List_ExtensionsLiveActivity()
} contentStates: {
    List_ExtensionsAttributes.ContentState.smiley
    List_ExtensionsAttributes.ContentState.starEyes
}
