import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CustomDialog from './CustomDialog';

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

    const handlePress = () => {
        setDialogVisible(true);
    };

    return (
        <View>
            <Button title={title} onPress={handlePress} />
            <CustomDialog
                visible={dialogVisible}
                title="Select Image"
                message="Choose an option"
                onDismiss={() => setDialogVisible(false)}
                buttons={[
                    {
                        label: 'Choose from Library',
                        onPress: () => {
                            setDialogVisible(false);
                            setTimeout(() => {
                                pickFromLibrary();
                            }, 300);
                        },
                    },
                    {
                        label: 'Take Photo',
                        onPress: () => {
                            setDialogVisible(false);
                            setTimeout(() => {
                                pickFromCamera();
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
        </View>
    );
}
