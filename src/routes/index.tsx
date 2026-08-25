import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import splashScreen from "@/assets/splash-screen.jpg";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/home" }), 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-black">
      <img
        src={splashScreen}
        alt="Aurora"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
