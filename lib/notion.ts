import { Client } from '@notionhq/client'

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

export const PROJECTS_DB_ID = '1d12dc3ef51480f6abcbd5c161e1768f'
