import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { AuthProvider } from "../contexts/AuthContext";
import { CustomDrawerContent } from "../components/CustomDrawerContent";
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
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
              drawerLabel: "Home",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="flights-list"
            options={{
              title: "Flights",
              drawerLabel: "Flights",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="airplane-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="drones-list"
            options={{
              title: "Drones List",
              drawerLabel: "Drones",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="hardware-chip-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="users-list"
            options={{
              title: "Users",
              drawerLabel: "Users",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="people-outline" size={size} color={color} />
              ),
            }}
          />
          {/* Detail and form screens - hidden from drawer */}
          <Drawer.Screen
            name="drone-details"
            options={{
              title: "Drone Details",
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="drone-form"
            options={{
              title: "Drone",
              drawerItemStyle: { display: 'none' },
            }}
          />
          <Drawer.Screen
            name="flight-form"
            options={{
              title: "Flight",
              drawerItemStyle: { display: 'none' },
            }}
          />
        </Drawer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
