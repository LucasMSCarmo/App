import { useCallback, useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Alert, AppState, Linking } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule';
import * as Notifications from 'expo-notifications';

export const usePermissions = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  const [hasSpeechRecognitionPermission, setHasSpeechRecognitionPermission] = useState<boolean | null>(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      setHasCameraPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso à câmera para tirar fotos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurações', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão da câmera:', error);
      return false;
    }
  }, []);

  const requestGalleryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = status === 'granted';
      setHasGalleryPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso à galeria para selecionar fotos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurações', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão da galeria:', error);
      return false;
    }
  }, []);

  const requestSpeechRecognitionPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasSpeechRecognitionPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso ao microfone para reconhecer a fala.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurações', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão do microfone:', error);
      return false;
    }
  }, []);

  const requestNotificationPermission = useCallback(async (showWarning: boolean = true): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasNotificationPermission(granted);

    if (!granted && showWarning) {
      Alert.alert(
        'Permissão Necessária',
        'Precisamos de permissão para enviar notificações.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Configurações', onPress: () => Linking.openSettings() },
        ],
      );
    }
    return granted;
  }, []);

  const requestLocationPermission = useCallback(async (showWarning: boolean = true): Promise<boolean> => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      setHasLocationPermission(false);
      if (showWarning) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso à localização para alertar sobre tarefas próximas.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurações', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return false;
    }

    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    const granted = bg === 'granted';
    setHasLocationPermission(granted);

    if (!granted && showWarning) {
      Alert.alert(
        'Permissão de Localização em Segundo Plano',
        'Para receber alertas de tarefas próximas mesmo com o app fechado, selecione "Permitir o tempo todo" nas configurações.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Configurações', onPress: () => Linking.openSettings() },
        ],
      );
    }
    return granted;
  }, []);

  const checkPermissions = useCallback(async () => {
    const [camera, gallery, speech, notification, location, background] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      ExpoSpeechRecognitionModule.getPermissionsAsync(),
      Notifications.getPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);

    const snapshot = {
      camera: camera.status === 'granted',
      gallery: gallery.status === 'granted',
      speech: speech.status === 'granted',
      notification: notification.status === 'granted',
      location: location.status === 'granted' && background.status === 'granted',
    };

    setHasCameraPermission(snapshot.camera);
    setHasGalleryPermission(snapshot.gallery);
    setHasSpeechRecognitionPermission(snapshot.speech);
    setHasNotificationPermission(snapshot.notification);
    setHasLocationPermission(snapshot.location);

    return snapshot;
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  return {
    hasCameraPermission,
    hasGalleryPermission,
    hasSpeechRecognitionPermission,
    hasNotificationPermission,
    hasLocationPermission,
    requestCameraPermission,
    requestGalleryPermission,
    requestSpeechRecognitionPermission,
    requestNotificationPermission,
    requestLocationPermission,
    checkPermissions,
  };
};
