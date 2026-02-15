import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CustomDialog from './CustomDialog';
import StyledButton from './StyledButton';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
    /** Aspect ratio [width, height] for cropping. Default is [1, 1] (square). */
    aspect?: [number, number];
    /** Allow editing/cropping. Default is true. */
    allowsEditing?: boolean;
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
    aspect = [1, 1],
    allowsEditing = true,
}: Props) {
    const [dialogVisible, setDialogVisible] = useState(false);

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
                allowsEditing,
                aspect,
                quality: 0.8,
                // On iOS, present as fullscreen to avoid UI conflicts
                presentationStyle: Platform.OS === 'ios' 
                    ? ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN 
                    : undefined,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
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
