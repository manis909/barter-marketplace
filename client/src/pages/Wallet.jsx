import walletBanner from "../assets/wallet.png";

export default function Wallet() {
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "24px",
      }}
    >
      <img
        src={walletBanner}
        alt="Wallet"
        style={{
          width: "100%",
          borderRadius: "24px",
          display: "block",
          marginBottom: "32px",
          boxShadow: "0 20px 50px rgba(0,0,0,.08)"
        }}
      />

      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
          border: "1px solid rgba(224,122,95,.15)"
        }}
      >
        <h1
          style={{
            marginBottom: "12px",
            fontSize: "32px"
          }}
        >
          Wallet
        </h1>

        <p
          style={{
            color: "#666",
            fontSize: "16px",
            lineHeight: "1.7"
          }}
        >
          Your wallet will help you securely manage credits,
          refunds, trade rewards, and future marketplace payments.
        </p>

        <button
          style={{
            marginTop: "30px",
            padding: "14px 30px",
            border: "none",
            borderRadius: "14px",
            background: "#E07A5F",
            color: "white",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
}