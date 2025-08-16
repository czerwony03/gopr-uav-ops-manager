import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "GOPR UAV Ops Manager",
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="drones-list"
          options={{
            title: "Drones List",
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="drone-details"
          options={{
            title: "Drone Details",
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="drone-form"
          options={{
            title: "Drone",
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="flights-list"
          options={{
            title: "Flights",
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="flight-form"
          options={{
            title: "Flight",
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
