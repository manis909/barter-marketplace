import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function FinalCTASection() {
  return (
    <section className="lp-section" style={{ paddingBottom: 140 }}>
      <div className="lp-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 36,
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.05) 50%, rgba(59, 130, 246, 0.1) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            padding: '80px 40px',
            textAlign: 'center',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Ambient Glow Center */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
              filter: 'blur(80px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
            <div className="lp-badge" style={{ margin: '0 auto 24px' }}>
              <Sparkles size={14} color="#C084FC" />
              <span>Join Your Campus Marketplace</span>
            </div>

            <h2 className="lp-heading-lg" style={{ marginBottom: 20 }}>
              Ready to Upgrade <br />
              <span className="lp-gradient-text">Your Campus Swaps?</span>
            </h2>

            <p className="lp-subtext" style={{ margin: '0 auto 36px' }}>
              Join thousands of students trading tech, textbooks, and gear. Create your account in under 60 seconds and start trading today.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" className="lp-btn-primary" style={{ padding: '16px 36px', fontSize: 16 }}>
                <span>Create Free Account</span>
                <ArrowRight size={18} />
              </Link>

              <Link to="/explore" className="lp-btn-secondary" style={{ padding: '16px 36px', fontSize: 16 }}>
                <span>Explore Marketplace</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
