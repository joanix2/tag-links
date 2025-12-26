import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Code, Key, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ApiDocsPage() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  const CodeBlock = ({ children, language = "bash" }: { children: string; language?: string }) => (
    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
      <code className={`language-${language}`}>{children}</code>
    </pre>
  );

  return (
    <AppLayout>
      <div className="container mx-auto py-10 px-4 max-w-4xl animate-slide-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Code className="h-8 w-8" />
            API Documentation
          </h1>
          <p className="text-muted-foreground text-lg">Access your bookmarks programmatically using our REST API</p>
        </div>

        {/* Getting Started */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>Create an API token to authenticate your requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must create an API token in your{" "}
                <Link to="/profile" className="underline font-medium">
                  profile page
                </Link>{" "}
                before using the API.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <h4 className="font-medium">Steps to get started:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to your Profile page</li>
                <li>Click "Create Token" in the API Tokens section</li>
                <li>Give your token a descriptive name</li>
                <li>Copy the token (you'll only see it once!)</li>
                <li>Use the token in the Authorization header of your requests</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>All API requests require authentication using Bearer tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Authorization Header</h4>
              <p className="text-sm text-muted-foreground mb-3">Include your API token in the Authorization header of every request:</p>
              <CodeBlock>{`Authorization: Bearer YOUR_API_TOKEN`}</CodeBlock>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>Available API endpoints for accessing your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Get All Links */}
            <div className="border-b pb-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                  GET
                </Badge>
                <code className="text-sm">/public/links</code>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Retrieve all your bookmarks, optionally filtered by tag names.</p>

              <h5 className="font-medium text-sm mb-2">Query Parameters</h5>
              <ul className="text-sm space-y-1 mb-4">
                <li>
                  <code className="bg-muted px-1.5 py-0.5 rounded">tags</code> (optional) - Filter links by tag names, comma-separated for multiple tags
                </li>
                <li className="text-muted-foreground ml-4">• Single tag: Returns links with that tag</li>
                <li className="text-muted-foreground ml-4">• Multiple tags: Returns links with ALL specified tags (AND logic)</li>
              </ul>

              <h5 className="font-medium text-sm mb-2">Example Requests</h5>
              <CodeBlock>
                {`# Get all links
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiUrl}/public/links"

# Get links with "Partage" tag
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiUrl}/public/links?tags=Partage"

# Get favorite links
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiUrl}/public/links?tags=Favoris"

# Get links with BOTH "Partage" AND "Development" tags
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiUrl}/public/links?tags=Partage,Development"`}
              </CodeBlock>

              <h5 className="font-medium text-sm mb-2 mt-4">Example Response</h5>
              <CodeBlock language="json">
                {`[
  {
    "id": "link-123",
    "title": "Example Bookmark",
    "url": "https://example.com",
    "description": "A useful resource",
    "tags": [
      {
        "id": "tag-1",
        "name": "Partage",
        "color": "#92400E"
      },
      {
        "id": "tag-2",
        "name": "Development",
        "color": "#3B82F6"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }
]`}
              </CodeBlock>
            </div>

            {/* Get Single Link */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                  GET
                </Badge>
                <code className="text-sm">/public/links/{"{link_id}"}</code>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Retrieve a specific bookmark by its ID.</p>

              <h5 className="font-medium text-sm mb-2">Example Request</h5>
              <CodeBlock>
                {`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiUrl}/public/links/link-123"`}
              </CodeBlock>

              <h5 className="font-medium text-sm mb-2 mt-4">Example Response</h5>
              <CodeBlock language="json">
                {`{
  "id": "link-123",
  "title": "Example Bookmark",
  "url": "https://example.com",
  "description": "A useful resource",
  "tags": [
    {
      "id": "tag-1",
      "name": "Development",
      "color": "#3B82F6"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z"
}`}
              </CodeBlock>
            </div>
          </CardContent>
        </Card>

        {/* Response Codes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Response Codes</CardTitle>
            <CardDescription>HTTP status codes returned by the API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200 shrink-0">
                  200
                </Badge>
                <div>
                  <div className="font-medium">OK</div>
                  <div className="text-muted-foreground">Request succeeded</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 shrink-0">
                  401
                </Badge>
                <div>
                  <div className="font-medium">Unauthorized</div>
                  <div className="text-muted-foreground">Invalid or missing API token</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 shrink-0">
                  403
                </Badge>
                <div>
                  <div className="font-medium">Forbidden</div>
                  <div className="text-muted-foreground">You don't have access to this resource</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 shrink-0">
                  404
                </Badge>
                <div>
                  <div className="font-medium">Not Found</div>
                  <div className="text-muted-foreground">Resource doesn't exist</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
