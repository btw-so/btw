import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    const uniqueId = await DeviceInfo.getUniqueId();
    return uniqueId;
  } catch (error) {
    // Fallback to a random ID if device ID is not available
    return `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
};
