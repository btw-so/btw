//
//  SplashView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI

struct SplashView: View {
    @State private var isActive = false
    @State private var textOpacity = 0.0
    @State private var textScale = 0.95
    @EnvironmentObject var authManager: AuthManager
    @Binding var showSplash: Bool
    @AppStorage("hasLaunchedBefore") private var hasLaunchedBefore = false
    @AppStorage("cachedUserName") private var cachedUserName: String?

    private var greetingText: String {
        if !hasLaunchedBefore {
            return "Welcome to Locus"
        } else {
            let greeting = getTimeBasedGreeting()
            if let userName = cachedUserName {
                return "\(greeting), \(userName)"
            } else {
                return greeting
            }
        }
    }

    private func getTimeBasedGreeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())

        switch hour {
        case 5..<12:
            return "Good Morning"
        case 12..<17:
            return "Good Afternoon"
        case 17..<21:
            return "Good Evening"
        default:
            return "Good Night"
        }
    }

    var body: some View {
        ZStack {
            // Background color
            LocusColors.backgroundPrimary
                .ignoresSafeArea(.all)

            // Greeting text
            Text(greetingText)
                .font(.system(size: 56, weight: .thin))
                .foregroundColor(LocusColors.textPrimary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.xxl)
                .opacity(textOpacity)
                .scaleEffect(textScale)
        }
        .onAppear {
            // Animate text in
            withAnimation(.easeOut(duration: 0.4)) {
                textOpacity = 1.0
                textScale = 1.0
            }

            // Splash screen duration: 1 second display + 0.5s fade
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                withAnimation(.easeOut(duration: 0.5)) {
                    self.isActive = true
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.showSplash = false
                    self.authManager.checkLoginStatus()
                    // Mark that the app has been launched
                    if !self.hasLaunchedBefore {
                        self.hasLaunchedBefore = true
                    }
                }
            }
        }
        .opacity(isActive ? 0 : 1)
    }
}

#Preview {
    SplashView(showSplash: .constant(true))
        .environmentObject(AuthManager.shared)
}
