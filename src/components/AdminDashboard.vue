<template>
  <div class="admin-dashboard min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <!-- Header -->
    <div class="bg-gray-900 bg-opacity-50 backdrop-blur-sm border-b border-gray-700 border-opacity-50 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                🏥 CM Program Admin Dashboard
              </h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-300">
              Last updated: {{ lastUpdated }}
            </div>
            <button 
              @click="refreshData"
              :disabled="refreshing"
              class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 flex items-center"
            >
              <svg v-if="refreshing" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-300 truncate">Total Enrolled Patients</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-white">{{ stats.totalPatients }}</div>
                  <div class="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                    <svg class="self-center flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="sr-only">Increased by</span>
                    {{ stats.newPatientsThisWeek }}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-300 truncate">Total Points Awarded</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-white">{{ stats.totalPoints.toLocaleString() }}</div>
                  <div class="ml-2 text-sm font-semibold text-purple-400">
                    +{{ stats.pointsThisWeek }} this week
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-300 truncate">Active Sessions Today</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-white">{{ stats.sessionsToday }}</div>
                  <div class="ml-2 text-sm font-semibold text-gray-400">
                    {{ stats.totalUnitsToday }} H0038 units
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-300 truncate">Revenue (Est.)</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-white">${{ stats.estimatedRevenue.toLocaleString() }}</div>
                  <div class="ml-2 text-sm font-semibold text-green-400">
                    +${{ stats.revenueThisWeek.toLocaleString() }} this week
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Recent Sessions -->
        <div class="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl border border-gray-700 border-opacity-50 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-white">Recent Sessions</h2>
            <select v-model="sessionFilter" class="bg-gray-800 text-white text-sm rounded-lg px-3 py-1 border border-gray-600">
              <option value="all">All Sessions</option>
              <option value="Individual">Individual Only</option>
              <option value="Group">Group Only</option>
              <option value="today">Today Only</option>
            </select>
          </div>
          
          <div class="space-y-4">
            <div 
              v-for="session in filteredSessions" 
              :key="session.id"
              class="session-card bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700 border-opacity-30"
            >
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {{ session.type === 'Individual' ? '1' : session.patientCount }}
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-white">
                      {{ session.type }} Session - {{ session.duration }}
                    </div>
                    <div class="text-sm text-gray-400">
                      {{ session.cpssProvider }} • {{ formatDateTime(session.startTime) }}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-semibold text-green-400">
                    {{ session.h0038Units }} units • ${{ session.estimatedRevenue.toFixed(2) }}
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ session.billingStatus === 'billable' ? '✅ Billable' : '⚠️ Non-billable' }}
                  </div>
                </div>
              </div>
              
              <div v-if="session.patients && session.patients.length > 0" class="mt-2">
                <div class="text-xs text-gray-400 mb-1">Participants:</div>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="patient in session.patients.slice(0, 5)" 
                    :key="patient.id"
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                  >
                    {{ patient.firstName }} {{ patient.lastName.charAt(0) }}.
                  </span>
                  <span v-if="session.patients.length > 5" class="text-xs text-gray-400">
                    +{{ session.patients.length - 5 }} more
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="filteredSessions.length === 0" class="text-center py-8">
            <div class="text-gray-400 text-sm">No sessions found matching your filters.</div>
          </div>
        </div>

        <!-- Quick Actions & Alerts -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl border border-gray-700 border-opacity-50 p-6">
            <h2 class="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div class="space-y-3">
              <button 
                @click="exportReport('weekly')"
                class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm font-medium flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Weekly Report
              </button>
              
              <button 
                @click="exportReport('billing')"
                class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-medium flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                Billing Summary
              </button>
              
              <button 
                @click="showDualEnrollments = true"
                class="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-700 text-sm font-medium flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                Check Dual Enrollments
              </button>
              
              <button 
                @click="showProviderManagement = true"
                class="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 text-sm font-medium flex items-center justify-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                Manage Providers
              </button>
            </div>
          </div>

          <!-- System Alerts -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl border border-gray-700 border-opacity-50 p-6">
            <h2 class="text-lg font-semibold text-white mb-4">System Alerts</h2>
            <div class="space-y-3">
              <div 
                v-for="alert in systemAlerts" 
                :key="alert.id"
                :class="[
                  'p-3 rounded-lg border-l-4',
                  alert.type === 'error' ? 'bg-red-900/20 border-red-500 text-red-200' :
                  alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200' :
                  'bg-blue-900/20 border-blue-500 text-blue-200'
                ]"
              >
                <div class="flex items-start">
                  <div class="flex-shrink-0">
                    <svg v-if="alert.type === 'error'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                    <svg v-else-if="alert.type === 'warning'" class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="ml-3 flex-1">
                    <p class="text-sm font-medium">{{ alert.title }}</p>
                    <p class="mt-1 text-xs opacity-80">{{ alert.message }}</p>
                    <p class="mt-1 text-xs opacity-60">{{ formatTime(alert.timestamp) }}</p>
                  </div>
                  <button 
                    @click="dismissAlert(alert.id)"
                    class="ml-4 flex-shrink-0 text-gray-400 hover:text-white"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div v-if="systemAlerts.length === 0" class="text-center py-4">
                <div class="text-gray-400 text-sm">✅ No active alerts</div>
              </div>
            </div>
          </div>

          <!-- Top Performers -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl border border-gray-700 border-opacity-50 p-6">
            <h2 class="text-lg font-semibold text-white mb-4">Top Performers This Week</h2>
            <div class="space-y-3">
              <div 
                v-for="(performer, index) in topPerformers" 
                :key="performer.id"
                class="flex items-center justify-between p-3 bg-gray-800 bg-opacity-50 rounded-lg"
              >
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-orange-600 text-orange-100' :
                      'bg-gray-600 text-gray-300'
                    ]">
                      {{ index + 1 }}
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-white">{{ performer.name }}</div>
                    <div class="text-xs text-gray-400">{{ performer.role }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-semibold text-purple-400">{{ performer.pointsAwarded }}</div>
                  <div class="text-xs text-gray-400">points awarded</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Dual Enrollments Modal -->
    <div v-if="showDualEnrollments" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Dual Enrollment Detection</h3>
            <button @click="showDualEnrollments = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6">
          <div v-if="dualEnrollments.length === 0" class="text-center py-8">
            <div class="text-gray-500">✅ No duplicate enrollments detected</div>
          </div>
          <div v-else class="space-y-4">
            <div v-for="duplicate in dualEnrollments" :key="duplicate.id" class="p-4 border rounded-lg">
              <div class="font-medium">{{ duplicate.patientName }}</div>
              <div class="text-sm text-gray-600 mt-1">Found in {{ duplicate.systems.join(', ') }}</div>
              <div class="mt-2 text-xs text-gray-500">{{ duplicate.details }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Provider Management Modal -->
    <div v-if="showProviderManagement" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Provider Management</h3>
            <button @click="showProviderManagement = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="provider in providers" :key="provider.id" class="p-4 border rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">{{ provider.name }}</div>
                <span :class="[
                  'px-2 py-1 text-xs rounded-full',
                  provider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]">
                  {{ provider.status }}
                </span>
              </div>
              <div class="text-sm text-gray-600">{{ provider.certification }}</div>
              <div class="text-sm text-gray-500 mt-1">{{ provider.patientsActive }} active patients</div>
              <div class="text-sm text-gray-500">{{ provider.sessionsThisWeek }} sessions this week</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminDashboard',
  data() {
    return {
      refreshing: false,
      lastUpdated: new Date().toLocaleTimeString(),
      sessionFilter: 'all',
      showDualEnrollments: false,
      showProviderManagement: false,
      stats: {
        totalPatients: 127,
        newPatientsThisWeek: 8,
        totalPoints: 15487,
        pointsThisWeek: 892,
        sessionsToday: 12,
        totalUnitsToday: 18,
        estimatedRevenue: 32750,
        revenueThisWeek: 2840
      },
      recentSessions: [
        {
          id: 1,
          type: 'Group',
          duration: '45:30',
          h0038Units: 3,
          estimatedRevenue: 63.48,
          patientCount: 4,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          billingStatus: 'billable',
          cpssProvider: 'Sarah Johnson, CPSS-I',
          patients: [
            { id: 1, firstName: 'John', lastName: 'Smith' },
            { id: 2, firstName: 'Maria', lastName: 'Garcia' },
            { id: 3, firstName: 'David', lastName: 'Wilson' },
            { id: 4, firstName: 'Emily', lastName: 'Brown' }
          ]
        },
        {
          id: 2,
          type: 'Individual',
          duration: '25:15',
          h0038Units: 2,
          estimatedRevenue: 42.32,
          patientCount: 1,
          startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
          billingStatus: 'billable',
          cpssProvider: 'Mike Thompson, CPSS-II',
          patients: [
            { id: 5, firstName: 'Jennifer', lastName: 'Davis' }
          ]
        },
        {
          id: 3,
          type: 'Case Management',
          duration: '15:45',
          h0038Units: 1,
          estimatedRevenue: 21.16,
          patientCount: 1,
          startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
          billingStatus: 'billable',
          cpssProvider: 'Lisa Rodriguez, CPSS-I',
          patients: [
            { id: 6, firstName: 'Robert', lastName: 'Johnson' }
          ]
        },
        {
          id: 4,
          type: 'Group',
          duration: '52:30',
          h0038Units: 4,
          estimatedRevenue: 84.64,
          patientCount: 6,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          billingStatus: 'billable',
          cpssProvider: 'Sarah Johnson, CPSS-I',
          patients: [
            { id: 7, firstName: 'Michael', lastName: 'Anderson' },
            { id: 8, firstName: 'Sarah', lastName: 'Taylor' },
            { id: 9, firstName: 'James', lastName: 'Wilson' },
            { id: 10, firstName: 'Ashley', lastName: 'Martinez' },
            { id: 11, firstName: 'Chris', lastName: 'Lee' },
            { id: 12, firstName: 'Amanda', lastName: 'White' }
          ]
        },
        {
          id: 5,
          type: 'Crisis Intervention',
          duration: '35:00',
          h0038Units: 2,
          estimatedRevenue: 42.32,
          patientCount: 1,
          startTime: new Date(Date.now() - 26 * 60 * 60 * 1000),
          billingStatus: 'billable',
          cpssProvider: 'Mike Thompson, CPSS-II',
          patients: [
            { id: 13, firstName: 'Alex', lastName: 'Thompson' }
          ]
        }
      ],
      systemAlerts: [
        {
          id: 1,
          type: 'warning',
          title: 'High Session Volume',
          message: 'Today\'s session count is 40% above average. Monitor CPSS capacity.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          id: 2,
          type: 'info',
          title: 'Weekly Report Ready',
          message: 'September 2-9, 2025 performance report is available for download.',
          timestamp: new Date(Date.now() - 60 * 60 * 1000)
        }
      ],
      topPerformers: [
        {
          id: 1,
          name: 'Sarah Johnson',
          role: 'CPSS-I',
          pointsAwarded: 1247
        },
        {
          id: 2,
          name: 'Mike Thompson',
          role: 'CPSS-II',
          pointsAwarded: 1089
        },
        {
          id: 3,
          name: 'Lisa Rodriguez',
          role: 'CPSS-I',
          pointsAwarded: 892
        },
        {
          id: 4,
          name: 'Jennifer Kim',
          role: 'CPSS-II',
          pointsAwarded: 756
        }
      ],
      dualEnrollments: [],
      providers: [
        {
          id: 1,
          name: 'Sarah Johnson',
          certification: 'CPSS-I',
          status: 'active',
          patientsActive: 23,
          sessionsThisWeek: 18
        },
        {
          id: 2,
          name: 'Mike Thompson',
          certification: 'CPSS-II',
          status: 'active',
          patientsActive: 19,
          sessionsThisWeek: 15
        },
        {
          id: 3,
          name: 'Lisa Rodriguez',
          certification: 'CPSS-I',
          status: 'active',
          patientsActive: 21,
          sessionsThisWeek: 12
        },
        {
          id: 4,
          name: 'Jennifer Kim',
          certification: 'CPSS-II',
          status: 'active',
          patientsActive: 17,
          sessionsThisWeek: 9
        }
      ]
    }
  },
  computed: {
    filteredSessions() {
      return this.recentSessions.filter(session => {
        if (this.sessionFilter === 'all') return true;
        if (this.sessionFilter === 'today') {
          const today = new Date();
          const sessionDate = new Date(session.startTime);
          return sessionDate.toDateString() === today.toDateString();
        }
        return session.type === this.sessionFilter;
      });
    }
  },
  mounted() {
    this.loadDashboardData();
    // Auto-refresh every 5 minutes
    setInterval(this.refreshData, 5 * 60 * 1000);
  },
  methods: {
    async loadDashboardData() {
      try {
        // Load dashboard statistics
        const statsResponse = await fetch('/api/cm/dashboard/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            this.stats = { ...this.stats, ...statsData.stats };
          }
        }

        // Load recent encounters/sessions
        const encountersResponse = await fetch('/api/cm/encounters?limit=20');
        if (encountersResponse.ok) {
          const encountersData = await encountersResponse.json();
          if (encountersData.success) {
            this.recentSessions = encountersData.encounters || this.recentSessions;
          }
        }

        // Load CPSS providers
        const providersResponse = await fetch('/api/cm/providers/cpss');
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          if (providersData.success) {
            this.providers = providersData.providers || this.providers;
          }
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        this.addAlert('error', 'Data Load Error', 'Failed to load some dashboard data. Using cached information.');
      }
    },

    async refreshData() {
      this.refreshing = true;
      try {
        await this.loadDashboardData();
        this.lastUpdated = new Date().toLocaleTimeString();
        this.addAlert('info', 'Data Refreshed', 'Dashboard data has been updated.');
      } catch (error) {
        console.error('Error refreshing dashboard:', error);
        this.addAlert('error', 'Refresh Failed', 'Unable to refresh dashboard data. Please try again.');
      } finally {
        this.refreshing = false;
      }
    },

    async exportReport(type) {
      try {
        const response = await fetch(`/api/cm/reports/${type}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `cm-${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          
          this.addAlert('info', 'Export Complete', `${type} report has been downloaded.`);
        } else {
          throw new Error(`Export failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Export error:', error);
        this.addAlert('error', 'Export Failed', `Unable to export ${type} report. Please try again.`);
      }
    },

    async loadDualEnrollments() {
      try {
        const response = await fetch('/api/cm/patients/dual-enrollment');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            this.dualEnrollments = data.dualEnrollments || [];
          }
        }
      } catch (error) {
        console.error('Error loading dual enrollments:', error);
        this.addAlert('error', 'Load Error', 'Failed to load dual enrollment data.');
      }
    },

    addAlert(type, title, message) {
      const alert = {
        id: Date.now(),
        type,
        title,
        message,
        timestamp: new Date()
      };
      this.systemAlerts.unshift(alert);
      
      // Auto-dismiss info alerts after 10 seconds
      if (type === 'info') {
        setTimeout(() => {
          this.dismissAlert(alert.id);
        }, 10000);
      }
    },

    dismissAlert(alertId) {
      this.systemAlerts = this.systemAlerts.filter(alert => alert.id !== alertId);
    },

    formatDateTime(date) {
      return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    },

    formatTime(date) {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  },
  watch: {
    showDualEnrollments(newVal) {
      if (newVal) {
        this.loadDualEnrollments();
      }
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Custom scrollbar for modals */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

/* Animation for alerts */
.space-y-3 > div {
  transition: all 0.3s ease-in-out;
}

/* Hover effects for interactive elements */
.session-card:hover {
  background-color: rgba(31, 41, 55, 0.7);
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
</style>