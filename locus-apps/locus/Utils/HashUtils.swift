//
//  HashUtils.swift
//  locus
//
//  Utility functions for generating hashes
//

import Foundation
import CryptoKit

/// Generates a short hash using HMAC-SHA256
/// Equivalent to the web's shortHash function
func shortHash(_ input: String, key: String, length: Int = 5) -> String {
    let symmetricKey = SymmetricKey(data: Data(key.utf8))
    let inputData = Data(input.utf8)

    let hmac = HMAC<SHA256>.authenticationCode(for: inputData, using: symmetricKey)
    let hmacData = Data(hmac)

    // Convert to base64
    let base64 = hmacData.base64EncodedString()

    // Make URL-safe (replace + with -, / with _, remove =)
    let safe = base64
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")

    // Take first 'length' characters and lowercase
    let result = String(safe.prefix(length)).lowercased()
    return result
}
