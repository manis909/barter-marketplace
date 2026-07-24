import { motion } from 'framer-motion';
import { Star, Sparkles, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Maya Lin',
    college: 'Stanford University',
    role: 'Computer Science Major',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    quote: 'Swapped my unused PS4 for a Sony noise-canceling headset in less than 24 hours right on campus! No money spent, super smooth.',
    rating: 5,
  },
  {
    name: 'Marcus Chen',
    college: 'UC Berkeley',
    role: 'Economics Major',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    quote: 'Textbooks cost an absolute fortune. Barter allowed me to swap last semester calculus books directly for organic chemistry guides.',
    rating: 5,
  },
  {
    name: 'Sophia Patel',
    college: 'NYU Stern',
    role: 'Business & Design',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    quote: 'The verification system gave me total peace of mind. Met up right at the Bobst Library student center and completed the trade.',
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="lp-section">
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
              <span>Loved By Students</span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-heading-md"
          >
            What Your Peers Are <span className="lp-gradient-text">Saying</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lp-subtext"
          >
            Real stories from verified students trading across top campuses.
          </motion.p>
        </div>

        {/* Testimonials Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}
        >
          {TESTIMONIALS.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="lp-glass-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                {/* Rating & Quote Icon */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={16} color="#F59E0B" fill="#F59E0B" />
                    ))}
                  </div>
                  <Quote size={24} color="rgba(168, 85, 247, 0.3)" />
                </div>

                <p style={{ fontSize: 15, color: '#F9FAFB', lineHeight: 1.6, marginBottom: 24, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
              </div>

              {/* User Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src={t.image}
                  alt={t.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(168, 85, 247, 0.4)',
                  }}
                />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F9FAFB' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#A855F7', fontWeight: 600 }}>
                    {t.college} • {t.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
