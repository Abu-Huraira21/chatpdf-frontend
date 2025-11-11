import { useState, useRef } from 'react';
import { User, Camera, Key, Mail, Calendar, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    name: string;
    email: string;
    avatarUrl?: string;
    joinDate: string;
  };
  onAvatarUpload: (file: File) => void;
  onPasswordChangeRequest: () => void;
  onLogout: () => Promise<void>;
}

export function ProfileModal({
  open,
  onOpenChange,
  userProfile,
  onAvatarUpload,
  onPasswordChangeRequest,
  onLogout,
}: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('ProfileModal render, open:', open);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      onAvatarUpload(file);
      toast.success('Profile photo updated successfully!');
    }
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast.success('Profile updated successfully!');
    // In a real app, you would save the changes to the backend
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Manage your account information and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-gray-100">
                <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                  {getInitials(userProfile.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-4 w-4 text-gray-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Click the camera icon to upload a new photo</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG or GIF (max. 5MB)</p>
            </div>
          </div>

          <Separator />

          {/* Profile Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : ''}
                />
                {!isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button onClick={handleSaveProfile}>Save</Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{userProfile.email}</span>
              </div>
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinDate">Member Since</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{userProfile.joinDate}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Actions */}
          <div className="space-y-3">
            <h4 className="text-sm">Account Security</h4>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={onPasswordChangeRequest}
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            <p className="text-xs text-gray-500">
              You will be logged out and receive a password reset link via email
            </p>
          </div>

          <Separator />

          {/* Logout Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full justify-start text-gray-700 hover:bg-gray-100"
              onClick={async () => {
                await onLogout();
                onOpenChange(false);
              }}
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Log Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
