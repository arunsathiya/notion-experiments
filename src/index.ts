import * as core from '@actions/core'
import { APIErrorCode, APIResponseError, Client, isFullPageOrDatabase } from '@notionhq/client'
import dotenv from 'dotenv'

// Load environment variables from .env file when not in GitHub Actions
if (!process.env.GITHUB_ACTIONS) {
  dotenv.config()
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

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
    const database = await notion.databases.retrieve({ database_id: databaseId })
    const pages = await notion.databases.query({ database_id: databaseId })
    const pagesToUpdate = pages.results.filter(page => isFullPageOrDatabase(page) && (!page.icon && !page.cover))
    const updatedPages = await Promise.allSettled(
      pagesToUpdate.map(page => retryUpdate(notion, page.id))
    )
    const successCount = updatedPages.filter(result => result.status === 'fulfilled').length
    const failCount = updatedPages.filter(result => result.status === 'rejected').length
    console.log(`Updated ${successCount} pages successfully. Failed to update ${failCount} pages.`)
    if (process.env.GITHUB_ACTIONS) {
      core.info(`Updated ${successCount} pages successfully. Failed to update ${failCount} pages.`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error querying database: ${errorMessage}`)
    if (process.env.GITHUB_ACTIONS) {
      core.error(`Error querying database: ${errorMessage}`)
    }
  }
}

async function retryUpdate(notion: Client, pageId: string): Promise<void> {
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      await addIconAndCover(notion, pageId)
      return
    } catch (error) {
      if (error instanceof APIResponseError && error.code === APIErrorCode.RateLimited) {
        retries++
        console.log(`Rate limited on page ${pageId}, retrying in ${RETRY_DELAY}ms`)
        if (process.env.GITHUB_ACTIONS) {
          core.info(`Rate limited on page ${pageId}, retrying in ${RETRY_DELAY}ms`)
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries))
      } else {
        throw error
      }
    }
  }
  throw new Error(`Failed to update page ${pageId} after ${MAX_RETRIES} retries`)
}

async function addIconAndCover(notion: Client, pageId: string): Promise<void> {
  const coverOptions = [
    { type: "solid", color: "red" },
    { type: "solid", color: "blue" },
    { type: "solid", color: "yellow" },
    { type: "gradient", number: "8" },
    { type: "gradient", number: "4" },
    { type: "gradient", number: "2" },
    { type: "gradient", number: "11" },
    { type: "gradient", number: "10" },
    { type: "gradient", number: "5" },
    { type: "gradient", number: "3" }
  ];
  
  const randomCover = coverOptions[Math.floor(Math.random() * coverOptions.length)];
  
  const getCoverUrl = (cover: typeof randomCover) => {
    if (cover.type === "solid") {
      return `https://www.notion.so/images/page-cover/solid_${cover.color}.png`;
    } else {
      return `https://www.notion.so/images/page-cover/gradients_${cover.number}.png`;
    }
  };

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
          url: getCoverUrl(randomCover)
        }
      }
    });
    
    const coverDescription = randomCover.type === "solid" 
      ? `solid ${randomCover.color}` 
      : `gradient ${randomCover.number}`;
    const message = `Updated page ${pageId} with icon and ${coverDescription} cover`;
    console.log(message);
    if (process.env.GITHUB_ACTIONS) {
      core.info(message);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error updating page ${pageId}: ${errorMessage}`);
    if (process.env.GITHUB_ACTIONS) {
      core.error(`Error updating page ${pageId}: ${errorMessage}`);
    }
  }
}

run()