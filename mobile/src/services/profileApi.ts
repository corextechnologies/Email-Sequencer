import ApiService from './api';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  currentPassword: string;
}

export interface Profile {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}

class ProfileApiService {
  async getProfile(): Promise<Profile> {
    const response = await ApiService.get('/profile');
    console.log('Profile data:', response.data.data.profile);
    return response.data.data.profile;
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await ApiService.put('/profile/change-password', data);
  }

  async changeEmail(data: ChangeEmailRequest): Promise<Profile> {
    const response = await ApiService.put('/profile/change-email', data);
    return response.data.user;
  }
}

export default new ProfileApiService();
