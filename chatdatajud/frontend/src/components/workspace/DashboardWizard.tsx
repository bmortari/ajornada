import { useEffect } from 'react';
import { usePipeline } from '../../hooks/usePipeline';
import WizardStepFilters from './WizardStepFilters';
import WizardStepMetrics from './WizardStepMetrics';
import WizardStepChartTypes from './WizardStepChartTypes';
import type { Step4Response } from '../../types/pipeline';

interface Props {
  onComplete: (result: Step4Response) => void;
  onCancel: () => void;
}

export default function DashboardWizard({ onComplete, onCancel }: Props) {
  const pipeline = usePipeline();
  const { state } = pipeline;

  // Load filter dimensions on mount
  useEffect(() => {
    pipeline.loadFilters();
  }, []);

  // When step 4 completes, hand off to parent
  useEffect(() => {
    if (state.step === 4 && state.dashboardResult && !state.isLoading) {
      onComplete(state.dashboardResult);
    }
  }, [state.step, state.dashboardResult, state.isLoading]);

  const stepLabels = ['Filtros', 'Métricas', 'Visualizações', 'Dashboard'];

  return (
    <div className="wizard wizard-fullscreen">
      {/* Header */}
      <div className="wizard-header">
        <h2 className="wizard-title">Construtor de Dashboard</h2>
        <button className="wizard-close" onClick={onCancel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Stepper */}
      <div className="wizard-stepper">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`wizard-step-indicator ${state.step === n ? 'active' : ''} ${state.step > n ? 'done' : ''}`}
          >
            <div className="wizard-step-number">
              {state.step > n ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : n}
            </div>
            <span>{stepLabels[n - 1]}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {state.error && (
        <div className="wizard-error">
          Erro: {state.error}
        </div>
      )}

      {/* Step content */}
      <div className="wizard-body">
        {state.step === 1 && (
          <WizardStepFilters pipeline={pipeline} />
        )}
        {state.step === 2 && (
          <WizardStepMetrics pipeline={pipeline} />
        )}
        {state.step === 3 && !state.isLoading && (
          <WizardStepChartTypes pipeline={pipeline} />
        )}
        {state.step === 3 && state.isLoading && (
          <div className="wizard-loading">
            <div className="wizard-spinner" />
            <p>Analisando tipos de visualização...</p>
            <span className="wizard-loading-sub">A IA está sugerindo os melhores gráficos para suas métricas</span>
          </div>
        )}
        {state.step === 4 && state.isLoading && (
          <div className="wizard-loading">
            <div className="wizard-spinner" />
            <p>Gerando dashboard...</p>
            <span className="wizard-loading-sub">Consultando dados e montando visualizações</span>
          </div>
        )}
      </div>
    </div>
  );
}
