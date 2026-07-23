# Implementation Plan

## Files to Create:
1. `src/components/simulation/preface-modal.tsx` - "Before You Begin" onboarding modal
2. `src/components/simulation/role-picker.tsx` - Role selection screen
3. `src/components/simulation/briefing-center.tsx` - Multi-tab briefing center
4. `src/components/simulation/decision-page.tsx` - Enhanced decision + voting UI
5. `src/components/simulation/consequence-feedback.tsx` - AI-powered consequence
6. `src/components/simulation/help-button.tsx` - Floating help chatbot
7. `src/components/simulation/api/help-chat/route.ts` - API for help chat

## Steps:
1. Dark Mode Audit - scan every existing component
2. Create PrefaceModal component
3. Create RolePicker component  
4. Create BriefingCenter component
5. Create DecisionPage component
6. Create ConsequenceFeedback component
7. Create HelpButton chatbot component
8. Refactor play page to use new components
9. Verify dark mode across all new components