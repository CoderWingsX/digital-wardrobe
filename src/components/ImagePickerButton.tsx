import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ExpoImageManipulator } from 'react-native-expo-image-cropper';
import CustomDialog from './CustomDialog';
import StyledButton from './StyledButton';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
    /** Skip the editor and use image as-is. Default is false. */
    skipEditor?: boolean;
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
    skipEditor = false,
}: Props) {
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editorVisible, setEditorVisible] = useState(false);
    const [pendingImageUri, setPendingImageUri] = useState<string>('');

    const pickImage = async (launcher: typeof ImagePicker.launchCameraAsync | typeof ImagePicker.launchImageLibraryAsync) => {
        try {
            let permissionRequestFunction;
            let permissionAlertMessage;

            if (launcher === ImagePicker.launchCameraAsync) {
                permissionRequestFunction = ImagePicker.requestCameraPermissionsAsync;
                permissionAlertMessage = 'Sorry, we need camera permissions to make this work!';
            } else {
                permissionRequestFunction = ImagePicker.requestMediaLibraryPermissionsAsync;
                permissionAlertMessage = 'Sorry, we need camera roll permissions to make this work!';
            }

            const { status } = await permissionRequestFunction();

            if (status !== 'granted') {
                Alert.alert('Permission needed', permissionAlertMessage);
                return;
            }

            const result = await launcher({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                
                if (skipEditor) {
                    onImageSelected(uri);
                } else {
                    setPendingImageUri(uri);
                    setEditorVisible(true);
                }
            }
        } catch (err) {
            console.error('ImagePicker Error:', err);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handlePickImage = () => {
        setDialogVisible(true);
    };

    return (
        <>
            <StyledButton
                title={title}
                icon="image-outline"
                buttonStyle="add"
                onPress={handlePickImage}
            />

            <CustomDialog
                visible={dialogVisible}
                title="Choose Image Source"
                message="Select where you want to pick the image from"
                onDismiss={() => setDialogVisible(false)}
                buttons={[
                    {
                        label: 'Camera',
                        onPress: () => {
                            setDialogVisible(false);
                            setTimeout(() => {
                                pickImage(ImagePicker.launchCameraAsync);
                            }, 300);
                        },
                    },
                    {
                        label: 'Gallery',
                        onPress: () => {
                            setDialogVisible(false);
                            setTimeout(() => {
                                pickImage(ImagePicker.launchImageLibraryAsync);
                            }, 300);
                        },
                    },
                    {
                        label: 'Cancel',
                        style: 'cancel',
                        onPress: () => setDialogVisible(false),
                    },
                ]}
            />

            <ExpoImageManipulator
                photo={{ uri: pendingImageUri }}
                isVisible={editorVisible}
                onPictureChoosed={(data: { uri: string }) => {
                    setEditorVisible(false);
                    setPendingImageUri('');
                    onImageSelected(data.uri);
                }}
                onToggleModal={() => {
                    setEditorVisible(false);
                    setPendingImageUri('');
                }}
                saveOptions={{
                    compress: 0.8,
                    format: 'jpeg',
                    base64: false,
                }}
            />
        </>
    );
}
