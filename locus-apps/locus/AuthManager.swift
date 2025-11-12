//
//  AuthManager.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
import Combine

class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var isLoggedIn = false
    @Published var currentUser: User?
    @Published var user: User?

    private let userDefaults = UserDefaults.standard

    private init() {
        checkLoginStatus()
    }

    func checkLoginStatus() {
        Task {
            do {
                if let user = try await APIService.shared.getUser() {
                    DispatchQueue.main.async {
                        self.currentUser = user
                        self.isLoggedIn = true
                        // Save user name to preferences for immediate access
                        if let name = user.name {
                            self.userDefaults.set(name, forKey: "cachedUserName")
                        }
                    }
                } else {
                    DispatchQueue.main.async {
                        self.isLoggedIn = false
                        self.userDefaults.removeObject(forKey: "cachedUserName")
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    self.isLoggedIn = false
                }
            }
        }
    }

    func logout() {
        // Implement logout API call if needed
        currentUser = nil
        isLoggedIn = false
        userDefaults.removeObject(forKey: "cachedUserName")
    }
}