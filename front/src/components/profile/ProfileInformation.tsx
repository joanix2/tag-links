import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API_URL } from "@/config/env";

export function ProfileInformation() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(user?.username || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [pendingDelete, setPendingDelete] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get profile picture URL
  const getProfilePictureUrl = () => {
    if (user?.profile_picture) {
      const baseUrl = API_URL.replace(/\/api$/, "");
      // Add timestamp to prevent browser caching
      return `${baseUrl}/assets/${user.profile_picture}?t=${imageTimestamp}`;
    }
    return undefined;
  };

  // Get initials from user's username
  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Store the file for later upload
    setSelectedFile(file);

    // Create preview only - don't upload yet
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Actually upload the file when user confirms
  const confirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploadingPicture(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch(`${API_URL}/users/${user?.id}/profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        console.error("Upload failed:", response.status, errorData);
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      await refreshUser();
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      // Update timestamp to force image reload
      setImageTimestamp(Date.now());

      setTimeout(() => {
        setShowPhotoDialog(false);
        setPreviewUrl(null);
        setUploadProgress(0);
        setSelectedFile(null);
      }, 500);
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleProfilePictureUpload(file);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProfilePictureUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle profile picture deletion
  const handleDeleteProfilePicture = async () => {
    setIsUploadingPicture(true);
    try {
      const response = await fetch(`${API_URL}/users/${user?.id}/profile-picture`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete profile picture");
      }

      await refreshUser();

      toast({
        title: "Success",
        description: "Profile picture removed successfully",
      });

      // Update timestamp to force image reload
      setImageTimestamp(Date.now());

      setShowPhotoDialog(false);
      setPreviewUrl(null);
      setPendingDelete(false);
    } catch (error) {
      console.error("Failed to delete profile picture:", error);
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  // Handle cancel - reset all states
  const handleCancel = () => {
    setShowPhotoDialog(false);
    setPreviewUrl(null);
    setPendingDelete(false);
    setUploadProgress(0);
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement updateProfile in AuthContext
      console.log("Update profile:", { username });
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col">
              <CardTitle className="text-2xl">Profile Information</CardTitle>
              <CardDescription>View and update your account details</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-6 mb-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative cursor-pointer group" onClick={() => setShowPhotoDialog(true)}>
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getProfilePictureUrl()} alt={user?.username} />
                  <AvatarFallback className="text-lg">{user?.username ? getInitials(user.username) : "U"}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex-1">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    <p className="text-sm text-muted-foreground">Your public display name</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email} disabled className="bg-muted" />
                    <p className="text-sm text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-b-transparent border-white"></div>
                          Saving...
                        </div>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setUsername(user?.username || "");
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Username</dt>
                    <dd className="text-base">{user?.username}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-base">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Account ID</dt>
                    <dd className="text-base text-gray-600">{user?.id}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t flex flex-col items-start pt-6">
          <h3 className="font-medium mb-2">Account Security</h3>
          <p className="text-sm text-gray-600 mb-4">Password management and security settings would typically be added here</p>
          <Button variant="outline" disabled>
            Change Password
          </Button>
        </CardFooter>
      </Card>

      {/* Profile Picture Upload Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
            <DialogDescription>Upload a new profile picture. Max file size: 5MB. Supported formats: JPEG, PNG, WebP.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"} ${
                isUploadingPicture ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploadingPicture && fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" />
              {previewUrl ? (
                <div className="space-y-4">
                  <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-32 rounded-full object-cover" />
                  {isUploadingPicture && (
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              ) : pendingDelete ? (
                <div className="space-y-2">
                  <div className="mx-auto h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <X className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-destructive font-medium">Photo will be removed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP (max 5MB)</p>
                  </div>
                </div>
              )}
            </div>
            {/* Only show remove button in dialog if there's a profile picture and not pending delete */}
            {user?.profile_picture && !isUploadingPicture && !pendingDelete && (
              <Button variant="outline" onClick={() => setPendingDelete(true)} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Remove Current Photo
              </Button>
            )}
            {/* Show undo button if pending delete */}
            {pendingDelete && !isUploadingPicture && (
              <Button variant="outline" onClick={() => setPendingDelete(false)} className="w-full">
                Undo Remove
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isUploadingPicture}>
              Cancel
            </Button>
            {(previewUrl || pendingDelete) && (
              <Button onClick={pendingDelete ? handleDeleteProfilePicture : confirmUpload} disabled={isUploadingPicture}>
                {isUploadingPicture ? "Processing..." : pendingDelete ? "Confirm Remove" : "Confirm Upload"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
