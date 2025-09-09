<template>
  <div class="universal-eligibility-checker min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
    <!-- Header -->
    <div class="bg-gray-900 bg-opacity-50 backdrop-blur-sm border-b border-gray-700 border-opacity-50 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                🏥 Universal Eligibility Checker
              </h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-300">
              Office Ally Integration
            </div>
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Payer Selection Card -->
      <div class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50 mb-8">
        <h2 class="text-lg font-semibold text-white mb-4">Step 1: Select Insurance Payer</h2>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Payer Dropdown -->
          <div class="lg:col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">Insurance Payer</label>
            <select 
              v-model="selectedPayerId" 
              @change="onPayerChange"
              class="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">Select a payer...</option>
              <optgroup 
                v-for="category in payerOptions" 
                :key="category.category" 
                :label="category.category"
              >
                <option 
                  v-for="payer in category.payers" 
                  :key="payer.value" 
                  :value="payer.value"
                >
                  {{ payer.label }} {{ payer.tested ? '✅' : '⚠️' }}
                </option>
              </optgroup>
            </select>
          </div>
          
          <!-- Payer Info -->
          <div v-if="selectedPayerId" class="bg-gray-800 bg-opacity-50 rounded-lg p-4">
            <h3 class="font-medium text-white mb-2">{{ currentFormConfig.payerName }}</h3>
            <p class="text-sm text-gray-300 mb-2">{{ currentFormConfig.category }}</p>
            <div class="text-xs text-gray-400">
              Required: {{ currentFormConfig.submitRequirements.required.length }} fields
            </div>
          </div>
        </div>

        <!-- Payer Help Text -->
        <div v-if="selectedPayerId && payerHelpText" class="mt-4 p-4 bg-blue-900 bg-opacity-30 rounded-lg">
          <pre class="text-sm text-blue-200 whitespace-pre-wrap font-mono">{{ payerHelpText }}</pre>
        </div>
      </div>

      <!-- Dynamic Form -->
      <div v-if="currentFormConfig && selectedPayerId" class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50 mb-8">
        <h2 class="text-lg font-semibold text-white mb-4">Step 2: Patient Information</h2>
        
        <form @submit.prevent="checkEligibility" class="space-y-6">
          <!-- Dynamic Fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              v-for="field in currentFormConfig.fields" 
              :key="field.name"
              :class="getFieldContainerClass(field)"
            >
              <!-- Text/Date Fields -->
              <div v-if="field.type === 'text' || field.type === 'date'">
                <label :class="getLabelClass(field)">
                  {{ field.label }}
                  <span v-if="field.isRequired" class="text-red-400">*</span>
                  <span v-else-if="field.isRecommended" class="text-yellow-400">📋</span>
                </label>
                <input
                  :type="field.type"
                  v-model="formData[field.name]"
                  :placeholder="field.placeholder"
                  :required="field.isRequired"
                  :class="getInputClass(field, formErrors[field.name])"
                />
                <p v-if="field.helpText" class="mt-1 text-xs text-gray-400">{{ field.helpText }}</p>
                <p v-if="formErrors[field.name]" class="mt-1 text-xs text-red-400">{{ formErrors[field.name] }}</p>
              </div>

              <!-- Select Fields -->
              <div v-else-if="field.type === 'select'">
                <label :class="getLabelClass(field)">
                  {{ field.label }}
                  <span v-if="field.isRequired" class="text-red-400">*</span>
                  <span v-else-if="field.isRecommended" class="text-yellow-400">📋</span>
                </label>
                <select
                  v-model="formData[field.name]"
                  :required="field.isRequired"
                  :class="getSelectClass(field, formErrors[field.name])"
                >
                  <option value="">{{ field.placeholder }}</option>
                  <option 
                    v-for="option in field.options" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <p v-if="field.helpText" class="mt-1 text-xs text-gray-400">{{ field.helpText }}</p>
                <p v-if="formErrors[field.name]" class="mt-1 text-xs text-red-400">{{ formErrors[field.name] }}</p>
              </div>

              <!-- Textarea Fields -->
              <div v-else-if="field.type === 'textarea'">
                <label :class="getLabelClass(field)">
                  {{ field.label }}
                  <span v-if="field.isRequired" class="text-red-400">*</span>
                  <span v-else-if="field.isRecommended" class="text-yellow-400">📋</span>
                </label>
                <textarea
                  v-model="formData[field.name]"
                  :placeholder="field.placeholder"
                  :required="field.isRequired"
                  rows="3"
                  :class="getTextareaClass(field, formErrors[field.name])"
                ></textarea>
                <p v-if="field.helpText" class="mt-1 text-xs text-gray-400">{{ field.helpText }}</p>
                <p v-if="formErrors[field.name]" class="mt-1 text-xs text-red-400">{{ formErrors[field.name] }}</p>
              </div>
            </div>
          </div>

          <!-- Form Validation Summary -->
          <div v-if="validationResult && !validationResult.isValid" class="p-4 bg-red-900 bg-opacity-30 rounded-lg border-l-4 border-red-500">
            <h4 class="font-medium text-red-200 mb-2">Please fix the following issues:</h4>
            <ul class="list-disc list-inside text-sm text-red-200 space-y-1">
              <li v-for="error in validationResult.errors" :key="error">{{ error }}</li>
            </ul>
          </div>

          <!-- Form Warnings -->
          <div v-if="validationResult && validationResult.warnings.length > 0" class="p-4 bg-yellow-900 bg-opacity-30 rounded-lg border-l-4 border-yellow-500">
            <h4 class="font-medium text-yellow-200 mb-2">Recommendations for better results:</h4>
            <ul class="list-disc list-inside text-sm text-yellow-200 space-y-1">
              <li v-for="warning in validationResult.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-center">
            <button
              type="submit"
              :disabled="!canSubmit"
              :class="getSubmitButtonClass()"
            >
              <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ loading ? 'Checking Eligibility...' : 'Check Eligibility' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Results -->
      <div v-if="eligibilityResult" class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-gray-700 border-opacity-50">
        <h2 class="text-lg font-semibold text-white mb-4">Eligibility Results</h2>
        
        <div v-if="eligibilityResult.enrolled" class="p-4 bg-green-900 bg-opacity-30 rounded-lg border-l-4 border-green-500">
          <div class="flex items-center mb-2">
            <svg class="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="font-semibold text-green-200">✅ ENROLLED</h3>
          </div>
          <p class="text-green-200 mb-2"><strong>Program:</strong> {{ eligibilityResult.program }}</p>
          <p v-if="eligibilityResult.planType" class="text-green-200 mb-2"><strong>Plan Type:</strong> {{ eligibilityResult.planType }}</p>
          <p v-if="eligibilityResult.details" class="text-green-200 text-sm">{{ eligibilityResult.details }}</p>
          
          <!-- Copay Information for Aetna -->
          <div v-if="eligibilityResult.copayInfo" class="mt-4 p-3 bg-green-800 bg-opacity-30 rounded">
            <h4 class="font-medium text-green-200 mb-2">💰 Copay Information:</h4>
            <div class="text-sm text-green-200 space-y-1">
              <div v-if="eligibilityResult.copayInfo.officeCopay">
                Office Visit: ${{ eligibilityResult.copayInfo.officeCopay }}
              </div>
              <div v-if="eligibilityResult.copayInfo.specialistCopay">
                Specialist: ${{ eligibilityResult.copayInfo.specialistCopay }}
              </div>
              <div v-if="eligibilityResult.copayInfo.emergencyCopay">
                Emergency Room: ${{ eligibilityResult.copayInfo.emergencyCopay }}
              </div>
              <div v-if="eligibilityResult.copayInfo.urgentCareCopay">
                Urgent Care: ${{ eligibilityResult.copayInfo.urgentCareCopay }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-4 bg-red-900 bg-opacity-30 rounded-lg border-l-4 border-red-500">
          <div class="flex items-center mb-2">
            <svg class="w-6 h-6 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <h3 class="font-semibold text-red-200">❌ NOT ENROLLED</h3>
          </div>
          <p v-if="eligibilityResult.error" class="text-red-200">{{ eligibilityResult.error }}</p>
        </div>

        <!-- Response Time -->
        <div class="mt-4 text-sm text-gray-400">
          Response time: {{ eligibilityResult.responseTime }}ms via Office Ally
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Import the dynamic field system (this would need to be adapted for browser use)
// For now, we'll include the logic directly in the component

export default {
  name: 'UniversalEligibilityChecker',
  data() {
    return {
      selectedPayerId: '',
      currentFormConfig: null,
      payerHelpText: '',
      formData: {},
      formErrors: {},
      validationResult: null,
      loading: false,
      eligibilityResult: null,
      
      // Payer options (this would normally come from the dynamic field system)
      payerOptions: [
        {
          category: 'Medicaid',
          payers: [
            { value: 'UTAH_MEDICAID', label: 'Utah Medicaid (Traditional FFS)', tested: true },
            { value: 'MOLINA', label: 'Molina Healthcare Utah', tested: false },
            { value: 'AETNA_BETTER_HEALTH_IL', label: 'Aetna Better Health - Illinois', tested: false }
          ]
        },
        {
          category: 'Commercial',
          payers: [
            { value: 'AETNA', label: 'Aetna Healthcare', tested: true },
            { value: 'REGENCE_BCBS', label: 'Regence BCBS Utah', tested: false },
            { value: 'SELECTHEALTH', label: 'SelectHealth Utah', tested: false },
            { value: 'ANTHEM', label: 'Anthem Blue Cross Blue Shield', tested: false },
            { value: 'CIGNA', label: 'Cigna Healthcare', tested: false },
            { value: 'UNITED_HEALTHCARE', label: 'United Healthcare', tested: false },
            { value: 'HUMANA', label: 'Humana Healthcare', tested: false }
          ]
        }
      ],

      // Form configurations for each payer (this would normally come from the library)
      formConfigs: {
        UTAH_MEDICAID: {
          payerName: 'Utah Medicaid (Traditional FFS)',
          category: 'Medicaid',
          notes: 'Working configuration. Uses name/DOB only for eligibility verification.',
          fields: [
            { name: 'firstName', label: 'First Name', type: 'text', isRequired: true, placeholder: 'Enter first name', helpText: 'Patient\'s legal first name' },
            { name: 'lastName', label: 'Last Name', type: 'text', isRequired: true, placeholder: 'Enter last name', helpText: 'Patient\'s legal last name' },
            { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', isRequired: true, placeholder: 'YYYY-MM-DD', helpText: 'Patient\'s date of birth' },
            { name: 'gender', label: 'Gender', type: 'select', isRequired: false, isRecommended: false, placeholder: 'Select gender', helpText: 'M = Male, F = Female', options: [
              { value: 'M', label: 'Male' },
              { value: 'F', label: 'Female' },
              { value: 'U', label: 'Unknown' }
            ]},
            { name: 'medicaidId', label: 'Medicaid ID', type: 'text', isRequired: false, isRecommended: true, placeholder: 'Enter Medicaid ID', helpText: 'State Medicaid identification number' }
          ],
          submitRequirements: {
            required: ['firstName', 'lastName', 'dateOfBirth'],
            recommended: ['medicaidId'],
            optional: ['gender']
          }
        },
        AETNA: {
          payerName: 'Aetna Healthcare',
          category: 'Commercial',
          notes: 'Requires gender and works best with member ID. Provider must be enrolled with Aetna.',
          fields: [
            { name: 'firstName', label: 'First Name', type: 'text', isRequired: true, placeholder: 'Enter first name', helpText: 'Patient\'s legal first name' },
            { name: 'lastName', label: 'Last Name', type: 'text', isRequired: true, placeholder: 'Enter last name', helpText: 'Patient\'s legal last name' },
            { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', isRequired: true, placeholder: 'YYYY-MM-DD', helpText: 'Patient\'s date of birth' },
            { name: 'gender', label: 'Gender', type: 'select', isRequired: true, placeholder: 'Select gender', helpText: 'M = Male, F = Female (required for Aetna)', options: [
              { value: 'M', label: 'Male' },
              { value: 'F', label: 'Female' }
            ]},
            { name: 'memberNumber', label: 'Member ID', type: 'text', isRequired: false, isRecommended: true, placeholder: 'Enter member number', helpText: 'Insurance member/subscriber ID from insurance card' },
            { name: 'groupNumber', label: 'Group Number', type: 'text', isRequired: false, isRecommended: false, placeholder: 'Enter group number', helpText: 'Group/employer ID from insurance card' }
          ],
          submitRequirements: {
            required: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
            recommended: ['memberNumber'],
            optional: ['groupNumber']
          }
        }
      }
    }
  },
  
  computed: {
    canSubmit() {
      if (!this.selectedPayerId || !this.currentFormConfig) return false;
      if (this.loading) return false;
      
      // Check if all required fields are filled
      const requiredFields = this.currentFormConfig.submitRequirements.required;
      return requiredFields.every(field => 
        this.formData[field] && this.formData[field].toString().trim() !== ''
      );
    }
  },

  methods: {
    onPayerChange() {
      this.currentFormConfig = this.formConfigs[this.selectedPayerId] || null;
      this.payerHelpText = this.generatePayerHelpText();
      this.formData = {};
      this.formErrors = {};
      this.validationResult = null;
      this.eligibilityResult = null;
    },

    generatePayerHelpText() {
      if (!this.currentFormConfig) return '';
      
      const config = this.currentFormConfig;
      const tested = this.selectedPayerId === 'UTAH_MEDICAID' || this.selectedPayerId === 'AETNA';
      
      let helpText = `${config.payerName} (${config.category}):\n`;
      helpText += `Required fields: ${config.submitRequirements.required.join(', ')}\n`;
      
      if (config.submitRequirements.recommended.length > 0) {
        helpText += `Recommended: ${config.submitRequirements.recommended.join(', ')}\n`;
      }
      
      if (config.notes) {
        helpText += `\nNotes: ${config.notes}`;
      }
      
      if (tested) {
        helpText += '\n✅ This payer configuration has been tested and verified.';
      } else {
        helpText += '\n⚠️  This payer configuration is based on Office Ally documentation but not yet tested.';
      }
      
      return helpText;
    },

    validateForm() {
      const errors = {};
      const warnings = [];
      
      if (!this.currentFormConfig) return { isValid: false, errors: ['Please select a payer first'], warnings: [] };
      
      // Check required fields
      this.currentFormConfig.submitRequirements.required.forEach(fieldName => {
        if (!this.formData[fieldName] || this.formData[fieldName].toString().trim() === '') {
          const field = this.currentFormConfig.fields.find(f => f.name === fieldName);
          errors[fieldName] = `${field.label} is required for ${this.currentFormConfig.payerName}`;
        }
      });
      
      // Check recommended fields
      this.currentFormConfig.submitRequirements.recommended.forEach(fieldName => {
        if (!this.formData[fieldName] || this.formData[fieldName].toString().trim() === '') {
          const field = this.currentFormConfig.fields.find(f => f.name === fieldName);
          warnings.push(`${field.label} is recommended for best results with ${this.currentFormConfig.payerName}`);
        }
      });

      // Date validation
      if (this.formData.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(this.formData.dateOfBirth)) {
        errors.dateOfBirth = 'Date of birth must be in YYYY-MM-DD format';
      }

      const errorList = Object.values(errors);
      this.formErrors = errors;
      
      return {
        isValid: errorList.length === 0,
        errors: errorList,
        warnings,
        canSubmit: errorList.length === 0
      };
    },

    async checkEligibility() {
      this.validationResult = this.validateForm();
      
      if (!this.validationResult.canSubmit) {
        return;
      }
      
      this.loading = true;
      this.eligibilityResult = null;
      
      try {
        // Prepare request data
        const requestData = {
          payerId: this.selectedPayerId,
          ...this.formData
        };
        
        const response = await fetch('/api/universal-eligibility/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        this.eligibilityResult = await response.json();
        
      } catch (error) {
        console.error('Eligibility check failed:', error);
        this.eligibilityResult = {
          enrolled: false,
          error: 'Unable to verify eligibility at this time. Please try again or verify manually.',
          responseTime: 0
        };
      } finally {
        this.loading = false;
      }
    },

    // Styling methods
    getFieldContainerClass(field) {
      let classes = '';
      if (field.isRequired) classes += ' field-required';
      if (field.isRecommended) classes += ' field-recommended';
      return classes;
    },

    getLabelClass(field) {
      return 'block text-sm font-medium text-gray-300 mb-2';
    },

    getInputClass(field, hasError) {
      let classes = 'w-full bg-gray-800 text-white rounded-lg px-4 py-3 border focus:outline-none transition-colors';
      
      if (hasError) {
        classes += ' border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-400';
      } else if (field.isRequired) {
        classes += ' border-purple-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500';
      } else if (field.isRecommended) {
        classes += ' border-yellow-600 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500';
      } else {
        classes += ' border-gray-600 focus:border-gray-500 focus:ring-2 focus:ring-gray-500';
      }
      
      return classes;
    },

    getSelectClass(field, hasError) {
      return this.getInputClass(field, hasError);
    },

    getTextareaClass(field, hasError) {
      return this.getInputClass(field, hasError);
    },

    getSubmitButtonClass() {
      let classes = 'flex items-center px-6 py-3 text-white font-medium rounded-lg transition-all duration-200 ';
      
      if (this.canSubmit && !this.loading) {
        classes += 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transform hover:scale-105';
      } else {
        classes += 'bg-gray-600 cursor-not-allowed opacity-50';
      }
      
      return classes;
    }
  },

  watch: {
    formData: {
      handler() {
        if (this.currentFormConfig) {
          this.validationResult = this.validateForm();
        }
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.universal-eligibility-checker {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Field styling based on requirement level */
.field-required {
  position: relative;
}

.field-required::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #ef4444, #dc2626);
  border-radius: 2px;
}

.field-recommended {
  position: relative;
}

.field-recommended::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #f59e0b, #d97706);
  border-radius: 2px;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #374151;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>