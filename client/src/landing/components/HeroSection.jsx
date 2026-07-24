import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Repeat, ShieldCheck } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="lp-section" style={{ paddingTop: 150, paddingBottom: 60, textAlign: 'center' }}>
      <div className="lp-container">
        {/* Honest Startup Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'inline-block' }}
        >
          <div className="lp-badge">
            <span>Peer-to-Peer Campus Marketplace</span>
          </div>
        </motion.div>

        {/* Honest Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lp-heading-lg"
          style={{ maxWidth: 840, margin: '0 auto 20px' }}
        >
          Cashless Campus Trading <br />
          <span className="lp-gradient-text">Made Simple.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lp-subtext"
          style={{ margin: '0 auto 36px' }}
        >
          Swap textbooks, tech, dorm gear, and everyday items directly with verified peers on your campus. No money needed.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 55 }}
        >
          <Link to="/signup" className="lp-btn-primary">
            <span>Start Trading</span>
            <ArrowRight size={17} />
          </Link>

          <Link to="/explore" className="lp-btn-secondary">
            <span>Explore Items</span>
          </Link>
        </motion.div>

        {/* Clean Trade Match Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            maxWidth: 720,
            margin: '0 auto',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(224, 122, 95, 0.18)',
              borderRadius: 24,
              padding: '28px 32px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 45px rgba(180, 140, 120, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                fontSize: 12.5,
                color: '#57534E',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={15} color="#E07A5F" />
                <span>Verified Peer Exchange</span>
              </div>
              <span style={{ color: '#E07A5F', fontWeight: 700 }}>Active Trade Proposal</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  background: 'rgba(250, 246, 240, 0.8)',
                  border: '1px solid rgba(224, 122, 95, 0.12)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 11, color: '#78716C', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                  Offered
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1917' }}>
                  Calculus 4th Edition
                </div>
                <div style={{ fontSize: 12, color: '#E07A5F', fontWeight: 600, marginTop: 2 }}>
                  Books
                </div>
              </div>

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E07A5F 0%, #C8624B 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(224, 122, 95, 0.25)',
                }}
              >
                <Repeat size={18} color="#FFFFFF" />
              </div>

              <div
                style={{
                  background: 'rgba(250, 246, 240, 0.8)',
                  border: '1px solid rgba(224, 122, 95, 0.12)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 11, color: '#78716C', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                  Requested
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1917' }}>
                  Wireless Headphones
                </div>
                <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginTop: 2 }}>
                  Electronics
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
