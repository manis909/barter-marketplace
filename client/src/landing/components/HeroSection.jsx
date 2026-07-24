import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Laptop, Headphones, Gamepad2, Camera, BookOpen, Shirt } from 'lucide-react';

const FLOATING_ITEMS = [
  { id: 1, name: 'MacBook Air M2', icon: Laptop, value: '$850', color: '#A855F7', delay: 0, x: -140, y: -40 },
  { id: 2, name: 'Sony WH-1000XM5', icon: Headphones, value: '$220', color: '#3B82F6', delay: 0.5, x: 150, y: -80 },
  { id: 3, name: 'PS5 Digital Edition', icon: Gamepad2, value: '$400', color: '#10B981', delay: 1, x: -180, y: 110 },
  { id: 4, name: 'Canon EOS R6', icon: Camera, value: '$1,200', color: '#F59E0B', delay: 1.5, x: 170, y: 90 },
  { id: 5, name: 'Calculus 4th Ed.', icon: BookOpen, value: '$85', color: '#EC4899', delay: 0.8, x: 0, y: 170 },
  { id: 6, name: 'Nike Jordan 1s', icon: Shirt, value: '$160', color: '#6366F1', delay: 1.2, x: 0, y: -160 },
];

export default function HeroSection() {
  return (
    <section className="lp-section" style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center' }}>
      <div className="lp-container">
        {/* Badge Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'inline-block' }}
        >
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            <Sparkles size={14} color="#C084FC" />
            <span>The #1 Campus Barter Marketplace</span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lp-heading-lg"
          style={{ maxWidth: 900, margin: '0 auto 24px' }}
        >
          Trade Smarter.<br />
          <span className="lp-gradient-text">Own More Without Spending.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lp-subtext"
          style={{ margin: '0 auto 40px' }}
        >
          The zero-cash peer-to-peer exchange for students. Swap electronics, textbooks, dorm gear, and fashion directly with verified peers nearby.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 70 }}
        >
          <Link to="/signup" className="lp-btn-primary">
            <span>Start Trading Free</span>
            <ArrowRight size={18} />
          </Link>

          <Link to="/explore" className="lp-btn-secondary">
            <span>Explore as Guest</span>
          </Link>
        </motion.div>

        {/* Animated Floating Showcase Canvas */}
        <div style={{ position: 'relative', width: '100%', height: 420, margin: '0 auto', maxWidth: 960 }}>
          {/* Ambient Glow Center */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
              filter: 'blur(50px)',
              zIndex: 0,
            }}
          />

          {/* Central Nexus Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              background: 'rgba(17, 24, 39, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: 24,
              padding: '24px 36px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.25)',
              maxWidth: 340,
              width: '90%',
            }}
          >
            <div style={{ fontSize: 13, color: '#A855F7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Direct Campus Swap
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 4px', color: '#F9FAFB' }}>
              No Currency Needed
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>
              Fair valuation matching engine instantly pairs your items.
            </div>
          </motion.div>

          {/* Floating Animated Asset Cards */}
          {FLOATING_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 1,
                  x: item.x,
                  y: [item.y - 8, item.y + 8, item.y - 8],
                }}
                transition={{
                  opacity: { duration: 0.8, delay: item.delay },
                  x: { duration: 0.8, delay: item.delay },
                  y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: item.delay },
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  zIndex: 1,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: 16,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.08, borderColor: item.color }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `rgba(${item.color === '#A855F7' ? '168, 85, 247' : '99, 102, 241'}, 0.15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={item.color} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F9FAFB', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                    Est. Value {item.value}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
