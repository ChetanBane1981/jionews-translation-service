import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Shield, Sliders, Save } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({
    // Approval Thresholds
    credibilityThreshold: 70,
    autoPublishThreshold: 80,
    fakeRiskThreshold: 'medium',

    // Agent Configuration
    feedPollInterval: 60,
    maxConcurrentAgents: 10,

    // Notifications
    breakingNewsAlerts: true,
    approvalQueueAlerts: true,
    systemHealthAlerts: true,
    emailNotifications: false,

    // Languages
    enabledLanguages: ['en', 'hi', 'ta', 'te'],

    // Advanced
    logLevel: 'info',
    enableMonitoring: true,
    autoRetry: true
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In production, send to API
    console.log('Saving settings:', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure autonomous newsroom parameters</p>
      </div>

      {/* Approval Thresholds */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Approval Thresholds</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credibility Threshold ({settings.credibilityThreshold}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.credibilityThreshold}
              onChange={(e) => setSettings({...settings, credibilityThreshold: Number(e.target.value)})}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Articles below this credibility score require human approval
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-Publish Threshold ({settings.autoPublishThreshold}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.autoPublishThreshold}
              onChange={(e) => setSettings({...settings, autoPublishThreshold: Number(e.target.value)})}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Articles above this score are auto-published without approval
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fake Risk Threshold
            </label>
            <select
              value={settings.fakeRiskThreshold}
              onChange={(e) => setSettings({...settings, fakeRiskThreshold: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Articles with higher risk require approval
            </p>
          </div>
        </div>
      </div>

      {/* Agent Configuration */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Agent Configuration</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feed Poll Interval (seconds)
            </label>
            <input
              type="number"
              value={settings.feedPollInterval}
              onChange={(e) => setSettings({...settings, feedPollInterval: Number(e.target.value)})}
              className="w-full border rounded-lg px-3 py-2"
              min="10"
              max="300"
            />
            <p className="text-xs text-gray-500 mt-1">
              How often agents check for new news
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Concurrent Agents
            </label>
            <input
              type="number"
              value={settings.maxConcurrentAgents}
              onChange={(e) => setSettings({...settings, maxConcurrentAgents: Number(e.target.value)})}
              className="w-full border rounded-lg px-3 py-2"
              min="1"
              max="50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of agents running simultaneously
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Auto Retry</div>
              <div className="text-sm text-gray-600">Automatically retry failed tasks</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoRetry}
              onChange={(e) => setSettings({...settings, autoRetry: e.target.checked})}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Breaking News Alerts</div>
              <div className="text-sm text-gray-600">Get notified of breaking news</div>
            </div>
            <input
              type="checkbox"
              checked={settings.breakingNewsAlerts}
              onChange={(e) => setSettings({...settings, breakingNewsAlerts: e.target.checked})}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Approval Queue Alerts</div>
              <div className="text-sm text-gray-600">Alert when items need approval</div>
            </div>
            <input
              type="checkbox"
              checked={settings.approvalQueueAlerts}
              onChange={(e) => setSettings({...settings, approvalQueueAlerts: e.target.checked})}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">System Health Alerts</div>
              <div className="text-sm text-gray-600">Alert on system issues</div>
            </div>
            <input
              type="checkbox"
              checked={settings.systemHealthAlerts}
              onChange={(e) => setSettings({...settings, systemHealthAlerts: e.target.checked})}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-gray-600">Receive email alerts</div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Languages */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Language Support</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'or'].map(lang => (
            <label key={lang} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={settings.enabledLanguages.includes(lang)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSettings({...settings, enabledLanguages: [...settings.enabledLanguages, lang]})
                  } else {
                    setSettings({...settings, enabledLanguages: settings.enabledLanguages.filter(l => l !== lang)})
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium uppercase">{lang}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Advanced Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Level
            </label>
            <select
              value={settings.logLevel}
              onChange={(e) => setSettings({...settings, logLevel: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Enable Monitoring</div>
              <div className="text-sm text-gray-600">Track system performance</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableMonitoring}
              onChange={(e) => setSettings({...settings, enableMonitoring: e.target.checked})}
              className="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Settings saved!</span>
        )}
        <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  )
}
