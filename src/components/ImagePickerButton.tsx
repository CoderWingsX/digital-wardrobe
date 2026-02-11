import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CustomDialog from './CustomDialog';
import StyledButton from './StyledButton';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
}: Props) {
    const [dialogVisible, setDialogVisible] = useState(false);

    const pickFromLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission needed',
                    'Sorry, we need camera roll permissions to make this work!'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
            }
        } catch (err) {
            console.error('ImagePicker Library Error:', err);
            Alert.alert('Error', 'Failed to pick image from library');
        }
    };

    const pickFromCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission needed',
                    'Sorry, we need camera permissions to make this work!'
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
            }
        } catch (err) {
            console.error('ImagePicker Camera Error:', err);
            Alert.alert('Error', 'Failed to take photo');
        }
    };
    const pickImage = async (launcher: typeof ImagePicker.launchCameraAsync | typeof ImagePicker.launchImageLibraryAsync) => {
        try {
            let permissionStatus;
            let permissionRequestFunction;
            let permissionAlertMessage;
            let errorMessage;

            if (launcher === ImagePicker.launchCameraAsync) {
                permissionRequestFunction = ImagePicker.requestCameraPermissionsAsync;
                permissionAlertMessage = 'Sorry, we need camera permissions to make this work!';
                errorMessage = 'Failed to take photo';
            } else {
                permissionRequestFunction = ImagePicker.requestMediaLibraryPermissionsAsync;
                permissionAlertMessage = 'Sorry, we need camera roll permissions to make this work!';
                errorMessage = 'Failed to pick image from library';
            }

            const { status } = await permissionRequestFunction();
            permissionStatus = status;

            if (permissionStatus !== 'granted') {
                Alert.alert(
                    'Permission needed',
                    permissionAlertMessage
                );
                return;
            }

            const result = await launcher({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
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
                            }, 500);
                        },
                    },
                    {
                        label: 'Gallery',
                        onPress: () => {
                            setDialogVisible(false);
                            setTimeout(() => {
                                pickImage(ImagePicker.launchImageLibraryAsync);
                            }, 500);
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
