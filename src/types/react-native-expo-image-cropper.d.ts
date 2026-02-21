declare module 'react-native-expo-image-cropper' {
  import { Component } from 'react';

  interface ExpoImageManipulatorProps {
    photo: { uri: string };
    isVisible: boolean;
    onPictureChoosed: (data: { uri: string; base64?: string }) => void;
    onToggleModal: () => void;
    saveOptions?: {
      compress?: number;
      format?: 'jpeg' | 'png';
      base64?: boolean;
    };
    btnTexts?: {
      crop?: string;
      rotate?: string;
      done?: string;
      processing?: string;
    };
    fixedMask?: {
      width: number;
      height: number;
    };
  }

  export class ExpoImageManipulator extends Component<ExpoImageManipulatorProps> {}
}
