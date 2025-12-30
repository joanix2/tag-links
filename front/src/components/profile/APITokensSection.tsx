import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Key, Trash2, AlertCircle, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

interface APIToken {
  id: string;
  name: string;
  token: string;
  created_at: string;
  last_used_at: string | null;
}

export function APITokensSection() {
  const { fetchApi } = useApi();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<{ name: string; token: string } | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

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

  return (
    <>
      <Card>
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
    </>
  );
}
