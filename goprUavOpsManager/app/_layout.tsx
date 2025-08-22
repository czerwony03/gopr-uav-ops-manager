import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CustomDrawerContent } from "@/components/CustomDrawerContent";
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import '../src/i18n'; // Initialize i18n

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
          name="procedures-checklists-list"
          options={{
            title: t('nav.procedures'),
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
        {/* Procedures & Checklists detail and form screens - hidden from drawer */}
        <Drawer.Screen
          name="procedures-checklist-details"
          options={{
            title: t('nav.procedures'),
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="procedures-checklist-form"
          options={{
            title: t('nav.procedures'),
            drawerItemStyle: { display: 'none' },
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNavigation />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
