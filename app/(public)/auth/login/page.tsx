// app/(public)/auth/login/page.tsx
import { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión | DevHub POS" };

export default function LoginPage() {
  return <LoginForm />;
}
