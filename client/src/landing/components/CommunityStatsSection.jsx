import { motion } from 'framer-motion';

const STATS = [
  { label: 'Items Listed', value: '10,000+', color: '#A855F7' },
  { label: 'Trades Completed', value: '2,500+', color: '#6366F1' },
  { label: 'Campuses Active', value: '150+', color: '#3B82F6' },
  { label: 'Student Satisfaction', value: '98%', color: '#10B981' },
];

export default function CommunityStatsSection() {
  return (
    <section className="lp-section" style={{ position: 'relative' }}>
      <div className="lp-container">
        {/* Glow Frame Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: 32,
            padding: '60px 32px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 40,
              textAlign: 'center',
            }}
          >
            {STATS.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
              >
                <div
                  style={{
                    fontSize: 'clamp(2.5rem, 4vw, 3.8rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    marginBottom: 8,
                    background: `linear-gradient(135deg, #FFFFFF 40%, ${stat.color} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
