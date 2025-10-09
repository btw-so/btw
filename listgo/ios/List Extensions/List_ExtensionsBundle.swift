//
//  List_ExtensionsBundle.swift
//  List Extensions
//
//  Created by Siddhartha Gunti on 09/10/25.
//

import WidgetKit
import SwiftUI

@main
struct List_ExtensionsBundle: WidgetBundle {
    var body: some Widget {
        List_Extensions()
        List_ExtensionsControl()
        List_ExtensionsLiveActivity()
        NoteWidget()
        ChildWidget()
    }
}
