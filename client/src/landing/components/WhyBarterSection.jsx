import { motion } from 'framer-motion';
import { Leaf, Users, ShieldCheck, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: Leaf,
    title: 'Sustainable & Cashless',
    description: 'Keep quality items in active circulation. Reduce environmental waste and eliminate financial friction by swapping what you have for what you need.',
    color: '#E07A5F',
    badge: 'Eco-Friendly',
  },
  {
    icon: Users,
    title: 'Campus Community Trust',
    description: 'Hyper-local trading exclusive to verified student peers. Meet up conveniently at campus libraries, student centers, or dining halls.',
    color: '#D97706',
    badge: 'Peer-to-Peer',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent Trade Mechanics',
    description: 'Zero guesswork or hidden terms. Clear item condition ratings, atomic offer acceptances, and instant status updates every step of the way.',
    color: '#C8624B',
    badge: 'Bank-Grade Logic',
  },
];

export default function WhyBarterSection() {
  return (
    <section id="why-barter" className="lp-section">
      <div className="lp-container">
        {/* Header */}
        <div className="lp-center" style={{ marginBottom: 65 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="lp-badge">
              <Sparkles size={14} color="#E07A5F" />
              <span>A Thoughtful Approach</span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-heading-md"
          >
            Built for Campus Communities, <br />
            <span className="lp-serif-accent">Not Profit Margins.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lp-subtext"
          >
            Designed to solve the unnecessary cost and environmental burden of traditional buy & sell apps.
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
                      width: 50,
                      height: 50,
                      borderRadius: 15,
                      background: 'rgba(224, 122, 95, 0.1)',
                      border: '1px solid rgba(224, 122, 95, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={24} color={feat.color} />
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: feat.color,
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(224, 122, 95, 0.15)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {feat.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: 21, fontWeight: 700, marginBottom: 12, color: '#1C1917' }}>
                  {feat.title}
                </h3>

                <p style={{ fontSize: 14.5, color: '#57534E', lineHeight: 1.65, margin: 0 }}>
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
