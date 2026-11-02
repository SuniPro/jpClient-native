import { Alert } from 'heroui-native';

export interface BasicAlertProps {
  status: 'success' | 'warning' | 'danger';
  title: string;
  description: string;
}

export function BasicAlert({ status, title, description }: BasicAlertProps) {
  return (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{description}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
