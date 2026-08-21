import type { Category } from './types'

export const categories: Category[] = [
  {
    id: 'cat-pm',
    slug: 'project-management-tools',
    name: 'Project Management Tools',
    icon: 'ListChecks',
    description: 'Software teams use to plan sprints, track tasks, and ship on time.',
  },
  {
    id: 'cat-coffee',
    slug: 'coffee-roasters',
    name: 'Coffee Roasters',
    icon: 'Coffee',
    description: 'Independent roasters shipping fresh beans direct to your door.',
  },
  {
    id: 'cat-hosting',
    slug: 'web-hosting',
    name: 'Web Hosting',
    icon: 'Server',
    description: 'Where builders host sites, apps, and side projects.',
  },
  {
    id: 'cat-fitness',
    slug: 'fitness-apps',
    name: 'Fitness Apps',
    icon: 'Dumbbell',
    description: 'Apps for training, tracking, and staying honest with yourself.',
  },
]
