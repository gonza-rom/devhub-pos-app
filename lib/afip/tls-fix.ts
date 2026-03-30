// lib/afip/tls-fix.ts
// Debe importarse ANTES de cualquier llamada al SDK de ARCA
// Fix para AFIP producción en Windows con OpenSSL moderno

import https from "https";

const agent = new https.Agent({
  rejectUnauthorized: false,
  minDHSize: 512,
  ciphers: "ALL",
  // @ts-ignore
  secureOptions: require("constants").SSL_OP_LEGACY_SERVER_CONNECT,
});

// Parchear el módulo http global de Node para que todas las requests usen el agente
const http = require("http");
const httpsModule = require("https");

const originalRequest = httpsModule.request;
httpsModule.request = function(options: any, callback: any) {
  if (typeof options === "object") {
    options.agent = options.agent ?? agent;
  }
  return originalRequest.call(this, options, callback);
};