<template>
  <div class="cpss-portal min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <div class="bg-white shadow-lg border-b-4 border-blue-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <h1 class="text-3xl font-bold text-gray-900">CPSS Portal</h1>
              <p class="text-sm text-gray-500">Contingency Management Program</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">{{ currentUser.name }}</span>
            <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {{ currentUser.credentials }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Panel: Patient Search & Eligibility -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Quick Stats -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-500">Active Patients</p>
                  <p class="text-2xl font-semibold text-gray-900">{{ stats.totalPatients }}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-500">Points Awarded</p>
                  <p class="text-2xl font-semibold text-gray-900">{{ stats.pointsAwarded }}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-500">Today's Sessions</p>
                  <p class="text-2xl font-semibold text-gray-900">{{ todaySessions }}</p>
                </div>
              </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-500">Success Rate</p>
                  <p class="text-2xl font-semibold text-gray-900">{{ stats.successRate }}%</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Patient Eligibility Check -->
          <div class="bg-white rounded-lg shadow-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-xl font-semibold text-gray-900">Patient Eligibility Check</h2>
              <p class="text-sm text-gray-600 mt-1">Verify Medicaid eligibility for CM program enrollment</p>
            </div>
            
            <div class="p-6">
              <form @submit.prevent="checkEligibility" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input 
                      v-model="eligibilityForm.firstName"
                      type="text" 
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter first name"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input 
                      v-model="eligibilityForm.lastName"
                      type="text" 
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter last name"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input 
                      v-model="eligibilityForm.dateOfBirth"
                      type="date" 
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                </div>
                
                <div class="flex justify-end">
                  <button 
                    type="submit"
                    :disabled="checkingEligibility"
                    class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg v-if="checkingEligibility" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ checkingEligibility ? 'Checking...' : 'Check Eligibility' }}
                  </button>
                </div>
              </form>

              <!-- Eligibility Results -->
              <div v-if="eligibilityResult" class="mt-6 p-4 rounded-lg" :class="{
                'bg-green-50 border border-green-200': eligibilityResult.enrolled,
                'bg-red-50 border border-red-200': !eligibilityResult.enrolled
              }">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg v-if="eligibilityResult.enrolled" class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium" :class="{
                      'text-green-800': eligibilityResult.enrolled,
                      'text-red-800': !eligibilityResult.enrolled
                    }">
                      {{ eligibilityResult.enrolled ? '✅ ELIGIBLE for CM Program' : '❌ NOT ELIGIBLE for CM Program' }}
                    </h3>
                    <div class="mt-2 text-sm" :class="{
                      'text-green-700': eligibilityResult.enrolled,
                      'text-red-700': !eligibilityResult.enrolled
                    }">
                      <p><strong>Program:</strong> {{ eligibilityResult.program || 'Not enrolled' }}</p>
                      <p v-if="eligibilityResult.networkStatus"><strong>Network Status:</strong> {{ eligibilityResult.networkStatus }}</p>
                      <p v-if="eligibilityResult.contractMessage">{{ eligibilityResult.contractMessage }}</p>
                    </div>
                  </div>
                </div>
                
                <!-- Enroll Button for Eligible Patients -->
                <div v-if="eligibilityResult.enrolled" class="mt-4">
                  <button 
                    @click="startEnrollment"
                    class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Enroll in CM Program
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Patient Enrollment Form -->
          <div v-if="showEnrollmentForm" class="bg-white rounded-lg shadow-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-xl font-semibold text-gray-900">CM Program Enrollment</h2>
              <p class="text-sm text-gray-600 mt-1">Complete patient enrollment for {{ eligibilityForm.firstName }} {{ eligibilityForm.lastName }}</p>
            </div>
            
            <div class="p-6">
              <form @submit.prevent="enrollPatient" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input 
                      v-model="enrollmentForm.phone"
                      type="tel" 
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(801) 555-1234"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                    <input 
                      v-model="enrollmentForm.email"
                      type="email" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="patient@email.com"
                    >
                  </div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Smartphone Access</label>
                  <select 
                    v-model="enrollmentForm.hasSmartphone"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select smartphone access level</option>
                    <option value="yes">Yes - Full smartphone access</option>
                    <option value="limited">Limited - Basic phone with text</option>
                    <option value="no">No - No smartphone or text capability</option>
                  </select>
                </div>

                <div class="flex items-center">
                  <input 
                    id="consent"
                    v-model="enrollmentForm.consent"
                    type="checkbox" 
                    required
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  >
                  <label for="consent" class="ml-2 block text-sm text-gray-900">
                    Patient has provided informed consent for CM program enrollment
                  </label>
                </div>

                <div class="flex justify-end space-x-3">
                  <button 
                    type="button"
                    @click="cancelEnrollment"
                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    :disabled="enrolling"
                    class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg v-if="enrolling" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ enrolling ? 'Enrolling...' : 'Enroll Patient' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Right Panel: Active Patients & Quick Actions -->
        <div class="space-y-6">
          
          <!-- My Patients -->
          <div class="bg-white rounded-lg shadow-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">My Active Patients</h2>
            </div>
            <div class="p-6">
              <div v-if="myPatients.length === 0" class="text-center py-4">
                <p class="text-gray-500">No active patients assigned</p>
              </div>
              <div v-else class="space-y-3">
                <div 
                  v-for="patient in myPatients" 
                  :key="patient.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  @click="selectPatient(patient)"
                >
                  <div>
                    <p class="font-medium text-gray-900">{{ patient.name }}</p>
                    <p class="text-sm text-gray-500">{{ patient.totalPoints }} points • {{ patient.streak }} streak</p>
                  </div>
                  <div class="text-right">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-lg shadow-lg">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div class="p-6 space-y-3">
              <button 
                @click="openSessionTimer"
                class="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
              >
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Session Timer
              </button>
              <button class="w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Award Points
              </button>
              <button class="w-full text-left px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors flex items-center">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Timer Modal -->
    <div v-if="showSessionTimer" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-2xl font-semibold text-gray-900">Session Timer & Encounter Capture</h2>
          <button 
            @click="closeSessionTimer"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="p-6">
          <SessionTimer @session-completed="handleSessionCompleted" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SessionTimer from './SessionTimer.vue'

