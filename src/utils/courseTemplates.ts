import type { Json, InsertBlock } from '../types/database.types';
import type { CourseFormat, CourseTheme } from '../types/courseTheme.types';
import { createDefaultStorylineDraft, defaultCourseTheme } from './courseTheme';
import type { BlockType } from '../types/blocks.types';

export interface CourseTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  featured?: boolean;
  format: CourseFormat;
  theme: CourseTheme;
  blocks: Array<{
    type: BlockType;
    content?: Json;
    settings?: Json;
  }>;
}

function mergeTheme(overrides: Partial<CourseTheme>): CourseTheme {
  return {
    ...defaultCourseTheme,
    ...overrides,
    logoUrl: overrides.logoUrl ?? defaultCourseTheme.logoUrl,
  };
}

export const courseTemplates: CourseTemplate[] = [
  {
    id: 'onboarding-new-hire',
    title: 'New Hire Onboarding',
    description: 'Premium onboarding flow with welcome context, first-week checklist, and a confidence check.',
    category: 'Onboarding',
    featured: true,
    format: 'course',
    theme: mergeTheme({ brandColor: '#E7B84D', accentColor: '#2B74C2' }),
    blocks: [
      { type: 'heading', content: { text: 'Welcome to the team', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false, backgroundColor: '#FFF8E7' } },
      { type: 'text', content: { html: '<p>This onboarding sets your first 30 days up for success. You will learn core tools, team rituals, and what “great” looks like.</p>' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'imagetext', content: { imageSrc: '', imageAlt: 'Welcome illustration', heading: 'Your first-week outcome', body: 'By Friday, you should be able to navigate our tools, explain the product in two sentences, and complete your first scoped task.', layout: 'right' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'timeline', content: { items: [
        { id: 'step-1', title: 'Day 1', body: 'Set up access, meet your manager, and align on role expectations.' },
        { id: 'step-2', title: 'Day 3', body: 'Shadow a real workflow and document questions in your onboarding notes.' },
        { id: 'step-3', title: 'Week 2', body: 'Take ownership of a small deliverable with your onboarding buddy.' },
        { id: 'step-4', title: 'Week 4', body: 'Present one improvement idea and share your 30-day reflection.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'tabs', content: { defaultTabId: 'tab-tools', tabs: [
        { id: 'tab-tools', title: 'Tools', body: 'Slack for communication, Notion for knowledge, Jira for planning, and CRM for customer context.' },
        { id: 'tab-people', title: 'People', body: 'Manager: priorities. Buddy: daily questions. Team leads: process and dependencies.' },
        { id: 'tab-rituals', title: 'Rituals', body: 'Weekly planning, async updates, and Friday retro notes are the default rhythm.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'accordion', content: { items: [
        { id: 'todo-1', title: 'Account setup checklist', body: 'Sign in, configure MFA, join shared channels, and verify calendar access.' },
        { id: 'todo-2', title: 'Learning checklist', body: 'Complete product tour, read customer personas, and review escalation paths.' },
        { id: 'todo-3', title: 'Execution checklist', body: 'Ship one scoped task and request feedback in your 1:1.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'flipcard', content: { frontTitle: 'Acronym check: SLA', frontBody: 'What does SLA stand for in our support process?', backTitle: 'Answer', backBody: 'Service Level Agreement — our promised response and resolution expectations.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'Before asking for help in Slack, what is the best first step?', options: [
        { id: 'opt-1', text: 'Share what you tried and your observed result', correct: true },
        { id: 'opt-2', text: 'Post only “it is broken” with no context', correct: false },
        { id: 'opt-3', text: 'Wait silently and hope it resolves itself', correct: false },
      ], allowMultiple: false, explanation: 'Context-first questions get faster, better answers.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'button', content: { label: 'Open onboarding checklist', url: '', style: 'secondary', align: 'left' }, settings: { padding: 'small', maxWidth: 'narrow', hidden: false } },
    ],
  },
  {
    id: 'compliance-privacy-101',
    title: 'Data Privacy 101',
    description: 'Compliance-ready lesson with definitions, incident workflow, and policy confirmation.',
    category: 'Compliance',
    featured: true,
    format: 'course',
    theme: mergeTheme({ brandColor: '#9AD8B4', accentColor: '#1E5D4B' }),
    blocks: [
      { type: 'heading', content: { text: 'Data Privacy 101', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false, backgroundColor: '#EAF8F0' } },
      { type: 'text', content: { html: '<p>Privacy is everyone’s responsibility. This lesson covers what data you may handle, where it can live, and what to do during incidents.</p>' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quote', content: { text: 'Privacy is a product requirement, not a legal afterthought.', attribution: 'Security & Compliance Team' }, settings: { padding: 'medium', maxWidth: 'medium', hidden: false } },
      { type: 'accordion', content: { items: [
        { id: 'def-1', title: 'Personal data', body: 'Information that directly or indirectly identifies a person, including combinations of seemingly harmless fields.' },
        { id: 'def-2', title: 'Processing', body: 'Any operation on data: collecting, storing, sharing, analyzing, or deleting.' },
        { id: 'def-3', title: 'Least privilege', body: 'Access only what is required for your task and remove access when no longer needed.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'tabs', content: { defaultTabId: 'tab-do', tabs: [
        { id: 'tab-do', title: 'Do', body: 'Use approved systems, follow retention policy, and report suspicious access immediately.' },
        { id: 'tab-dont', title: 'Don’t', body: 'Move customer data into personal drives, public tools, or unapproved AI services.' },
        { id: 'tab-report', title: 'If unsure', body: 'Pause the action and ask Security/Legal in the privacy-help channel.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'timeline', content: { items: [
        { id: 'incident-1', title: 'Detect', body: 'Identify unusual access, leakage risk, or policy violations.' },
        { id: 'incident-2', title: 'Contain', body: 'Stop further exposure and restrict access paths immediately.' },
        { id: 'incident-3', title: 'Report', body: 'Escalate with facts: what data, how many records, and where stored.' },
        { id: 'incident-4', title: 'Document', body: 'Capture remediation actions and lessons learned.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'flipcard', content: { frontTitle: 'Retention rule check', frontBody: 'Can you keep exports on your desktop after task completion?', backTitle: 'Answer', backBody: 'No. Move to approved storage and remove local copies per policy.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'Select all valid first steps when production customer data is needed for debugging.', options: [
        { id: 'opt-1', text: 'Use masked/staging data if available', correct: true },
        { id: 'opt-2', text: 'Limit access to the smallest dataset possible', correct: true },
        { id: 'opt-3', text: 'Export all records to a personal spreadsheet', correct: false },
      ], allowMultiple: true, explanation: 'Use minimum necessary data and approved systems only.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'button', content: { label: 'Open privacy policy hub', url: '', style: 'secondary', align: 'left' }, settings: { padding: 'small', maxWidth: 'narrow', hidden: false } },
    ],
  },
  {
    id: 'product-launch-briefing',
    title: 'Product Launch Briefing',
    description: 'Structured product training with launch narrative, talk track, and positioning check.',
    category: 'Product Training',
    featured: true,
    format: 'course',
    theme: mergeTheme({ brandColor: '#7AC9FF', accentColor: '#264B8C' }),
    blocks: [
      { type: 'heading', content: { text: 'Launch briefing', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false, backgroundColor: '#EAF5FF' } },
      { type: 'text', content: { html: '<p>This briefing prepares customer-facing teams to explain what shipped, who benefits most, and how to position the value in under 60 seconds.</p>' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'imagetext', content: { imageSrc: '', imageAlt: 'Product screenshot', heading: 'What shipped', body: 'A guided workflow that reduces setup friction and improves visibility from kickoff to completion.', layout: 'left' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'tabs', content: { defaultTabId: 'tab-benefits', tabs: [
        { id: 'tab-benefits', title: 'Benefits', body: 'Faster setup, fewer handoffs, and clearer ownership across teams.' },
        { id: 'tab-audience', title: 'Audience', body: 'Best fit for admins, champions, and teams replacing manual tracking.' },
        { id: 'tab-positioning', title: 'Positioning', body: 'Lead with outcomes: fewer delays and higher confidence in delivery.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'timeline', content: { items: [
        { id: 'launch-1', title: 'Problem', body: 'Frame the pain: setup was slow and inconsistent.' },
        { id: 'launch-2', title: 'Solution', body: 'Show the new guided workflow in one concrete scenario.' },
        { id: 'launch-3', title: 'Impact', body: 'Anchor on measurable outcomes and customer value.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'video', content: { url: '', provider: null, videoId: null }, settings: { padding: 'small', maxWidth: 'wide', hidden: false } },
      { type: 'flipcard', content: { frontTitle: '10-second opener', frontBody: 'How do you open this launch story fast?', backTitle: 'Suggested opener', backBody: '“Teams can now launch in minutes with built-in guidance and fewer manual steps.”' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'Which opening message is strongest for first-contact calls?', options: [
        { id: 'opt-1', text: 'Outcome first, then demo the workflow', correct: true },
        { id: 'opt-2', text: 'List every feature before business impact', correct: false },
        { id: 'opt-3', text: 'Skip context and jump to pricing only', correct: false },
      ], allowMultiple: false, explanation: 'Outcome-led messaging wins attention early.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'button', content: { label: 'Watch the launch demo', url: '', style: 'primary', align: 'left' }, settings: { padding: 'small', maxWidth: 'narrow', hidden: false } },
    ],
  },
  {
    id: 'sales-objection-handling',
    title: 'Objection Handling Playbook',
    description: 'Flip cards for fast practice, plus a short scenario check.',
    category: 'Sales Enablement',
    format: 'course',
    theme: mergeTheme({ brandColor: '#F1A6B8', accentColor: '#7B1D3A' }),
    blocks: [
      { type: 'heading', content: { text: 'Objection handling', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'text', content: { html: '<p>Practice concise responses. Keep it curious, not combative.</p>' }, settings: { padding: 'medium', maxWidth: 'medium', hidden: false } },
      { type: 'flipcard', content: { frontTitle: '“It’s too expensive.”', frontBody: 'What do you say next?', backTitle: 'Response', backBody: 'Ask what “expensive” means, then anchor to ROI and risk reduction.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'flipcard', content: { frontTitle: '“We already have a tool.”', frontBody: 'What do you ask?', backTitle: 'Response', backBody: 'Ask what success looks like with the current tool and where it falls short.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'Best next step after an objection?', options: [
        { id: 'opt-1', text: 'Ask a clarifying question', correct: true },
        { id: 'opt-2', text: 'Immediately defend your product', correct: false },
      ], allowMultiple: false, explanation: 'Clarify first, then respond.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
  {
    id: 'leadership-1on1-coaching',
    title: 'Coaching Better 1:1s',
    description: 'A leadership template built around cadence and a repeatable conversation structure.',
    category: 'Leadership',
    format: 'course',
    theme: mergeTheme({ brandColor: '#C9B6FF', accentColor: '#2D2366' }),
    blocks: [
      { type: 'heading', content: { text: 'Coaching better 1:1s', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'timeline', content: { items: [
        { id: 'step-1', title: 'Set context', body: 'What are we solving this week?' },
        { id: 'step-2', title: 'Unblock', body: 'Remove friction and clarify priorities.' },
        { id: 'step-3', title: 'Develop', body: 'One skill to improve this month.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'accordion', content: { items: [
        { id: 'q-1', title: 'Question: What’s hard right now?', body: 'Let them lead. Avoid jumping to solutions.' },
        { id: 'q-2', title: 'Question: What does “good” look like?', body: 'Define outcomes and constraints.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
  {
    id: 'support-triage-playbook',
    title: 'Support Triage Playbook',
    description: 'A practical support template: identify, reproduce, communicate, resolve.',
    category: 'Customer Support',
    format: 'course',
    theme: mergeTheme({ brandColor: '#FFD38A', accentColor: '#6A3E00' }),
    blocks: [
      { type: 'heading', content: { text: 'Triage playbook', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'tabs', content: { defaultTabId: 'tab-identify', tabs: [
        { id: 'tab-identify', title: 'Identify', body: 'What is the user trying to do? What changed?' },
        { id: 'tab-repro', title: 'Reproduce', body: 'Steps, expected vs actual, environment.' },
        { id: 'tab-update', title: 'Update', body: 'Clear ETA, next action, what you need from them.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'What should every ticket update include?', options: [
        { id: 'opt-1', text: 'Next action + ETA', correct: true },
        { id: 'opt-2', text: 'Only a status emoji', correct: false },
      ], allowMultiple: false, explanation: 'Make it actionable.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
  {
    id: 'micro-safety-check',
    title: 'Microlearning: Safety Check',
    description: 'A single-objective microlearning with a quick check.',
    category: 'Microlearning',
    format: 'microlearning',
    theme: mergeTheme({ brandColor: '#B8F2E6', accentColor: '#0F766E' }),
    blocks: [
      { type: 'heading', content: { text: 'Safety objective', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'text', content: { html: '<p>Before you begin, verify the environment is safe to operate.</p>' }, settings: { padding: 'medium', maxWidth: 'medium', hidden: false } },
      { type: 'quiz', content: { question: 'First thing to check?', options: [
        { id: 'opt-1', text: 'Clear area and PPE', correct: true },
        { id: 'opt-2', text: 'Skip the checklist', correct: false },
      ], allowMultiple: false, explanation: 'Protect people first.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
  {
    id: 'micro-feature-spotlight',
    title: 'Microlearning: Feature Spotlight',
    description: 'A short feature explanation with a link out and a recap check.',
    category: 'Microlearning',
    format: 'microlearning',
    theme: mergeTheme({ brandColor: '#A7C7FF', accentColor: '#1F3A8A' }),
    blocks: [
      { type: 'heading', content: { text: 'Feature spotlight', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'imagetext', content: { imageSrc: '', imageAlt: 'Feature image', heading: 'One thing to remember', body: 'This feature reduces manual steps and makes outcomes visible.', layout: 'right' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'button', content: { label: 'Open the demo', url: '', style: 'primary', align: 'left' }, settings: { padding: 'small', maxWidth: 'narrow', hidden: false } },
      { type: 'quiz', content: { question: 'What’s the main benefit?', options: [
        { id: 'opt-1', text: 'Fewer manual steps', correct: true },
        { id: 'opt-2', text: 'More paperwork', correct: false },
      ], allowMultiple: false, explanation: 'Keep it outcome-based.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
  {
    id: 'micro-policy-update',
    title: 'Microlearning: Policy Update',
    description: 'A quick update with an accordion for details and a completion check.',
    category: 'Microlearning',
    format: 'microlearning',
    theme: mergeTheme({ brandColor: '#FFE08A', accentColor: '#7C2D12' }),
    blocks: [
      { type: 'heading', content: { text: 'Policy update', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'accordion', content: { items: [
        { id: 'p-1', title: 'What changed', body: 'We updated the retention period for exports.' },
        { id: 'p-2', title: 'What you do', body: 'Use the new export tool and avoid local copies.' },
      ] }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'Best practice after exporting?', options: [
        { id: 'opt-1', text: 'Delete local copies and store in approved systems', correct: true },
        { id: 'opt-2', text: 'Keep exports on your desktop indefinitely', correct: false },
      ], allowMultiple: false, explanation: 'Approved storage only.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
  {
    id: 'micro-quick-reference',
    title: 'Microlearning: Quick Reference',
    description: 'Flashcard-style microlearning for fast recall.',
    category: 'Microlearning',
    format: 'microlearning',
    theme: mergeTheme({ brandColor: '#FFB4A2', accentColor: '#7F1D1D' }),
    blocks: [
      { type: 'heading', content: { text: 'Quick reference', level: 1 }, settings: { padding: 'small', maxWidth: 'medium', hidden: false } },
      { type: 'flipcard', content: { frontTitle: 'Term: KPI', frontBody: 'What does KPI mean?', backTitle: 'Answer', backBody: 'Key Performance Indicator.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'flipcard', content: { frontTitle: 'Term: OKR', frontBody: 'What does OKR mean?', backTitle: 'Answer', backBody: 'Objectives and Key Results.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
      { type: 'quiz', content: { question: 'KPI stands for…', options: [
        { id: 'opt-1', text: 'Key Performance Indicator', correct: true },
        { id: 'opt-2', text: 'Known Product Issue', correct: false },
      ], allowMultiple: false, explanation: 'Short recall check.' }, settings: { padding: 'medium', maxWidth: 'wide', hidden: false } },
    ],
  },
];

export function buildTemplateSettings(template: CourseTemplate): Json {
  return {
    theme: template.theme as unknown as Json,
    authoringMode: 'rise',
    format: template.format,
    storyline: createDefaultStorylineDraft() as unknown as Json,
  };
}

export function instantiateTemplateBlocks(courseId: string, template: CourseTemplate): InsertBlock[] {
  return template.blocks.map((block, index) => ({
    course_id: courseId,
    type: block.type,
    content: block.content ?? {},
    settings: block.settings ?? { padding: 'medium', maxWidth: 'wide', hidden: false },
    order: index,
  }));
}
