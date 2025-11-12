//
//  GridBackground.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//  Grid pattern background for auth screens
//

import SwiftUI

struct GridBackground: View {
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Base background
                LocusColors.backgroundPrimary

                // Grid pattern
                Canvas { context, size in
                    let spacing = Layout.gridSize

                    // Vertical lines
                    var x: CGFloat = 0
                    while x <= size.width {
                        context.stroke(
                            Path { path in
                                path.move(to: CGPoint(x: x, y: 0))
                                path.addLine(to: CGPoint(x: x, y: size.height))
                            },
                            with: .color(LocusColors.gridLine),
                            lineWidth: 1
                        )
                        x += spacing
                    }

                    // Horizontal lines
                    var y: CGFloat = 0
                    while y <= size.height {
                        context.stroke(
                            Path { path in
                                path.move(to: CGPoint(x: 0, y: y))
                                path.addLine(to: CGPoint(x: size.width, y: y))
                            },
                            with: .color(LocusColors.gridLine),
                            lineWidth: 1
                        )
                        y += spacing
                    }
                }
            }
        }
        .edgesIgnoringSafeArea(.all)
    }
}

#Preview {
    GridBackground()
}
