import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const PasswordReset = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate password reset
    setTimeout(() => {
      if (email) {
        setSent(true);
        toast({
          title: "Reset link sent (stub)",
          description: "Password reset functionality is not yet implemented.",
        });
      } else {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold">Check your email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to {email}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">Reset password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you reset instructions
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="editor@publisher.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default PasswordReset;