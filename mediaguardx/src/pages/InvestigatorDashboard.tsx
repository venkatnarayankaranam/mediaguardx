import { useState } from 'react';
import Card from '../components/Card';
import FileUploader from '../components/FileUploader';
import { FileText, Upload, Calendar, Plus } from 'lucide-react';

export default function InvestigatorDashboard() {
  const [showNewCase, setShowNewCase] = useState(false);
  const [cases] = useState([
    {
      id: '1',
      title: 'Fraud Case #2024-001',
      description: 'Suspected deepfake video evidence',
      evidenceCount: 3,
      createdAt: '2024-01-15',
      status: 'active',
    },
    {
      id: '2',
      title: 'Identity Theft Investigation',
      description: 'Audio deepfake analysis',
      evidenceCount: 5,
      createdAt: '2024-01-10',
      status: 'closed',
    },
  ]);

  const handleFileSelect = (file: File) => {
    console.log('Evidence file selected:', file);
    // In production, this would upload and attach to case
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-200 mb-2">Investigator Dashboard</h1>
          <p className="text-gray-400">Manage cases and evidence</p>
        </div>
        <button
          onClick={() => setShowNewCase(!showNewCase)}
          className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Case</span>
        </button>
      </div>

      {showNewCase && (
        <Card>
          <h2 className="text-xl font-semibold text-gray-200 mb-4">Create New Case</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Case Title
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-gray-300 focus:outline-none focus:border-primary-500"
                placeholder="Enter case title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-gray-300 focus:outline-none focus:border-primary-500"
                placeholder="Enter case description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Evidence
              </label>
              <FileUploader onFileSelect={handleFileSelect} />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
              >
                Create Case
              </button>
              <button
                type="button"
                onClick={() => setShowNewCase(false)}
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Cases List */}
      <div className="grid md:grid-cols-2 gap-6">
        {cases.map((caseItem) => (
          <Card key={caseItem.id} hover>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-200 mb-1">
                  {caseItem.title}
                </h3>
                <p className="text-sm text-gray-400 mb-3">{caseItem.description}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  caseItem.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {caseItem.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4" />
                  <span>{caseItem.evidenceCount} evidence</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{caseItem.createdAt}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-sm">
                View Case
              </button>
              <button className="flex-1 px-4 py-2 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg transition-colors text-sm">
                Export PDF
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Timeline Visualization Placeholder */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Case Timeline</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-dark-700"></div>
          <div className="space-y-6 pl-12">
            {[
              { date: '2024-01-15', event: 'Case created', type: 'created' },
              { date: '2024-01-16', event: 'Evidence #1 uploaded', type: 'evidence' },
              { date: '2024-01-17', event: 'Evidence #2 uploaded', type: 'evidence' },
              { date: '2024-01-18', event: 'Analysis completed', type: 'analysis' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="absolute -left-8 top-1 w-4 h-4 bg-primary-600 rounded-full border-2 border-dark-900"></div>
                <div>
                  <p className="text-sm text-gray-400">{item.date}</p>
                  <p className="text-gray-300">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

