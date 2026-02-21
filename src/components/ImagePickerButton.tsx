import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ImageCropTool from '@bsky.app/expo-image-crop-tool';
import CustomDialog from './CustomDialog';
import StyledButton from './StyledButton';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
    /** Skip cropping and use image as-is. Default is false. */
    skipCropping?: boolean;
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
    skipCropping = false,
}: Props) {
    const [dialogVisible, setDialogVisible] = useState(false);

    const openCropper = async (imageUri: string) => {
        try {
            const result = await ImageCropTool.openCropperAsync({
                imageUri,
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
            if (err?.message?.toLowerCase().includes('cancel')) {
                return;
            }
            console.error('Cropper Error:', err);
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

            const result = await launcher({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // We use custom cropper
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                
                if (skipCropping) {
                    onImageSelected(uri);
                } else {
                    await openCropper(uri);
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
        </>
    );
}
