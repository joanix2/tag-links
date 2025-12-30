import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export function DangerZone() {
  const { signOut } = useAuth();
  const { fetchApi } = useApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  return (
    <>
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
    </>
  );
}
