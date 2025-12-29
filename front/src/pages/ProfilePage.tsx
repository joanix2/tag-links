import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Copy, Key, Trash2, AlertCircle, BookOpen, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface APIToken {
  id: string;
  name: string;
  token: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { fetchApi } = useApi();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API Tokens state
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<{ name: string; token: string } | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Get initials from user's username
  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Load API tokens
  const fetchTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const data = await fetchApi("/api-tokens/");
      setTokens(data);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      toast({
        title: "Error",
        description: "Failed to load API tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTokens(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a token name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingToken(true);
    try {
      const data = await fetchApi("/api-tokens/", {
        method: "POST",
        body: JSON.stringify({ name: newTokenName }),
      });
      setCreatedToken(data);
      setNewTokenName("");
      setShowCreateDialog(false);
      await fetchTokens();
      toast({
        title: "Token Created",
        description: "Your API token has been created successfully",
      });
    } catch (error) {
      console.error("Failed to create token:", error);
      toast({
        title: "Error",
        description: "Failed to create API token",
        variant: "destructive",
      });
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await fetchApi(`/api-tokens/${tokenId}`, {
        method: "DELETE",
      });
      await fetchTokens();
      toast({
        title: "Token Deleted",
        description: "The API token has been revoked",
      });
    } catch (error) {
      console.error("Failed to delete token:", error);
      toast({
        title: "Error",
        description: "Failed to delete API token",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Token copied to clipboard",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);
    try {
      await fetchApi("/auth/me", {
        method: "DELETE",
      });
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted",
      });
      signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
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

        {/* API Tokens Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Tokens
                </CardTitle>
                <CardDescription>Create and manage API tokens to access your links programmatically</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/api-docs">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View API Docs
                  </Link>
                </Button>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Create Token
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTokens ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-b-transparent border-primary"></div>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No API tokens yet. Create one to get started.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{token.token}</code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(token.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(token.last_used_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteToken(token.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Token Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>Give your token a descriptive name to help identify its purpose.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Token Name</Label>
                <Input
                  id="token-name"
                  placeholder="e.g., Mobile App, Integration Script"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateToken();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreatingToken}>
                Cancel
              </Button>
              <Button onClick={handleCreateToken} disabled={isCreatingToken}>
                {isCreatingToken ? "Creating..." : "Create Token"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Show Created Token Dialog */}
        <Dialog open={!!createdToken} onOpenChange={() => setCreatedToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Created Successfully</DialogTitle>
              <DialogDescription>Make sure to copy your token now. You won't be able to see it again!</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This is the only time you will see this token. Store it securely.</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Token Name</Label>
                <div className="font-medium">{createdToken?.name}</div>
              </div>
              <div className="space-y-2">
                <Label>Your API Token</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-3 rounded text-xs break-all">{createdToken?.token}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdToken?.token || "")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setCreatedToken(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Danger Zone - Delete Account */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions that will permanently delete your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Delete Account</h3>
              <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back. This will permanently delete:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                <li>Your user profile and settings</li>
                <li>All your saved links and URLs</li>
                <li>All your tags</li>
                <li>All your API tokens</li>
                <li>All associated data in our database</li>
              </ul>
            </div>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Delete My Account
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    Please type <span className="font-bold">DELETE</span> to confirm:
                  </p>
                  <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE here" className="font-mono" />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE" || isDeletingAccount} className="bg-destructive hover:bg-destructive/90">
                {isDeletingAccount ? "Deleting..." : "Delete Account Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
