import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to access your secure files on Bangkar.",
};


export default function LoginPage() {
  return <LoginForm />;
}
