<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
    <div class="max-w-2xl mx-auto">
      
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Patient Onboarding</h1>
        <p class="text-gray-600">Contingency Management Program - Acute Care Setting</p>
      </div>

      <!-- Step Indicator -->
      <div class="flex justify-center mb-8">
        <div class="flex items-center space-x-4">
          <div class="flex items-center">
            <div :class="step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'" 
                 class="rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</div>
            <span class="ml-2 text-sm font-medium text-gray-900">Eligibility</span>
          </div>
          <div class="w-8 h-0.5 bg-gray-300"></div>
          <div class="flex items-center">
            <div :class="step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'" 
                 class="rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">2</div>
            <span class="ml-2 text-sm font-medium text-gray-900">Contact Info</span>
          </div>
          <div class="w-8 h-0.5 bg-gray-300"></div>
          <div class="flex items-center">
            <div :class="step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'" 
                 class="rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">3</div>
            <span class="ml-2 text-sm font-medium text-gray-900">Complete</span>
          </div>
        </div>
      </div>

      <!-- Step 1: Eligibility Check -->
      <div v-if="step === 1" class="bg-white rounded-xl shadow-lg p-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Check Patient Eligibility</h2>
        
        <form @submit.prevent="checkEligibility" class="space-y-6">
          <!-- Patient Name -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input 
                v-model="patientInfo.firstName" 
                type="text" 
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Enter first name"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input 
                v-model="patientInfo.lastName" 
                type="text" 
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="Enter last name"
              >
            </div>
          </div>

          <!-- Date of Birth -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            <input 
              v-model="patientInfo.dob" 
              type="date" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            >
          </div>

          <!-- Optional Medicaid ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Medicaid ID <span class="text-gray-500 text-sm">(optional - helps verify coverage)</span>
            </label>
            <input 
              v-model="patientInfo.medicaidId" 
              type="text" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="Enter if available"
            >
          </div>

          <!-- Check Eligibility Button -->
          <button 
            type="submit" 
            :disabled="checking"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-4 px-6 rounded-lg transition-colors text-lg"
          >
            <span v-if="checking" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking Eligibility...
            </span>
            <span v-else>Check Eligibility</span>
          </button>
        </form>

        <!-- Eligibility Result -->
        <div v-if="eligibilityResult" class="mt-6 p-6 rounded-lg" 
             :class="eligibilityResult.enrolled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg v-if="eligibilityResult.enrolled" class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <svg v-else class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium" :class="eligibilityResult.enrolled ? 'text-green-800' : 'text-red-800'">
                {{ eligibilityResult.enrolled ? '✅ ELIGIBLE FOR CM PROGRAM' : '❌ NOT ELIGIBLE' }}
              </h3>
              <p class="mt-1 text-sm" :class="eligibilityResult.enrolled ? 'text-green-700' : 'text-red-700'">
                {{ eligibilityResult.message }}
              </p>
            </div>
          </div>

          <div v-if="eligibilityResult.enrolled" class="mt-4">
            <button 
              @click="step = 2" 
              class="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Continue to Enrollment →
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: Contact Information & Enrollment -->
      <div v-if="step === 2" class="bg-white rounded-xl shadow-lg p-8">
        <h2 class="text-xl font-bold text-gray-900 mb-6">Patient Contact & Enrollment</h2>
        
        <!-- Patient Summary -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 class="font-medium text-blue-900">Patient: {{ patientInfo.firstName }} {{ patientInfo.lastName }}</h3>
          <p class="text-blue-700 text-sm">DOB: {{ formatDate(patientInfo.dob) }} • {{ eligibilityResult.program }}</p>
        </div>

        <form @submit.prevent="enrollPatient" class="space-y-6">
          <!-- Phone Number -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span class="text-red-500">*</span>
            </label>
            <input 
              v-model="contactInfo.phone" 
              type="tel" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="(555) 123-4567"
            >
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span class="text-gray-500 text-sm">(optional)</span>
            </label>
            <input 
              v-model="contactInfo.email" 
              type="email" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="patient@email.com"
            >
          </div>

          <!-- Smartphone Access -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Smartphone Access</label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input v-model="contactInfo.hasSmartphone" value="yes" type="radio" class="mr-3">
                <span>Yes - Patient has smartphone and can download apps</span>
              </label>
              <label class="flex items-center">
                <input v-model="contactInfo.hasSmartphone" value="limited" type="radio" class="mr-3">
                <span>Limited - Has phone but needs help with apps</span>
              </label>
              <label class="flex items-center">
                <input v-model="contactInfo.hasSmartphone" value="no" type="radio" class="mr-3">
                <span>No - Would need device provided for program</span>
              </label>
            </div>
          </div>

          <!-- Consent -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <label class="flex items-start">
              <input v-model="contactInfo.consent" type="checkbox" required class="mt-1 mr-3">
              <span class="text-sm text-gray-700">
                <strong>Patient Consent:</strong> I consent to enrollment in the Contingency Management program and understand that:
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li>I will receive points for meeting program goals</li>
                  <li>I can exchange points for incentives</li>
                  <li>My progress will be tracked by my care team</li>
                  <li>I can withdraw from the program at any time</li>
                </ul>
              </span>
            </label>
          </div>

          <!-- Enroll Button -->
          <button 
            type="submit" 
            :disabled="enrolling"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-4 px-6 rounded-lg transition-colors text-lg"
          >
            <span v-if="enrolling" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enrolling Patient...
            </span>
            <span v-else>Enroll in CM Program</span>
          </button>
        </form>

        <button @click="step = 1" class="mt-4 text-gray-600 hover:text-gray-800">← Back to Eligibility Check</button>
      </div>

      <!-- Step 3: Completion & Patient Instructions -->
      <div v-if="step === 3" class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-8">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Enrollment Complete!</h2>
          <p class="text-gray-600 mt-2">{{ patientInfo.firstName }} {{ patientInfo.lastName }} is now enrolled in the CM program</p>
        </div>

        <!-- Patient Instructions Card -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 class="text-lg font-bold text-blue-900 mb-4">📱 Patient App Access</h3>
          
          <div v-if="contactInfo.hasSmartphone === 'yes'">
            <p class="text-blue-800 mb-4">Instructions sent to: <strong>{{ contactInfo.phone }}</strong></p>
            <div class="bg-white rounded-lg p-4 border">
              <h4 class="font-medium text-gray-900 mb-2">📱 SMS Message Sent:</h4>
              <p class="text-sm text-gray-700 italic bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                "🎯 Welcome to Moonlit's CM program! You've earned 25 welcome points.<br><br>
                📱 Access your patient portal:<br>
                {{ getPatientAppLink() }}<br><br>
                🔑 Login with:<br>
                Name: {{ patientInfo.firstName }} {{ patientInfo.lastName }}<br>
                DOB: {{ formatDate(patientInfo.dob) }}<br><br>
                Questions? Reply STOP to opt out."
              </p>
            </div>
          </div>

          <div v-else-if="contactInfo.hasSmartphone === 'limited'">
            <p class="text-blue-800 mb-4">⚠️ Patient needs assistance with app setup</p>
            <div class="bg-white rounded-lg p-4 border">
              <h4 class="font-medium text-gray-900 mb-2">Next Steps:</h4>
              <ul class="text-sm text-gray-700 space-y-1">
                <li>• Help patient visit: {{ getPatientAppLink() }}</li>
                <li>• Show them how to bookmark the page</li>
                <li>• Walk through the login process once</li>
                <li>• Contact info saved for follow-up support</li>
              </ul>
            </div>
          </div>

          <div v-else>
            <p class="text-blue-800 mb-4">📞 Device provision required for program participation</p>
            <div class="bg-white rounded-lg p-4 border">
              <h4 class="font-medium text-gray-900 mb-2">Administrative Action Required:</h4>
              <p class="text-sm text-gray-700">
                Patient enrolled but will need device provided. Consider CPT 98978 reimbursement for device provision.
                Contact admin to coordinate device delivery to: {{ contactInfo.phone }}
              </p>
            </div>
          </div>
        </div>

        <!-- CPSS Summary -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">📋 CPSS Documentation Summary</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Patient:</strong> {{ patientInfo.firstName }} {{ patientInfo.lastName }}</p>
              <p><strong>DOB:</strong> {{ formatDate(patientInfo.dob) }}</p>
              <p><strong>Program:</strong> {{ eligibilityResult.program }}</p>
              <p><strong>Starting Points:</strong> 25 (Welcome Bonus)</p>
              <p><strong>Enrollment Date:</strong> {{ new Date().toLocaleDateString() }}</p>
            </div>
            <div>
              <p><strong>Phone:</strong> {{ contactInfo.phone }}</p>
              <p><strong>Email:</strong> {{ contactInfo.email || 'Not provided' }}</p>
              <p><strong>Device Status:</strong> {{ getDeviceStatusText() }}</p>
              <p><strong>Setting:</strong> Acute Care (ED/Inpatient)</p>
              <p><strong>CPSS:</strong> {{ getCurrentCPSS() }}</p>
            </div>
          </div>
          
          <div class="mt-4 p-3 bg-blue-50 rounded border">
            <h4 class="font-medium text-blue-900 mb-1">Next Steps for Patient:</h4>
            <ul class="text-xs text-blue-800 space-y-1">
              <li v-if="contactInfo.hasSmartphone === 'yes'">✓ SMS sent with login instructions</li>
              <li v-if="contactInfo.hasSmartphone === 'limited'">⚠️ Assistance needed for app setup</li>
              <li v-if="contactInfo.hasSmartphone === 'no'">📞 Device provision required</li>
              <li>• First group session: Contact patient within 48 hours</li>
              <li>• Initial UDS scheduling: Within 1 week</li>
              <li>• Points redemption options available immediately</li>
            </ul>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-4 mt-6">
          <button 
            @click="startNewOnboarding" 
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Enroll Another Patient
          </button>
          <button 
            @click="$emit('return-to-dashboard')" 
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'

