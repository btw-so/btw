//
//  Locus_ExtensionsLiveActivity.swift
//  Locus Extensions
//
//  Created by Siddhartha Gunti on 09/10/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct Locus_ExtensionsAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct Locus_ExtensionsLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: Locus_ExtensionsAttributes.self) { context in
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

extension Locus_ExtensionsAttributes {
    fileprivate static var preview: Locus_ExtensionsAttributes {
        Locus_ExtensionsAttributes(name: "World")
    }
}

extension Locus_ExtensionsAttributes.ContentState {
    fileprivate static var smiley: Locus_ExtensionsAttributes.ContentState {
        Locus_ExtensionsAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: Locus_ExtensionsAttributes.ContentState {
         Locus_ExtensionsAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: Locus_ExtensionsAttributes.preview) {
   Locus_ExtensionsLiveActivity()
} contentStates: {
    Locus_ExtensionsAttributes.ContentState.smiley
    Locus_ExtensionsAttributes.ContentState.starEyes
}
