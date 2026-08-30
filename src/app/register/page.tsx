import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an account on Bangkar for secure cloud storage.",
};


export default function RegisterPage() {
  return <RegisterForm />;
}
