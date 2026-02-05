import { Link } from 'react-router-dom';
import { Shield, Zap, BarChart3, FileText, Camera, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';

export default function Landing() {
  const features = [
    {
      icon: Shield,
      title: 'AI-Powered Detection',
      description: 'Advanced deep learning models analyze media for deepfake indicators',
    },
    {
      icon: Zap,
      title: 'Real-Time Analysis',
      description: 'Get instant results with our fast detection pipeline',
    },
    {
      icon: BarChart3,
      title: 'Trust Score',
      description: 'Clear 0-100 trust score with detailed explanations',
    },
    {
      icon: FileText,
      title: 'Detailed Reports',
      description: 'Generate tamper-proof PDF reports for evidence',
    },
    {
      icon: Camera,
      title: 'Live Monitoring',
      description: 'Real-time deepfake detection from camera feed',
    },
    {
      icon: TrendingUp,
      title: 'Explainable AI',
      description: 'Visual heatmaps show exactly where anomalies are detected',
    },
  ];

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="pt-20 pb-32 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">
              MediaGuardX
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-4">
              AI-Powered Deepfake Detection Platform
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
              Protect yourself from synthetic media with cutting-edge AI technology.
              Detect deepfakes in images, videos, and audio with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold text-lg transition-colors"
              >
                Try Demo
              </Link>
              <Link
                to="/register"
                className="px-8 py-4 glass border border-primary-600/50 hover:bg-primary-600/10 rounded-lg font-semibold text-lg transition-colors"
              >
                Generate Report
              </Link>
            </div>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="py-20 px-4 bg-dark-800/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-200">
              The Deepfake Threat
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass rounded-xl p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">99%</div>
                <p className="text-gray-300">
                  of people can't detect deepfakes by eye
                </p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-4xl font-bold text-amber-400 mb-2">900%</div>
                <p className="text-gray-300">
                  increase in deepfake content since 2019
                </p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-4xl font-bold text-primary-400 mb-2">$78B</div>
                <p className="text-gray-300">
                  estimated financial fraud from deepfakes
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-200">
              Powerful Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="glass rounded-xl p-6 hover:bg-dark-800/70 transition-colors">
                    <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-200 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Architecture Diagram */}
        <section className="py-20 px-4 bg-dark-800/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-200">
              System Architecture
            </h2>
            <div className="glass rounded-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="border-2 border-primary-600/50 rounded-lg p-4 bg-dark-800/50">
                  <div className="font-semibold text-primary-400 mb-2">Input Layer</div>
                  <div className="text-sm text-gray-400">Media Upload</div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-2xl text-gray-500">→</div>
                </div>
                <div className="border-2 border-primary-600/50 rounded-lg p-4 bg-dark-800/50">
                  <div className="font-semibold text-primary-400 mb-2">Processing</div>
                  <div className="text-sm text-gray-400">AI Analysis</div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-2xl text-gray-500">→</div>
                </div>
                <div className="border-2 border-primary-600/50 rounded-lg p-4 bg-dark-800/50">
                  <div className="font-semibold text-primary-400 mb-2">Detection</div>
                  <div className="text-sm text-gray-400">Trust Score</div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-2xl text-gray-500">→</div>
                </div>
                <div className="border-2 border-primary-600/50 rounded-lg p-4 bg-dark-800/50">
                  <div className="font-semibold text-primary-400 mb-2">Output</div>
                  <div className="text-sm text-gray-400">Report & Heatmap</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-gray-200">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Join thousands of users protecting themselves from deepfake threats
            </p>
            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold text-lg transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}

