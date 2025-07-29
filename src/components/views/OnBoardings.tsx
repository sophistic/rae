import React, { useState } from 'react';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState<number>(1);

  const nextStep = (): void => {
    setStep(step + 1);
  };

  const prevStep = (): void => {
    setStep(step - 1);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`}>1</div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}>2</div>
            <div className={`w-24 h-1 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${step >= 3 ? 'bg-blue-500' : 'bg-gray-300'}`}>3</div>
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-800">Welcome to Quack!</h2>
            <p className="mt-4 text-center text-gray-600">The best application for all your needs.</p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-800">Set up your profile</h2>
            <p className="mt-4 text-center text-gray-600">Personalize your experience.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-800">You're all set!</h2>
            <p className="mt-4 text-center text-gray-600">Enjoy using our application.</p>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button onClick={prevStep} className="px-4 py-2 font-bold text-white bg-gray-500 rounded hover:bg-gray-700">
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button onClick={nextStep} className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700">
              Next
            </button>
          ) : (
            <button className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700">
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;