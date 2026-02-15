import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ExpoImageCropTool from '@bsky.app/expo-image-crop-tool';
import CustomDialog from './CustomDialog';
import StyledButton from './StyledButton';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
    /** Aspect ratio for cropping (width/height). Default is free-form. */
    aspectRatio?: number;
    /** Shape of the crop area. Default is 'rectangle'. */
    cropShape?: 'rectangle' | 'circle';
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
    aspectRatio,
    cropShape = 'rectangle',
}: Props) {
    const [dialogVisible, setDialogVisible] = useState(false);

    const openCropper = async (imageUri: string) => {
        try {
            const result = await ExpoImageCropTool.openCropperAsync({
                imageUri,
                shape: cropShape,
                aspectRatio,
                format: 'jpeg',
                compressImageQuality: 0.8,
                rotationEnabled: true,
                cancelButtonText: 'Cancel',
                doneButtonText: 'Done',
            });
            
            if (result?.path) {
                onImageSelected(result.path);
            }
        } catch (err: any) {
            // User cancelled - not an error
            if (err?.message?.includes('cancel') || err?.message?.includes('Cancel')) {
                return;
            }
            console.error('Cropper Error:', err);
            Alert.alert('Error', 'Failed to crop image');
        }
    };

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

            // Pick image without editing (we'll use custom cropper)
            const result = await launcher({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Open custom cropper with the selected image
                await openCropper(result.assets[0].uri);
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
        </>
    );
}
