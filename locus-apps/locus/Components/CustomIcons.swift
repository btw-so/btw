//
//  CustomIcons.swift
//  locus
//
//  Custom SVG-based icons (Remix Icons)
//

import SwiftUI

/// Quill icon for notes only (Note icon)
/// SVG path: M21 1.99669C6 1.99669 4 15.9967 3 21.9967C3.66667 21.9967 4.33275 21.9967 4.99824 21.9967C5.66421 18.6636 7.33146 16.8303 10 16.4967C14 15.9967 17 12.4967 18 9.49669L16.5 8.49669C16.8333 8.16336 17.1667 7.83002 17.5 7.49669C18.5 6.49669 19.5042 4.99669 21 1.99669Z
struct QuillIcon: View {
    let color: SwiftUI.Color
    let size: CGFloat

    var body: some View {
        Canvas { context, canvasSize in
            let scale = canvasSize.width / 24.0

            var path = Path()
            path.move(to: CGPoint(x: 21 * scale, y: 1.99669 * scale))
            path.addCurve(
                to: CGPoint(x: 3 * scale, y: 21.9967 * scale),
                control1: CGPoint(x: 6 * scale, y: 1.99669 * scale),
                control2: CGPoint(x: 4 * scale, y: 15.9967 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 4.99824 * scale, y: 21.9967 * scale),
                control1: CGPoint(x: 3.66667 * scale, y: 21.9967 * scale),
                control2: CGPoint(x: 4.33275 * scale, y: 21.9967 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 10 * scale, y: 16.4967 * scale),
                control1: CGPoint(x: 5.66421 * scale, y: 18.6636 * scale),
                control2: CGPoint(x: 7.33146 * scale, y: 16.8303 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 18 * scale, y: 9.49669 * scale),
                control1: CGPoint(x: 14 * scale, y: 15.9967 * scale),
                control2: CGPoint(x: 17 * scale, y: 12.4967 * scale)
            )
            path.addLine(to: CGPoint(x: 16.5 * scale, y: 8.49669 * scale))
            path.addCurve(
                to: CGPoint(x: 17.5 * scale, y: 7.49669 * scale),
                control1: CGPoint(x: 16.8333 * scale, y: 8.16336 * scale),
                control2: CGPoint(x: 17.1667 * scale, y: 7.83002 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 21 * scale, y: 1.99669 * scale),
                control1: CGPoint(x: 18.5 * scale, y: 6.49669 * scale),
                control2: CGPoint(x: 19.5042 * scale, y: 4.99669 * scale)
            )
            path.closeSubpath()

            context.fill(path, with: .color(color))
        }
        .frame(width: size, height: size)
    }
}

/// Scribble icon (Paintbrush icon)
/// SVG path: M13.2886 6.21301L18.2278 2.37142C18.6259 2.0618 19.1922 2.09706 19.5488 2.45367L22.543 5.44787C22.8997 5.80448 22.9349 6.37082 22.6253 6.76891L18.7847 11.7068C19.0778 12.8951 19.0836 14.1721 18.7444 15.4379C17.8463 18.7897 14.8142 20.9986 11.5016 20.9986C8 20.9986 3.5 19.4967 1 17.9967C4.97978 14.9967 4.04722 13.1865 4.5 11.4967C5.55843 7.54658 9.34224 5.23935 13.2886 6.21301ZM16.7015 8.09161C16.7673 8.15506 16.8319 8.21964 16.8952 8.28533L18.0297 9.41984L20.5046 6.23786L18.7589 4.4921L15.5769 6.96698L16.7015 8.09161Z
struct ScribbleIcon: View {
    let color: SwiftUI.Color
    let size: CGFloat

