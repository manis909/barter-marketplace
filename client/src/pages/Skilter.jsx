import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import api from '../services/api';
import BookSkillModal from '../components/BookSkillModal';
import './MySkillBookings.css'; // Reuse design tokens

export default function Skilter() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    // Attempt to fetch skill listings if Member 2's endpoint is active
    api.get('/skills')
      .then(res => setSkills(res.data.skills || []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bookings-container">
      {/* Hero Section */}
      <header className="bookings-hero">
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ background: '#c6e930', color: '#0f3d2e', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Skilter Platform
            </span>
            <h1 className="bookings-hero-title">Campus Skill Exchange</h1>
            <p className="bookings-hero-sub">
              Teach what you know, learn what you need. Exchange skills and book tutoring sessions with fellow students.
            </p>
          </div>

          <Link
            to="/skill-bookings"
            className="bookings-empty-btn"
            style={{ background: '#c6e930', color: '#0f3d2e', fontSize: '0.95rem' }}
          >
            📋 My Skill Bookings
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="bookings-main">
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', color: '#0f3d2e', marginBottom: '20px' }}>
          Available Skill Sessions
        </h2>

        {loading ? (
          <div className="bookings-grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="booking-card" style={{ height: '180px', background: '#e5e2d8', opacity: 0.6 }} />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="bookings-empty">
            <div className="bookings-empty-icon">💡</div>
            <h3 className="bookings-empty-title">Discover & Teach Skills</h3>
            <p className="bookings-empty-desc">
              Browse campus skills or manage your active bookings using the button above.
            </p>
            <Link to="/skill-bookings" className="bookings-empty-btn">
              View My Bookings
            </Link>
          </div>
        ) : (
          <div className="bookings-grid">
            {skills.map(skill => (
              <div key={skill.id} className="booking-card">
                <div>
                  <div className="booking-card-top">
                    <span className="booking-role-badge role-teacher">
                      {skill.price_type || 'Free'}
                    </span>
                    <span className="booking-skill-cat">{skill.category || 'General'}</span>
                  </div>
                  <h3 className="booking-skill-title">{skill.skill_name}</h3>
                  <p style={{ fontSize: '0.88rem', color: '#647167', marginBottom: '16px' }}>
                    {skill.description}
                  </p>
                </div>

                <button
                  className="booking-btn-accept"
                  style={{ width: '100%' }}
                  onClick={() => setSelectedSkill(skill)}
                >
                  Book Session
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {selectedSkill && (
        <BookSkillModal
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onSuccess={() => setSelectedSkill(null)}
        />
      )}

      <Footer />
    </div>
  );
}
