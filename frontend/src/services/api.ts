const API_BASE_URL = 'http://localhost:3000';

export interface Assumption {
  name: string;
  data: any[];
  assumptionId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export class ApiService {
  static async getAssumptions(): Promise<Assumption[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/reserve/assumptions`);
      const result: ApiResponse<{ files: Assumption[] }> = await response.json();
      
      if (result.success && result.data?.files) {
        return result.data.files;
      }
      return [];
    } catch (error) {
      console.error('Error fetching assumptions:', error);
      return [];
    }
  }

  static async uploadAssumptions(file: File): Promise<Assumption[]> {
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch(`${API_BASE_URL}/reserve/assumptions`, {
        method: 'POST',
        body: formData,
      });

      const result: ApiResponse<{ files: Assumption[] }> = await response.json();
      
      if (result.success && result.data?.files) {
        return result.data.files;
      }
      throw new Error(result.message || 'Upload failed');
    } catch (error) {
      console.error('Error uploading assumptions:', error);
      throw error;
    }
  }
} 