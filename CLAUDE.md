## Routing (GOAT)

1. For every coding task, call the triage agent first.
2. Delegate to the agent matching its route: quick, build or deep.
   Pass the full task and the triage JSON. Never pass a model parameter.
3. Then call the verifier with the risk and checks from triage.
4. If the verifier says FAIL, retry once, one step up:
   - It skipped a file or did not run the tests → quick to build.
   - It had full context and was still wrong → build to deep.
   - If deep fails, stop and report the blocker with the verification evidence.
     Do not automatically call escalate: Fable is unavailable, and escalate
     uses Opus at high effort, below deep at xhigh.
   - After the single retry, call the verifier again.
     If it still fails, stop and report the remaining failure.
5. After any escalation, ask triage to save one line to its memory:
   "<task pattern> → <route that worked>".