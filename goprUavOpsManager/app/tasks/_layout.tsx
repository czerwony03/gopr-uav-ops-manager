import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TasksLayout() {
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
          title: t('tasks.title'),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('tasks.createTask'),
        }}
      />
      <Stack.Screen
        name="templates"
        options={{
          headerShown: false,
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
