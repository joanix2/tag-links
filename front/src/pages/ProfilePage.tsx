import { useState } from "react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get initials from user's username
  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
    <AppLayout>
      <div className="container mx-auto py-10 px-4 max-w-3xl animate-slide-in">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

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
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-lg">{user?.username ? getInitials(user.username) : "U"}</AvatarFallback>
              </Avatar>
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
      </div>
    </AppLayout>
  );
}