export default {
  name: 'CPSSPatientOnboarding',
  emits: ['return-to-dashboard'],
  setup(props, { emit }) {
    const step = ref(1)
    const checking = ref(false)
    const enrolling = ref(false)
    
    const patientInfo = reactive({
      firstName: '',
      lastName: '',
      dob: '',
      medicaidId: ''
    })

    const contactInfo = reactive({
      phone: '',
      email: '',
      hasSmartphone: 'yes',
      consent: false
    })

    const eligibilityResult = ref(null)

    const checkEligibility = async () => {
      checking.value = true
      try {
        const response = await fetch('http://localhost:3000/api/medicaid/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first: patientInfo.firstName,
            last: patientInfo.lastName,
            dob: patientInfo.dob
          })
        })

        const result = await response.json()
        
        eligibilityResult.value = {
          enrolled: result.enrolled,
          program: result.program || 'Traditional Medicaid',
          message: result.enrolled 
            ? `${result.program} - Qualified for Contingency Management Program`
            : result.message || 'Not eligible for CM program - please check insurance status'
        }
      } catch (error) {
        console.error('Eligibility check failed:', error)
        eligibilityResult.value = {
          enrolled: false,
          message: 'Unable to verify eligibility - please check connection and try again'
        }
      } finally {
        checking.value = false
      }
    }

    const enrollPatient = async () => {
      enrolling.value = true
      try {
        // First, create or find the patient in the main patients table
        const patientData = {
          firstName: patientInfo.firstName,
          lastName: patientInfo.lastName,
          dateOfBirth: patientInfo.dob,
          phone: contactInfo.phone,
          email: contactInfo.email || null,
          insuranceType: eligibilityResult.value.program
        }

        // Try to enroll the patient - the API will handle creating patient record if needed
        const enrollResponse = await fetch('http://localhost:3000/api/cm/patient/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientData,
            contactInfo: {
              phone: contactInfo.phone,
              email: contactInfo.email,
              hasSmartphone: contactInfo.hasSmartphone,
              consent: contactInfo.consent
            }
          })
        })

        const enrollResult = await enrollResponse.json()
        
        if (!enrollResponse.ok) {
          throw new Error(enrollResult.error || 'Enrollment failed')
        }
        
        console.log('Patient enrolled successfully:', enrollResult)
        
        // Simulate sending text message/email based on smartphone access
        if (contactInfo.hasSmartphone === 'yes' && contactInfo.phone) {
          console.log(`SMS sent to ${contactInfo.phone}: Welcome to Moonlit CM! Access your portal: ${getPatientAppLink()}`)
        }
        
        step.value = 3
      } catch (error) {
        console.error('Enrollment failed:', error)
        alert(`Enrollment failed: ${error.message}. Please try again.`)
      } finally {
        enrolling.value = false
      }
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return ''
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString()
    }

    const getPatientAppLink = () => {
      return `${window.location.origin}#patient`
    }

    const getCurrentCPSS = () => {
      return 'Current User' // In real implementation, get from auth context
    }

    const getDeviceStatusText = () => {
      switch (contactInfo.hasSmartphone) {
        case 'yes': return 'Has smartphone'
        case 'limited': return 'Needs assistance'
        case 'no': return 'Device needed'
        default: return 'Unknown'
      }
    }

    const startNewOnboarding = () => {
      // Reset all form data
      step.value = 1
      Object.assign(patientInfo, {
        firstName: '',
        lastName: '',
        dob: '',
        medicaidId: ''
      })
      Object.assign(contactInfo, {
        phone: '',
        email: '',
        hasSmartphone: 'yes',
        consent: false
      })
      eligibilityResult.value = null
    }

    return {
      step,
      checking,
      enrolling,
      patientInfo,
      contactInfo,
      eligibilityResult,
      checkEligibility,
      enrollPatient,
      formatDate,
      getPatientAppLink,
      getDeviceStatusText,
      startNewOnboarding
    }
  }
}
</script>