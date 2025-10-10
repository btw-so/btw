#!/bin/bash

# Simple script to run iOS app without React Native CLI's bundler check

echo "🚀 Starting Metro bundler..."
# Check if Metro is already running
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Metro is already running on port 8081"
else
    echo "Starting Metro..."
    npx react-native start &
    sleep 3
fi

echo "📱 Building and launching iOS app..."
cd ios
xcodebuild -workspace locus.xcworkspace \
  -scheme locus \
  -configuration Debug \
  -destination 'name=iPhone 16' \
  -derivedDataPath build \
  build

echo "🎉 Launching simulator..."
xcrun simctl boot "iPhone 16" 2>/dev/null || true
open -a Simulator
xcrun simctl install booted build/Build/Products/Debug-iphonesimulator/locus.app
xcrun simctl launch booted com.siddg.locus.app

echo "✅ App launched!"
