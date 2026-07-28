import walletBanner from "../assets/wallet.png";

export default function Wallet() {
  return (
    <div
      style={{
        background: "#fff",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
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
            marginBottom: "24px",
            
        }}
        />

        {/* Rest of your content */}
      </div>
    </div>
  );
}