    var body: some View {
        Canvas { context, canvasSize in
            let scale = canvasSize.width / 24.0

            var path = Path()

            // Main path
            path.move(to: CGPoint(x: 13.2886 * scale, y: 6.21301 * scale))
            path.addLine(to: CGPoint(x: 18.2278 * scale, y: 2.37142 * scale))
            path.addCurve(
                to: CGPoint(x: 19.5488 * scale, y: 2.45367 * scale),
                control1: CGPoint(x: 18.6259 * scale, y: 2.0618 * scale),
                control2: CGPoint(x: 19.1922 * scale, y: 2.09706 * scale)
            )
            path.addLine(to: CGPoint(x: 22.543 * scale, y: 5.44787 * scale))
            path.addCurve(
                to: CGPoint(x: 22.6253 * scale, y: 6.76891 * scale),
                control1: CGPoint(x: 22.8997 * scale, y: 5.80448 * scale),
                control2: CGPoint(x: 22.9349 * scale, y: 6.37082 * scale)
            )
            path.addLine(to: CGPoint(x: 18.7847 * scale, y: 11.7068 * scale))
            path.addCurve(
                to: CGPoint(x: 18.7444 * scale, y: 15.4379 * scale),
                control1: CGPoint(x: 19.0778 * scale, y: 12.8951 * scale),
                control2: CGPoint(x: 19.0836 * scale, y: 14.1721 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 11.5016 * scale, y: 20.9986 * scale),
                control1: CGPoint(x: 17.8463 * scale, y: 18.7897 * scale),
                control2: CGPoint(x: 14.8142 * scale, y: 20.9986 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 1 * scale, y: 17.9967 * scale),
                control1: CGPoint(x: 8 * scale, y: 20.9986 * scale),
                control2: CGPoint(x: 3.5 * scale, y: 19.4967 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 4.5 * scale, y: 11.4967 * scale),
                control1: CGPoint(x: 4.97978 * scale, y: 14.9967 * scale),
                control2: CGPoint(x: 4.04722 * scale, y: 13.1865 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 13.2886 * scale, y: 6.21301 * scale),
                control1: CGPoint(x: 5.55843 * scale, y: 7.54658 * scale),
                control2: CGPoint(x: 9.34224 * scale, y: 5.23935 * scale)
            )
            path.closeSubpath()

            // Secondary shape (brush tip)
            path.move(to: CGPoint(x: 16.7015 * scale, y: 8.09161 * scale))
            path.addCurve(
                to: CGPoint(x: 16.8952 * scale, y: 8.28533 * scale),
                control1: CGPoint(x: 16.7673 * scale, y: 8.15506 * scale),
                control2: CGPoint(x: 16.8319 * scale, y: 8.21964 * scale)
            )
            path.addLine(to: CGPoint(x: 18.0297 * scale, y: 9.41984 * scale))
            path.addLine(to: CGPoint(x: 20.5046 * scale, y: 6.23786 * scale))
            path.addLine(to: CGPoint(x: 18.7589 * scale, y: 4.4921 * scale))
            path.addLine(to: CGPoint(x: 15.5769 * scale, y: 6.96698 * scale))
            path.addLine(to: CGPoint(x: 16.7015 * scale, y: 8.09161 * scale))
            path.closeSubpath()

            context.fill(path, with: .color(color))
        }
        .frame(width: size, height: size)
    }
}

/// Combined icon for notes with scribbles
/// SVG path: M4.7134 7.12811L4.46682 7.69379C4.28637 8.10792 3.71357 8.10792 3.53312 7.69379L3.28656 7.12811C2.84706 6.11947 2.05545 5.31641 1.06767 4.87708L0.308047 4.53922C-0.102682 4.35653 -0.102682 3.75881 0.308047 3.57612L1.0252 3.25714C2.03838 2.80651 2.84417 1.97373 3.27612 0.930828L3.52932 0.319534C3.70578 -0.106511 4.29417 -0.106511 4.47063 0.319534L4.72382 0.930828C5.15577 1.97373 5.96158 2.80651 6.9748 3.25714L7.69188 3.57612C8.10271 3.75881 8.10271 4.35653 7.69188 4.53922L6.93228 4.87708C5.94451 5.31641 5.15288 6.11947 4.7134 7.12811ZM3.06361 21.6132C4.08854 15.422 6.31105 1.99658 21 1.99658C19.5042 4.99658 18.5 6.49658 17.5 7.49658L16.5 8.49658L18 9.49658C17 12.4966 14 15.9966 10 16.4966C7.33146 16.8301 5.66421 18.6635 4.99824 21.9966H3C3.02074 21.8722 3.0419 21.7443 3.06361 21.6132Z
struct QuillScribbleIcon: View {
    let color: SwiftUI.Color
    let size: CGFloat

