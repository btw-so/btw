//
//  LoginView.swift
//  locus
//
//  Created by Siddhartha Gunti on 26/10/25.
//

import SwiftUI
import UniformTypeIdentifiers

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var otpCode = ""
    @State private var mode: LoginMode = .enterEmail
    @State private var isLoading = false
    @State private var errorMessage: String?

    enum LoginMode {
        case enterEmail
        case enterOTP
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Grid background pattern
                GridBackground()

                ScrollView {
                    VStack(spacing: Spacing.xl) {
                        // Header with logo
                        HStack {
                            Image("BrandIcon")
                                .resizable()
                                .scaledToFit()
                                .frame(height: 16)
                            Spacer()
                        }
                        .padding(.horizontal, Spacing.xl)
                        .padding(.top, Spacing.xxxl)

                        Spacer(minLength: geometry.size.height * 0.05)

                        // Welcome section
                        VStack(alignment: .leading, spacing: Spacing.xl) {
                            Text("Welcome to\nLocus")
                                .font(geometry.size.width > Layout.breakpointTablet
                                      ? .system(size: 48, weight: .bold)
                                      : .largeTitle)
                                .foregroundColor(LocusColors.textPrimary)
                                .multilineTextAlignment(.leading)

                            Text("You are one step away to write. One step to get clarity from chaos. One step to make sure you are still thinking.")
                                .font(.title3)
                                .foregroundColor(LocusColors.textBody)
                                .multilineTextAlignment(.leading)
                        }
                        .frame(maxWidth: Layout.maxFormWidth, alignment: .leading)
                        .padding(.horizontal, Spacing.xxxxl)

                        if mode == .enterOTP {
                            otpView(geometry: geometry)
                                .onAppear {
                                    // Clear any previous OTP value
                                    otpCode = ""
                                }
                        } else {
                            emailView(geometry: geometry)
                        }

                        Spacer(minLength: geometry.size.height * 0.1)
                    }
                    .padding()
                    .frame(minHeight: geometry.size.height)
                }
            }
        }
    }

    private func emailView(geometry: GeometryProxy) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Enter your email address")
                    .font(.body)
                    .foregroundColor(LocusColors.textBody)

                // Email input field
                TextField("Email", text: $email)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                    .background(LocusColors.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(LocusColors.borderDark, lineWidth: 1)
                    )
                    .font(.body)
                    .foregroundColor(LocusColors.textPrimary)
                    #if os(iOS)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                    #endif

                Text("We'll send you a magic code (6-digit) for a password-free login experience.")
                    .font(.body)
                    .foregroundColor(LocusColors.textBody)
            }

            if let error = errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            // Send OTP button
            Button(action: sendOTP) {
                HStack(spacing: Spacing.lg) {
                    if isLoading {
                        ProgressView()
                            .frame(width: IconSize.md, height: IconSize.md)
                            .tint(.white)
                    }
                    Text(isLoading ? "Sending OTP..." : "Send OTP")
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.horizontal, Spacing.xl)
                .padding(.vertical, Spacing.md)
                .background(LocusColors.buttonBackground)
                .foregroundColor(.white)
                .cornerRadius(CornerRadius.md)
            }
            .buttonStyle(.plain)
            .disabled(isLoading || email.isEmpty)
        }
        .frame(maxWidth: Layout.maxFormWidth, alignment: .leading)
        .padding(.horizontal, Spacing.xxxxl)
    }

    private func otpView(geometry: GeometryProxy) -> some View {
        let isLarge = geometry.size.width > Layout.breakpointTablet

        return VStack(alignment: .leading, spacing: Spacing.xl) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Check your email for a magic code")
                    .font(isLarge ? .title : .title2)
                    .fontWeight(.bold)
                    .foregroundColor(LocusColors.textPrimary)

                Text("We've sent a 6-digit code to \(email). The code will expire in 10 minutes.")
                    .font(.body)
                    .foregroundColor(LocusColors.textBody)

                // Single OTP input field
                TextField("000000", text: $otpCode)
                    .textFieldStyle(.plain)
                    .multilineTextAlignment(.center)
                    .font(.body)
                    .foregroundColor(LocusColors.textPrimary)
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                    .background(LocusColors.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(LocusColors.borderDark, lineWidth: 1)
                    )
                    #if os(iOS)
                    .keyboardType(.numberPad)
                    #endif
                    .onChange(of: otpCode) { newValue in
                        handleOTPInput(newValue: newValue)
                    }

                Text("Can't find the code? Please check your spam folder.")
                    .font(.body)
                    .foregroundColor(LocusColors.textBody)
            }

            if let error = errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            // Verify OTP button
            Button(action: verifyOTP) {
                HStack(spacing: Spacing.lg) {
                    if isLoading {
                        ProgressView()
                            .frame(width: IconSize.md, height: IconSize.md)
                            .tint(.white)
                    }
                    Text(isLoading ? "Verifying..." : "Verify OTP")
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.horizontal, Spacing.xl)
                .padding(.vertical, Spacing.md)
                .background(LocusColors.buttonBackground)
                .foregroundColor(.white)
                .cornerRadius(CornerRadius.md)
            }
            .buttonStyle(.plain)
            .disabled(isLoading || otpCode.count != 6)
        }
        .frame(maxWidth: Layout.maxFormWidth, alignment: .leading)
        .padding(.horizontal, Spacing.xxxxl)
    }

    private func sendOTP() {
        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address."
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let success = try await APIService.shared.generateOTP(email: email)
                if success {
                    mode = .enterOTP
                } else {
                    errorMessage = "Failed to send OTP. Please try again."
                }
            } catch {
                errorMessage = "Network error. Please check your connection."
            }
            isLoading = false
        }
    }

    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = #"^\S+@\S+\.\S+$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }

    private func handleOTPInput(newValue: String) {
        // Only allow numeric input
        let filtered = newValue.filter { $0.isNumber }

        // Limit to 6 digits
        if filtered.count > 6 {
            otpCode = String(filtered.prefix(6))
        } else {
            otpCode = filtered
        }
    }

    private func verifyOTP() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let success = try await APIService.shared.verifyOTP(email: email, otp: self.otpCode)
                if success {
                    // Get user details
                    do {
                        if let user = try await APIService.shared.getUser() {
                            await MainActor.run {
                                self.authManager.currentUser = user
                                self.authManager.isLoggedIn = true
                                self.isLoading = false
                            }
                        } else {
                            await MainActor.run {
                                self.errorMessage = "Failed to get user details."
                                self.otpCode = ""
                                self.isLoading = false
                            }
                        }
                    } catch {
                        await MainActor.run {
                            self.errorMessage = "Failed to get user details: \(error.localizedDescription)"
                            self.otpCode = ""
                            self.isLoading = false
                        }
                    }
                } else {
                    await MainActor.run {
                        self.errorMessage = "Invalid OTP. Please try again."
                        self.otpCode = ""
                        self.isLoading = false
                    }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Network error: \(error.localizedDescription)"
                    self.otpCode = ""
                    self.isLoading = false
                }
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager.shared)
}
