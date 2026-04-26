// src/lib/aiService.ts
/**
 * Client for the Digital Wardrobe AI microservice.
 * Sends clothing images for analysis and returns structured metadata.
 */

import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

// AI analysis result shape — matches the microservice response
export interface AIAnalysisResult {
  name: string;
  category: string;
  description: string;
  metadata: {
    Color: string;
    Size: string;
    Brand: string;
    Material: string;
    [key: string]: string;
  };
  tags: string[];
}

/**
 * Get the AI service URL from app config, environment, or fallback to localhost.
 */
function getServiceUrl(): string {
  // Try expo-constants extra config first
  const extra = Constants.expoConfig?.extra;
  if (extra?.aiServiceUrl) {
    return extra.aiServiceUrl;
  }

  // Fallback for local development
  // Android emulator uses 10.0.2.2 to reach host localhost
  // iOS simulator uses localhost directly
  return 'http://localhost:8000';
}

/**
 * Analyze a clothing image using the AI microservice.
 *
 * @param imageUri - Local file URI of the image (file:// path or relative filename)
 * @returns Structured clothing data from the AI
 * @throws Error if the service is unreachable or returns an error
 */
export async function analyzeClothingImage(
  imageUri: string
): Promise<AIAnalysisResult> {
  const serviceUrl = getServiceUrl();
  const analyzeUrl = `${serviceUrl}/analyze`;

  // Resolve the URI — handle both full file:// paths and relative filenames
  let resolvedUri = imageUri;
  if (!imageUri.startsWith('file://') && !imageUri.startsWith('http')) {
    // It's a relative filename stored in the DB — resolve to full path
    resolvedUri = `${FileSystem.documentDirectory}images/${imageUri}`;
  }

  try {
    const response = await FileSystem.uploadAsync(analyzeUrl, resolvedUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'image',
      mimeType: 'image/jpeg',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status < 200 || response.status >= 300) {
      let errorMessage = `AI service error (${response.status})`;
      try {
        const errorData = JSON.parse(response.body);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Response wasn't JSON, use default message
      }
      throw new Error(errorMessage);
    }

    const result: AIAnalysisResult = JSON.parse(response.body);
    return result;
  } catch (error: any) {
    // Provide user-friendly error messages
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Could not connect')) {
      throw new Error(
        'Could not reach the AI service. Make sure the server is running on ' + serviceUrl
      );
    }
    throw error;
  }
}

/**
 * Check if the AI service is reachable and configured.
 */
export async function checkAIServiceHealth(): Promise<{
  healthy: boolean;
  model?: string;
  error?: string;
}> {
  const serviceUrl = getServiceUrl();

  try {
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { healthy: false, error: `Status ${response.status}` };
    }

    const data = await response.json();
    return {
      healthy: data.status === 'healthy' && data.api_key_configured,
      model: data.model,
      error: !data.api_key_configured ? 'API key not configured' : undefined,
    };
  } catch {
    return { healthy: false, error: 'Service unreachable' };
  }
}
