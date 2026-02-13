import LandingLayout from '@/components/layouts/LandingLayout';
import HeroSection from '@/components/landing/HeroSection';
import StatsBanner from '@/components/landing/StatsBanner';
import HowItWorks from '@/components/landing/HowItWorks';
import FeatureShowcase from '@/components/landing/FeatureShowcase';
import CTASection from '@/components/landing/CTASection';

export default function Landing(): JSX.Element {
  return (
    <LandingLayout>
      <HeroSection />
      <StatsBanner />
      <HowItWorks />
      <FeatureShowcase />
      <CTASection />
    </LandingLayout>
  );
}
