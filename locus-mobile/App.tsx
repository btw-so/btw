import React, {useState, useRef, useEffect} from 'react';
import {SafeAreaView, StyleSheet, StatusBar, View, Linking} from 'react-native';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import {LoginScreen} from './src/screens/LoginScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {NodeDetailScreen} from './src/screens/NodeDetailScreen';
import {WidgetConfigScreen} from './src/screens/WidgetConfigScreen';
import {QuickNoteButton} from './src/components/QuickNoteButton';

type NavigationState = {
  screen: 'home' | 'nodeDetail' | 'widgetConfig';
  nodeId?: string;
};

const AppContent: React.FC = () => {
  const {user, isLoading} = useAuth();
  const [navigation, setNavigation] = useState<NavigationState>({screen: 'home'});
  const [navigationStack, setNavigationStack] = useState<NavigationState[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const navigateToNode = (nodeId: string) => {
    setNavigationStack(prev => [...prev, navigation]);
    setNavigation({screen: 'nodeDetail', nodeId});
  };

  const navigateToWidgetConfig = () => {
    setNavigationStack(prev => [...prev, navigation]);
    setNavigation({screen: 'widgetConfig'});
  };

  const navigateBack = () => {
    if (navigationStack.length > 0) {
      const previous = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setNavigation(previous);
    } else {
      setNavigation({screen: 'home'});
    }
  };

  const handleNoteSaved = () => {
    // Trigger refresh by incrementing the trigger
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle deep links from widgets
  useEffect(() => {
    const handleDeepLink = (event: {url: string}) => {
      const url = event.url;
      console.log('Deep link received:', url);

      if (url.startsWith('locus://node/')) {
        const nodeId = url.replace('locus://node/', '');
        console.log('Navigating to node:', nodeId);
        navigateToNode(nodeId);
      } else if (url === 'locus://widgetConfig') {
        console.log('Navigating to widget config');
        navigateToWidgetConfig();
      }
    };

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({url});
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Quick Note Button - Always visible */}
      <QuickNoteButton onNoteSaved={handleNoteSaved} />

      {/* Main Content */}
      {!user ? (
        <LoginScreen />
      ) : (
        <>
          {navigation.screen === 'home' ? (
            <HomeScreen
              onNavigateToNode={navigateToNode}
              onNavigateToWidgetConfig={navigateToWidgetConfig}
              refreshTrigger={refreshTrigger}
            />
          ) : navigation.screen === 'widgetConfig' ? (
            <WidgetConfigScreen onBack={navigateBack} />
          ) : (
            <NodeDetailScreen
              nodeId={navigation.nodeId!}
              onNavigateToNode={navigateToNode}
              onBack={navigateBack}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default App;
