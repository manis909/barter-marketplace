import { motion } from 'framer-motion';
import { Coins, MapPin, ShieldCheck, Zap, Lock, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: Coins,
    title: 'No Money Needed',
    description: 'Eliminate cash friction. Exchange items directly based on mutual utility and estimated value without spending a single dollar.',
    color: '#A855F7',
    badge: '100% Cash-Free',
  },
  {
    icon: MapPin,
    title: 'Trade With Students Nearby',
    description: 'Hyper-local campus trades. Meet up safely at campus libraries, student centers, or dorms for instant zero-shipping handoffs.',
    color: '#3B82F6',
    badge: 'Campus Verified',
  },
  {
    icon: ShieldCheck,
    title: 'Safe Campus Marketplace',
    description: 'Built exclusively for verified student communities. Transparent user profiles, rating histories, and atomic trade offers.',
    color: '#10B981',
    badge: 'Bank-Grade Safety',
  },
];

export default function WhyBarterSection() {
  return (
    <section id="why-barter" className="lp-section" style={{ position: 'relative' }}>
      <div className="lp-container">
        {/* Header */}
        <div className="lp-center" style={{ marginBottom: 60 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="lp-badge">
              <Sparkles size={14} color="#C084FC" />
              <span>Built Differently</span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-heading-md"
          >
            Why Students Choose <span className="lp-gradient-text">Barter</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lp-subtext"
          >
            Designed from the ground up to solve the friction of traditional buy & sell apps.
          </motion.p>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="lp-glass-card"
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                {/* Glow accent top right */}
                <div
                  style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: feat.color,
                    opacity: 0.08,
                    filter: 'blur(30px)',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: `rgba(${feat.color === '#A855F7' ? '168, 85, 247' : feat.color === '#3B82F6' ? '59, 130, 246' : '16, 185, 129'}, 0.12)`,
                      border: `1px solid rgba(${feat.color === '#A855F7' ? '168, 85, 247' : feat.color === '#3B82F6' ? '59, 130, 246' : '16, 185, 129'}, 0.3)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={26} color={feat.color} />
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: feat.color,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {feat.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#F9FAFB' }}>
                  {feat.title}
                </h3>

                <p style={{ fontSize: 15, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>
                  {feat.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
