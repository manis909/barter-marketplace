import './LandingPage.css';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import WhyBarterSection from './components/WhyBarterSection';
import HowItWorksSection from './components/HowItWorksSection';
import MarketplaceShowcaseSection from './components/MarketplaceShowcaseSection';
import CommunityStatsSection from './components/CommunityStatsSection';
import TestimonialsSection from './components/TestimonialsSection';
import FinalCTASection from './components/FinalCTASection';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* Background Ambient Glow Orbs */}
      <div className="lp-ambient-orb lp-ambient-orb-1" />
      <div className="lp-ambient-orb lp-ambient-orb-2" />
      <div className="lp-ambient-orb lp-ambient-orb-3" />

      {/* Navigation */}
      <LandingNavbar />

      {/* Main Content */}
      <main>
        <HeroSection />
        <WhyBarterSection />
        <HowItWorksSection />
        <MarketplaceShowcaseSection />
        <CommunityStatsSection />
        <TestimonialsSection />
        <FinalCTASection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
