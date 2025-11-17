import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TaskDetailLayout() {
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
          title: t('tasks.taskDetails'),
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: t('tasks.editTask'),
        }}
      />
    </Stack>
  );
}
