// app/(public)/loading.tsx — Loading para /auth y /catalogo

export default function PublicLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid #e5e7eb", borderTopColor: "#111827",
          animation: "devhub-spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes devhub-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
