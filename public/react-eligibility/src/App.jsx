import React from 'react'
import EligibilityChecker from './components/EligibilityChecker'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Universal Eligibility Checker
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time insurance eligibility verification with dynamic field requirements
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-blue-600">
                Moonlit PLLC
              </div>
              <div className="text-xs text-gray-500">
                Office Ally Integration
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EligibilityChecker />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              Powered by Office Ally X12 270/271 Real-Time Eligibility
            </p>
            <p className="mt-1">
              Average response time: &lt;2 seconds
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
