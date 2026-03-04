import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },

  experimental: {
    // El cliente reutiliza el RSC payload sin ir al servidor
    // si la página ya fue visitada hace menos de N segundos.
    staleTimes: {
      dynamic: 30,   // productos, movimientos, estadísticas, etc.
      static:  300,  // páginas estáticas: 5 min
    },
  },
};

export default nextConfig;