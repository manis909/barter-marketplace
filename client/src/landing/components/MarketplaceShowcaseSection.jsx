import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SHOWCASE_ITEMS = [
  {
    id: 's1',
    title: 'Sony WH-1000XM4 Headphones',
    category: 'Electronics',
    condition: 'Like New',
    estimatedValue: '$210',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    campus: 'Stanford',
  },
  {
    id: 's2',
    title: 'Apple iPad Air M1 (64GB)',
    category: 'Electronics',
    condition: 'Excellent',
    estimatedValue: '$420',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80',
    campus: 'UC Berkeley',
  },
  {
    id: 's3',
    title: 'Keychron K2 Mechanical Keyboard',
    category: 'Tech Accessories',
    condition: 'Good',
    estimatedValue: '$75',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80',
    campus: 'MIT',
  },
  {
    id: 's4',
    title: 'Fujifilm X-T30 Mirrorless Camera',
    category: 'Photography',
    condition: 'Like New',
    estimatedValue: '$780',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80',
    campus: 'NYU',
  },
  {
    id: 's5',
    title: 'Calculus & Linear Algebra Texts',
    category: 'Textbooks',
    condition: 'Good',
    estimatedValue: '$90',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80',
    campus: 'Harvard',
  },
];

export default function MarketplaceShowcaseSection() {
  const [liked, setLiked] = useState({});

  function toggleLike(id, e) {
    e.stopPropagation();
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section id="marketplace" className="lp-section">
      <div className="lp-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 50, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="lp-badge">
              <Sparkles size={14} color="#C084FC" />
              <span>Live Campus Inventory</span>
            </div>
            <h2 className="lp-heading-md" style={{ margin: 0 }}>
              Trending Items <span className="lp-gradient-text">Ready to Swap</span>
            </h2>
          </div>

          <Link to="/explore" className="lp-btn-secondary" style={{ padding: '10px 22px', fontSize: 14 }}>
            <span>View Full Marketplace</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Netflix-Style Horizontal Scroll Container */}
        <div className="lp-scroll-row">
          {SHOWCASE_ITEMS.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              style={{
                flex: '0 0 280px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                backdropFilter: 'blur(12px)',
                cursor: 'pointer',
              }}
              whileHover={{ y: -8, borderColor: 'rgba(168, 85, 247, 0.4)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            >
              {/* Image Header with Heart Badge */}
              <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img
                  src={item.image}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'rgba(9, 13, 22, 0.75)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#C084FC',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                  }}
                >
                  {item.condition}
                </div>

                <button
                  type="button"
                  onClick={e => toggleLike(item.id, e)}
                  aria-label="Add to wishlist"
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(9, 13, 22, 0.65)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <Heart
                    size={16}
                    color={liked[item.id] ? '#EC4899' : '#FFFFFF'}
                    fill={liked[item.id] ? '#EC4899' : 'none'}
                  />
                </button>
              </div>

              {/* Item Info */}
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.category} • {item.campus}
                </div>

                <h4
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#F9FAFB',
                    margin: '6px 0 12px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>Est. Value</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>
                      {item.estimatedValue}
                    </div>
                  </div>

                  <Link
                    to="/signup"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#A855F7',
                      textDecoration: 'none',
                    }}
                  >
                    Propose Trade →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
