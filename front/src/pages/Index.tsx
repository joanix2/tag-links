
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // This will redirect to dashboard for authenticated users,
    // and the auth context will handle redirecting to login if needed
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Redirecting...</h1>
        <div className="h-6 w-6 mx-auto animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    </div>
  );
};

export default Index;
