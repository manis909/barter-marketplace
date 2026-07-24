import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function FinalCTASection() {
  return (
    <section className="lp-section" style={{ padding: '80px 0 110px' }}>
      <div className="lp-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            borderRadius: 28,
            background: 'linear-gradient(135deg, rgba(224, 122, 95, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
            border: '1px solid rgba(224, 122, 95, 0.18)',
            padding: '55px 32px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 16px 45px rgba(180, 140, 120, 0.08)',
          }}
        >
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 className="lp-heading-md" style={{ marginBottom: 14 }}>
              Ready to Start <span className="lp-gradient-text">Trading?</span>
            </h2>

            <p className="lp-subtext" style={{ margin: '0 auto 28px' }}>
              Create your account in under a minute and start swapping items with students on your campus.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" className="lp-btn-primary" style={{ padding: '14px 32px' }}>
                <span>Create Free Account</span>
                <ArrowRight size={17} />
              </Link>

              <Link to="/explore" className="lp-btn-secondary" style={{ padding: '14px 32px' }}>
                <span>Browse Marketplace</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
