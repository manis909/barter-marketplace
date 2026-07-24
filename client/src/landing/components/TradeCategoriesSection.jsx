import { motion } from 'framer-motion';
import { BookOpen, Laptop, Music, Gamepad2, Shirt, Dumbbell, Home, Sparkles, Palette, Backpack } from 'lucide-react';

const CATEGORIES = [
  { title: 'Books & Textbooks', desc: 'Course guides, novels, & exam prep', icon: BookOpen, count: '1,420+ items', color: '#E07A5F' },
  { title: 'Electronics & Tech', desc: 'Laptops, tablets, headphones, & cables', icon: Laptop, count: '2,150+ items', color: '#C8624B' },
  { title: 'Musical Instruments', desc: 'Guitars, keyboards, amps, & pedals', icon: Music, count: '380+ items', color: '#D97706' },
  { title: 'Gaming & Consoles', desc: 'Consoles, controllers, & game discs', icon: Gamepad2, count: '940+ items', color: '#E07A5F' },
  { title: 'Fashion & Apparel', desc: 'Jackets, sneakers, hoodies, & bags', icon: Shirt, count: '1,890+ items', color: '#C8624B' },
  { title: 'Sports & Fitness Gear', desc: 'Rackets, gym weights, bikes, & boards', icon: Dumbbell, count: '620+ items', color: '#D97706' },
  { title: 'Dorm Decor & Home', desc: 'Desk lamps, plants, side tables, & cookware', icon: Home, count: '870+ items', color: '#E07A5F' },
  { title: 'Collectibles & Toys', desc: 'Figures, board games, & vinyl records', icon: Sparkles, count: '450+ items', color: '#C8624B' },
  { title: 'Art & Supplies', desc: 'Paint sets, sketchbooks, & easel stands', icon: Palette, count: '310+ items', color: '#D97706' },
  { title: 'College Essentials', desc: 'Mini fridges, microwaves, & storage bins', icon: Backpack, count: '1,100+ items', color: '#E07A5F' },
];

export default function TradeCategoriesSection() {
  return (
    <section id="trade-categories" className="lp-section" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
      <div className="lp-container">
        {/* Header */}
        <div className="lp-center" style={{ marginBottom: 65 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="lp-badge">Endless Possibilities</div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-heading-md"
          >
            What Can You <span className="lp-gradient-text">Trade?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lp-subtext"
          >
            From last semester’s textbooks to dorm accessories—almost any useful item has trade value on campus.
          </motion.p>
        </div>

        {/* 10 Category Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 20,
          }}
        >
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
                className="lp-glass-card"
                style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: 'rgba(224, 122, 95, 0.09)',
                      border: '1px solid rgba(224, 122, 95, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Icon size={22} color={cat.color} />
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#1C1917' }}>
                    {cat.title}
                  </h3>

                  <p style={{ fontSize: 12.5, color: '#57534E', lineHeight: 1.5, margin: '0 0 14px' }}>
                    {cat.desc}
                  </p>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, letterSpacing: '0.03em' }}>
                  {cat.count}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
