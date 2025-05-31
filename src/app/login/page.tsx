import { Suspense } from "react";
import LoginFormComponent from "../components/LoginFormComponent";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginFormComponent />
    </Suspense>
  );
} 