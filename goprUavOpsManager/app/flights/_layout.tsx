import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function FlightsLayout() {
  const { t } = useTranslation('common');

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
          title: t('flights.title'),
        }}
      />
      <Stack.Screen
        name="flight-details"
        options={{
          title: t('flights.flightDetails'),
        }}
      />
      <Stack.Screen
        name="flight-form"
        options={{
          title: t('flights.title'),
        }}
      />
    </Stack>
  );
}