// hooks/useMediaPermissions.ts
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export const usePermissions = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);

  const requestCameraPermission = async () => {
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
            { text: 'Configurações', onPress: () => Linking.openSettings() }
          ]
        );
      }
      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão da câmera:', error);
      return false;
    }
  };

  const requestGalleryPermission = async () => {
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
            { text: 'Configurações', onPress: () => Linking.openSettings() }
          ]
        );
      }
      return granted;
    } catch (error) {
      console.error('Erro ao solicitar permissão da galeria:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');
      setHasGalleryPermission(galleryStatus.status === 'granted');
    };
    checkPermissions();
  }, []);

  return {
    hasCameraPermission,
    hasGalleryPermission,
    requestCameraPermission,
    requestGalleryPermission,
  };
};