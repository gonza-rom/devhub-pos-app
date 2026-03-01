// app/(app)/productos/nuevo/page.tsx
import { Metadata } from "next";
import ProductoForm from "@/components/productos/ProductoForm";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NuevoProductoPage() {
  return <ProductoForm />;
}