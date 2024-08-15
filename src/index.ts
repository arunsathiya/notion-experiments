import * as core from '@actions/core'
import { Client, isFullPageOrDatabase } from '@notionhq/client'
import dotenv from 'dotenv'

// Load environment variables from .env file when not in GitHub Actions
if (!process.env.GITHUB_ACTIONS) {
  dotenv.config()
}

export async function run(): Promise<void> {
  try {
    const notionApiKey = process.env.GITHUB_ACTIONS
      ? core.getInput('notion_api_key')
      : process.env.NOTION_API_KEY

    const notionDatabaseId = process.env.GITHUB_ACTIONS
      ? core.getInput('notion_database_id')
      : process.env.NOTION_DATABASE_ID

    if (!notionApiKey || !notionDatabaseId) {
      throw new Error('Notion API key or Database ID is missing')
    }

    const notion = new Client({ auth: notionApiKey })

    await checkForNewPages(notion, notionDatabaseId)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${errorMessage}`)
    if (process.env.GITHUB_ACTIONS) {
      core.setFailed(errorMessage)
    }
  }
}

async function checkForNewPages(notion: Client, databaseId: string): Promise<void> {
  try {
    // First, retrieve the database schema
    const database = await notion.databases.retrieve({ database_id: databaseId })

    const pages = await notion.databases.query({ database_id: databaseId })
    for (const page of pages.results) {
        if (!isFullPageOrDatabase(page)) {
            continue
        }
        const icon = page.icon
        const cover = page.cover
        if (!icon && !cover) {
            await addIconAndCover(notion, page.id)
        }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error querying database: ${errorMessage}`)
    if (process.env.GITHUB_ACTIONS) {
      core.error(`Error querying database: ${errorMessage}`)
    }
  }
}

async function addIconAndCover(notion: Client, pageId: string): Promise<void> {
  try {
    await notion.pages.update({
      page_id: pageId,
      icon: {
        type: "emoji",
        emoji: "🚀"
      },
      cover: {
        type: "external",
        external: {
          url: "https://www.notion.so/images/page-cover/solid_red.png"
        }
      }
    })
    const message = `Updated page ${pageId} with icon and cover`
    console.log(message)
    if (process.env.GITHUB_ACTIONS) {
      core.info(message)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error updating page ${pageId}: ${errorMessage}`)
    if (process.env.GITHUB_ACTIONS) {
      core.error(`Error updating page ${pageId}: ${errorMessage}`)
    }
  }
}

run()