    var body: some View {
        Canvas { context, canvasSize in
            let scale = canvasSize.width / 24.0

            var path = Path()

            // Star/sparkle shape (top left)
            path.move(to: CGPoint(x: 4.7134 * scale, y: 7.12811 * scale))
            path.addLine(to: CGPoint(x: 4.46682 * scale, y: 7.69379 * scale))
            path.addCurve(
                to: CGPoint(x: 3.53312 * scale, y: 7.69379 * scale),
                control1: CGPoint(x: 4.28637 * scale, y: 8.10792 * scale),
                control2: CGPoint(x: 3.71357 * scale, y: 8.10792 * scale)
            )
            path.addLine(to: CGPoint(x: 3.28656 * scale, y: 7.12811 * scale))
            path.addCurve(
                to: CGPoint(x: 1.06767 * scale, y: 4.87708 * scale),
                control1: CGPoint(x: 2.84706 * scale, y: 6.11947 * scale),
                control2: CGPoint(x: 2.05545 * scale, y: 5.31641 * scale)
            )
            path.addLine(to: CGPoint(x: 0.308047 * scale, y: 4.53922 * scale))
            path.addCurve(
                to: CGPoint(x: 0.308047 * scale, y: 3.57612 * scale),
                control1: CGPoint(x: -0.102682 * scale, y: 4.35653 * scale),
                control2: CGPoint(x: -0.102682 * scale, y: 3.75881 * scale)
            )
            path.addLine(to: CGPoint(x: 1.0252 * scale, y: 3.25714 * scale))
            path.addCurve(
                to: CGPoint(x: 3.27612 * scale, y: 0.930828 * scale),
                control1: CGPoint(x: 2.03838 * scale, y: 2.80651 * scale),
                control2: CGPoint(x: 2.84417 * scale, y: 1.97373 * scale)
            )
            path.addLine(to: CGPoint(x: 3.52932 * scale, y: 0.319534 * scale))
            path.addCurve(
                to: CGPoint(x: 4.47063 * scale, y: 0.319534 * scale),
                control1: CGPoint(x: 3.70578 * scale, y: -0.106511 * scale),
                control2: CGPoint(x: 4.29417 * scale, y: -0.106511 * scale)
            )
            path.addLine(to: CGPoint(x: 4.72382 * scale, y: 0.930828 * scale))
            path.addCurve(
                to: CGPoint(x: 6.9748 * scale, y: 3.25714 * scale),
                control1: CGPoint(x: 5.15577 * scale, y: 1.97373 * scale),
                control2: CGPoint(x: 5.96158 * scale, y: 2.80651 * scale)
            )
            path.addLine(to: CGPoint(x: 7.69188 * scale, y: 3.57612 * scale))
            path.addCurve(
                to: CGPoint(x: 7.69188 * scale, y: 4.53922 * scale),
                control1: CGPoint(x: 8.10271 * scale, y: 3.75881 * scale),
                control2: CGPoint(x: 8.10271 * scale, y: 4.35653 * scale)
            )
            path.addLine(to: CGPoint(x: 6.93228 * scale, y: 4.87708 * scale))
            path.addCurve(
                to: CGPoint(x: 4.7134 * scale, y: 7.12811 * scale),
                control1: CGPoint(x: 5.94451 * scale, y: 5.31641 * scale),
                control2: CGPoint(x: 5.15288 * scale, y: 6.11947 * scale)
            )
            path.closeSubpath()

            // Quill shape (main body)
            path.move(to: CGPoint(x: 3.06361 * scale, y: 21.6132 * scale))
            path.addCurve(
                to: CGPoint(x: 21 * scale, y: 1.99658 * scale),
                control1: CGPoint(x: 4.08854 * scale, y: 15.422 * scale),
                control2: CGPoint(x: 6.31105 * scale, y: 1.99658 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 17.5 * scale, y: 7.49658 * scale),
                control1: CGPoint(x: 19.5042 * scale, y: 4.99658 * scale),
                control2: CGPoint(x: 18.5 * scale, y: 6.49658 * scale)
            )
            path.addLine(to: CGPoint(x: 16.5 * scale, y: 8.49658 * scale))
            path.addLine(to: CGPoint(x: 18 * scale, y: 9.49658 * scale))
            path.addCurve(
                to: CGPoint(x: 10 * scale, y: 16.4966 * scale),
                control1: CGPoint(x: 17 * scale, y: 12.4966 * scale),
                control2: CGPoint(x: 14 * scale, y: 15.9966 * scale)
            )
            path.addCurve(
                to: CGPoint(x: 4.99824 * scale, y: 21.9966 * scale),
                control1: CGPoint(x: 7.33146 * scale, y: 16.8301 * scale),
                control2: CGPoint(x: 5.66421 * scale, y: 18.6635 * scale)
            )
            path.addLine(to: CGPoint(x: 3 * scale, y: 21.9966 * scale))
            path.addCurve(
                to: CGPoint(x: 3.06361 * scale, y: 21.6132 * scale),
                control1: CGPoint(x: 3.02074 * scale, y: 21.8722 * scale),
                control2: CGPoint(x: 3.0419 * scale, y: 21.7443 * scale)
            )
            path.closeSubpath()

            context.fill(path, with: .color(color))
        }
        .frame(width: size, height: size)
    }
}
