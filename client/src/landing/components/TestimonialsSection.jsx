import { motion } from 'framer-motion';
import { Star, Sparkles, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Maya Lin',
    college: 'Stanford University',
    role: 'Computer Science Major',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    quote: 'Textbooks cost an absolute fortune. Barter allowed me to swap last semester’s calculus books directly for organic chemistry guides. Zero dollars spent.',
    rating: 5,
  },
  {
    name: 'Marcus Chen',
    college: 'UC Berkeley',
    role: 'Economics Major',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    quote: 'I swapped my unused PS4 for a Sony noise-canceling headset right on campus. It feels great keeping good electronics out of landfills while helping out a peer.',
    rating: 5,
  },
  {
    name: 'Sophia Patel',
    college: 'NYU Stern',
    role: 'Business & Design',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    quote: 'The trade status tracking and verification gave me total peace of mind. Met up right at the Bobst Library student center and completed the exchange.',
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="lp-section">
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
              <span>Campus Stories</span>
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
            Real experiences from students giving items a second life across top campuses.
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
                      <Star key={i} size={15} color="#D97706" fill="#D97706" />
                    ))}
                  </div>
                  <Quote size={24} color="rgba(224, 122, 95, 0.3)" />
                </div>

                <p style={{ fontSize: 14.5, color: '#1C1917', lineHeight: 1.65, marginBottom: 24, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
              </div>

              {/* User Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src={t.image}
                  alt={t.name}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(224, 122, 95, 0.3)',
                  }}
                />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1917' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#E07A5F', fontWeight: 600 }}>
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
