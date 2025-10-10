import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useAuth} from '../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const {generateOTP, login} = useAuth();
  const [mode, setMode] = useState<'enter-email' | 'enter-otp'>('enter-email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP inputs
  const [otp1, setOtp1] = useState('');
  const [otp2, setOtp2] = useState('');
  const [otp3, setOtp3] = useState('');
  const [otp4, setOtp4] = useState('');
  const [otp5, setOtp5] = useState('');
  const [otp6, setOtp6] = useState('');

  const otp1Ref = useRef<TextInput>(null);
  const otp2Ref = useRef<TextInput>(null);
  const otp3Ref = useRef<TextInput>(null);
  const otp4Ref = useRef<TextInput>(null);
  const otp5Ref = useRef<TextInput>(null);
  const otp6Ref = useRef<TextInput>(null);

  useEffect(() => {
    const otpComplete = otp1 && otp2 && otp3 && otp4 && otp5 && otp6;
    if (otpComplete) {
      handleVerifyOTP();
    }
  }, [otp1, otp2, otp3, otp4, otp5, otp6]);

  const validateEmail = (email: string) => {
    return /^\S+@\S+\.\S+$/.test(email);
  };

  const handleGenerateOTP = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setIsLoading(true);

    const result = await generateOTP(email);

    setIsLoading(false);

    if (result.success) {
      setMode('enter-otp');
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    setIsLoading(true);
    setError('');

    const result = await login(email, otpCode);

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid OTP');
      // Reset OTP fields
      setOtp1('');
      setOtp2('');
      setOtp3('');
      setOtp4('');
      setOtp5('');
      setOtp6('');
      otp1Ref.current?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to{'\n'}Locus</Text>
          <Text style={styles.subtitle}>
            One step away to organize your thoughts. One step to get clarity from chaos.
          </Text>

          {mode === 'enter-email' ? (
            <View style={styles.form}>
              <Text style={styles.label}>Enter your email address</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                We'll send you a magic code (6-digit) for a password-free login experience.
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleGenerateOTP}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.otpTitle}>Check your email for a magic code</Text>
              <Text style={styles.otpSubtitle}>
                We've sent a 6-digit code to {email}. The code will expire in 10 minutes.
              </Text>
              <View style={styles.otpContainer}>
                <TextInput
                  ref={otp1Ref}
                  style={styles.otpInput}
                  value={otp1}
                  onChangeText={text => {
                    setOtp1(text);
                    if (text) otp2Ref.current?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <TextInput
                  ref={otp2Ref}
                  style={styles.otpInput}
                  value={otp2}
                  onChangeText={text => {
                    setOtp2(text);
                    if (text) otp3Ref.current?.focus();
                  }}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && !otp2) {
                      otp1Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <TextInput
                  ref={otp3Ref}
                  style={styles.otpInput}
                  value={otp3}
                  onChangeText={text => {
                    setOtp3(text);
                    if (text) otp4Ref.current?.focus();
                  }}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && !otp3) {
                      otp2Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <TextInput
                  ref={otp4Ref}
                  style={styles.otpInput}
                  value={otp4}
                  onChangeText={text => {
                    setOtp4(text);
                    if (text) otp5Ref.current?.focus();
                  }}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && !otp4) {
                      otp3Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <TextInput
                  ref={otp5Ref}
                  style={styles.otpInput}
                  value={otp5}
                  onChangeText={text => {
                    setOtp5(text);
                    if (text) otp6Ref.current?.focus();
                  }}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && !otp5) {
                      otp4Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <TextInput
                  ref={otp6Ref}
                  style={styles.otpInput}
                  value={otp6}
                  onChangeText={setOtp6}
                  onKeyPress={({nativeEvent}) => {
                    if (nativeEvent.key === 'Backspace' && !otp6) {
                      otp5Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
              <Text style={styles.otpHelperText}>
                {isLoading ? 'Verifying...' : "Can't find the code? Please check your spam folder."}
              </Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 48,
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
  },
  otpTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  otpSubtitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 24,
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    color: '#111827',
    backgroundColor: 'transparent',
  },
  otpHelperText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
