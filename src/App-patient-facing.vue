<template>
  <div class="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50/30 to-stone-100">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <!-- Moonlit brand dots -->
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-orange-400 rounded-full"></div>
              <div class="w-2 h-2 bg-orange-300 rounded-full"></div>
            </div>
            <div>
              <h1 class="text-lg font-medium text-gray-900">moonlit</h1>
              <p class="text-xs text-gray-500 uppercase tracking-wide">PSYCHIATRY</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-xs text-green-600 font-medium">✓ Real-time verification</span>
            <button class="px-4 py-2 bg-[#BF9C73] text-white text-sm font-medium rounded-xl hover:bg-[#A8875F] transition-colors">
              Need Help?
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-6 py-12">
      <!-- Title Section -->
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold text-slate-800 mb-4 font-['Newsreader']">
          Can we help you with your mental healthcare?
        </h2>
        <p class="text-xl text-slate-600">
          Let's check if we can accept your insurance for treatment
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <form @submit.prevent="checkEligibility">
          <div class="space-y-6">
            <!-- Patient Name Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="firstName" class="block text-sm font-medium text-slate-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  v-model="form.firstName"
                  type="text"
                  required
                  class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                  placeholder="Your first name"
                  :disabled="loading"
                >
              </div>

              <div>
                <label for="lastName" class="block text-sm font-medium text-slate-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  v-model="form.lastName"
                  type="text"
                  required
                  class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                  placeholder="Your last name"
                  :disabled="loading"
                >
              </div>
            </div>

            <!-- Date of Birth -->
            <div>
              <label for="dateOfBirth" class="block text-sm font-medium text-slate-700 mb-2">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                v-model="form.dateOfBirth"
                type="date"
                required
                class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                :disabled="loading"
              >
            </div>

            <!-- Insurance Information Section -->
            <div class="border-t border-stone-200 pt-6">
              <h3 class="text-lg font-semibold text-slate-800 mb-4">Insurance Information</h3>
              <p class="text-slate-600 mb-6 text-sm">
                For the most accurate verification, please provide your insurance member ID. If you don't have it handy, we can try with just your name and date of birth.
              </p>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Insurance Name/Type -->
                <div>
                  <label for="insuranceName" class="block text-sm font-medium text-slate-700 mb-2">
                    Insurance Name
                  </label>
                  <input
                    id="insuranceName"
                    v-model="form.insuranceName"
                    type="text"
                    class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                    placeholder="e.g., Utah Medicaid, Molina, SelectHealth"
                    :disabled="loading"
                  >
                  <p class="text-xs text-slate-500 mt-2">
                    Enter the name on your insurance card
                  </p>
                </div>

                <!-- Member ID -->
                <div>
                  <label for="memberId" class="block text-sm font-medium text-slate-700 mb-2">
                    Member ID
                    <span class="text-slate-500 font-normal">(recommended)</span>
                  </label>
                  <input
                    id="memberId"
                    v-model="form.memberId"
                    type="text"
                    class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                    placeholder="Member/Policy ID from card"
                    :disabled="loading"
                  >
                  <p class="text-xs text-slate-500 mt-2">
                    Usually found on the front of your insurance card
                  </p>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-6">
              <button
                type="submit"
                class="w-full px-6 py-4 bg-[#BF9C73] text-white text-lg font-semibold rounded-xl hover:bg-[#A8875F] transition-colors flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loading || !canSubmit"
              >
                <svg v-if="loading" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ loading ? 'Checking your coverage...' : 'Check My Coverage' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-2xl shadow-xl p-8 text-center mb-8">
        <div class="flex justify-center mb-4">
          <svg class="animate-spin h-12 w-12 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-slate-800 mb-2">Checking your coverage...</h3>
        <p class="text-slate-600">
          We're verifying your insurance information with our network
        </p>
        <p class="text-sm text-slate-500 mt-2">This usually takes just a moment</p>
      </div>

      <!-- Results -->
      <div v-if="result && !loading">
        <!-- Success Result -->
        <div v-if="result.canAccept" class="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-3xl font-bold text-slate-800 mb-2">Great news!</h3>
            <p class="text-xl text-slate-600">We can help you with your mental healthcare</p>
          </div>

          <!-- Coverage Details -->
          <div class="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <h4 class="font-semibold text-green-800 mb-3">Your Coverage Status</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div class="text-sm font-medium text-green-700">Insurance Plan</div>
                <div class="text-green-900 font-medium">{{ result.program || result.insuranceName }}</div>
              </div>
              <div>
                <div class="text-sm font-medium text-green-700">Coverage Status</div>
                <div class="text-green-900 font-medium">{{ result.coverageStatus || 'Active and Accepted' }}</div>
              </div>
            </div>
          </div>

          <!-- Next Steps -->
          <div class="space-y-4">
            <h4 class="text-lg font-semibold text-slate-800">What happens next?</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center p-4">
                <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span class="text-orange-600 font-bold">1</span>
                </div>
                <h5 class="font-medium text-slate-800 mb-1">Book Your Appointment</h5>
                <p class="text-sm text-slate-600">Choose a time that works for you</p>
              </div>
              <div class="text-center p-4">
                <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span class="text-orange-600 font-bold">2</span>
                </div>
                <h5 class="font-medium text-slate-800 mb-1">Initial Consultation</h5>
                <p class="text-sm text-slate-600">Meet with our team</p>
              </div>
              <div class="text-center p-4">
                <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span class="text-orange-600 font-bold">3</span>
                </div>
                <h5 class="font-medium text-slate-800 mb-1">Begin Treatment</h5>
                <p class="text-sm text-slate-600">Start your care journey</p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 mt-8">
            <button 
              @click="bookAppointment"
              class="flex-1 px-6 py-4 bg-[#BF9C73] text-white text-lg font-semibold rounded-xl hover:bg-[#A8875F] transition-colors"
            >
              Book My Appointment
            </button>
            <button 
              @click="learnMore"
              class="flex-1 px-6 py-4 border-2 border-stone-200 text-slate-700 text-lg font-medium rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>

        <!-- Not Accepted Result -->
        <div v-else class="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-3xl font-bold text-slate-800 mb-2">We want to help you</h3>
            <p class="text-xl text-slate-600">Let's explore your options together</p>
          </div>

          <!-- Issue Explanation -->
          <div class="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
            <h4 class="font-semibold text-orange-800 mb-2">About your insurance</h4>
            <p class="text-orange-900">{{ result.message || 'We are not currently in-network with your insurance plan, but we have options to help you access care.' }}</p>
          </div>

          <!-- Alternative Options -->
          <div class="space-y-4">
            <h4 class="text-lg font-semibold text-slate-800">Your options for care:</h4>
            
            <!-- Out-of-pocket option -->
            <div class="border-2 border-stone-200 rounded-xl p-4 hover:border-orange-300 transition-colors">
              <div class="flex items-center space-x-4">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h5 class="font-semibold text-slate-800">Self-Pay Options Available</h5>
                  <p class="text-sm text-slate-600">We offer competitive self-pay rates and payment plans</p>
                </div>
                <button class="px-4 py-2 bg-[#BF9C73] text-white text-sm font-medium rounded-lg hover:bg-[#A8875F] transition-colors">
                  Learn More
                </button>
              </div>
            </div>

            <!-- Waitlist option if applicable -->
            <div v-if="result.waitlistAvailable" class="border-2 border-stone-200 rounded-xl p-4 hover:border-orange-300 transition-colors">
              <div class="flex items-center space-x-4">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h5 class="font-semibold text-slate-800">Join Our Waitlist</h5>
                  <p class="text-sm text-slate-600">We're working to accept your insurance - get notified when available</p>
                </div>
                <button class="px-4 py-2 border border-stone-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors">
                  Join Waitlist
                </button>
              </div>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="mt-8 p-4 bg-stone-50 rounded-xl">
            <p class="text-center text-slate-600">
              <strong>Questions about your coverage?</strong><br>
              Our team is here to help explain your options.
            </p>
            <div class="flex justify-center mt-3">
              <button class="px-6 py-2 bg-[#BF9C73] text-white font-medium rounded-lg hover:bg-[#A8875F] transition-colors">
                Contact Our Team
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Help Text -->
      <div class="text-center text-slate-500">
        <p class="text-sm">
          Can't find your insurance card? No problem - our team can help verify your coverage.
        </p>
        <p class="text-sm mt-1">
          Contact us at <span class="font-medium text-orange-600">hello@trymoonlit.com</span> for assistance.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'PatientEligibilityChecker',
  setup() {
    const form = ref({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      insuranceName: '',
      memberId: ''
    })

    const loading = ref(false)
    const result = ref(null)
    const responseTime = ref(0)

    // Computed property to check if form can be submitted
    const canSubmit = computed(() => {
      return form.value.firstName.trim() && 
             form.value.lastName.trim() && 
             form.value.dateOfBirth &&
             form.value.insuranceName.trim()
    })

    const checkEligibility = async () => {
      loading.value = true
      result.value = null
      
      try {
        const startTime = Date.now()
        
        // First, try Office Ally eligibility verification
        const eligibilityResponse = await fetch('/api/medicaid/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first: form.value.firstName,
            last: form.value.lastName,
            dob: form.value.dateOfBirth,
            medicaidId: form.value.memberId, // Use member ID as Medicaid ID
            insuranceName: form.value.insuranceName
          })
        })
        
        const eligibilityData = await eligibilityResponse.json()
        responseTime.value = Date.now() - startTime

        // Transform eligibility response into patient-facing result
        if (eligibilityData.enrolled) {
          result.value = {
            canAccept: true,
            program: eligibilityData.program,
            coverageStatus: 'Active Coverage Verified',
            insuranceName: form.value.insuranceName,
            verificationSource: eligibilityData.verified ? 'Real-time verification' : 'Database lookup'
          }
        } else {
          // Check if this is a known insurance type we might accept
          const isKnownInsurance = form.value.insuranceName.toLowerCase().includes('medicaid') ||
                                 form.value.insuranceName.toLowerCase().includes('molina') ||
                                 form.value.insuranceName.toLowerCase().includes('selecthealth')
          
          result.value = {
            canAccept: false,
            message: eligibilityData.error || 'We are not currently in-network with this insurance plan.',
            waitlistAvailable: isKnownInsurance, // Show waitlist for known insurances
            insuranceName: form.value.insuranceName
          }
        }
        
      } catch (error) {
        console.error('Error checking eligibility:', error)
        result.value = {
          canAccept: false,
          message: 'We were unable to verify your coverage right now. Please contact our team for assistance.',
          contactRecommended: true
        }
        responseTime.value = 0
      } finally {
        loading.value = false
      }
    }

    const bookAppointment = () => {
      // Redirect to booking flow or show booking modal
      alert('Booking flow would start here - redirecting to calendar...')
    }

    const learnMore = () => {
      // Show more information about services
      alert('Learn more modal/page would open here')
    }

    return {
      form,
      loading,
      result,
      responseTime,
      canSubmit,
      checkEligibility,
      bookAppointment,
      learnMore
    }
  }
}
</script>

<style scoped>
/* Custom font for headlines if needed */
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap');
</style>