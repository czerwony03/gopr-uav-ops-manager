import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TemplatesLayout() {
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
          title: t('tasks.templates'),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('tasks.createTemplate'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
