'use client';

import React from 'react';
import { useState } from 'react';
import styles from './OnboardingSurvey.module.css';

interface OnboardingSurveyProps {
  onComplete: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

const questions = [
  {
    id: 'role',
    text: 'What best describes your role?',
    options: ['Individual User', 'Developer', 'Small Business Owner', 'Journalist / Activist', 'Other'],
  },
  {
    id: 'primaryUse',
    text: 'What will you primarily use Shield for?',
    options: ['Sharing personal documents', 'Sending business information', 'Protecting source materials', 'Integrating with my app', 'Other'],
  },
  {
    id: 'howHeard',
    text: 'How did you hear about us?',
    options: ['Social Media', 'A friend or colleague', 'Tech blog or news', 'Online search', 'Other'],
  },
  {
    id: 'mostExcited',
    text: 'What feature are you most excited about?',
    options: ['Face verification', 'Decentralized storage', 'On-chain access policies', 'Ease of use', 'Other'],
  },
];

export default function OnboardingSurvey({ onComplete, onSkip }: OnboardingSurveyProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherValue, setOtherValue] = useState('');

  const handleOptionClick = (option: string) => {
    const questionId = questions[currentStep].id;
    const isOther = option === 'Other';
    
    if (isOther) {
      setAnswers({ ...answers, [questionId]: 'Other' });
    } else {
      const newAnswers = { ...answers, [questionId]: option };
      setAnswers(newAnswers);
      goToNextStep(newAnswers);
    }
  };

  const handleOtherSubmit = () => {
    const questionId = questions[currentStep].id;
    const newAnswers = { ...answers, [questionId]: otherValue || 'Other' };
    setAnswers(newAnswers);
    setOtherValue('');
    goToNextStep(newAnswers);
  };

  const goToNextStep = (currentAnswers: Record<string, string>) => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(currentAnswers);
    }
  };

  const progress = ((currentStep + 1) / questions.length) * 100;
  const currentQuestion = questions[currentStep];
  const isOtherSelected = answers[currentQuestion.id] === 'Other';

  return (
    <div className={styles.overlay}>
      <div className={styles.surveyModal}>
        <h2 className={styles.title}>Welcome to Shield!</h2>
        <p className={styles.message}>Help us improve by answering a few quick questions.</p>
        <div className={styles.progressBar}>
          <div className={styles.progress} style={{ width: `${progress}%` }}></div>
        </div>
        
        <h3 className={styles.question}>{currentQuestion.text}</h3>
        
        {!isOtherSelected ? (
          <div className={styles.options}>
            {currentQuestion.options.map((option) => (
              <button key={option} onClick={() => handleOptionClick(option)} className={styles.option}>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={otherValue}
              onChange={(e) => setOtherValue(e.target.value)}
              placeholder="Please specify..."
              className={styles.otherInput}
              autoFocus
            />
            <button onClick={handleOtherSubmit} className={`${styles.option} ${styles.submitOther}`}>
              Submit
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <button onClick={onSkip} className={styles.skipButton}>Skip</button>
        </div>
      </div>
    </div>
  );
}
