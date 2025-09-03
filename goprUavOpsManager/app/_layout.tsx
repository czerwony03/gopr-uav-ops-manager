import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ConsoleProvider } from "@/contexts/ConsoleContext";
import { CustomDrawerContent } from "@/components/CustomDrawerContent";
import ConsoleModal from "@/components/ConsoleModal";
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import { captureConsoleIntegration } from '@sentry/core';
import { CrossPlatformAlertProvider } from '@/components/CrossPlatformAlert';
import { useEffect } from 'react';
import '@/src/i18n';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_URL,
  sendDefaultPii: true,
  enabled: process.env.EXPO_PUBLIC_SENTRY_DISABLED !== 'true',
  integrations: [
    captureConsoleIntegration({
      levels: ['error', 'warn']
    })
  ],
  beforeSend(event) {
    if (event.exception?.values) {
      event.exception.values.forEach(exception => {
        if (exception.stacktrace?.frames) {
          // filter out frames from your console capture wrapper
          exception.stacktrace.frames = exception.stacktrace.frames.filter(
            frame =>
              !frame.function?.includes("createConsoleCapture") &&
              !frame.function?.includes("wrappedConsole")
          );
        }
      });
    }
    return event;
  }
});

function RootLayoutNavigation() {
  const { user, loading } = useAuth();
  const { t } = useTranslation('common');

  // Show nothing while loading authentication state
  if (loading) {
    return null;
  }

  // If user is authenticated, show drawer navigation
  if (user) {
    return (
      <Drawer
        drawerContent={CustomDrawerContent}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0066CC',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          drawerActiveBackgroundColor: '#e3f2fd',
          drawerActiveTintColor: '#0066CC',
          drawerInactiveTintColor: '#666',
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: "GOPR UAV Ops Manager",
            drawerLabel: t('nav.home'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="flights"
          options={{
            title: t('flights.title'),
            headerShown: false,
            drawerLabel: t('nav.flights'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="airplane-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="drones"
          options={{
            title: t('drones.title'),
            headerShown: false,
            drawerLabel: t('nav.drones'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="hardware-chip-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="users"
          options={{
            title: t('users.title'),
            headerShown: false,
            drawerLabel: t('nav.users'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="procedures"
          options={{
            title: t('procedures.title'),
            headerShown: false,
            drawerLabel: t('nav.procedures'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="clipboard-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="info-contact"
          options={{
            title: t('nav.info'),
            drawerLabel: t('nav.info'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="information-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="audit-logs"
          options={{
            title: t('nav.auditLogs'),
            drawerLabel: t('nav.auditLogs'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
            drawerItemStyle: { display: 'none' }, // Hidden by default, visibility controlled in CustomDrawerContent
          }}
        />
      </Drawer>
    );
  }

  // If user is not authenticated, show simple stack navigation
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066CC',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "GOPR UAV Ops Manager",
        }}
      />
      <Stack.Screen
        name="info-contact"
        options={{
          title: t('nav.info'),
        }}
      />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  const { i18n } = useTranslation();

  // Effect to set and update HTML lang attribute for React Native Web
  useEffect(() => {
    // Only run on web platforms where document exists
    if (typeof document !== 'undefined' && document.documentElement) {
      // Set initial language
      const setHtmlLang = () => {
        const currentLanguage = i18n.language || 'pl';
        document.documentElement.lang = currentLanguage;
      };

      // Set initial value
      setHtmlLang();

      // Listen for language changes using i18next events
      const handleLanguageChange = () => {
        setHtmlLang();
      };

      i18n.on('languageChanged', handleLanguageChange);

      // Cleanup event listener
      return () => {
        i18n.off('languageChanged', handleLanguageChange);
      };
    }
  }, [i18n]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConsoleProvider>
        <AuthProvider>
          <CrossPlatformAlertProvider>
            <RootLayoutNavigation />
            <ConsoleModal />
          </CrossPlatformAlertProvider>
        </AuthProvider>
      </ConsoleProvider>
    </GestureHandlerRootView>
  );
});
