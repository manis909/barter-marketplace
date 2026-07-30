import Footer from '../components/Footer'

export default function Skilter() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', backgroundColor: '#F8FAFC' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Skilter
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#64748B', maxWidth: '540px', lineHeight: 1.6, margin: 0 }}>
          A platform where students can showcase and monetize their skills. Coming Soon.
        </p>
      </main>
      <Footer />
    </div>
  )
}
