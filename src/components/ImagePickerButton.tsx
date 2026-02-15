import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageEditor } from 'expo-image-editor';
import CustomDialog from './CustomDialog';
import StyledButton from './StyledButton';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
    /** Aspect ratio for cropping (width/height). Default is free-form. */
    aspectRatio?: number;
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
    aspectRatio,
}: Props) {
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editorVisible, setEditorVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

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

            // Pick image without editing (we'll use custom editor)
            const result = await launcher({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Open custom editor with the selected image
                setSelectedImageUri(result.assets[0].uri);
                setEditorVisible(true);
            }
        } catch (err) {
            console.error('ImagePicker Error:', err);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handlePickImage = () => {
        setDialogVisible(true);
    };

    const handleEditorDone = (result: { uri: string }) => {
        setEditorVisible(false);
        setSelectedImageUri(null);
        if (result?.uri) {
            onImageSelected(result.uri);
        }
    };

    const handleEditorCancel = () => {
        setEditorVisible(false);
        setSelectedImageUri(null);
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

            <ImageEditor
                visible={editorVisible}
                onCloseEditor={handleEditorCancel}
                imageUri={selectedImageUri || ''}
                fixedCropAspectRatio={aspectRatio || 1}
                lockAspectRatio={!!aspectRatio}
                minimumCropDimensions={{ width: 100, height: 100 }}
                onEditingComplete={handleEditorDone}
                mode="crop-only"
            />
        </>
    );
}
