import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Repeat, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="lp-section" style={{ paddingTop: 165, paddingBottom: 85, textAlign: 'center' }}>
      <div className="lp-container">
        {/* Sustainable Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'inline-block' }}
        >
          <div className="lp-badge">
            <Leaf size={14} color="#E07A5F" />
            <span>Sustainable Campus Trading</span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lp-heading-lg"
          style={{ maxWidth: 920, margin: '0 auto 24px' }}
        >
          Give Every Item a Second Life.<br />
          <span className="lp-gradient-text">Trade Without Cash.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lp-subtext"
          style={{ margin: '0 auto 42px' }}
        >
          The peer-to-peer campus exchange built for trust and sustainability. Swap textbooks, dorm gear, tech, and creative supplies directly with verified peers nearby.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 65 }}
        >
          <Link to="/signup" className="lp-btn-primary">
            <span>Start Trading Free</span>
            <ArrowRight size={18} />
          </Link>

          <Link to="/explore" className="lp-btn-secondary">
            <span>Explore Marketplace</span>
          </Link>
        </motion.div>

        {/* Apple-Style Minimal Light Liquid Glass Trade Match Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          style={{
            maxWidth: 780,
            margin: '0 auto',
            position: 'relative',
          }}
        >
          {/* Subtle Warm Background Glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 480,
              height: 240,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(224, 122, 95, 0.12) 0%, transparent 70%)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(224, 122, 95, 0.18)',
              borderRadius: 28,
              padding: '32px 36px',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 20px 60px rgba(180, 140, 120, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            }}
          >
            {/* Header pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#57534E', fontWeight: 600 }}>
                <ShieldCheck size={16} color="#E07A5F" />
                <span>Verified Campus Exchange</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(224, 122, 95, 0.1)',
                  border: '1px solid rgba(224, 122, 95, 0.25)',
                  color: '#C8624B',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={13} color="#C8624B" />
                <span>Trade Completed</span>
              </div>
            </div>

            {/* Trade Exchange Items Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 20,
              }}
            >
              {/* Item 1 */}
              <div
                style={{
                  background: 'rgba(250, 246, 240, 0.7)',
                  border: '1px solid rgba(224, 122, 95, 0.12)',
                  borderRadius: 18,
                  padding: '18px 20px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 11, color: '#57534E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Offered Item
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1917' }}>
                  Hardcover Travel Guides
                </div>
                <div style={{ fontSize: 12, color: '#E07A5F', fontWeight: 600, marginTop: 4 }}>
                  Category: Books
                </div>
              </div>

              {/* Exchange Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E07A5F 0%, #C8624B 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 20px rgba(224, 122, 95, 0.3)',
                }}
              >
                <Repeat size={20} color="#FFFFFF" />
              </div>

              {/* Item 2 */}
              <div
                style={{
                  background: 'rgba(250, 246, 240, 0.7)',
                  border: '1px solid rgba(224, 122, 95, 0.12)',
                  borderRadius: 18,
                  padding: '18px 20px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 11, color: '#57534E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Requested Item
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1917' }}>
                  Wireless Headphones
                </div>
                <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginTop: 4 }}>
                  Category: Electronics
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
