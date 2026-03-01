// app/(public)/auth/registro/page.tsx
import { Metadata } from "next";
import RegistroForm from "./RegistroForm";

export const metadata: Metadata = { title: "Crear cuenta | DevHub POS" };

export default function RegistroPage() {
  return <RegistroForm />;
}
