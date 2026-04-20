# First Weekly Experiment Pick

- **Chosen item**: OpenAI structured output controls
- **Hypothesis**: Enforcing strict JSON outputs reduces parser failures in automation by at least 50%.
- **Setup time**: 30 minutes
- **Test steps**:
  1. Take one existing prompt that returns loose text.
  2. Add explicit JSON schema constraints.
  3. Run 20 sample requests and log parse failures.
  4. Compare with prior baseline behavior.
- **Success metric**: Parse success rate >= 95% over test samples.
- **Decision template**: Keep / Drop / Watch
