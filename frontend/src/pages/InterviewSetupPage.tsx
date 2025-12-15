import { useState } from 'react';

type InterviewSetupPageProps = {
  onStartInterview: (selectedAvatar: string, topic: string) => void;
};

type AvatarType = {
  id: string;
  name: string;
  role: string;
  gradient: string;
  icon: React.ReactNode;
  voiceId: string;
};

const avatars: AvatarType[] = [
  {
    id: 'agent_0001kbcdpen5edxbpvyp7z50m14s',
    name: 'HR Interviewer',
    role: 'Human Resources',
    gradient: 'from-pink-400 to-rose-500',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    icon: (
      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'agent_9901kbccvfcqe38absbdkg3wvxwg',
    name: 'Academic Interviewer',
    role: 'Academic Specialist',
    gradient: 'from-blue-400 to-cyan-500',
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
    icon: (
      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    id: 'agent_3101kbcdy5eyfbqvnj80e1ss1daw',
    name: 'Business Interviewer',
    role: 'Business Analyst',
    gradient: 'from-emerald-400 to-teal-500',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    icon: (
      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
      </svg>
    ),
  },
];

const InterviewSetupPage = ({ onStartInterview }: InterviewSetupPageProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [interviewTopic, setInterviewTopic] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleStartInterview = () => {
    if (selectedAvatar && (interviewTopic.trim() || attachedFile)) {
      onStartInterview(selectedAvatar, interviewTopic);
    }
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    // Voice recording logic will be implemented
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Interview Panel
          </h1>
          <p className="text-xl text-gray-600">
            Select an interviewer and provide your interview details
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Avatar Selection */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Interviewer</h2>
            
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                  selectedAvatar === avatar.id
                    ? 'ring-4 ring-blue-500 shadow-2xl scale-102'
                    : 'shadow-lg hover:shadow-xl'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 bg-gradient-to-br ${avatar.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {avatar.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {avatar.name}
                    </h3>
                    <p className="text-blue-600 font-semibold text-sm">
                      {avatar.role}
                    </p>
                  </div>
                  {selectedAvatar === avatar.id && (
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
                      ✓ Selected
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right Side - Input Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Interview Details
            </h2>

            {/* Text Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Interview Topic / Position
              </label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                rows={5}
                placeholder="e.g., Software Engineer position, Marketing Manager role, Data Science interview..."
                value={interviewTopic}
                onChange={(e) => setInterviewTopic(e.target.value)}
              />
            </div>

            {/* File Attachment */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Attach Resume or Documents (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileAttach}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-3 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-gray-600">
                    {attachedFile ? attachedFile.name : 'Click to attach file'}
                  </span>
                </label>
              </div>
            </div>

            {/* Voice Recording */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Record Voice Message (Optional)
              </label>
              <button
                onClick={handleVoiceRecord}
                className={`flex items-center justify-center gap-3 w-full px-4 py-3 border-2 rounded-xl transition-all ${
                  isRecording
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-gray-300 hover:border-blue-500 text-gray-600'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </span>
              </button>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartInterview}
              disabled={!selectedAvatar || (!interviewTopic.trim() && !attachedFile)}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              Start Interview
            </button>

            {/* Hint Text */}
            <p className="text-center text-sm text-gray-500 mt-4">
              {!selectedAvatar && "Please select an interviewer above"}
              {selectedAvatar && !interviewTopic.trim() && !attachedFile && "Please provide interview details"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetupPage;