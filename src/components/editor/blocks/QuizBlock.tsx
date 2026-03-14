import type { QuizContent } from '../../../types/blocks.types';

interface QuizBlockProps {
  content: QuizContent;
  isSelected: boolean;
  onChange: (content: Partial<QuizContent>) => void;
}

export function QuizBlock({ content, isSelected, onChange }: QuizBlockProps) {
  const options = content.options || [];

  const updateOption = (id: string, patch: Partial<{ text: string; correct: boolean }>) => {
    onChange({
      options: options.map((opt) => (opt.id === id ? { ...opt, ...patch } : opt)),
    });
  };

  const addOption = () => {
    onChange({
      options: [...options, { id: `opt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, text: 'New option', correct: false }],
    });
  };

  const removeOption = (id: string) => {
    onChange({
      options: options.filter((opt) => opt.id !== id),
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {isSelected ? (
        <div className="controls">
          <input
            className="input"
            value={content.question}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Question"
          />
          <div className="row">
            <label className="chip">
              <input
                type="checkbox"
                checked={content.allowMultiple}
                onChange={(e) => onChange({ allowMultiple: e.target.checked })}
              />
              Allow multiple correct answers
            </label>
            <button className="ghost" onClick={addOption}>+ Add option</button>
          </div>
          <div className="options">
            {options.map((opt, idx) => (
              <div key={opt.id} className="option">
                <span className="pill">{idx + 1}</span>
                <input
                  className="input"
                  value={opt.text}
                  onChange={(e) => updateOption(opt.id, { text: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <label className="chip">
                  <input
                    type="checkbox"
                    checked={opt.correct}
                    onChange={(e) => updateOption(opt.id, { correct: e.target.checked })}
                  />
                  Correct
                </label>
                <button className="remove" onClick={(e) => { e.stopPropagation(); removeOption(opt.id); }}>✕</button>
              </div>
            ))}
          </div>
          <textarea
            className="textarea"
            value={content.explanation || ''}
            onChange={(e) => onChange({ explanation: e.target.value })}
            placeholder="Explanation (optional)"
          />
        </div>
      ) : (
        <div className="quiz">
          <div className="question">{content.question}</div>
          <div className="options">
            {options.map((opt) => (
              <div key={opt.id} className={`option-pill ${opt.correct ? 'correct' : ''}`}>
                {opt.text}
              </div>
            ))}
          </div>
          {content.explanation && <div className="explanation">{content.explanation}</div>}
        </div>
      )}
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.controls { display: flex; flex-direction: column; gap: 0.5rem; }
.input, .textarea { width: 100%; padding: 0.5rem 0.65rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; }
.textarea { min-height: 80px; }
.row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.6rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; font-size: 0.9rem; }
.ghost { padding: 0.35rem 0.7rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.02); color: #f6f6fb; cursor: pointer; }
.options { display: flex; flex-direction: column; gap: 0.4rem; }
.option { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 0.4rem; align-items: center; }
.pill { width: 26px; height: 26px; border-radius: 8px; background: rgba(255,255,255,0.08); display: grid; place-items: center; color: #f6f6fb; font-weight: 700; }
.remove { border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; }
.remove:hover { color: #ff8a8a; }
.quiz { display: flex; flex-direction: column; gap: 0.5rem; }
.question { font-weight: 700; font-size: 1.1rem; }
.option-pill { padding: 0.5rem 0.65rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: #f6f6fb; }
.option-pill.correct { border-color: rgba(108,214,138,0.8); background: rgba(108,214,138,0.15); }
.explanation { border-left: 3px solid rgba(255,255,255,0.18); padding-left: 0.6rem; color: rgba(255,255,255,0.78); }
@media (max-width: 720px) { .option { grid-template-columns: auto 1fr auto; grid-template-areas: "pill text remove" "chip chip chip"; } }
`;
