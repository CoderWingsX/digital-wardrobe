// Bridge for passing image editor results back to the caller without
// needing to serialize callbacks through navigation params.

type Resolver = (uri: string | null) => void;

let pendingResolver: Resolver | null = null;

/**
 * Opens the image editor screen and returns a promise that resolves
 * with the edited image URI, or null if the user cancelled.
 */
export function openImageEditor(
  navigation: { navigate: (screen: string, params: any) => void },
  imageUri: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    pendingResolver = resolve;
    navigation.navigate('ImageEditor', { imageUri });
  });
}

/**
 * Called by ImageEditorScreen when the user taps Done.
 */
export function resolveImageEditor(uri: string) {
  if (pendingResolver) {
    pendingResolver(uri);
    pendingResolver = null;
  }
}

/**
 * Called by ImageEditorScreen when the user taps Cancel.
 */
export function cancelImageEditor() {
  if (pendingResolver) {
    pendingResolver(null);
    pendingResolver = null;
  }
}