export default {
  name: 'CPSSPortal',
  components: {
    SessionTimer
  },
  data() {
    return {
      currentUser: {
        name: 'Sarah Johnson, CPSS-I',
        credentials: 'CPSS-I'
      },
      stats: {
        totalPatients: 0,
        pointsAwarded: 0,
        successRate: 0
      },
      todaySessions: 0,
      eligibilityForm: {
        firstName: '',
        lastName: '',
        dateOfBirth: ''
      },
      enrollmentForm: {
        phone: '',
        email: '',
        hasSmartphone: '',
        consent: false
      },
      eligibilityResult: null,
      checkingEligibility: false,
      showEnrollmentForm: false,
      enrolling: false,
      myPatients: [],
      showSessionTimer: false
    }
  },
  async mounted() {
    await this.loadDashboardStats();
  },
  methods: {
    async loadDashboardStats() {
      try {
        const response = await fetch('/api/cm/dashboard/stats');
        const data = await response.json();
        if (data.success) {
          this.stats = data.stats;
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    },

    async checkEligibility() {
      this.checkingEligibility = true;
      this.eligibilityResult = null;
      
      try {
        const response = await fetch('/api/medicaid/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            first: this.eligibilityForm.firstName,
            last: this.eligibilityForm.lastName,
            dob: this.eligibilityForm.dateOfBirth
          })
        });
        
        const data = await response.json();
        this.eligibilityResult = data;
      } catch (error) {
        console.error('Error checking eligibility:', error);
        this.eligibilityResult = {
          enrolled: false,
          program: 'Error checking eligibility'
        };
      } finally {
        this.checkingEligibility = false;
      }
    },

    startEnrollment() {
      this.showEnrollmentForm = true;
    },

    cancelEnrollment() {
      this.showEnrollmentForm = false;
      this.enrollmentForm = {
        phone: '',
        email: '',
        hasSmartphone: '',
        consent: false
      };
    },

    async enrollPatient() {
      this.enrolling = true;
      
      try {
        const response = await fetch('/api/cm/patient/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patientData: {
              firstName: this.eligibilityForm.firstName,
              lastName: this.eligibilityForm.lastName,
              dateOfBirth: this.eligibilityForm.dateOfBirth,
              insuranceType: this.eligibilityResult?.program || 'Utah Medicaid'
            },
            contactInfo: {
              phone: this.enrollmentForm.phone,
              email: this.enrollmentForm.email,
              hasSmartphone: this.enrollmentForm.hasSmartphone,
              consent: this.enrollmentForm.consent
            }
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert(`✅ Patient successfully enrolled in CM program!\n\nPatient ID: ${data.patient.canonical.id.slice(0, 8)}...\nWelcome Points: ${data.patient.enrollment.total_points}`);
          
          // Reset forms
          this.eligibilityForm = { firstName: '', lastName: '', dateOfBirth: '' };
          this.enrollmentForm = { phone: '', email: '', hasSmartphone: '', consent: false };
          this.showEnrollmentForm = false;
          this.eligibilityResult = null;
          
          // Refresh stats
          await this.loadDashboardStats();
        } else {
          alert(`❌ Enrollment failed: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error enrolling patient:', error);
        alert('❌ Error enrolling patient. Please try again.');
      } finally {
        this.enrolling = false;
      }
    },

    selectPatient(patient) {
      // TODO: Implement patient detail view
      console.log('Selected patient:', patient);
    },

    openSessionTimer() {
      this.showSessionTimer = true;
    },

    closeSessionTimer() {
      this.showSessionTimer = false;
    },

    async handleSessionCompleted(sessionData) {
      console.log('Session completed:', sessionData);
      
      // Update today's sessions count
      this.todaySessions = (this.todaySessions || 0) + 1;
      
      // Refresh dashboard stats to reflect new points and activity
      await this.loadDashboardStats();
      
      // Show success notification
      const message = sessionData.units > 0 
        ? `✅ Session completed successfully!\n\n${sessionData.type} session: ${sessionData.duration}\n${sessionData.units} H0038 units earned\nRevenue: $${sessionData.revenue.toFixed(2)}\n\nPoints awarded to ${sessionData.patientCount} patient(s)`
        : `⚠️ Session under 8 minutes\n\nNo billing units earned. Consider same-day encounter aggregation for optimal billing.`;
      
      alert(message);
      
      // Create encounter record in canonical database
      try {
        const response = await fetch('/api/cm/encounters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionType: sessionData.type,
            duration: sessionData.duration,
            elapsedSeconds: sessionData.elapsedSeconds,
            units: sessionData.units,
            revenue: sessionData.revenue,
            patients: sessionData.patients,
            patientCount: sessionData.patientCount,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            cpssProviderId: this.currentUser.id || 'sarah-johnson-cpss'
          })
        });
        
        const result = await response.json();
        console.log('Encounter logged:', result);
      } catch (error) {
        console.error('Error saving encounter:', error);
      }
    }
  }
}
</script>